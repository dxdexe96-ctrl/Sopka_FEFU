-- Расписание мероприятия по дням (время начала/окончания для каждой даты)
begin;

alter table events
    add column if not exists event_daily_schedule jsonb;

comment on column events.event_daily_schedule is
    'Массив объектов {"date":"YYYY-MM-DD","start_time":"HH:MM","end_time":"HH:MM"} — время проведения в каждый день.';

commit;
