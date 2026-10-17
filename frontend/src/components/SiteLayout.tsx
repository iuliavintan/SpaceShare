import type { ReactNode } from 'react';
import { SiteHeader } from './SiteHeader';

export function SiteLayout({ children, mainClassName }: { children: ReactNode; mainClassName?: string }) {
  return (
    <div className="page-shell">
      <a className="skip-link" href="#main-content" onClick={(event) => {
        event.preventDefault();
        document.getElementById('main-content')?.focus();
      }}>Sari la conținut</a>
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className={mainClassName}>{children}</main>
      <footer className="site-footer">
        <span>SpaceShare — Spațiile ne aduc împreună.</span>
        <span>Proiect universitar / În dezvoltare</span>
      </footer>
    </div>
  );
}
