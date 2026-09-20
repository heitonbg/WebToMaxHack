import React from 'react';

const paths = {
  search: <><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></>,
  sliders: <><path d="M4 7h7M15 7h5M4 17h4M12 17h8" /><circle cx="13" cy="7" r="2" /><circle cx="10" cy="17" r="2" /></>,
  calendar: <><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M8 3v4M16 3v4M4 10h16" /></>,
  map: <><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3Z" /><path d="M9 3v15M15 6v15" /></>,
  pin: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
  home: <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1Z" /></>,
  plus: <><circle cx="12" cy="12" r="9" /><path d="M12 8v8M8 12h8" /></>,
  user: <><circle cx="12" cy="8" r="3.5" /><path d="M4.5 21c.7-4 3.2-6 7.5-6s6.8 2 7.5 6" /></>,
  heart: <path d="M20.8 4.8a5.4 5.4 0 0 0-7.6 0L12 6l-1.2-1.2a5.4 5.4 0 0 0-7.6 7.6L12 21l8.8-8.6a5.4 5.4 0 0 0 0-7.6Z" />,
  people: <><circle cx="9" cy="8" r="3" /><path d="M3.5 20c.5-3.6 2.3-5.5 5.5-5.5s5 1.9 5.5 5.5" /><path d="M16 5.5a3 3 0 0 1 0 5.8M16 14.5c2.6.2 4.1 2 4.5 5.1" /></>,
  clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7v5l3.4 2" /></>,
  grid: <><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><rect x="14" y="14" width="6" height="6" rx="1" /></>,
  ticket: <path d="M4 7a2.5 2.5 0 1 0 0 5v5h16v-5a2.5 2.5 0 1 0 0-5V3H4Z" />,
  monitor: <><rect x="3" y="4" width="18" height="13" rx="2" /><path d="M8 21h8M12 17v4" /></>,
  arrowLeft: <path d="m14 5-7 7 7 7M7 12h11" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  chevronDown: <path d="m7 10 5 5 5-5" />,
  chevronRight: <path d="m9 5 7 7-7 7" />,
  share: <><path d="M12 15V3" /><path d="m8 7 4-4 4 4" /><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" /></>,
  compass: <><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2 5-5 2 2-5Z" /></>,
  layers: <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 12 9 5 9-5M3 16l9 5 9-5" /></>,
  edit: <><path d="m4 20 4.2-1 10-10a2.1 2.1 0 0 0-3-3l-10 10Z" /><path d="m13.8 7.2 3 3" /></>,
  more: <><circle cx="5" cy="12" r="1" fill="currentColor" /><circle cx="12" cy="12" r="1" fill="currentColor" /><circle cx="19" cy="12" r="1" fill="currentColor" /></>,
  star: <path d="m12 3 2.7 5.5 6 .9-4.4 4.3 1 6-5.3-2.8L6.7 19.7l1-6L3.3 9.4l6-.9Z" />,
};

export default function Icon({ name, size = 22, className = '', filled = false }) {
  return (
    <svg
      className={`ui-icon ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.85"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] || paths.grid}
    </svg>
  );
}