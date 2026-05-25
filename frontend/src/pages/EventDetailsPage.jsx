// frontend/src/pages/EventDetailsPage.jsx
import { useState, useEffect } from 'react';
import { getEvent, listEventParticipants, updateEventParticipant, listStudents } from '../lib/api';
import './EventDetailsPage.css';
import GanttChart from '../components/GanttChart';

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

      console.log('=== participantsData ===', participantsData);
      console.log('=== первый участник ===', participantsData[0]);

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

  const handleCheckParticipant = async (participantId, checked) => {
    try {
      await updateEventParticipant(eventId, participantId, {
        is_confirmed: checked
      });

      const updateList = (list) =>
        list.map(p =>
          p.participation_id === participantId
            ? { ...p, is_confirmed: checked }
            : p
        );

      setOrganizers(updateList(organizers));
      setExecutors(updateList(executors));
      setVolunteers(updateList(volunteers));
      setParticipants(updateList(participants));
    } catch (err) {
      console.error('Ошибка:', err);
    }
  };

  // ========== ФУНКЦИИ ДЛЯ ДИАГРАММЫ ГАНТА ==========

  const addToGantt = (participantId) => {
    if (!selectedParticipants.includes(participantId)) {
      setSelectedParticipants([...selectedParticipants, participantId]);
      setShowGantt(true);
    }
  };

  const removeFromGantt = (participantId) => {
    setSelectedParticipants(selectedParticipants.filter(id => id !== participantId));
    if (selectedParticipants.length === 1) {
      setShowGantt(false);
    }
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
  if (!event?.start_date) return [];

  const startDate = new Date(event.start_date);
  let endDate = new Date(event.end_date || event.start_date);

  if (startDate.getTime() === endDate.getTime()) {
    endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 1);
  }

  const allParticipants = [...organizers, ...executors, ...volunteers, ...participants];
  const selected = allParticipants.filter(p => selectedParticipants.includes(p.participation_id));

  return selected.map(participant => ({
    id: `bg_${participant.participation_id}`,
    content: '',
    start: startDate,
    end: endDate,
    group: String(participant.participation_id),
    type: 'background',
    style: 'background-color:  rgba(0, 91, 170, 0.15); border-radius: 4px;'
  }));
};

  const buildGanttItems = () => {
  const items = [];
  const allParticipants = [...organizers, ...executors, ...volunteers, ...participants];
  const selected = allParticipants.filter(p => selectedParticipants.includes(p.participation_id));

  selected.forEach((participant) => {
    const student = studentsCache.find(s => s.student_id === participant.student_id);
    const fullName = getFullName(student);
    const role = participant.role_name || '';

    const intervals = participant.intervals || participant.timeSlots || [];

    if (intervals.length === 0) {
      if (event?.start_date) {
        const startDate = new Date(event.start_date);
        let endDate = new Date(event.end_date || event.start_date);

        if (startDate.getTime() === endDate.getTime()) {
          endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + 1);
        }

        items.push({
          id: String(participant.participation_id),
          content: ``,
          start: startDate,
          end: endDate,
          group: String(participant.participation_id),
          style: 'background-color: #005BAA; color: white; border-radius: 0px;height: 10px;'
        });
      }
    } else {
      intervals.forEach((interval, idx) => {
        let startDate = new Date(interval.start || interval.start_date);
        let endDate = new Date(interval.end || interval.end_date);

        if (isNaN(startDate.getTime()) || startDate.getFullYear() < 2000) {
          const eventDate = new Date(event.start_date);
          const startTime = interval.start?.split(':') || ['10', '00'];
          const endTime = interval.end?.split(':') || ['18', '00'];

          startDate = new Date(
            eventDate.getFullYear(),
            eventDate.getMonth(),
            eventDate.getDate(),
            parseInt(startTime[0]),
            parseInt(startTime[1])
          );
          endDate = new Date(
            eventDate.getFullYear(),
            eventDate.getMonth(),
            eventDate.getDate(),
            parseInt(endTime[0]),
            parseInt(endTime[1])
          );
        }

        items.push({
          id: `${participant.participation_id}_${idx}`,
          content: ``,
          start: startDate,
          end: endDate,
          group: String(participant.participation_id),
          style: 'background-color: #005BAA; border-radius: 0px; height: 24px;'
        });
      });
    }
  });

  return items;
};

  const getGanttGroups = () => {
  const allParticipants = [...organizers, ...executors, ...volunteers, ...participants];
  const selected = allParticipants.filter(p => selectedParticipants.includes(p.participation_id));

  // Создаём группу для КАЖДОГО выбранного участника
  return selected.map(participant => {
    const student = studentsCache.find(s => s.student_id === participant.student_id);
    const fullName = getFullName(student);
    const role = participant.role_name || 'Участник';

    return {
      id: String(participant.participation_id),
      content: `${fullName} (${role})`
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

  return (
    <div className="event-details-page">
      <div className="event-details__container">
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
                            <span>{item.hours || item.duration_hours || 6} ч.</span>
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

        {showGantt && selectedParticipants.length > 0 && (
          <div style={{ marginTop: '30px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ color: '#005BAA', fontSize: '18px', margin: 0 }}>
                Диаграмма Ганта ({selectedParticipants.length} участников)
              </h3>
              <button
                onClick={() => {
                  setSelectedParticipants([]);
                  setShowGantt(false);
                }}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#e74c3c',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                Очистить все
              </button>
            </div>
            <GanttChart
  items={buildGanttItems()}
  groups={getGanttGroups()}
  startDate={event.start_date}
  endDate={event.end_date || event.start_date}
  eventItems={buildEventBackground()}
/>
          </div>
        )}
      </div>
    </div>
  );
};

export default EventDetailsPage;