import React, { useEffect, useRef, useState } from 'react';
import Icon from './Icon';

export default function EventOwnerMenu({ event, onDelete, onEdit, isPast = false }) {
  const [open, setOpen] = useState(false);
  const root = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (!root.current?.contains(e.target)) setOpen(false);
    };
    const escape = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);

  return (
    <div
      className="event-owner-menu"
      ref={root}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className="event-owner-trigger"
        aria-label="Управление событием"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <Icon name="more" />
      </button>
      {open && (
        <div className="event-owner-dropdown">
          {onEdit && !isPast && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onEdit(event);
              }}
            >
              Редактировать
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onDelete(event);
            }}
          >
            Удалить событие
          </button>
        </div>
      )}
    </div>
  );
}