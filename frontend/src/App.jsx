import { useEffect, useState } from 'react';
import { Header } from './components/layout/Header.jsx';
import { HomePage } from './pages/HomePage.jsx';
import { ParticipantEditPage } from './pages/ParticipantEditPage.jsx';
import { ParticipantImportPage } from './pages/ParticipantImportPage.jsx';
import { ParticipantRegistrationPage } from './pages/ParticipantRegistrationPage.jsx';
import { ParticipantsDatabasePage } from './pages/ParticipantsDatabasePage.jsx';
import { ParticipantsSummaryPage } from './pages/ParticipantsSummaryPage.jsx';
import { EventCreatePage } from './pages/EventCreatePage.jsx';
import { EventsListPage } from './pages/EventsListPage.jsx';
import { EventEditPage } from './pages/EventEditPage.jsx';
import './styles/app.css';

function parseHash() {
  const raw = (window.location.hash || '#').replace(/^#/, '');
  const pathPart = raw.split('?')[0] || 'home';
  const queryPart = raw.includes('?') ? raw.slice(raw.indexOf('?') + 1) : '';
  return { path: pathPart, params: new URLSearchParams(queryPart) };
}

function getRouteFromHash() {
  return parseHash().path;
}

/** ID участника для страницы редактирования (не путать с edit-event). */
function getParticipantEditId() {
  const { path, params } = parseHash();
  if (path === 'edit-event' || path.startsWith('edit-event')) {
    return null;
  }
  if (path.startsWith('edit-participant/')) {
    const id = path.slice('edit-participant/'.length).split('/')[0];
    return id || null;
  }
  if (path === 'edit-participant') {
    return params.get('id') || null;
  }
  if (path.startsWith('edit/')) {
    const id = path.slice('edit/'.length).split('/')[0];
    return id || null;
  }
  if (path === 'edit') {
    return params.get('id') || null;
  }
  return null;
}

export default function App() {
  const [route, setRoute] = useState(getRouteFromHash);

  useEffect(() => {
    function handleHashChange() {
      setRoute(getRouteFromHash());
    }

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const participantEditId = getParticipantEditId();
  const isEditParticipantPage = Boolean(participantEditId);
  const isEditEventPage = route === 'edit-event';

  const isWidePage =
    route === 'create' ||
    route === 'database' ||
    route === 'import' ||
    route === 'participants-summary' ||
    route === 'create-event' ||
    route === 'events-list' ||
    isEditEventPage ||
    isEditParticipantPage;

  return (
    <div className="app-shell">
      <Header />
      <main className={`app-content ${isWidePage ? 'app-content--wide' : ''}`}>
        {route === 'create' ? <ParticipantRegistrationPage /> : null}
        {route === 'import' ? <ParticipantImportPage /> : null}
        {route === 'database' ? <ParticipantsDatabasePage /> : null}
        {route === 'participants-summary' ? <ParticipantsSummaryPage /> : null}
        {isEditParticipantPage ? <ParticipantEditPage studentId={participantEditId} /> : null}

        {route === 'events-list' ? <EventsListPage /> : null}
        {route === 'create-event' ? <EventCreatePage /> : null}
        {isEditEventPage ? <EventEditPage /> : null}

        {route !== 'create' &&
        route !== 'import' &&
        route !== 'database' &&
        route !== 'participants-summary' &&
        route !== 'create-event' &&
        route !== 'events-list' &&
        route !== 'edit-event' &&
        !isEditParticipantPage ? (
          <HomePage />
        ) : null}
      </main>
    </div>
  );
}
