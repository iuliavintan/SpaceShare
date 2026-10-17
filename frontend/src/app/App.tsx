import { HomePage } from '../pages/HomePage';
import { useEffect, useState } from 'react';
import { AuthProvider } from '../features/auth/AuthProvider';
import { AuthPage } from '../pages/AuthPage';
import { ProfilePage } from '../pages/ProfilePage';

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
  return <HomePage />;
}

export function App() {
  return <AuthProvider><Pages /></AuthProvider>;
}
