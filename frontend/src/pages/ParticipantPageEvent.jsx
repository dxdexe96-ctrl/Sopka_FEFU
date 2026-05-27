import { useState, useMemo } from 'react';
import './ParticipantsSummaryPage.css';

const levelOptions = [
  'Все уровни',
  'Университетский',
  'Факультетский',
  'Городской',
  'Региональный',
  'Федеральный',
  'Международный',
];

// Mock data — в реальном проекте заменить на запрос к API
const mockParticipants = [
  {
    id: 1,
    full_name: 'Иванов Иван Иванович',
    phone: '+7(914)123-45-67',
    total_hours: 24,
    events: [
      { name: 'Студенческая весна', start_date: '12.03.2025', has_hours: true },
      { name: 'Форум молодёжи', start_date: '01.04.2025', has_hours: false },
    ],
  },
  {
    id: 2,
    full_name: 'Петрова Анна Сергеевна',
    phone: '+7(924)987-65-43',
    total_hours: 16,
    events: [
      { name: 'Научная конференция', start_date: '20.02.2025', has_hours: true },
      { name: 'Студенческая весна', start_date: '12.03.2025', has_hours: false },
    ],
  },
  {
    id: 3,
    full_name: 'Сидоров Алексей Петрович',
    phone: '+7(902)345-67-89',
    total_hours: 8,
    events: [
      { name: 'Форум молодёжи', start_date: '01.04.2025', has_hours: true },
      { name: 'Олимпиада ДВФУ', start_date: '15.05.2025', has_hours: false },
    ],
  },
];

function formatDateInput(value) {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  const day = digits.slice(0, 2);
  const month = digits.slice(2, 4);
  const year = digits.slice(4, 8);
  return [day, month, year].filter(Boolean).join('.');
}

export function ParticipantsSummaryPage() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [level, setLevel] = useState('Все уровни');
  const [searched, setSearched] = useState(false);
  const [results, setResults] = useState([]);

  // Собираем уникальные названия мероприятий из результатов
  const eventColumns = useMemo(() => {
    const seen = new Set();
    const cols = [];
    results.forEach((p) => {
      p.events.forEach((e) => {
        const key = `${e.name}|||${e.start_date}`;
        if (!seen.has(key)) {
          seen.add(key);
          cols.push({ name: e.name, start_date: e.start_date });
        }
      });
    });
    return cols;
  }, [results]);

  function handleSearch() {
    // В реальном проекте — запрос к API с параметрами dateFrom, dateTo, level
    setResults(mockParticipants);
    setSearched(true);
  }

  function getEventHoursForParticipant(participant, eventCol) {
    const event = participant.events.find(
      (e) => e.name === eventCol.name && e.start_date === eventCol.start_date,
    );
    return event || null;
  }

  const uniqueEventsCount = eventColumns.length;

  return (
    <div className="summary-page">
      {/* Header */}
      <header className="summary-page__header">
        <div className="summary-page__header-inner">
          <div className="summary-page__logo">
            <div className="summary-page__logo-emblem">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 8h20v2H6zM6 13h14v2H6zM6 18h20v2H6zM6 23h14v2H6z" fill="white" opacity="0.9"/>
                <rect x="2" y="2" width="28" height="28" rx="4" stroke="white" strokeWidth="1.5" fill="none" opacity="0.4"/>
              </svg>
            </div>
            <div className="summary-page__logo-text">
              <span className="summary-page__logo-title">ДВФУ</span>
              <span className="summary-page__logo-subtitle">Дальневосточный федеральный университет</span>
            </div>
          </div>
          <nav className="summary-page__nav">
            <a className="summary-page__nav-link" href="#">Главная</a>
            <a className="summary-page__nav-link summary-page__nav-link--active" href="#">Участники</a>
            <a className="summary-page__nav-link" href="#">Мероприятия</a>
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="summary-page__main">
        <div className="summary-page__container">

          <h1 className="summary-page__title">Сводная таблица по участникам</h1>

          {/* Filters */}
          <div className="summary-page__filters">
            <div className="summary-page__filter-row">
              <div className="summary-page__filter-group">
                <span className="summary-page__filter-label">Искать с</span>
                <input
                  className="summary-page__date-input"
                  type="text"
                  inputMode="numeric"
                  placeholder="00.00.0000"
                  value={dateFrom}
                  maxLength={10}
                  onChange={(e) => setDateFrom(formatDateInput(e.target.value))}
                />
                <span className="summary-page__filter-label summary-page__filter-label--by">по</span>
                <input
                  className="summary-page__date-input"
                  type="text"
                  inputMode="numeric"
                  placeholder="00.00.0000"
                  value={dateTo}
                  maxLength={10}
                  onChange={(e) => setDateTo(formatDateInput(e.target.value))}
                />
              </div>

              <div className="summary-page__filter-group">
                <select
                  className="summary-page__select"
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                >
                  {levelOptions.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="summary-page__filter-actions">
              <button className="summary-page__search-btn" type="button" onClick={handleSearch}>
                Поиск
              </button>
            </div>
          </div>

          {/* Stats */}
          {searched && (
            <div className="summary-page__stats">
              <span className="summary-page__stat">
                Участников найдено:&nbsp;<strong>{results.length}</strong>
              </span>
              <span className="summary-page__stat">
                Мероприятий найдено:&nbsp;<strong>{uniqueEventsCount}</strong>
              </span>
            </div>
          )}

          {/* Table */}
          <div className="summary-page__table-wrapper">
            {searched && results.length > 0 ? (
              <table className="summary-page__table">
                <thead>
                  <tr>
                    <th className="summary-page__th summary-page__th--fixed" rowSpan={2}>ФИО</th>
                    <th className="summary-page__th summary-page__th--fixed" rowSpan={2}>Номер телефона</th>
                    <th className="summary-page__th summary-page__th--fixed" rowSpan={2}>Общее число рабочих часов</th>
                    {eventColumns.map((col) => (
                      <th key={`${col.name}-${col.start_date}`} className="summary-page__th summary-page__th--event">
                        {col.name}
                      </th>
                    ))}
                  </tr>
                  <tr>
                    {eventColumns.map((col) => (
                      <th key={`date-${col.name}-${col.start_date}`} className="summary-page__th summary-page__th--date">
                        {col.start_date}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {results.map((participant) => (
                    <tr key={participant.id} className="summary-page__tr">
                      <td className="summary-page__td">{participant.full_name}</td>
                      <td className="summary-page__td">{participant.phone}</td>
                      <td className="summary-page__td summary-page__td--center">{participant.total_hours}</td>
                      {eventColumns.map((col) => {
                        const event = getEventHoursForParticipant(participant, col);
                        return (
                          <td
                            key={`${participant.id}-${col.name}-${col.start_date}`}
                            className={`summary-page__td summary-page__td--center ${event?.has_hours ? 'summary-page__td--highlight' : ''}`}
                          >
                            {event ? (
                              event.has_hours
                                ? <span className="summary-page__event-label">Сумма за все дни этого мероприятия</span>
                                : <span className="summary-page__event-none">Если нет, то без окраски</span>
                            ) : '—'}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : searched ? (
              <div className="summary-page__empty">Участники не найдены</div>
            ) : (
              <div className="summary-page__placeholder">
                Задайте параметры поиска и нажмите «Поиск»
              </div>
            )}
          </div>

        </div>
      </main>

      {/* Footer action */}
      <div className="summary-page__footer-action">
        <a className="summary-page__footer-btn" href="#register">
          Зарегистрировать участника
        </a>
      </div>
    </div>
  );
}
