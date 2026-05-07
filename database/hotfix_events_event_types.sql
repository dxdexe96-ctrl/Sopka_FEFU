begin;

create table if not exists event_types (
    event_type_id bigserial primary key,
    event_type_name varchar(255) not null,
    description text,
    is_active boolean not null default true,
    created_at timestamp not null default now(),
    constraint uq_event_types_name unique (event_type_name),
    constraint ck_event_types_name_not_blank check (btrim(event_type_name) <> '')
);

alter table events
    add column if not exists event_type_id bigint;

alter table events
    add column if not exists event_comment text;

alter table events
    drop column if exists organization_id;

do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conname = 'fk_events_event_type'
          and conrelid = 'events'::regclass
    ) then
        alter table events
            add constraint fk_events_event_type
            foreign key (event_type_id)
            references event_types(event_type_id)
            on delete restrict;
    end if;
end $$;

create index if not exists ix_events_event_type
    on events(event_type_id);

commit;
