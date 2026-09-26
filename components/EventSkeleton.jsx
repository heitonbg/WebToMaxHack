import React from 'react';

const EventSkeleton = () => (
  <div className="event-card-horizontal skeleton-card">
    <div className="skeleton-image" />
    <div className="event-card-body">
      <div className="skeleton-line title" />
      <div className="skeleton-line text" />
      <div className="skeleton-line text short" />
      <div className="skeleton-line button" />
    </div>
  </div>
);

export const EventSkeletonList = ({ count = 3 }) => (
  <div className="event-feed">
    {Array.from({ length: count }).map((_, i) => <EventSkeleton key={i} />)}
  </div>
);

export default EventSkeleton;