import React, { useEffect, useRef } from 'react';

export default function DeleteEventDialog({ event, busy, error, onCancel, onConfirm }) {
  const dialog = useRef(null);
  useEffect(() => {
    const element = dialog.current;
    element.showModal();
    return () => element.close();
  }, []);
  return <dialog ref={dialog} className="delete-event-dialog" aria-labelledby="delete-event-title" aria-describedby="delete-event-description" onCancel={(e) => { e.preventDefault(); if (!busy) onCancel(); }}>
    <h2 id="delete-event-title">Удалить событие?</h2>
    <p id="delete-event-description">«{event.title}» исчезнет из списков и с карты. Отменить удаление нельзя.</p>
    {error && <p role="alert" className="delete-event-error">{error}</p>}
    <div className="delete-event-actions">
      <button type="button" autoFocus disabled={busy} onClick={onCancel}>Оставить</button>
      <button type="button" className="delete-event-confirm" disabled={busy} onClick={onConfirm}>{busy ? 'Удаление…' : 'Удалить'}</button>
    </div>
  </dialog>;
}
