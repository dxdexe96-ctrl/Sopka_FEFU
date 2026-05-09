import { useState } from 'react';
import './EventCreatePage.css';

export function EventViewModal({ event, onClose }) {
  const [isParticipantsExpanded, setIsParticipantsExpanded] = useState(true);

  if (!event) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="event-create-page" style={{ padding: 0 }}>
          <div className="event-create-page__hero" style={{ 
            display: 'flex', 
            flexDirection: 'row', 
            justifyContent: 'space-between', 
            alignItems: 'center' 
          }}>
            <h1 className="event-create-page__title">Мероприятие</h1>
            
            <button 
              className="modal-close-btn" 
              onClick={onClose} 
              title="Закрыть"
              style={{ 
                position: 'static',
                fontSize: '32px', 
                padding: '0 10px'
              }}
            >
              ✕
            </button>
          </div>

          <div className="event-create-page__form">
            <div className="form-section">
              <div className="events-form__grid">
                {/* ← Все поля теперь читаются из API-ответа */}
                <div className="events-form__field">
                  <label className="events-form__label">Название</label>
                  <input className="events-form__control" value={event.event_name} readOnly />
                </div>
                <div className="events-form__field">
                  <label className="events-form__label">Уровень</label>
                  <input className="events-form__control" value={event.event_level} readOnly />
                </div>
                <div className="events-form__field">
                  <label className="events-form__label">Тип мероприятия</label>
                  <input className="events-form__control" value={event.event_type || '—'} readOnly />
                </div>
                <div className="events-form__field">
                  <label className="events-form__label">Организатор</label>
                  <input className="events-form__control" value={event.organizer_name || '—'} readOnly />
                </div>
                <div className="events-form__field">
                  <label className="events-form__label">Дата начала</label>
                  <input className="events-form__control" value={event.start_date} readOnly />
                </div>
                <div className="events-form__field">
                  <label className="events-form__label">Время начала</label>
                  <input className="events-form__control" value={event.start_time} readOnly />
                </div>
                <div className="events-form__field">
                  <label className="events-form__label">Дата окончания</label>
                  <input className="events-form__control" value={event.end_date} readOnly />
                </div>
                <div className="events-form__field">
                  <label className="events-form__label">Время окончания</label>
                  <input className="events-form__control" value={event.end_time} readOnly />
                </div>
                <div className="events-form__field">
                  <label className="events-form__label">Количество участников</label>
                  <input className="events-form__control" value={event.participants_planned || 0} readOnly />
                </div>
                <div className="events-form__field">
                  <label className="events-form__label">Длительность</label>
                  <input className="events-form__control" value={event.duration_hours || '—'} readOnly />
                </div>
                <div className="events-form__field" style={{ gridColumn: '1 / -1' }}>
                  <label className="events-form__label">Комментарий</label>
                  <textarea className="events-form__control" value={event.event_comment || '—'} readOnly rows="3" />
                </div>
              </div>
            </div>

            <div className="participants-section">
              <div className="participants-section__header" onClick={() => setIsParticipantsExpanded(!isParticipantsExpanded)}>
                <h2 className="participants-section__title">Участники</h2>
                <div className="participants-section__toggle">
                  <svg className={`participants-section__toggle-icon ${isParticipantsExpanded ? 'participants-section__toggle-icon--expanded' : ''}`} width="16" height="10" viewBox="0 0 16 10" fill="none">
                    <path d="M1 1L8 8L15 1" stroke="#005BAA" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
              {isParticipantsExpanded && (
                <div className="participants-table">
                  <div className="participants-section__count">Всего: {event.participants?.length || event.participants_planned || 0}</div>
                  {/* Карточки участников — добавите позже */}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}