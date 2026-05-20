import { ActionPanel } from '../components/features/ActionPanel.jsx';

const actions = [
  { id: 'create', label: 'Добавить участника вручную', href: '#create' },
  { id: 'import', label: 'Загрузить участников из файла', href: '#import' },
  { id: 'database', label: 'Просмотреть список участников', href: '#database' },
];

const eventActions = [
  { id: 'create-event', label: 'Создать мероприятие', href: '#create-event' },
  { id: 'events-list', label: 'Посмотреть список мероприятий', href: '#events-list' },
];

const reportActions = [
  { id: 'participants-summary', label: 'Сводная таблица по участникам', href: '#participants-summary' },
];

export function HomePage() {
  return (
    <div className="home-page">
      <ActionPanel title="Работа с участниками СОПКи" actions={actions} />
      <ActionPanel title="Работа с мероприятиями" actions={eventActions} />
      <ActionPanel title="Отчёты" actions={reportActions} />
    </div>
  );
}
