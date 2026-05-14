import { useState, useEffect } from 'react';
import { listEvents, deleteEvent as deleteEventApi, listEventParticipants } from '../lib/api.js';
import './EventsListPage.css';
import { EventViewModal } from './EventViewModal';

export function EventsListPage() {
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadEventsWithParticipants() {
      try {
        setLoading(true);
        // Загружаем список мероприятий
        const eventsData = await listEvents({ limit: 200 });

        // Для каждого мероприятия загружаем количество участников
        const eventsWithCounts = await Promise.all(
          eventsData.map(async (event) => {
            try {
              const participants = await listEventParticipants(event.event_id);
              return {
                ...event,
                participants_count: participants.length
              };
            } catch (err) {
              console.error(`Не удалось загрузить участников для мероприятия ${event.event_id}:`, err);
              return {
                ...event,
                participants_count: 0
              };
            }
          })
        );

        setEvents(eventsWithCounts);
      } catch (err) {
        console.error('Не удалось загрузить мероприятия:', err);
      } finally {
        setLoading(false);
      }
    }

    loadEventsWithParticipants();
  }, []);

  const deleteEvent = async (id, e) => {
    e.stopPropagation();
    if (window.confirm("Вы уверены, что хотите удалить это мероприятие?")) {
      try {
        await deleteEventApi(id);
        setEvents(events.filter(event => event.event_id !== id));
      } catch (err) {
        alert('Не удалось удалить: ' + (err.message || 'Ошибка'));
      }
    }
  };

  const goToEdit = (id, e) => {
    e.stopPropagation();
    window.location.hash = `edit-event?id=${id}`;
  };

  if (loading) {
    return (
      <div className="events-list-page">
        <div className="loading-state">Загрузка мероприятий...</div>
      </div>
    );
  }

  return (
    <div className="events-list-page">
      <div className="events-list-header">
        <div className="top-navigation">
          <button className="back-home-button" onClick={() => window.location.hash = ''}>
            ← На главную
          </button>
        </div>

        <div className="header-main-row">
          <h1 className="events-list-title">Мероприятия</h1>
          <div className="events-list-controls">
            <button
              className="add-event-button"
              onClick={() => window.location.hash = 'create-event'}
            >
              Добавить мероприятие
            </button>
            <div className="events-total-count">Всего: {events.length}</div>
          </div>
        </div>
      </div>

      <div className="events-grid">
        {events.length > 0 ? (
          events.map((event) => (
            <div
              key={event.event_id}
              className="event-card"
              onClick={() => setSelectedEvent(event)}
              style={{ cursor: 'pointer' }}
            >
              <div className="event-actions">
                <button
                  className="action-btn edit-btn"
                  title="Отредактировать"
                  onClick={(e) => goToEdit(event.event_id, e)}
                >
                  ✎
                </button>
                <button
                  className="action-btn delete-btn"
                  title="Удалить мероприятие"
                  onClick={(e) => deleteEvent(event.event_id, e)}
                >
                  ×
                </button>
              </div>

              <div className="event-card-header">
                <span className="event-card-name">{event.event_name}</span>
              </div>
              <div className="event-card-body">
                <div className="event-card-info">
                  <span className="event-card-datetime">
                    {event.start_date} - {event.end_date}, {event.start_time} - {event.end_time}
                  </span>
                  <div className="event-card-participants">
                    <span className="participants-label">Кол. Участников</span>
                    <div className="participants-badge">{event.participants_count || 0}</div>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state">Список мероприятий пуст</div>
        )}
      </div>

      {selectedEvent && (
        <EventViewModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </div>
  );
}

