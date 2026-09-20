import React, { useState } from 'react';
import Icon from './Icon';

const Reviews = ({ event, userId, userName, reviews = [], onSubmit }) => {
  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const myReview = reviews.find((r) => String(r.userId) === String(userId));
  const averageRating = reviews.length
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : '0.0';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!rating) { setError('Поставьте оценку'); return; }
    if (!text.trim()) { setError('Напишите отзыв'); return; }
    setSubmitting(true);
    setError('');
    try {
      await onSubmit({
        eventId: event.id,
        userId,
        userName: userName || 'Гость',
        rating,
        text: text.trim(),
        createdAt: new Date().toISOString()
      });
      setRating(0);
      setText('');
    } catch (err) {
      setError(err.message || 'Не удалось отправить отзыв');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="detail-section reviews-section">
      <div className="reviews-header">
        <h3>Отзывы</h3>
        {reviews.length > 0 && (
          <span className="reviews-average">
            <Icon name="star" size={16} filled /> {averageRating} · {reviews.length}
          </span>
        )}
      </div>

      {reviews.length === 0 ? (
        <p className="reviews-empty">Пока нет отзывов. Будьте первым!</p>
      ) : (
        <div className="reviews-list">
          {reviews.map((r) => (
            <div key={r.id} className="review-item">
              <div className="review-head">
                <strong>{r.userName || 'Гость'}</strong>
                <span className="review-stars">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Icon key={n} name="star" size={13} filled={n <= r.rating} />
                  ))}
                </span>
              </div>
              <p className="review-text">{r.text}</p>
            </div>
          ))}
        </div>
      )}

      {!myReview && (
        <form className="review-form" onSubmit={handleSubmit}>
          <div className="review-form-stars">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                type="button"
                key={n}
                className={`review-star ${n <= rating ? 'active' : ''}`}
                onClick={() => setRating(n)}
                aria-label={`Оценка ${n}`}
              >
                <Icon name="star" size={26} filled={n <= rating} />
              </button>
            ))}
          </div>
          <textarea
            rows="3"
            maxLength={500}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Поделитесь впечатлениями о событии..."
          />
          {error && <p className="error-text">{error}</p>}
          <button type="submit" className="primary-btn" disabled={submitting}>
            {submitting ? 'Отправка...' : 'Оставить отзыв'}
          </button>
        </form>
      )}
    </section>
  );
};

export default Reviews;