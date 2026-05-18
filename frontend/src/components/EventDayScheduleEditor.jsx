import { formatRuDateShort } from '../lib/eventScheduleUtils.js';

export function EventDayScheduleEditor({ rows, onRowsChange }) {
  function updateRow(index, field, value) {
    const next = rows.map((row, i) => (i === index ? { ...row, [field]: value } : row));
    onRowsChange(next);
  }

  if (!rows.length) {
    return (
      <div className="events-form__field" style={{ gridColumn: '1 / -1' }}>
        <p className="event-schedule-hint">Укажите дату начала (и при необходимости дату окончания), чтобы задать время для каждого дня.</p>
      </div>
    );
  }

  return (
    <div className="event-daily-schedule" style={{ gridColumn: '1 / -1' }}>
      <h3 className="event-daily-schedule__title">Время проведения по дням</h3>
      <p className="event-schedule-hint">Для каждого дня укажите время начала и окончания (например, 1-й день 9:00–17:00, 2-й день 11:00–15:00).</p>
      <div className="event-daily-schedule__table">
        {rows.map((row, index) => (
          <div key={row.date} className="event-daily-schedule__row">
            <span className="event-daily-schedule__date">{formatRuDateShort(row.date)}</span>
            <span className="event-daily-schedule__weekday">
              {new Date(`${row.date}T12:00:00`).toLocaleDateString('ru-RU', { weekday: 'short' })}
            </span>
            <input
              type="time"
              className="events-form__control event-daily-schedule__time"
              step={300}
              value={row.start}
              onChange={(e) => updateRow(index, 'start', e.target.value)}
            />
            <span className="event-daily-schedule__dash">—</span>
            <input
              type="time"
              className="events-form__control event-daily-schedule__time"
              step={300}
              value={row.end}
              onChange={(e) => updateRow(index, 'end', e.target.value)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
