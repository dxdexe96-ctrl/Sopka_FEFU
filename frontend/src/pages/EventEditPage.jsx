import { useState, useEffect } from 'react';
import { getEvent, updateEvent } from '../lib/api.js';
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

function hasValue(value) {
  return value !== null && value !== undefined && value !== '';
}

function getValidationMessages(formData) {
  const messages = [];
  if (!hasValue(formData.event_name)) messages.push('Укажите название.');
  if (!hasValue(formData.event_level)) messages.push('Выберите уровень.');
  if (!hasValue(formData.start_date)) messages.push('Укажите дату начала.');
  return messages;
}

function FormField({ label, name, value, onChange, required = false, type = 'text', placeholder = '', as = 'input', options = [], disabled = false }) {
  const commonProps = { className: 'events-form__control', id: name, name, value, onChange, required, placeholder, disabled };
  return (
    <div className="events-form__field">
      <label className="events-form__label" htmlFor={name}>{label}{required && <span className="events-form__required">*</span>}</label>
      {as === 'select' ? (
        <select {...commonProps}><option value="">Выберите значение</option>{options.map(o => <option key={o} value={o}>{o}</option>)}</select>
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
      <input type="date" className="time-slot-input__date" value={slot.date} onChange={(e) => onChange('date', e.target.value)} />
      <input type="time" className="time-slot-input__time" value={slot.start} onChange={(e) => onChange('start', e.target.value)} />
      <span className="time-slot-input__separator">-</span>
      <input type="time" className="time-slot-input__time" value={slot.end} onChange={(e) => onChange('end', e.target.value)} />
      <button type="button" className="time-slot-input__remove" onClick={onRemove}>✕</button>
    </div>
  );
}

function ParticipantCard({ participant, index, onRemove, onAddTimeSlot, onUpdateTimeSlot, onRemoveTimeSlot }) {
  return (
    <div className="participant-wrapper">
      <div className="participant-card">
        <div className="participant-card__main">
          <input type="text" className="participant-card__fio" placeholder="Фамилия Имя Отчество" value={participant.fio} readOnly />
          <select className="participant-card__role"><option value="">{participant.role || 'Роль'}</option></select>
          <input type="text" className="participant-card__phone" value="+7(000)000-00-00" disabled />
        </div>
        <div className="participant-card__time">
          <div className="participant-card__duration">
            <span className="participant-card__duration-text">0 ч.</span>
          </div>
          <div className="participant-card__slots">
            {participant.timeSlots.map((slot, sIdx) => (
              <TimeSlotInput key={sIdx} slot={slot} onChange={(f, v) => onUpdateTimeSlot(index, sIdx, f, v)} onRemove={() => onRemoveTimeSlot(index, sIdx)} />
            ))}
            <button type="button" className="participant-card__add-time" onClick={() => onAddTimeSlot(index)}>+</button>
          </div>
        </div>
      </div>
      <button type="button" className="participant-card__remove-outside" onClick={() => onRemove(index)}>−</button>
    </div>
  );
}

export function EventEditPage() {
  const [formData, setFormData] = useState({
    event_name: '', event_level: '', event_type: '', organizer_name: '',
    start_date: '', end_date: '', start_time: '', end_time: '',
    participants_planned: '', duration_hours: '', event_comment: '',
  });
  const [participants, setParticipants] = useState([]);
  const [isParticipantsExpanded, setIsParticipantsExpanded] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [eventId, setEventId] = useState(null);

  // Получаем event_id из URL (поддерживает #/edit-event?id=123 и ?id=123)
  useEffect(() => {
    const hash = window.location.hash;
    const queryString = hash.includes('?') ? hash.split('?')[1] : window.location.search;
    const params = new URLSearchParams(queryString);
    const id = params.get('id');
    
    if (id) {
      setEventId(Number(id));
    } else {
      setError('Не указан ID мероприятия');
      setLoading(false);
    }
  }, []);

  // Загрузка данных мероприятия
  useEffect(() => {
    if (!eventId) return;

    async function loadEvent() {
      try {
        setLoading(true);
        setError('');
        const event = await getEvent(eventId);
        
        // Форматируем время из ISO в локальный формат для input
        const formatTimeForInput = (isoString) => {
          if (!isoString) return '';
          const date = new Date(isoString);
          return date.toTimeString().slice(0, 5);
        };

        const formatDateForInput = (isoString) => {
          if (!isoString) return '';
          const date = new Date(isoString);
          return date.toISOString().split('T')[0];
        };

        setFormData({
          event_name: event.event_name || '',
          event_level: event.event_level || '',
          event_type: event.event_type || '',
          organizer_name: event.organizer_name || '',
          start_date: formatDateForInput(event.start_date),
          end_date: formatDateForInput(event.end_date),
          start_time: formatTimeForInput(event.start_time),
          end_time: formatTimeForInput(event.end_time),
          participants_planned: event.participants_planned || '',
          duration_hours: event.duration_hours || '',
          event_comment: event.event_comment || '',
        });

        if (event.participants && event.participants.length > 0) {
          setParticipants(event.participants);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Не удалось загрузить данные мероприятия');
        console.error('Error loading event:', err);
      } finally {
        setLoading(false);
      }
    }

    loadEvent();
  }, [eventId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  function formatForApi() {
    const payload = {
      event_name: formData.event_name.trim(),
      event_level: formData.event_level,
      organizer_name: formData.organizer_name?.trim() || null,
      event_type: formData.event_type?.trim() || null,
      start_date: formData.start_date || null,
      end_date: formData.end_date || null,
      participants_planned: formData.participants_planned ? parseInt(formData.participants_planned) : null,
      duration_hours: formData.duration_hours ? parseFloat(formData.duration_hours) : null,
      event_comment: formData.event_comment?.trim() || null,
    };

    if (formData.start_date && formData.start_time) {
      payload.start_time = `${formData.start_date}T${formData.start_time}:00`;
    }
    if (formData.end_date && formData.end_time) {
      payload.end_time = `${formData.end_date}T${formData.end_time}:00`;
    }

    return payload;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationMessages = getValidationMessages(formData);
    if (validationMessages.length > 0) {
      setError(validationMessages.join(' '));
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const payload = formatForApi();
      await updateEvent(eventId, payload);
      
      // Возвращаемся к списку мероприятий через hash-навигацию
      window.location.hash = 'events-list';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить изменения');
      console.error('Error updating event:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const validationMessages = getValidationMessages(formData);
  const isValid = validationMessages.length === 0;

  if (loading) {
    return (
      <div className="event-create-page">
        <div className="loading-state">Загрузка данных...</div>
      </div>
    );
  }

  if (!eventId) {
    return (
      <div className="event-create-page">
        <div className="error-message" style={{ margin: '20px' }}>
          {error}
          <button onClick={() => { window.location.hash = 'events-list'; }} className="retry-button">К списку</button>
        </div>
      </div>
    );
  }

  return (
    <div className="event-create-page">
      <div className="event-create-page__hero">
        <a className="event-create-page__back-link" href="#events-list" onClick={(e) => { e.preventDefault(); window.location.hash = 'events-list'; }}>
          ← К списку мероприятий
        </a>
        <h1 className="event-create-page__title">Редактирование мероприятия</h1>
      </div>

      {error && (
        <div className="error-message" style={{ margin: '20px' }}>
          {error}
          <button onClick={() => setError('')} className="retry-button">Закрыть</button>
        </div>
      )}

      <form className="event-create-page__form" onSubmit={handleSubmit}>
        <div className="form-section">
          <div className="events-form__grid">
            <FormField label="Название" name="event_name" value={formData.event_name} onChange={handleChange} required />
            <FormField label="Уровень" name="event_level" value={formData.event_level} onChange={handleChange} as="select" options={eventLevelOptions} required />
            <FormField label="Тип мероприятия" name="event_type" value={formData.event_type} onChange={handleChange} />
            <FormField label="Организатор" name="organizer_name" value={formData.organizer_name} onChange={handleChange} placeholder="ФИО" />
            <FormField label="Дата начала" name="start_date" value={formData.start_date} onChange={handleChange} type="date" required />
            <FormField label="Время начала" name="start_time" value={formData.start_time} onChange={handleChange} type="time" />
            <FormField label="Дата окончания" name="end_date" value={formData.end_date} onChange={handleChange} type="date" />
            <FormField label="Время окончания" name="end_time" value={formData.end_time} onChange={handleChange} type="time" />
            <FormField label="Количество участников" name="participants_planned" value={participants.length} disabled />
            <FormField label="Длительность" name="duration_hours" value={formData.duration_hours} onChange={handleChange} disabled placeholder="0 ч." />
            <FormField label="Комментарий" name="event_comment" value={formData.event_comment} onChange={handleChange} as="textarea" />
          </div>
        </div>

        <div className="participants-section">
          <div className="participants-section__header participants-section__header--clickable" onClick={() => setIsParticipantsExpanded(!isParticipantsExpanded)}>
            <h2 className="participants-section__title">Участники</h2>
            <button type="button" className="participants-section__toggle">
              <svg className={`participants-section__toggle-icon ${isParticipantsExpanded ? 'participants-section__toggle-icon--expanded' : ''}`} width="16" height="10" viewBox="0 0 16 10" fill="none">
                <path d="M1 1L8 8L15 1" stroke="#005BAA" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>

          {isParticipantsExpanded && (
            <div className="participants-table">
              <div className="participants-section__count">Всего: {participants.length}</div>
              {participants.map((p, idx) => (
                <ParticipantCard key={p.id} participant={p} index={idx} onRemove={() => {}} onAddTimeSlot={() => {}} onUpdateTimeSlot={() => {}} onRemoveTimeSlot={() => {}} />
              ))}
            </div>
          )}
        </div>

        <div className="form-actions">
          <div className={`form-validation form-validation--${isValid ? 'ready' : 'error'}`}>
            <span className="form-validation__title">{isValid ? 'Можно сохранить изменения' : 'Что нужно исправить'}</span>
            <p className="form-validation__text">{isValid ? 'Все обязательные данные заполнены.' : validationMessages.join(' ')}</p>
          </div>
          <button className="form-submit" type="submit" disabled={!isValid || isSubmitting}>
            {isSubmitting ? 'Сохранение...' : 'Сохранить изменения'}
          </button>
        </div>
      </form>
    </div>
  );
}