import { useEffect, useState } from 'react';
import { PageHeader } from '../components/ui/PageHeader.jsx';
import { listEvents } from '../lib/api.js';
import { formatEventScheduleSummary } from '../lib/eventScheduleUtils.js';
import './EventStatisticsPage.css';

function formatDate(value) {
  if (!value) {
    return '';
  }
  return new Date(`${String(value).slice(0, 10)}T12:00:00`).toLocaleDateString('ru-RU');
}

function getEventDateLabel(event) {
  const start = formatDate(event.start_date);
  const end = formatDate(event.end_date);
  return end && end !== start ? `${start} — ${end}` : start;
}

export function EventStatisticsPage() {
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [status, setStatus] = useState({ type: 'loading', message: 'Загрузка списка мероприятий...' });

  useEffect(() => {
    let isMounted = true;

    listEvents({ limit: 200 })
      .then((rows) => {
        if (!isMounted) {
          return;
        }
        const sorted = [...(rows || [])].sort((left, right) => {
          const leftDate = String(left.start_date || '');
          const rightDate = String(right.start_date || '');
          return rightDate.localeCompare(leftDate) || String(left.event_name || '').localeCompare(String(right.event_name || ''), 'ru');
        });
        setEvents(sorted);
        setStatus({ type: 'idle', message: '' });
      })
      .catch((error) => {
        if (!isMounted) {
          return;
        }
        setEvents([]);
        setStatus({
          type: 'error',
          message: error instanceof Error ? error.message : 'Не удалось загрузить мероприятия.',
        });
      });

    return () => {
      isMounted = false;
    };
  }, []);

  function openStatistics() {
    if (!selectedEventId) {
      return;
    }
    window.location.hash = `event-details?id=${selectedEventId}`;
  }

  const selectedEvent = events.find((event) => String(event.event_id) === String(selectedEventId));

  return (
    <div className="event-statistics-page">
      <PageHeader title="Статистика по мероприятию" />

      <p className="event-statistics-page__hint">
        Выберите мероприятие, чтобы открыть информацию об участниках и диаграмму занятости.
      </p>

      {status.message ? (
        <p className={`event-statistics-page__status event-statistics-page__status--${status.type}`}>
          {status.message}
        </p>
      ) : null}

      {!status.message && events.length === 0 ? (
        <p className="event-statistics-page__empty">Мероприятия не найдены. Сначала создайте мероприятие.</p>
      ) : null}

      {events.length > 0 ? (
        <div className="event-statistics-page__panel">
          <label className="event-statistics-page__label" htmlFor="event-statistics-select">
            Мероприятие
          </label>
          <select
            id="event-statistics-select"
            className="event-statistics-page__select"
            value={selectedEventId}
            onChange={(event) => setSelectedEventId(event.target.value)}
          >
            <option value="">Выберите мероприятие</option>
            {events.map((event) => (
              <option key={event.event_id} value={String(event.event_id)}>
                {event.event_name} ({getEventDateLabel(event)})
              </option>
            ))}
          </select>

          {selectedEvent ? (
            <div className="event-statistics-page__preview">
              <div><strong>Уровень:</strong> {selectedEvent.event_level || '—'}</div>
              <div>
                <strong>Расписание:</strong>{' '}
                {formatEventScheduleSummary(selectedEvent) || getEventDateLabel(selectedEvent) || '—'}
              </div>
            </div>
          ) : null}

          <button
            type="button"
            className="event-statistics-page__open-btn"
            onClick={openStatistics}
            disabled={!selectedEventId}
          >
            Открыть статистику
          </button>
        </div>
      ) : null}

      <div className="event-statistics-page__back-link">
        <a href="#home" className="event-statistics-page__back-link-btn">
          ← Вернуться к списку отчётов
        </a>
      </div>
    </div>
  );
}
