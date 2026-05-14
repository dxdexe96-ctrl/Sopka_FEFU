import { useState, useEffect, useRef } from 'react';
import {
  createEventParticipant,
  createEventType,
  deleteEventParticipant,
  getEvent,
  listEventParticipants,
  listEventTypes,
  listStudents,
  updateEvent,
} from '../lib/api.js';
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

function getStudentName(student) {
  return [student?.last_name, student?.first_name, student?.middle_name].filter(Boolean).join(' ');
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

function EventTypeInput({ value, eventTypesList, onSelectEventType, onChange }) {
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef(null);

  function getSuggestions(searchValue = '') {
    if (!eventTypesList || eventTypesList.length === 0) {
      return [];
    }

    const search = searchValue.toLowerCase().trim();
    if (!search) {
      return eventTypesList;
    }

    return eventTypesList.filter(et => (et.event_type_name || '').toLowerCase().includes(search));
  }

  function openSuggestions(searchValue = value) {
    const nextSuggestions = getSuggestions(searchValue);
    setSuggestions(nextSuggestions);
    setShowSuggestions(nextSuggestions.length > 0);
  }

  function handleChange(e) {
    const val = e.target.value;
    onChange(val);
    openSuggestions(val);
  }

  function handleSelect(eventType) {
    onChange(eventType.event_type_name);
    onSelectEventType({ eventTypeId: eventType.event_type_id, eventTypeName: eventType.event_type_name });
    setShowSuggestions(false);
    setSuggestions([]);
  }

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="student-input-wrapper" ref={wrapperRef}>
      <input
        className="events-form__control"
        type="text"
        placeholder="Тип мероприятия"
        value={value}
        onChange={handleChange}
        onFocus={() => openSuggestions()}
        onClick={() => openSuggestions()}
        autoComplete="off"
      />
      {showSuggestions && suggestions.length > 0 && (
        <ul className="student-suggestions">
          {suggestions.map((et) => (
            <li key={et.event_type_id} className="student-suggestion-item" onClick={() => handleSelect(et)}>
              {et.event_type_name}
            </li>
          ))}
        </ul>
      )}
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
    duration_hours: '', event_comment: '',
  });
  const [participants, setParticipants] = useState([]);
  const [isParticipantsExpanded, setIsParticipantsExpanded] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [eventId, setEventId] = useState(null);
  const [eventTypesCache, setEventTypesCache] = useState([]);
  const [eventData, setEventData] = useState(null);
  const [studentsCache, setStudentsCache] = useState([]);
  const [newParticipant, setNewParticipant] = useState({ student_id: '', role_name: '' });

  // Получаем ID из URL
  useEffect(() => {
    try {
      const hash = window.location.hash;
      const queryString = hash.includes('?') ? hash.split('?')[1] : window.location.search;
      const params = new URLSearchParams(queryString);
      const id = params.get('id');

      console.log('EventEditPage: ID из URL:', id);

      if (id) {
        setEventId(Number(id));
      } else {
        setError('Не указан ID мероприятия');
        setLoading(false);
      }
    } catch (err) {
      console.error('Ошибка при получении ID:', err);
      setError('Ошибка при получении ID мероприятия');
      setLoading(false);
    }
  }, []);

  // Загрузка студентов
  useEffect(() => {
    let isMounted = true;
    async function loadStudents() {
      try {
        const data = await listStudents({ limit: 200, isActive: true });
        if (isMounted) setStudentsCache(data);
      } catch (err) {
        console.error('Не удалось загрузить список студентов:', err);
      }
    }
    loadStudents();
    return () => { isMounted = false; };
  }, []);

  // Загрузка типов мероприятий
  useEffect(() => {
    let isMounted = true;
    async function loadEventTypes() {
      try {
        const data = await listEventTypes({ limit: 200, isActive: true });
        if (isMounted) setEventTypesCache(data);
      } catch (err) {
        console.error('Не удалось загрузить типы мероприятий:', err);
      }
    }
    loadEventTypes();
    return () => { isMounted = false; };
  }, []);

  // Загрузка данных мероприятия
  useEffect(() => {
    if (!eventId) return;

    async function loadEvent() {
      try {
        setLoading(true);
        setError('');
        console.log('Загрузка мероприятия с ID:', eventId);

        const event = await getEvent(eventId);
        console.log('Получены данные мероприятия:', event);
        setEventData(event);

        const formatTimeForInput = (isoString) => {
          if (!isoString) return '';
          if (typeof isoString === 'string' && /^\d{2}:\d{2}/.test(isoString)) {
            return isoString.slice(0, 5);
          }
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
          event_type: '',
          organizer_name: event.organizer_name || '',
          start_date: formatDateForInput(event.start_date),
          end_date: formatDateForInput(event.end_date),
          start_time: formatTimeForInput(event.start_time),
          end_time: formatTimeForInput(event.end_time),
          duration_hours: event.duration_hours || '',
          event_comment: event.event_comment || '',
        });

        if (event.participants && event.participants.length > 0) {
          setParticipants(event.participants);
        }
      } catch (err) {
        console.error('Error loading event:', err);
        setError(err instanceof Error ? err.message : 'Не удалось загрузить данные мероприятия');
      } finally {
        setLoading(false);
      }
    }

    loadEvent();
  }, [eventId]);

  // Загрузка участников
  useEffect(() => {
    if (!eventId) return;

    let isMounted = true;
    async function loadParticipants() {
      try {
        console.log('Загрузка участников для мероприятия:', eventId);
        const data = await listEventParticipants(eventId);
        if (!isMounted) return;

        console.log('Получены участники:', data);

        setParticipants(
          data.map((participant) => {
            const student = studentsCache.find((item) => item.student_id === participant.student_id);
            return {
              ...participant,
              id: participant.participation_id,
              fio: getStudentName(student) || `ID ${participant.student_id}`,
              role: participant.role_name,
              phone: student?.phone || '',
              timeSlots: [],
            };
          })
        );
      } catch (err) {
        console.error('Не удалось загрузить участников мероприятия:', err);
      }
    }

    // Ждем загрузки studentsCache
    if (studentsCache.length > 0 || participants.length === 0) {
      loadParticipants();
    }
    return () => { isMounted = false; };
  }, [eventId, studentsCache]);

  // Заполняем тип мероприятия
  useEffect(() => {
    if (eventData && eventTypesCache.length > 0 && eventData.event_type_id) {
      const type = eventTypesCache.find(et => et.event_type_id === eventData.event_type_id);
      if (type) {
        setFormData(prev => ({ ...prev, event_type: type.event_type_name }));
      }
    }
  }, [eventData, eventTypesCache]);

  // Расчет длительности
  useEffect(() => {
    function calculateDurationInHours() {
      if (!formData.start_date || !formData.end_date) {
        return;
      }

      const startDateOnly = new Date(formData.start_date);
      const endDateOnly = new Date(formData.end_date);
      startDateOnly.setHours(0, 0, 0, 0);
      endDateOnly.setHours(0, 0, 0, 0);

      const daysDiff = Math.floor((endDateOnly - startDateOnly) / (1000 * 60 * 60 * 24)) + 1;

      let startHours = 0;
      let endHours = 0;

      if (formData.start_time) {
        const [hours, minutes] = formData.start_time.split(':').map(Number);
        startHours = hours + minutes / 60;
      }

      if (formData.end_time) {
        const [hours, minutes] = formData.end_time.split(':').map(Number);
        endHours = hours + minutes / 60;
      } else if (formData.start_time) {
        endHours = 24;
      } else {
        return daysDiff * 8;
      }

      const hoursPerDay = endHours - startHours;

      if (hoursPerDay <= 0) {
        return daysDiff * 8;
      }

      const totalHours = daysDiff * hoursPerDay;
      const roundedHours = Math.round(totalHours * 2) / 2;

      return roundedHours;
    }

    const calculatedDuration = calculateDurationInHours();

    if (calculatedDuration !== undefined && calculatedDuration !== null && !isNaN(calculatedDuration)) {
      setFormData(prev => ({
        ...prev,
        duration_hours: calculatedDuration.toString()
      }));
    }
  }, [formData.start_date, formData.start_time, formData.end_date, formData.end_time]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  async function resolveEventTypeId(typeName) {
    if (!typeName) return null;

    const existing = eventTypesCache.find(
      et => et.event_type_name.toLowerCase() === typeName.toLowerCase()
    );
    if (existing) return existing.event_type_id;

    try {
      const newType = await createEventType({
        event_type_name: typeName,
        description: null,
        is_active: true,
      });
      setEventTypesCache(prev => [...prev, newType]);
      return newType.event_type_id;
    } catch (err) {
      console.error('Не удалось создать тип:', err);
      return null;
    }
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
      const eventTypeId = await resolveEventTypeId(formData.event_type?.trim());

      const payload = {
        event_name: formData.event_name.trim(),
        event_level: formData.event_level,
        event_type_id: eventTypeId,
        organizer_name: formData.organizer_name?.trim() || null,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        participants_planned: participants.length,
        duration_hours: formData.duration_hours ? parseFloat(formData.duration_hours) : null,
        event_comment: formData.event_comment?.trim() || null,
      };

      if (formData.start_date && formData.start_time) {
        payload.start_time = `${formData.start_time}:00`;
      }
      if (formData.end_date && formData.end_time) {
        payload.end_time = `${formData.end_time}:00`;
      }

      console.log('Отправка payload:', payload);
      await updateEvent(eventId, payload);
      window.location.hash = 'events-list';
    } catch (err) {
      console.error('Error updating event:', err);
      setError(err instanceof Error ? err.message : 'Не удалось сохранить изменения');
    } finally {
      setIsSubmitting(false);
    }
  };

  const validationMessages = getValidationMessages(formData);
  const isValid = validationMessages.length === 0;

  async function handleAddParticipant() {
    if (!eventId || !newParticipant.student_id || !newParticipant.role_name) return;

    try {
      const created = await createEventParticipant(eventId, {
        student_id: Number(newParticipant.student_id),
        role_name: newParticipant.role_name,
        participation_status: 'planned',
        notes: null,
      });
      const student = studentsCache.find((item) => item.student_id === created.student_id);
      setParticipants((prev) => [
        ...prev,
        {
          ...created,
          id: created.participation_id,
          fio: getStudentName(student) || `ID ${created.student_id}`,
          role: created.role_name,
          phone: student?.phone || '',
          timeSlots: [],
        },
      ]);
      setNewParticipant({ student_id: '', role_name: '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось добавить участника.');
    }
  }

  async function handleRemoveParticipant(index) {
    const participant = participants[index];
    if (!eventId || !participant?.participation_id) return;

    try {
      await deleteEventParticipant(eventId, participant.participation_id);
      setParticipants((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось удалить участника.');
    }
  }

  // Отладочный вывод
  console.log('EventEditPage rendering, loading:', loading, 'error:', error, 'eventId:', eventId);

  if (loading) {
    return (
      <div className="event-create-page">
        <div className="loading-state">Загрузка данных мероприятия...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="event-create-page">
        <div className="error-message" style={{ margin: '20px' }}>
          <p>Ошибка: {error}</p>
          <button onClick={() => { window.location.hash = 'events-list'; }} className="retry-button">
            Вернуться к списку
          </button>
        </div>
      </div>
    );
  }

  if (!eventId) {
    return (
      <div className="event-create-page">
        <div className="error-message" style={{ margin: '20px' }}>
          <p>ID мероприятия не найден в URL</p>
          <button onClick={() => { window.location.hash = 'events-list'; }} className="retry-button">
            Вернуться к списку
          </button>
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

            <div className="events-form__field">
              <label className="events-form__label" htmlFor="event_type">Тип мероприятия</label>
              <EventTypeInput
                value={formData.event_type}
                eventTypesList={eventTypesCache}
                onChange={(val) => setFormData(prev => ({ ...prev, event_type: val }))}
                onSelectEventType={() => {}}
              />
            </div>

            <FormField label="Организатор" name="organizer_name" value={formData.organizer_name} onChange={handleChange} placeholder="ФИО" />
            <FormField label="Дата начала" name="start_date" value={formData.start_date} onChange={handleChange} type="date" required />
            <FormField label="Время начала" name="start_time" value={formData.start_time} onChange={handleChange} type="time" />
            <FormField label="Дата окончания" name="end_date" value={formData.end_date} onChange={handleChange} type="date" />
            <FormField label="Время окончания" name="end_time" value={formData.end_time} onChange={handleChange} type="time" />
            <FormField label="Количество участников" name="participants_planned" value={participants.length} disabled />
            <FormField label="Длительность (общее время мероприятия, ч)" name="duration_hours" value={formData.duration_hours} onChange={handleChange} disabled placeholder="0 ч." />
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
              <div className="participant-card">
                <div className="participant-card__main">
                  <select
                    className="participant-card__fio"
                    value={newParticipant.student_id}
                    onChange={(event) => setNewParticipant((prev) => ({ ...prev, student_id: event.target.value }))}
                  >
                    <option value="">Выберите студента</option>
                    {studentsCache.map((student) => (
                      <option key={student.student_id} value={student.student_id}>
                        {getStudentName(student)}
                      </option>
                    ))}
                  </select>
                  <select
                    className="participant-card__role"
                    value={newParticipant.role_name}
                    onChange={(event) => setNewParticipant((prev) => ({ ...prev, role_name: event.target.value }))}
                  >
                    <option value="">Роль</option>
                    {roleOptions.map((role) => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                  <button
                    className="participant-card__add-time"
                    type="button"
                    onClick={handleAddParticipant}
                    disabled={!newParticipant.student_id || !newParticipant.role_name}
                  >
                    +
                  </button>
                </div>
              </div>
              {participants.map((p, idx) => (
                <ParticipantCard key={p.participation_id || p.id} participant={p} index={idx} onRemove={handleRemoveParticipant} onAddTimeSlot={() => {}} onUpdateTimeSlot={() => {}} onRemoveTimeSlot={() => {}} />
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