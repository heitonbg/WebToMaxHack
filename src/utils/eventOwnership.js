export const isEventOwner = (event, userId) =>
  event?.organizer?.id != null && userId != null &&
  String(event.organizer.id) === String(userId);
