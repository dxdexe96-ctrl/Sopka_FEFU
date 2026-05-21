import { useEffect, useState } from 'react';
import { PageHeader } from '../components/ui/PageHeader.jsx';
import { getStudentEventsReport } from '../lib/api.js';
import './StudentEventsPage.css';

const emptyReport = {
  full_name: '',
  phone: '',
  total_hours: 0,
  total_events: 0,
  events: [],
};

function formatPhone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) {
    return 'Не указан';
  }
  if (digits.length === 11 && digits.startsWith('7')) {
    return `+7 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9, 11)}`;
  }
  return digits;
}

function formatHours(value) {
  const number = Number(value || 0);
  return number > 0 ? number.toLocaleString('ru-RU', { maximumFractionDigits: 2 }) : '—';
}

function formatDate(value) {
  if (!value) {
    return '';
  }
  return new Date(`${String(value).slice(0, 10)}T12:00:00`).toLocaleDateString('ru-RU');
}

function getEventRoleLabel(role) {
  const roleMap = {
    participant: 'Участник',
    volunteer: 'Волонтёр',
    organizer: 'Организатор',
    speaker: 'Спикер',
    expert: 'Эксперт',
    guest: 'Гость',
  };
  return roleMap[role] || role || '—';
}

function getEventLevelLabel(level) {
  const levelMap = {
    international: 'Международный',
    national: 'Всероссийский',
    regional: 'Региональный',
    city: 'Городской',
    university: 'Университетский',
    institute: 'Институтский',
  };
  return levelMap[level] || level || '—';
}

function getEventTypeLabel(type) {
  const typeMap = {
    conference: 'Конференция',
    hackathon: 'Хакатон',
    seminar: 'Семинар',
    workshop: 'Воркшоп',
    lecture: 'Лекция',
    competition: 'Соревнование',
    other: 'Другое',
  };
  return typeMap[type] || type || '—';
}

export function StudentEventsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [appliedSearchQuery, setAppliedSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
  });
  const [appliedFilters, setAppliedFilters] = useState(filters);
  const [report, setReport] = useState(emptyReport);
  const [status, setStatus] = useState({ type: 'idle', message: '' });

  // Загрузка данных при изменении поискового запроса или фильтров
  useEffect(() => {
    if (!appliedSearchQuery.trim()) {
      setReport(emptyReport);
      setStatus({ type: 'idle', message: '' });
      return;
    }

    let isMounted = true;
    setStatus({ type: 'loading', message: 'Поиск участника...' });

    getStudentEventsReport({
      search: appliedSearchQuery,
      dateFrom: appliedFilters.dateFrom,
      dateTo: appliedFilters.dateTo,
    })
      .then((data) => {
        if (!isMounted) return;
        if (!data || !data.full_name) {
          setReport(emptyReport);
          setStatus({ type: 'error', message: 'Участник не найден. Проверьте ФИО или номер телефона.' });
        } else {
          setReport(data);
          setStatus({ type: 'idle', message: '' });
        }
      })
      .catch((error) => {
        if (!isMounted) return;
        setReport(emptyReport);
        setStatus({
          type: 'error',
          message: error instanceof Error ? error.message : 'Не удалось загрузить данные участника.',
        });
      });

    return () => {
      isMounted = false;
    };
  }, [appliedSearchQuery, appliedFilters]);

  // Debounce для поиска
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setAppliedSearchQuery(searchQuery);
    }, 500);

    return () => window.clearTimeout(timeoutId);
  }, [searchQuery]);

  // Debounce для дат
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setAppliedFilters(filters);
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [filters]);

  function updateFilter(name, value) {
    setFilters((current) => ({ ...current, [name]: value }));
  }

  function resetFilters() {
    setSearchQuery('');
    setAppliedSearchQuery('');
    setFilters({
      dateFrom: '',
      dateTo: '',
    });
    setAppliedFilters({
      dateFrom: '',
      dateTo: '',
    });
    setReport(emptyReport);
    setStatus({ type: 'idle', message: '' });
  }

  function handleSearch() {
    setAppliedSearchQuery(searchQuery);
    setAppliedFilters(filters);
  }

  const hasEvents = report.events && report.events.length > 0;
  const hasData = report.full_name && report.full_name.trim() !== '';

  return (
    <div className="student-events-page">
      <PageHeader title="Участие студента в мероприятиях" />

      <div className="student-events-page__filters">
        <div className="student-events-page__filters-row">
          <div className="student-events-page__filter-group student-events-page__filter-group--search">
            <input
              type="text"
              className="student-events-page__filter-input student-events-page__filter-input--search"
              placeholder="Поиск по ФИО или номеру телефона"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <button className="student-events-page__search-btn" onClick={handleSearch}>
            Поиск
          </button>
          <button className="student-events-page__reset-btn" onClick={resetFilters}>
            Сбросить
          </button>
        </div>

        <div className="student-events-page__filters-row">
          <div className="student-events-page__filter-group">
            <label className="student-events-page__filter-label">Искать мероприятия с</label>
            <input
              type="date"
              className="student-events-page__filter-input"
              value={filters.dateFrom}
              onChange={(e) => updateFilter('dateFrom', e.target.value)}
            />
          </div>
          <div className="student-events-page__filter-group">
            <label className="student-events-page__filter-label">по</label>
            <input
              type="date"
              className="student-events-page__filter-input"
              value={filters.dateTo}
              onChange={(e) => updateFilter('dateTo', e.target.value)}
            />
          </div>
        </div>
      </div>

      {status.message ? (
        <p className={`student-events-page__status student-events-page__status--${status.type}`}>
          {status.message}
        </p>
      ) : null}

      {hasData && (
        <>
          <div className="student-events-page__info-cards">
            <div className="student-events-page__info-card">
              <div className="student-events-page__info-label">
                {report.full_name}
                <span className="student-events-page__info-phone"> | {formatPhone(report.phone)}</span>
              </div>
              <div className="student-events-page__info-title">Фамилия Имя Отчество | Номер телефона</div>
            </div>
            <div className="student-events-page__info-card">
              <div className="student-events-page__info-label">{formatHours(report.total_hours)}</div>
              <div className="student-events-page__info-title">Общее число рабочих часов</div>
            </div>
            <div className="student-events-page__info-card">
              <div className="student-events-page__info-label">{report.total_events || 0}</div>
              <div className="student-events-page__info-title">Общее число посещенных мероприятий</div>
            </div>
          </div>

          {!hasEvents ? (
            <p className="student-events-page__empty">
              По выбранным условиям мероприятия не найдены.
            </p>
          ) : (
            <div className="student-events-page__table-frame">
              <table className="student-events-page__table">
                <thead>
                  <tr>
                    <th>Наименование мероприятия</th>
                    <th>Дата мероприятия</th>
                    <th>Роль на мероприятии</th>
                    <th>Количество часов</th>
                    <th>Уровень мероприятия</th>
                    <th>Тип мероприятия</th>
                  </tr>
                </thead>
                <tbody>
                  {report.events.map((event, index) => (
                    <tr key={event.event_id || index}>
                      <td className="student-events-page__event-name-cell">{event.event_name || '—'}</td>
                      <td>{formatDate(event.event_date)}</td>
                      <td>{getEventRoleLabel(event.role)}</td>
                      <td className="student-events-page__hours-cell">{formatHours(event.hours)}</td>
                      <td>{getEventLevelLabel(event.event_level)}</td>
                      <td>{getEventTypeLabel(event.event_type)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <div className="student-events-page__back-link">
        <a href="#home" className="student-events-page__back-link-btn">
          ← Вернуться к списку участников
        </a>
      </div>
    </div>
  );
}