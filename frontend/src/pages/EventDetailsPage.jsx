import { useState, useEffect } from 'react';
import { getEvent, listEventParticipants, listStudents } from '../lib/api';
import './EventDetailsPage.css';
import GanttChart from '../components/GanttChart';

function parseDateTime(dateValue, timeValue) {
  const dateStr = String(dateValue || '').slice(0, 10);
  const timeStr = String(timeValue || '00:00:00').slice(0, 8);
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hour, minute, second] = timeStr.split(':').map(Number);
  if (!year || !month || !day) {
    return null;
  }
  return new Date(year, month - 1, day, hour || 0, minute || 0, second || 0);
}

function getAllParticipants(organizers, executors, volunteers, participants) {
  return [...organizers, ...executors, ...volunteers, ...participants];
}

function sumParticipationHours(participant) {
  const slots = participant.time_slots || [];
  if (slots.length > 0) {
    return slots.reduce((sum, slot) => sum + Number(slot.participation_hours || 0), 0);
  }
  return Number(participant.hours || participant.duration_hours || 0);
}

function computeGanttRange(event, items) {
  let start = parseDateTime(event?.start_date, '00:00:00');
  let end = parseDateTime(event?.end_date || event?.start_date, '23:59:59');

  items.forEach((item) => {
    if (item.start && (!start || item.start < start)) {
      start = new Date(item.start);
    }
    if (item.end && (!end || item.end > end)) {
      end = new Date(item.end);
    }
  });

  if (!start || !end) {
    const now = new Date();
    return { start: now, end: new Date(now.getTime() + 24 * 60 * 60 * 1000) };
  }

  if (end <= start) {
    end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  }

  return { start, end };
}

