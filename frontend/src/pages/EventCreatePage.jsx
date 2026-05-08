import { useState, useEffect } from 'react';
import './EventCreatePage.css';

const eventLevelOptions = [
  'Всероссийский',
  'Региональный',
  'Городской',
  'Университетский',
  'Институтский',
];

const roleOptions = [
  'Руководитель',
  'Организатор',
  'Исполнитель',
  'Волонтер',
  'Участник',
];

const initialFormState = {
  event_name: '',
  event_level: '',
  event_type: '',
  organizer_name: '',
  start_date: '',
  end_date: '',
  start_time: '',
  end_time: '',
  participants_planned: '',
  duration_hours: '',
  event_comment: '',
};

function hasValue(value) {
  return value !== null && value !== undefined && value !== '';
}

function getValidationMessages(formData) {
  const messages = [];

  if (!hasValue(formData.event_name)) {
    messages.push('Укажите название.');
  }

  if (!hasValue(formData.event_level)) {
    messages.push('Выберите уровень.');
  }

  if (!hasValue(formData.start_date)) {
    messages.push('Укажите дату начала.');
  }

  return messages;
}

function FormField({
  label,
  name,
  value,
  onChange,
  required = false,
  type = 'text',
  placeholder = '',
  as = 'input',
  options = [],
  disabled = false,
}) {
  const commonProps = {
    className: 'events-form__control',
    id: name,
    name,
    value,
    onChange,
    required,
    placeholder,
    disabled,
  };

  return (
    <div className="events-form__field">
      <label className="events-form__label" htmlFor={name}>
        {label}
        {required && <span className="events-form__required">*</span>}
      </label>
      {as === 'select' ? (
        <select {...commonProps}>
          <option value="">Выберите значение</option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : as === 'textarea' ? (
        <textarea {...commonProps} rows="3" />
      ) : (
        <input {...commonProps} type={type} />
      )}
    </div>
  );
}

function TimeSlotInput({ slot, onChange, onRemove }) {
  return (
    <div className="time-slot-input">
      <input
        type="date"
        className="time-slot-input__date"
        value={slot.date}
        onChange={(e) => onChange('date', e.target.value)}
      />
      <input
        type="time"
        className="time-slot-input__time"
        value={slot.start}
        onChange={(e) => onChange('start', e.target.value)}
      />
      <span className="time-slot-input__separator">-</span>
      <input
        type="time"
        className="time-slot-input__time"
        value={slot.end}
        onChange={(e) => onChange('end', e.target.value)}
      />
      <button
        type="button"
        className="time-slot-input__remove"
        onClick={onRemove}
        aria-label="Удалить время"
      >
        ✕
      </button>
    </div>
  );
}

function ParticipantCard({ participant, index, onRemove, onAddTimeSlot, onUpdateTimeSlot, onRemoveTimeSlot }) {
  const totalDuration = participant.timeSlots.reduce((sum, slot) => {
    if (slot.start && slot.end) {
      const [sh, sm] = slot.start.split(':').map(Number);
      const [eh, em] = slot.end.split(':').map(Number);
      const diff = (eh * 60 + em) - (sh * 60 + sm);
      return sum + (diff > 0 ? diff : 0);
    }
    return sum;
  }, 0);

  const durationHours = (totalDuration / 60).toFixed(1).replace(/\.0$/, '');

  return (
    <div className="participant-wrapper">
      <div className="participant-card">
        <div className="participant-card__main">
          <input 
            type="text" 
            className="participant-card__fio"
            placeholder="Фамилия Имя Отчество"
            value={participant.fio}
            onChange={(e) => {}}
          />
          <select className="participant-card__role">
            <option value="">Роль</option>
            {roleOptions.map(role => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
          <input 
            type="text" 
            className="participant-card__phone"
            value="+7(000)000-00-00"
            disabled
            placeholder="Телефон (загружается из БД)"
          />
        </div>
        
        <div className="participant-card__time">
          <div className="participant-card__duration">
            <svg className="participant-card__clock-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="7" stroke="#397AB2" strokeWidth="1.5"/>
              <path d="M8 4V8L11 10" stroke="#397AB2" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <span className="participant-card__duration-text">{durationHours} ч.</span>
          </div>
          
          <div className="participant-card__slots">
            {participant.timeSlots.map((slot, slotIdx) => (
              <TimeSlotInput
                key={slotIdx}
                slot={slot}
                onChange={(field, value) => onUpdateTimeSlot(index, slotIdx, field, value)}
                onRemove={() => onRemoveTimeSlot(index, slotIdx)}
              />
            ))}
            <button 
              type="button" 
              className="participant-card__add-time"
              onClick={() => onAddTimeSlot(index)}
              aria-label="Добавить время"
            >
              +
            </button>
          </div>
        </div>
      </div>

      <button 
        type="button" 
        className="participant-card__remove-outside"
        onClick={() => onRemove(index)}
        aria-label="Удалить участника"
      >
        −
      </button>
    </div>
  );
}

export function EventCreatePage() {
  const [formData, setFormData] = useState(initialFormState);
  const [participants, setParticipants] = useState([]);
  const [isParticipantsExpanded, setIsParticipantsExpanded] = useState(false);
  const [status, setStatus] = useState({ type: 'error', messages: [] });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      participants_planned: participants.length.toString()
    }));
  }, [participants]);

  useEffect(() => {
    const { start_date, start_time, end_date, end_time } = formData;
    if (start_date && start_time && end_date && end_time) {
      const start = new Date(`${start_date}T${start_time}`);
      const end = new Date(`${end_date}T${end_time}`);
      
      if (!isNaN(start) && !isNaN(end) && end > start) {
        const hours = (end - start) / (1000 * 60 * 60);
        setFormData(prev => ({ 
          ...prev, 
          duration_hours: hours.toFixed(1).replace(/\.0$/, '') 
        }));
      }
    }
  }, [formData.start_date, formData.start_time, formData.end_date, formData.end_time]);

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  function addParticipant() {
    setParticipants(prev => [...prev, { 
      id: Date.now(), 
      fio: '', 
      role: '', 
      phone: '',
      timeSlots: [] 
    }]);
    setIsParticipantsExpanded(true);
  }

  function removeParticipant(index) {
    setParticipants(prev => prev.filter((_, i) => i !== index));
  }

  function addTimeSlot(index) {
    setParticipants(prev => prev.map((p, i) => {
      if (i === index) {
        return {
          ...p,
          timeSlots: [...p.timeSlots, { date: '', start: '', end: '' }]
        };
      }
      return p;
    }));
  }

  function removeTimeSlot(index, slotIdx) {
    setParticipants(prev => prev.map((p, i) => {
      if (i === index) {
        return {
          ...p,
          timeSlots: p.timeSlots.filter((_, si) => si !== slotIdx)
        };
      }
      return p;
    }));
  }

  function updateTimeSlot(index, slotIdx, field, value) {
    setParticipants(prev => prev.map((p, i) => {
      if (i === index) {
        const newSlots = [...p.timeSlots];
        newSlots[slotIdx] = { ...newSlots[slotIdx], [field]: value };
        return {
          ...p,
          timeSlots: newSlots
        };
      }
      return p;
    }));
  }

  function canSubmit() {
    const validationMessages = getValidationMessages(formData);
    return validationMessages.length === 0;
  }

  function formatDuration() {
    if (!formData.duration_hours) return null;
    const hours = parseFloat(formData.duration_hours);
    return isNaN(hours) ? null : hours;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const validationMessages = getValidationMessages(formData);
    if (validationMessages.length > 0) {
      setStatus({ type: 'error', messages: validationMessages });
      return;
    }

    setIsSubmitting(true);

    const payload = {
      event_name: formData.event_name.trim(),
      event_level: formData.event_level,
      event_type: formData.event_type?.trim() || null,
      organizer_name: formData.organizer_name?.trim() || null,
      start_date: formData.start_date,
      end_date: formData.end_date || null,
      start_time: formData.start_time || null,
      end_time: formData.end_time || null,
      participants_planned: participants.length,
      duration_hours: formatDuration(),
      event_comment: formData.event_comment?.trim() || null,
      participants: participants,
    };

    console.log('Отправка данных:', payload);

    setTimeout(() => {
      setStatus({ type: 'success', message: 'Мероприятие успешно создано!' });
      setFormData(initialFormState);
      setParticipants([]);
      setIsParticipantsExpanded(false);
      setIsSubmitting(false);
      setTimeout(() => setStatus({ type: 'idle', messages: [] }), 2000);
    }, 1000);
  }

  const isValid = canSubmit();
  const validationMessages = getValidationMessages(formData);

  return (
    <div className="event-create-page">
      <div className="event-create-page__hero">
        <a className="event-create-page__back-link" href="#">← На главную</a>
        <h1 className="event-create-page__title">Создание мероприятия</h1>
      </div>

      <form className="event-create-page__form" onSubmit={handleSubmit}>
        <div className="form-section">
          <div className="events-form__grid">
            <FormField
              label="Название"
              name="event_name"
              value={formData.event_name}
              onChange={handleChange}
              required
              placeholder="Название"
            />
            <FormField
              label="Уровень"
              name="event_level"
              value={formData.event_level}
              onChange={handleChange}
              required
              as="select"
              options={eventLevelOptions}
            />
            <FormField
              label="Тип мероприятия"
              name="event_type"
              value={formData.event_type}
              onChange={handleChange}
            />
            <FormField
              label="Организатор"
              name="organizer_name"
              value={formData.organizer_name}
              onChange={handleChange}
              placeholder="ФИО"
            />
            <FormField
              label="Дата начала"
              name="start_date"
              value={formData.start_date}
              onChange={handleChange}
              type="date"
              required
            />
            <FormField
              label="Время начала"
              name="start_time"
              value={formData.start_time}
              onChange={handleChange}
              type="time"
            />
            <FormField
              label="Дата окончания"
              name="end_date"
              value={formData.end_date}
              onChange={handleChange}
              type="date"
            />
            <FormField
              label="Время окончания"
              name="end_time"
              value={formData.end_time}
              onChange={handleChange}
              type="time"
            />
            <FormField
              label="Количество участников"
              name="participants_planned"
              value={formData.participants_planned}
              onChange={handleChange}
              type="number"
              placeholder="0"
              disabled
            />
            <FormField
              label="Длительность"
              name="duration_hours"
              value={formData.duration_hours}
              onChange={handleChange}
              type="number"
              step="0.5"
              placeholder="0 ч."
              disabled
            />
            <FormField
              label="Комментарий"
              name="event_comment"
              value={formData.event_comment}
              onChange={handleChange}
              as="textarea"
              placeholder="Комментарий"
            />
          </div>
        </div>

        <div className="participants-section">
          <div 
            className="participants-section__header participants-section__header--clickable"
            onClick={() => setIsParticipantsExpanded(!isParticipantsExpanded)}
          >
            <h2 className="participants-section__title">Участники</h2>
            
            {!isParticipantsExpanded && (
              <button 
                type="button" 
                className="participants-section__plus-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  addParticipant();
                }}
                aria-label="Добавить участника"
              >
                <div className="participants-section__plus-horizontal"></div>
                <div className="participants-section__plus-vertical"></div>
              </button>
            )}
            
            <button 
              type="button" 
              className="participants-section__toggle"
              aria-label={isParticipantsExpanded ? 'Свернуть' : 'Развернуть'}
            >
              <svg 
                className={`participants-section__toggle-icon ${isParticipantsExpanded ? 'participants-section__toggle-icon--expanded' : ''}`}
                width="16" 
                height="10" 
                viewBox="0 0 16 10" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <path 
                  d="M1 1L8 8L15 1" 
                  stroke="#005BAA" 
                  strokeWidth="3" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>

          {isParticipantsExpanded && (
            <>
              <div className="participants-section__count">Всего: {participants.length}</div>
              
              <div className="participants-table">
                {participants.length === 0 ? (
                  <div className="participants-table__empty">Список участников пуст. Нажмите «+» чтобы добавить.</div>
                ) : (
                  participants.map((participant, idx) => (
                    <ParticipantCard
                      key={participant.id}
                      participant={participant}
                      index={idx}
                      onRemove={removeParticipant}
                      onAddTimeSlot={addTimeSlot}
                      onRemoveTimeSlot={removeTimeSlot}
                      onUpdateTimeSlot={updateTimeSlot}
                    />
                  ))
                )}
              </div>
              
              <div className="participants-section__plus-container">
                <button 
                  type="button" 
                  className="participants-section__plus-btn"
                  onClick={addParticipant}
                  aria-label="Добавить участника"
                >
                  <div className="participants-section__plus-horizontal"></div>
                  <div className="participants-section__plus-vertical"></div>
                </button>
              </div>
            </>
          )}
        </div>

        <div className="form-actions">
          <div className={`form-validation form-validation--${status.type === 'success' ? 'success' : isValid ? 'ready' : 'error'}`}>
            <span className="form-validation__title">
              {status.type === 'success' ? 'Мероприятие создано' : isValid ? 'Можно создать мероприятие' : 'Что нужно исправить'}
            </span>
            
            {status.type === 'error' && validationMessages.length > 0 ? (
              <ul className="form-validation__list">
                {validationMessages.map((msg, i) => (
                  <li key={i}>{msg}</li>
                ))}
              </ul>
            ) : status.type === 'success' ? (
              <p className="form-validation__text">{status.message}</p>
            ) : (
              <p className="form-validation__text">Все обязательные данные заполнены.</p>
            )}
          </div>
          
          <button className="form-submit" type="submit" disabled={!isValid || isSubmitting}>
            {isSubmitting ? 'Создание...' : 'Создать мероприятие'}
          </button>
        </div>
      </form>
    </div>
  );
}