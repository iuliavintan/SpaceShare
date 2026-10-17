import { HomePage } from '../pages/HomePage';
import { useEffect, useState } from 'react';
import { AuthProvider } from '../features/auth/AuthProvider';
import { AuthPage } from '../pages/AuthPage';
import { ProfilePage } from '../pages/ProfilePage';
import { RequireAccess } from '../components/RequireAccess';
import { ResourcesPage } from '../pages/ResourcesPage';
import { ResourceDetailPage } from '../pages/ResourceDetailPage';
import { NewResourcePage } from '../pages/NewResourcePage';

function Pages() {
  const [path, setPath] = useState(window.location.hash);
  useEffect(() => {
    const navigate = () => {
      setPath(window.location.hash);
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', navigate);
    return () => window.removeEventListener('hashchange', navigate);
  }, []);
  if (path === '#/login') return <AuthPage key="login" mode="login" />;
  if (path === '#/register') return <AuthPage key="register" mode="register" />;
  if (path === '#/profile') return <ProfilePage />;
  if (path === '#/resources') return <RequireAccess><ResourcesPage key="catalog" /></RequireAccess>;
  if (path === '#/admin/resources') return <RequireAccess admin><ResourcesPage key="admin-catalog" manage /></RequireAccess>;
  if (path === '#/admin/resources/new') return <RequireAccess admin><NewResourcePage /></RequireAccess>;
  const resourcePath = /^#\/(admin\/)?resources\/([^/]+)$/.exec(path);
  if (resourcePath) {
    let id: string;
    try { id = decodeURIComponent(resourcePath[2]!); } catch { return <HomePage />; }
    const manage = !!resourcePath[1];
    return <RequireAccess admin={manage}><ResourceDetailPage key={path} id={id} manage={manage} /></RequireAccess>;
  }
  return <HomePage />;
}

export function App() {
  return <AuthProvider><Pages /></AuthProvider>;
}
