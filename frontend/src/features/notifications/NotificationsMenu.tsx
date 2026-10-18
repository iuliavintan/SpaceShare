import { useCallback, useEffect, useState } from 'react';
import { notificationsApi, type SpaceShareNotification } from './notifications.api';

const dateFormat = new Intl.DateTimeFormat('ro-RO', { timeZone: 'Europe/Bucharest', dateStyle: 'medium', timeStyle: 'short' });

export function NotificationsMenu() {
  const [notifications, setNotifications] = useState<SpaceShareNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const result = await notificationsApi.list(signal);
      setNotifications(result.notifications);
      setUnreadCount(result.unreadCount);
      setError('');
    } catch (error: unknown) {
      if (signal?.aborted) return;
      setError(error instanceof Error ? error.message : 'Notificările nu pot fi încărcate.');
    }
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    const onNavigate = () => { void load(); };
    window.addEventListener('hashchange', onNavigate);
    return () => { controller.abort(); window.removeEventListener('hashchange', onNavigate); };
  }, [load]);
  async function openNotification(notification: SpaceShareNotification) {
    if (!notification.readAt) {
      setBusyId(notification.id);
      try {
        const updated = await notificationsApi.markRead(notification.id);
        setNotifications((current) => current.map((item) => item.id === updated.id ? updated : item));
        setUnreadCount((count) => Math.max(0, count - 1));
      } catch (error: unknown) { setError(error instanceof Error ? error.message : 'Notificarea nu poate fi marcată ca citită.'); }
      finally { setBusyId(''); }
    }
    setOpen(false);
    if (notification.bookingId) window.location.hash = '/bookings';
  }
  return <div className="notifications-menu">
    <button type="button" className="notifications-trigger" aria-expanded={open} aria-controls="notification-list" aria-label={`Notificări${unreadCount ? `, ${unreadCount} necitite` : ''}`} onClick={() => setOpen((value) => !value)}>
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg><span className="notifications-label">Notificări</span>{unreadCount > 0 && <span className="notification-count">{unreadCount > 99 ? '99+' : unreadCount}</span>}
    </button>
    {open && <section id="notification-list" className="notifications-panel" aria-label="Notificările tale">
      <div className="notifications-heading"><strong>Notificări</strong><span>{unreadCount} necitite</span></div>
      {error && <p role="alert" className="notifications-error">{error}</p>}
      {!notifications.length && !error && <p className="small-note notifications-empty">Nu ai notificări noi.</p>}
      {notifications.map((notification) => <button key={notification.id} type="button" className={`notification-item${notification.readAt ? '' : ' unread'}`} disabled={busyId === notification.id} onClick={() => void openNotification(notification)}>
        <span className="notification-copy">{notification.message}<small>{dateFormat.format(new Date(notification.createdAt))}</small></span><span className="notification-dot" aria-label={notification.readAt ? 'Citită' : 'Necitită'} />
      </button>)}
    </section>}
  </div>;
}
