import React, { useState } from 'react';
import Icon from './Icon';
import { isEventOwner } from '../utils/eventOwnership';

const Reviews = ({ event, userId, userName, reviews = [], onSubmit }) => {
  const isOwner = isEventOwner(event, userId);

  const [rating, setRating] = useState(0);
  const [organizerRating, setOrganizerRating] = useState(0);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const myReview = reviews.find((r) => String(r.userId) === String(userId));
  const averageRating = reviews.length
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : '0.0';

  const organizerRatings = reviews
    .map((r) => r.organizerRating)
    .filter((v) => Number.isInteger(v) && v >= 1 && v <= 5);
  const averageOrganizerRating = organizerRatings.length
    ? (
        organizerRatings.reduce((sum, v) => sum + v, 0) / organizerRatings.length
      ).toFixed(1)
    : null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!rating) {
      setError('Поставьте оценку событию');
      return;
    }
    if (!text.trim()) {
      setError('Напишите отзыв');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await onSubmit({
        eventId: event.id,
        userId,
        userName: userName || 'Гость',
        rating,
        organizerRating: organizerRating || null,
        text: text.trim(),
        createdAt: new Date().toISOString(),
      });
      setRating(0);
      setOrganizerRating(0);
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

      {averageOrganizerRating && (
        <p className="reviews-organizer-avg">
          Организатор: <Icon name="star" size={14} filled /> {averageOrganizerRating} из 5
        </p>
      )}

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
              {Number.isInteger(r.organizerRating) && (
                <p className="review-organizer-rating">
                  Организатор: {r.organizerRating} / 5
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {isOwner ? (
        <p className="reviews-empty">
          Вы организатор этого события и не можете оставить отзыв.
        </p>
      ) : myReview ? (
        <p className="reviews-empty">Вы уже оставили отзыв — спасибо!</p>
      ) : (
        <form className="review-form" onSubmit={handleSubmit}>
          <div className="review-form-row">
            <span className="review-form-label">Оценка события</span>
            <div className="review-form-stars">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  type="button"
                  key={`event-${n}`}
                  className={`review-star ${n <= rating ? 'active' : ''}`}
                  onClick={() => setRating(n)}
                  aria-label={`Оценка события ${n}`}
                >
                  <Icon name="star" size={26} filled={n <= rating} />
                </button>
              ))}
            </div>
          </div>

          <div className="review-form-row">
            <span className="review-form-label">Оценка организатора (необязательно)</span>
            <div className="review-form-stars">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  type="button"
                  key={`org-${n}`}
                  className={`review-star ${n <= organizerRating ? 'active' : ''}`}
                  onClick={() => setOrganizerRating(organizerRating === n ? 0 : n)}
                  aria-label={`Оценка организатора ${n}`}
                >
                  <Icon name="star" size={22} filled={n <= organizerRating} />
                </button>
              ))}
            </div>
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