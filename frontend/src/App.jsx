import { useEffect, useState } from 'react';
import { Header } from './components/layout/Header.jsx';
import { HomePage } from './pages/HomePage.jsx';
import { ParticipantEditPage } from './pages/ParticipantEditPage.jsx';
import { ParticipantImportPage } from './pages/ParticipantImportPage.jsx';
import { ParticipantRegistrationPage } from './pages/ParticipantRegistrationPage.jsx';
import { ParticipantsDatabasePage } from './pages/ParticipantsDatabasePage.jsx';
import { EventCreatePage } from './pages/EventCreatePage.jsx';
import { EventsListPage } from './pages/EventsListPage.jsx';
import { EventEditPage } from './pages/EventEditPage.jsx'; // 1. Импортируем новую страницу
import './styles/app.css';

function getRouteFromHash() {
  // Убираем '#' и всё, что идет после знака '?', для чистого сравнения маршрута
  const route = window.location.hash.replace('#', '').split('?')[0];
  return route || 'home';
}

export default function App() {
  const [route, setRoute] = useState(getRouteFromHash);
  const [routeName, routeParam] = route.split('/');

  useEffect(() => {
    function handleHashChange() {
      setRoute(getRouteFromHash());
    }

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const isEditParticipantPage = routeName === 'edit' && routeParam;
  
  // 2. Проверка, является ли страница редактированием мероприятия
  const isEditEventPage = route === 'edit-event';

  const isWidePage = 
    route === 'create' || 
    route === 'database' || 
    route === 'import' || 
    route === 'create-event' || 
    route === 'events-list' || 
    isEditEventPage || // Добавили в список широких страниц
    isEditParticipantPage;

  return (
    <div className="app-shell">
      <Header />
      <main className={`app-content ${isWidePage ? 'app-content--wide' : ''}`}>
        {/* Страницы участников */}
        {route === 'create' ? <ParticipantRegistrationPage /> : null}
        {route === 'import' ? <ParticipantImportPage /> : null}
        {route === 'database' ? <ParticipantsDatabasePage /> : null}
        {isEditParticipantPage ? <ParticipantEditPage studentId={routeParam} /> : null}

        {/* Страницы мероприятий */}
        {route === 'events-list' ? <EventsListPage /> : null}
        {route === 'create-event' ? <EventCreatePage /> : null}
        {isEditEventPage ? <EventEditPage /> : null} {/* 3. Регистрация страницы редактирования */}

        {/* Главная страница: отображается, если маршрут не совпал с вышеуказанными */}
        {route !== 'create' && 
         route !== 'import' && 
         route !== 'database' && 
         route !== 'create-event' && 
         route !== 'events-list' && 
         route !== 'edit-event' && // Добавили исключение для главной
         !isEditParticipantPage ? <HomePage /> : null}
      </main>
    </div>
  );
}