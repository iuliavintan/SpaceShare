import { useCallback, useEffect, useRef, useState } from 'react';
import { notificationsApi, type SpaceShareNotification } from './notifications.api';

const dateFormat = new Intl.DateTimeFormat('ro-RO', { timeZone: 'Europe/Bucharest', dateStyle: 'medium', timeStyle: 'short' });

export function NotificationsMenu() {
  const [notifications, setNotifications] = useState<SpaceShareNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const [loading, setLoading] = useState(true);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const load = useCallback(async (signal?: AbortSignal, showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const result = await notificationsApi.list(signal);
      setNotifications(result.notifications);
      setUnreadCount(result.unreadCount);
      setError('');
    } catch (error: unknown) {
      if (signal?.aborted) return;
      setError(error instanceof Error ? error.message : 'Notificările nu pot fi încărcate.');
    } finally { if (!signal?.aborted && showLoading) setLoading(false); }
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    const onNavigate = () => { void load(); };
    window.addEventListener('hashchange', onNavigate);
    const refreshInterval = window.setInterval(() => { void load(undefined, false); }, 30_000);
    return () => { controller.abort(); window.clearInterval(refreshInterval); window.removeEventListener('hashchange', onNavigate); };
  }, [load]);
  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setOpen(false); triggerRef.current?.focus(); }
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [open]);
  async function openNotification(notification: SpaceShareNotification) {
    if (!notification.readAt) {
      setBusyId(notification.id);
      try {
        const updated = await notificationsApi.markRead(notification.id);
        setNotifications((current) => current.map((item) => item.id === updated.id ? updated : item));
        setUnreadCount((count) => Math.max(0, count - 1));
      } catch (error: unknown) { setError(error instanceof Error ? error.message : 'Notificarea nu poate fi marcată ca citită.'); return; }
      finally { setBusyId(''); }
    }
    setOpen(false);
    if (notification.bookingId) window.location.hash = '/bookings';
  }
  return <div className="notifications-menu">
    <button ref={triggerRef} type="button" className="notifications-trigger" aria-expanded={open} aria-controls="notification-list" aria-label={`Notificări${unreadCount ? `, ${unreadCount} necitite` : ''}`} onClick={() => setOpen((value) => !value)}>
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg><span className="notifications-label">Notificări</span>{unreadCount > 0 && <span className="notification-count" aria-live="polite" aria-atomic="true">{unreadCount > 99 ? '99+' : unreadCount}</span>}
    </button>
    <section id="notification-list" className="notifications-panel" aria-label="Notificările tale" aria-busy={loading} hidden={!open}>
      <div className="notifications-heading"><strong>Notificări</strong><span>{unreadCount} necitite</span></div>
      {error && <p role="alert" className="notifications-error">{error}</p>}
      {loading && <p role="status" className="small-note notifications-empty">Se încarcă notificările…</p>}
      {!loading && !notifications.length && !error && <p className="small-note notifications-empty">Nu ai notificări.</p>}
      {notifications.map((notification) => <button key={notification.id} type="button" className={`notification-item${notification.readAt ? '' : ' unread'}`} disabled={busyId === notification.id} onClick={() => void openNotification(notification)}>
        <span className="notification-copy"><span>{notification.message}</span><small>{dateFormat.format(new Date(notification.createdAt))}</small><span className="sr-only">{notification.readAt ? 'Citită' : 'Necitită'}</span></span><span className="notification-dot" aria-hidden="true" />
      </button>)}
    </section>
  </div>;
}
