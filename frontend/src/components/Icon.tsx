import type { CSSProperties } from 'react';

const paths = {
  arrow: 'M5 12h14m-6-6 6 6-6 6',
  room: 'M4 21h16M6 21V4h12v17M10 8h4m-4 4h4m-4 4h4',
  lab: 'M9 3h6m-5 0v7L4 19a1 1 0 0 0 1 2h14a1 1 0 0 0 1-2l-6-9V3M8 15h8',
  screen: 'M3 4h18v13H3zM8 21h8m-4-4v4',
  check: 'm5 12 4 4L19 6',
  refresh: 'M20 7v5h-5M4 17v-5h5M6 7a7 7 0 0 1 12-1l2 3M4 15l2 3a7 7 0 0 0 12-1',
};

export function Icon({ name, className = '', style }: { name: keyof typeof paths; className?: string; style?: CSSProperties }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}><path d={paths[name]} /></svg>;
}
