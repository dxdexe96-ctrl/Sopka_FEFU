import { useState, useEffect } from 'react';
import {
  listEvents,
  deleteEvent as deleteEventApi,
  listEventParticipants
} from '../lib/api.js';

import './EventsListPage.css';
import { formatEventScheduleSummary } from '../lib/eventScheduleUtils.js';
import { EventViewModal } from './EventViewModal';

function formatDate(dateString) {
  if (!dateString) return '';

  const date = new Date(dateString);

  return date.toLocaleDateString('ru-RU');
}

function formatTime(timeString) {
  if (!timeString) return '';

  // 14:30:00 -> 14:30
  return timeString.slice(0, 5);
}

export function EventsListPage() {
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loading, setLoading] = useState(true);

  // 🔍 Поиск и фильтры
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  useEffect(() => {
    async function loadEventsWithParticipants() {
      try {
        setLoading(true);

        const eventsData = await listEvents({ limit: 200 });

        const eventsWithCounts = await Promise.all(
          eventsData.map(async (event) => {
            try {
              const participants = await listEventParticipants(event.event_id);

              return {
                ...event,
                participants_count: participants.length
              };
            } catch (err) {
              console.error(
                `Не удалось загрузить участников для мероприятия ${event.event_id}:`,
                err
              );

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

  // 🔍 Фильтрация мероприятий
  const filteredEvents = events.filter((event) => {

    const matchesSearch =
      event.event_name
        ?.toLowerCase()
        .includes(search.toLowerCase());

    const matchesLevel =
      !levelFilter ||
      event.event_level === levelFilter;

    const matchesType =
      !typeFilter ||
      event.event_type_name === typeFilter;

    const matchesDate =
      !dateFilter ||
      event.start_date === dateFilter;

    return (
      matchesSearch &&
      matchesLevel &&
      matchesType &&
      matchesDate
    );
  });

  // 📋 Уникальные значения
  const uniqueLevels = [
    ...new Set(
      events
        .map(e => e.event_level)
        .filter(Boolean)
    )
  ];

  const uniqueTypes = [
    ...new Set(
      events
        .map(e => e.event_type_name)
        .filter(Boolean)
    )
  ];

  // ❌ Удаление мероприятия
  const deleteEvent = async (id, e) => {
    e.stopPropagation();

    if (
      window.confirm(
        'Вы уверены, что хотите удалить это мероприятие?'
      )
    ) {
      try {
        await deleteEventApi(id);

        setEvents(
          events.filter(event => event.event_id !== id)
        );

      } catch (err) {
        alert(
          'Не удалось удалить: ' +
          (err.message || 'Ошибка')
        );
      }
    }
  };

  // ✏️ Переход к редактированию
  const goToEdit = (id, e) => {
    e.stopPropagation();
    window.location.hash = `edit-event?id=${id}`;
  };

  // ⏳ Загрузка
  if (loading) {
    return (
      <div className="events-list-page">
        <div className="loading-state">
          Загрузка мероприятий...
        </div>
      </div>
    );
  }

  return (
    <div className="events-list-page">
      {/* HEADER */}
      <div className="events-list-header">
        <div className="top-navigation">
          <button
            className="back-home-button"
            onClick={() => window.location.hash = ''}
          >
            ← На главную
          </button>
        </div>

        <div className="header-main-row">
          <h1 className="events-list-title">
            Мероприятия
          </h1>

          <div className="events-list-controls">

            <button
              className="add-event-button"
              onClick={() =>
                window.location.hash = 'create-event'
              }
            >
              Добавить мероприятие
            </button>

            <div className="events-total-count">
              Найдено: {filteredEvents.length}
            </div>

          </div>
        </div>

        {/* 🔍 ФИЛЬТРЫ */}
        <div className="events-filters">

          {/* ПОИСК */}
          <input
            type="text"
            placeholder="Поиск мероприятия..."
            className="events-search-input"
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
          />

          {/* УРОВЕНЬ */}
          <select
            className="events-filter-select"
            value={levelFilter}
            onChange={(e) =>
              setLevelFilter(e.target.value)
            }
          >
            <option value="">
              Все уровни
            </option>

            {uniqueLevels.map(level => (
              <option
                key={level}
                value={level}
              >
                {level}
              </option>
            ))}
          </select>

          {/* ТИП */}
          <select
            className="events-filter-select"
            value={typeFilter}
            onChange={(e) =>
              setTypeFilter(e.target.value)
            }
          >
            <option value="">
              Все типы
            </option>

            {uniqueTypes.map(type => (
              <option
                key={type}
                value={type}
              >
                {type}
              </option>
            ))}
          </select>

          {/* ДАТА */}
          <input
            type="date"
            className="events-filter-date"
            value={dateFilter}
            onChange={(e) =>
              setDateFilter(e.target.value)
            }
          />

          {/* СБРОС */}
          <button
            className="events-reset-filters"
            onClick={() => {
              setSearch('');
              setLevelFilter('');
              setTypeFilter('');
              setDateFilter('');
            }}
          >
            Сбросить
          </button>

        </div>
      </div>

      {/* СПИСОК МЕРОПРИЯТИЙ */}
      <div className="events-grid">
        {filteredEvents.length > 0 ? (
          filteredEvents.map((event) => (
            <div
              key={event.event_id}
              className="event-card"
              onClick={() => setSelectedEvent(event)}
              style={{ cursor: 'pointer' }}
            >

              {/* КНОПКИ */}
              <div className="event-actions">
                <button
                  className="action-btn edit-btn"
                  title="Отредактировать"
                  onClick={(e) =>
                    goToEdit(event.event_id, e)
                  }
                >
                  ✎
                </button>
                <button
                  className="action-btn delete-btn"
                  title="Удалить мероприятие"
                  onClick={(e) =>
                    deleteEvent(event.event_id, e)
                  }
                >
                  ×
                </button>
              </div>

              {/* HEADER */}
              <div className="event-card-header">
                <span className="event-card-name">
                  {event.event_name}
                </span>
              </div>

              {/* BODY */}
              <div className="event-card-body">
                <div className="event-card-info">
                  <span className="event-card-datetime">
                  {formatDate(event.start_date)}
                  {event.end_date && (
                    <>
                      {' — '}
                      {formatDate(event.end_date)}
                    </>
                  )}
                  <br />

                  {formatEventScheduleSummary(event) || (
                    <>
                      {formatTime(event.start_time)}
                      {event.end_time && (
                        <>
                          {' - '}
                          {formatTime(event.end_time)}
                        </>
                      )}
                    </>
                  )}
                </span>
                  <div className="event-card-participants">
                    <span className="participants-label">
                      Кол. участников
                    </span>

                    <div className="participants-badge">
                      {event.participants_count || 0}
                    </div>
                  </div>
                </div>
              </div>
            </div>

          ))

        ) : (

          <div className="empty-state">
            Ничего не найдено
          </div>

        )}

      </div>

      {/* МОДАЛКА */}
      {selectedEvent && (
        <EventViewModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      )}

    </div>
  );
}