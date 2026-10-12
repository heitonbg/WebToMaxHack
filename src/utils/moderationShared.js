// Shared moderation rules used by the client and the server.
export const BANNED_WORDS = [
  // Sexual content, prostitution, and solicitation
  'секс', 'секс-вечеринка', 'секс-вечеринки', 'секс-услуги', 'секс услуги',
  'интим', 'интим-услуги', 'интим услуги', 'интимный досуг', 'эротика',
  'эротический массаж', 'порно', 'порнография', 'порнографический',
  'проститутка', 'проститутки', 'проституток', 'проституткой', 'проституция',
  'проституцией', 'проституции', 'шлюха', 'шлюхи', 'шлюх', 'шлюшку',
  'шлюшка', 'шлюшки', 'шалава', 'шалавы', 'эскорт', 'эскорт-услуги',
  'эскорт услуги', 'содержанка', 'содержанки', 'свинг', 'свингеры',
  'бдсм', 'bdsm', 'фетиш', 'мастурбация', 'мастурбировать', 'минет', 'куни',
  'анальный секс', 'голые девушки', 'голые парни', 'девушки на ночь',
  'девушка на ночь', 'снять проститутку', 'снять шлюху', 'ищу проститутку',
  'ищу шлюху', 'оказание интимных услуг', 'предлагаю интим', 'интим досуг',
  'секс за деньги', 'секс знакомства', 'эротические услуги',
  // Russian profanity and common spelling variants
  'блядь', 'блять', 'бля', 'блядство', 'блядский', 'блядская', 'блядское',
  'блядские', 'блядью', 'блядина', 'бляди', 'блядотина',
  'хуй', 'хуя', 'хуе', 'хуё', 'хуи', 'хую', 'хуев', 'хуёв', 'хуями',
  'хуесос', 'хуеплет', 'хуеплёт', 'хуила', 'хуйн', 'нахуй', 'на хуй',
  'похуй', 'охуеть', 'охуел', 'охуела', 'охуенно', 'охуительный',
  'пизда', 'пиздец', 'пизду', 'пизды', 'пизде', 'пиздобол', 'пизданутый',
  'ебать', 'ебёт', 'ебет', 'ебал', 'ебала', 'ебали', 'ебаный', 'ёбаный',
  'ебанутый', 'ёбанутый', 'ебучий', 'заебал', 'заебала', 'заебали',
  'заебись', 'уёбок', 'уебок', 'уёбище', 'уебище', 'долбоёб', 'долбоеб',
  'мудила', 'мудак', 'гандон', 'гондон', 'жопошник', 'сука', 'суки',
  'сукин', 'сучка', 'сучки', 'сучара', 'сучье', 'мразь', 'падла', 'гнида',
  'тварь', 'ублюдок', 'выблядок',
  // Common transliterations used to bypass Russian profanity filters
  'blyad', 'blyat', 'bljat', 'hui', 'huy', 'khuy', 'pizda', 'pizdec',
  'ebat', 'yobaniy', 'mudak', 'shlyuha', 'shlyukha', 'prostitutka',
  // English profanity, adult content, and solicitation
  'fuck', 'fucking', 'fucker', 'motherfucker', 'shit', 'bullshit',
  'bitch', 'bitches', 'bastard', 'asshole', 'dick', 'cock', 'cunt',
  'whore', 'slut', 'hooker', 'prostitute', 'prostitution', 'escort',
  'porn', 'porno', 'pornography', 'sex service', 'sex services',
  'adult service', 'nude', 'nudes', 'onlyfans',
  // Violence
  'убийство', 'убить', 'убийца', 'зарезать', 'застрелить', 'казнить',
  'изнасиловать', 'изнасилование', 'насилие', 'пытка', 'похищение', 'похитить',
  'теракт', 'взрыв', 'бомба', 'оружие', 'наркотики', 'мефедрон',
  'продать наркотики', 'купить наркотики', 'закладка',
  // Extremism
  'нацизм', 'фашизм', 'экстремизм', 'терроризм',
  // Fraud
  'обман', 'мошенничество', 'развод', 'скам', 'scam', 'фишинг',
  // Dangerous activities
  'руфинг', 'зацепинг', 'диггерство',
];

const CONFUSABLES = {
  a: 'а', b: 'в', c: 'с', e: 'е', h: 'н', i: 'и', k: 'к',
  m: 'м', o: 'о', p: 'р', t: 'т', x: 'х', y: 'у',
  '0': 'о', '1': 'и', '2': 'з', '3': 'з', '4': 'ч',
  '5': 'с', '6': 'б', '7': 'т', '8': 'в', '@': 'а', '$': 'с',
};

const LATIN_TO_CYRILLIC = {
  a: 'а', b: 'б', c: 'с', d: 'д', e: 'е', f: 'ф', g: 'г', h: 'х',
  i: 'и', j: 'й', k: 'к', l: 'л', m: 'м', n: 'н', o: 'о', p: 'п',
  q: 'к', r: 'р', s: 'с', t: 'т', u: 'у', v: 'в', w: 'в', x: 'кс',
  y: 'у', z: 'з', '0': 'о', '1': 'и', '2': 'з', '3': 'з', '4': 'ч',
  '5': 'с', '6': 'б', '7': 'т', '8': 'в', '@': 'а', '$': 'с',
};

const normalizeWords = (text, letterMap) =>
  text
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[a-z0-9@$]/g, (char) => letterMap[char] || char)
    .replace(/([а-я])\1+/g, '$1')
    .match(/[a-zа-я]+/g) || [];

const normalizeForModeration = (text) => [
  normalizeWords(text, CONFUSABLES),
  normalizeWords(text, LATIN_TO_CYRILLIC),
];

const normalizedBannedEntries = [...new Map(
  BANNED_WORDS.flatMap((word) => normalizeForModeration(word))
    .filter((words) => words.length && words.join('').length >= 3 && words.every((part) => part.length >= 2))
    .map((words) => [words.join(' '), words])
).values()].sort((a, b) => b.join('').length - a.join('').length);

const containsBannedEntry = (textWords, bannedWords) => {
  if (bannedWords.length === 1) {
    if (textWords.includes(bannedWords[0])) return true;

    for (let start = 0; start < textWords.length; start += 1) {
      let run = '';
      for (let end = start; end < textWords.length && textWords[end].length === 1; end += 1) {
        run += textWords[end];
        if (run.includes(bannedWords[0])) return true;
      }
    }
    return false;
  }

  for (let start = 0; start <= textWords.length - bannedWords.length; start += 1) {
    if (bannedWords.every((word, offset) => textWords[start + offset] === word)) {
      return true;
    }
  }
  return false;
};

export const SUSPICIOUS_PATTERNS = [
  /у\s*б\s*и\s*й\s*с\s*т\s*в/i,
  /у6ийство/i,
  /уб!йство/i,
  /\b(?:hate|murder|kill|drug)\b/i,
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

  const normalizedTexts = normalizeForModeration(text);
  for (const words of normalizedTexts) {
    if (normalizedBannedEntries.some((entry) => containsBannedEntry(words, entry))) {
      return { isClean: false, reason: 'Текст содержит запрещённый контент' };
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
