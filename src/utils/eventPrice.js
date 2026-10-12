export const formatEventPrice = (event) => {
  if (event?.price !== 'Платно') return event?.price || 'Бесплатно';

  const amount = Number(event.priceAmount);
  if (!Number.isInteger(amount) || amount < 1) return 'Платно';

  return `${new Intl.NumberFormat('ru-RU').format(amount)} ₽`;
};
