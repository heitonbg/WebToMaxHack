// Единый источник правил модерации. Используется и фронтом, и бэком.
export const BANNED_WORDS = [
  // Насилие
  'убийство', 'убить', 'убийца', 'зарезать', 'застрелить', 'казнить',
  'изнасиловать', 'изнасилование', 'насилие', 'пытка', 'похищение', 'похитить',
  'теракт', 'взрыв', 'бомба', 'оружие', 'наркотики', 'мефедрон',
  'продать наркотики', 'купить наркотики', 'закладка',
  // Экстремизм
  'нацизм', 'фашизм', 'экстремизм', 'терроризм',
  // Мошенничество
  'обман', 'мошенничество', 'развод', 'скам', 'scam', 'фишинг',
  // 18+
  'секс', 'интим', 'эротика', 'порно',
  // Опасные активности
  'руфинг', 'зацепинг', 'диггерство',
];

export const SUSPICIOUS_PATTERNS = [
  /у\s*б\s*и\s*й\s*с\s*т\s*в/i,
  /у6ийство/i,
  /уб!йство/i,
  /[a-z]*k[i1]ll[a-z]*/i,
  /hate|murder|kill|drug/i,
];

export const DANGEROUS_ADDRESS_PATTERNS = [
  /у\s*подъезда/i,
  /у\s*дома\s*№?\s*\d+/i,
  /во\s*дворе\s*дома/i,
  /возле\s*квартиры/i,
  /около\s*школы\s*№?\s*\d+/i,
  /детский\s*сад\s*№?\s*\d+/i,
];

export const moderateContent = (text) => {
  if (!text || typeof text !== 'string') {
    return { isClean: false, reason: 'Пустой текст' };
  }
  const lowerText = text.toLowerCase();

  for (const word of BANNED_WORDS) {
    if (lowerText.includes(word)) {
      return { isClean: false, reason: `Запрещенное слово: "${word}"`, word };
    }
  }

  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(text)) {
      return { isClean: false, reason: 'Подозрительный контент' };
    }
  }

  const upperRatio = (text.match(/[A-ZА-Я]/g) || []).length / text.length;
  if (text.length > 15 && upperRatio > 0.7) {
    return { isClean: false, reason: 'Слишком много заглавных букв' };
  }

  if (/(.)\1{5,}/.test(text)) {
    return { isClean: false, reason: 'Подозрительный спам' };
  }

  return { isClean: true };
};

export const moderateUrl = (url) => {
  if (!url) return { isClean: true };
  const dangerousProtocols = ['javascript:', 'data:', 'vbscript:'];
  const lowerUrl = url.toLowerCase();
  for (const proto of dangerousProtocols) {
    if (lowerUrl.startsWith(proto)) {
      return { isClean: false, reason: 'Небезопасная ссылка' };
    }
  }
  return { isClean: true };
};

export const validateAddress = (address) => {
  for (const pattern of DANGEROUS_ADDRESS_PATTERNS) {
    if (pattern.test(address)) {
      return {
        isClean: false,
        reason: 'Нельзя указывать точный адрес жилого дома. Используйте общественное место.'
      };
    }
  }
  return { isClean: true };
};