const EventDetailsPage = ({ eventId }) => {
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [organizers, setOrganizers] = useState([]);
  const [executors, setExecutors] = useState([]);
  const [volunteers, setVolunteers] = useState([]);
  const [studentsCache, setStudentsCache] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [expandedSections, setExpandedSections] = useState({
    organizers: true,
    executors: true,
    volunteers: false,
    participants: false
  });

  // Состояния для диаграммы Ганта
  const [selectedParticipants, setSelectedParticipants] = useState([]);
  const [showGantt, setShowGantt] = useState(false);

  useEffect(() => {
    if (eventId) {
      loadData();
    }
  }, [eventId]);

  useEffect(() => {
    async function loadStudents() {
      try {
        const data = await listStudents({ limit: 200, isActive: true });
        setStudentsCache(data);
      } catch (err) {
        console.error('Не удалось загрузить студентов:', err);
      }
    }
    loadStudents();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [eventData, participantsData] = await Promise.all([
        getEvent(eventId),
        listEventParticipants(eventId)
      ]);

      setEvent(eventData);

      const orgs = participantsData.filter(p =>
        p.role_name?.toLowerCase() === 'организатор' ||
        p.role_name?.toLowerCase() === 'organizer'
      );
      const execs = participantsData.filter(p =>
        p.role_name?.toLowerCase() === 'исполнитель' ||
        p.role_name?.toLowerCase() === 'executor'
      );
      const vols = participantsData.filter(p =>
        p.role_name?.toLowerCase() === 'волонтер' ||
        p.role_name?.toLowerCase() === 'volunteer'
      );
      const parts = participantsData.filter(p =>
        p.role_name?.toLowerCase() === 'участник' ||
        p.role_name?.toLowerCase() === 'participant'
      );

      setOrganizers(orgs);
      setExecutors(execs);
      setVolunteers(vols);
      setParticipants(parts);

      const allLoaded = getAllParticipants(orgs, execs, vols, parts);
      setSelectedParticipants(allLoaded.map((item) => item.participation_id));
      setShowGantt(allLoaded.length > 0);
    } catch (err) {
      console.error('Ошибка:', err);
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    window.location.hash = '#events-list';
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const addToGantt = (participantId) => {
    if (!selectedParticipants.includes(participantId)) {
      const next = [...selectedParticipants, participantId];
      setSelectedParticipants(next);
      setShowGantt(next.length > 0);
    }
  };

  const removeFromGantt = (participantId) => {
    const next = selectedParticipants.filter((id) => id !== participantId);
    setSelectedParticipants(next);
    setShowGantt(next.length > 0);
  };

  const addAllToGantt = () => {
    const all = getAllParticipants(organizers, executors, volunteers, participants);
    setSelectedParticipants(all.map((item) => item.participation_id));
    setShowGantt(all.length > 0);
  };

  const isInGantt = (participantId) => selectedParticipants.includes(participantId);

  const getFullName = (student) => {
    if (!student) return 'Участник';
    return `${student.last_name || ''} ${student.first_name || ''} ${student.middle_name || ''}`.trim() || 'Участник';
  };
const formatPhone = (phone) => {
  if (!phone) return '+7(000)000-00-00';
  const str = String(phone).replace(/\D/g, '');
  if (str.length === 11) {
    return `+7(${str.slice(1, 4)})${str.slice(4, 7)}-${str.slice(7, 9)}-${str.slice(9, 11)}`;
  }
  if (str.length === 10) {
    return `+7(${str.slice(0, 3)})${str.slice(3, 6)}-${str.slice(6, 8)}-${str.slice(8, 10)}`;
  }
  return '+7(000)000-00-00';
};

  const buildEventBackground = () => {
    if (!event?.start_date) {
      return [];
    }

    const allParticipants = getAllParticipants(organizers, executors, volunteers, participants);
    const selected = allParticipants.filter((item) => selectedParticipants.includes(item.participation_id));

    return selected.map((participant) => {
      const slots = participant.time_slots || [];
      let start = parseDateTime(event.start_date, event.start_time || '00:00:00');
      let end = parseDateTime(event.end_date || event.start_date, event.end_time || '23:59:59');

      if (slots.length > 0) {
        const slotStarts = slots.map((slot) => parseDateTime(slot.participation_date, slot.start_time)).filter(Boolean);
        const slotEnds = slots.map((slot) => parseDateTime(slot.participation_date, slot.end_time)).filter(Boolean);
        if (slotStarts.length && slotEnds.length) {
          start = new Date(Math.min(...slotStarts.map((value) => value.getTime())));
          end = new Date(Math.max(...slotEnds.map((value) => value.getTime())));
        }
      }

      if (!start || !end || end <= start) {
        start = parseDateTime(event.start_date, '00:00:00');
        end = parseDateTime(event.end_date || event.start_date, '23:59:59');
        if (!end || end <= start) {
          end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
        }
      }

      return {
        id: `bg_${participant.participation_id}`,
        content: '',
        start,
        end,
        group: String(participant.participation_id),
        type: 'background',
        style: 'background-color: rgba(0, 91, 170, 0.12); border-radius: 4px;',
      };
    });
  };

  const buildGanttItems = () => {
    const items = [];
    const allParticipants = getAllParticipants(organizers, executors, volunteers, participants);
    const selected = allParticipants.filter((item) => selectedParticipants.includes(item.participation_id));

    selected.forEach((participant) => {
      const slots = participant.time_slots || [];

      if (slots.length === 0) {
        const start = parseDateTime(event.start_date, event.start_time || '09:00:00');
        let end = parseDateTime(event.end_date || event.start_date, event.end_time || '17:00:00');
        if (!start || !end || end <= start) {
          end = new Date((start || new Date()).getTime() + 8 * 60 * 60 * 1000);
        }
        items.push({
          id: String(participant.participation_id),
          content: '',
          start: start || new Date(),
          end,
          group: String(participant.participation_id),
          style: 'background-color: #005BAA; border-radius: 4px; height: 24px;',
        });
        return;
      }

      slots.forEach((slot, index) => {
        const start = parseDateTime(slot.participation_date, slot.start_time);
        const end = parseDateTime(slot.participation_date, slot.end_time);
        if (!start || !end || end <= start) {
          return;
        }

        items.push({
          id: `${participant.participation_id}_${index}`,
          content: '',
          start,
          end,
          group: String(participant.participation_id),
          style: 'background-color: #005BAA; border-radius: 4px; height: 24px;',
        });
      });
    });

    return items;
  };

  const getGanttGroups = () => {
    const allParticipants = getAllParticipants(organizers, executors, volunteers, participants);
    const selected = allParticipants.filter((item) => selectedParticipants.includes(item.participation_id));

    return selected.map((participant) => {
      const student = studentsCache.find((item) => item.student_id === participant.student_id);
      const fullName = getFullName(student);
      const role = participant.role_name || 'Участник';

      return {
        id: String(participant.participation_id),
        content: `${fullName} (${role})`,
      };
    });
  };

  if (loading) {
    return (
      <div className="event-details-page">
        <div className="loading">Загрузка...</div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="event-details-page">
        <div className="loading">Мероприятие не найдено</div>
      </div>
    );
  }

  const sections = [
    { key: 'organizers', title: 'Организаторы', data: organizers, emptyText: 'Нет организаторов' },
    { key: 'executors', title: 'Исполнители', data: executors, emptyText: 'Нет исполнителей' },
    { key: 'volunteers', title: 'Волонтеры', data: volunteers, emptyText: 'Нет волонтеров' },
    { key: 'participants', title: 'Участники', data: participants, emptyText: 'Нет участников' }
  ];

  const totalParticipants =
    organizers.length + executors.length + volunteers.length + participants.length;
  const ganttItems = buildGanttItems();
  const ganttGroups = getGanttGroups();
  const ganttBackground = buildEventBackground();
  const ganttRange = computeGanttRange(event, [...ganttItems, ...ganttBackground]);

  return (
    <div className="event-details-page">
      <div className={`event-details__container${showGantt ? ' event-details__container--wide' : ''}`}>
        <button type="button" className="back-link" onClick={goBack}>
          ← Вернуться к списку мероприятий
        </button>

        <div className="event-info-block">
          <h1 className="event-info-block__title">Информация о мероприятии</h1>
          <div className="event-info-block__row">
            <div className="event-info-block__label">Название</div>
            <div className="event-info-block__value">{event.event_name}</div>
          </div>
          <div className="event-info-block__row">
            <div className="event-info-block__label">Уровень</div>
            <div className="event-info-block__value">{event.event_level || 'Не указан'}</div>
          </div>
          <div className="event-info-block__row">
            <div className="event-info-block__label">Тип</div>
            <div className="event-info-block__value">{event.event_type?.event_type_name || 'Тип не указан'}</div>
          </div>
          <div className="event-info-block__row">
            <div className="event-info-block__label">Дата начала</div>
            <div className="event-info-block__value">{event.start_date ? new Date(event.start_date).toLocaleDateString('ru-RU') : '—'}</div>
          </div>
          <div className="event-info-block__row">
            <div className="event-info-block__label">Количество участников</div>
            <div className="event-info-block__value">{organizers.length + executors.length + volunteers.length + participants.length}</div>
          </div>
        </div>

        <div className="participants-block">
          <h2 className="participants-block__title">Участники</h2>
          <p className="participants-block__hint">
            Кнопками + и − выберите, кого показать на диаграмме Ганта ниже.
          </p>
          {sections.map((section) => (
            <div key={section.key} className="participant-group">
              <div className="participant-group__header" onClick={() => toggleSection(section.key)}>
                <div className="participant-group__title-wrapper">
                  <h3 className="participant-group__title">{section.title}</h3>
                  <span className="participant-group__count">{section.data.length} чел.</span>
                </div>
                <button type="button" className="participant-group__toggle">
                  <svg className={`toggle-icon ${expandedSections[section.key] ? 'expanded' : ''}`} viewBox="0 0 24 24" width="20" height="20" fill="none">
                    <path d="M6 9L12 15L18 9" stroke="#005BAA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
              {expandedSections[section.key] && (
                <div className="participant-group__content">
                  {section.data.length === 0 ? (
                    <div className="participant-group__empty">{section.emptyText}</div>
                  ) : (
                    section.data.map((item) => {
                      const student = studentsCache.find(s => s.student_id === item.student_id);
                      const fullName = student ? `${student.last_name} ${student.first_name} ${student.middle_name || ''}`.trim() : 'Фамилия Имя Отчество';
                      const phone = student?.phone ? formatPhone(student.phone) : '+7(000)000-00-00';
                      const isSelected = isInGantt(item.participation_id);

                      return (
                        <div key={item.participation_id} className="participant-item">
                          <div className="participant-item__fio">{fullName}</div>
                          <div className="participant-item__hours-block">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#005BAA" strokeWidth="2">
                              <circle cx="12" cy="12" r="10" />
                              <polyline points="12 6 12 12 16 14" />
                            </svg>
                            <span>{sumParticipationHours(item) || 0} ч.</span>
                          </div>
                          <div className="participant-item__phone">{phone}</div>

                          {!isSelected ? (
                            <button
                              type="button"
                              className="participant-item__plus-btn"
                              onClick={() => addToGantt(item.participation_id)}
                              title="Добавить в диаграмму"
                            >
                              <div className="participant-item__plus-horizontal" />
                              <div className="participant-item__plus-vertical" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="participant-item__minus-btn"
                              onClick={() => removeFromGantt(item.participation_id)}
                              title="Убрать из диаграммы"
                            >
                              <div className="participant-item__minus-horizontal" />
                            </button>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="gantt-block">
          <div className="gantt-block__header">
            <h2 className="gantt-block__title">
              Диаграмма Ганта ({selectedParticipants.length} из {totalParticipants})
            </h2>
            <div className="gantt-block__actions">
              <button type="button" className="gantt-block__btn gantt-block__btn--secondary" onClick={addAllToGantt}>
                Показать всех
              </button>
              <button
                type="button"
                className="gantt-block__btn gantt-block__btn--danger"
                onClick={() => {
                  setSelectedParticipants([]);
                  setShowGantt(false);
                }}
              >
                Очистить
              </button>
            </div>
          </div>

          {showGantt && selectedParticipants.length > 0 && ganttItems.length > 0 ? (
            <GanttChart
              items={ganttItems}
              groups={ganttGroups}
              startDate={ganttRange.start}
              endDate={ganttRange.end}
              eventItems={ganttBackground}
            />
          ) : (
            <p className="gantt-block__empty">
              {totalParticipants === 0
                ? 'Добавьте участников к мероприятию, чтобы построить диаграмму.'
                : 'Выберите участников кнопкой + в списке выше или нажмите «Показать всех».'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventDetailsPage;