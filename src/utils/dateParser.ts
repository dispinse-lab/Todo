import type { ParsedInput, Priority } from '../types';

const GIORNI_SETTIMANA = [
  'domenica', 'lunedi', 'martedi', 'mercoledi', 'giovedi', 'venerdi', 'sabato'
];

// Mappa varianti accentate/non accentate
const GIORNI_MAP: Record<string, number> = {
  'domenica': 0,
  'lunedi': 1, 'lunedì': 1,
  'martedi': 2, 'martedì': 2,
  'mercoledi': 3, 'mercoledì': 3,
  'giovedi': 4, 'giovedì': 4,
  'venerdi': 5, 'venerdì': 5,
  'sabato': 6
};

const MESI = [
  'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
  'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'
];

const NUMERI_TESTUALI: Record<string, number> = {
  'uno': 1, 'una': 1, 'un': 1,
  'due': 2,
  'tre': 3,
  'quattro': 4,
  'cinque': 5,
  'sei': 6,
  'sette': 7,
  'otto': 8,
  'nove': 9,
  'dieci': 10,
  'undici': 11,
  'dodici': 12,
  'tredici': 13,
  'quattordici': 14,
  'quindici': 15,
  'sedici': 16,
  'diciassette': 17,
  'diciotto': 18,
  'diciannove': 19,
  'venti': 20,
  'ventuno': 21,
  'ventidue': 22,
  'ventitrè': 23,
  'ventiquattro': 24,
  'trenta': 30,
  'trentuno': 31
};

// Pattern per riconoscere le priorità
const PRIORITY_PATTERNS: { pattern: RegExp; priority: Priority }[] = [
  { pattern: /\b(?:urgente|urgentissim[oa]|asap|subito)\b/i, priority: 'urgent' },
  { pattern: /\b(?:priorit[àa]\s*(?:alta|1|uno)|alta\s*priorit[àa]|important[ei]|prioritari[oa])\b/i, priority: 'high' },
  { pattern: /\b(?:priorit[àa]\s*(?:media|2|due)|media\s*priorit[àa])\b/i, priority: 'medium' },
  { pattern: /\b(?:priorit[àa]\s*(?:bassa|3|tre)|bassa\s*priorit[àa]|poco\s*importante)\b/i, priority: 'low' },
];

function parseNumber(text: string): number | null {
  const lower = text.toLowerCase().trim();
  if (NUMERI_TESTUALI[lower] !== undefined) {
    return NUMERI_TESTUALI[lower];
  }
  const num = parseInt(lower, 10);
  return isNaN(num) ? null : num;
}

function setTime(date: Date, hours: number, minutes: number = 0): Date {
  const result = new Date(date);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function addHours(date: Date, hours: number): Date {
  const result = new Date(date);
  result.setHours(result.getHours() + hours);
  return result;
}

function addMinutes(date: Date, minutes: number): Date {
  const result = new Date(date);
  result.setMinutes(result.getMinutes() + minutes);
  return result;
}

function getNextWeekday(dayIndex: number, fromDate: Date = new Date()): Date {
  const result = new Date(fromDate);
  const currentDay = result.getDay();
  let daysToAdd = dayIndex - currentDay;
  if (daysToAdd <= 0) {
    daysToAdd += 7;
  }
  result.setDate(result.getDate() + daysToAdd);
  return result;
}

function parsePriority(text: string): { priority: Priority; cleanedText: string } {
  let priority: Priority = 'none';
  let cleanedText = text;

  for (const { pattern, priority: p } of PRIORITY_PATTERNS) {
    if (pattern.test(text)) {
      priority = p;
      cleanedText = cleanedText.replace(pattern, '').trim();
      break;
    }
  }

  return { priority, cleanedText };
}

export function parseInput(input: string): ParsedInput {
  const now = new Date();
  let text = input.toLowerCase().trim();
  let date: Date | null = null;
  let remainingText = text;
  let hasTime = false; // Track se è stato specificato un orario

  // Prima estrai la priorità
  const { priority, cleanedText } = parsePriority(text);
  remainingText = cleanedText;
  text = cleanedText;

  // Pattern per "alle HH:MM" o "alle HH"
  const timePattern = /\balle?\s+(\d{1,2})(?::(\d{2}))?\b/i;
  // Pattern per orario relativo "fra/tra X ore/minuti"
  const relativeTimePattern = /\b(?:fra|tra)\s+(\d+|un|una|uno|due|tre|quattro|cinque|sei|sette|otto|nove|dieci)\s+(or[ae]|minut[oi])\b/i;
  // Pattern per giorno relativo "fra/tra X giorni"
  const relativeDayPattern = /\b(?:fra|tra)\s+(\d+|un|una|uno|due|tre|quattro|cinque|sei|sette|otto|nove|dieci)\s+giorn[oi]\b/i;
  // Pattern per data esplicita "il 15 marzo" o "15 marzo"
  const explicitDatePattern = /\b(?:il\s+)?(\d{1,2})\s+(gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)\b/i;
  // Pattern per "prossimo/a lunedì" o "lunedì prossimo" (con o senza accento)
  const nextWeekdayPattern1 = /\b(?:prossim[oa])\s+(luned[iì]|marted[iì]|mercoled[iì]|gioved[iì]|venerd[iì]|sabato|domenica)\b/i;
  const nextWeekdayPattern2 = /\b(luned[iì]|marted[iì]|mercoled[iì]|gioved[iì]|venerd[iì]|sabato|domenica)\s+(?:prossim[oa])\b/i;
  // Pattern per giorno della settimana semplice (con o senza accento)
  const weekdayPattern = /\b(luned[iì]|marted[iì]|mercoled[iì]|gioved[iì]|venerd[iì]|sabato|domenica)\b/i;

  // Estrai l'orario se presente
  let hours: number | null = null;
  let minutes: number = 0;

  const timeMatch = text.match(timePattern);
  if (timeMatch) {
    hours = parseInt(timeMatch[1], 10);
    minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    hasTime = true;
    remainingText = remainingText.replace(timeMatch[0], '').trim();
  }

  // Controlla "oggi"
  if (/\boggi\b/i.test(text)) {
    date = new Date(now);
    remainingText = remainingText.replace(/\boggi\b/gi, '').trim();
  }
  // Controlla "domani"
  else if (/\bdomani\b/i.test(text)) {
    date = addDays(now, 1);
    remainingText = remainingText.replace(/\bdomani\b/gi, '').trim();
  }
  // Controlla "dopodomani"
  else if (/\bdopodomani\b/i.test(text)) {
    date = addDays(now, 2);
    remainingText = remainingText.replace(/\bdopodomani\b/gi, '').trim();
  }
  // Controlla "stasera"
  else if (/\bstasera\b/i.test(text)) {
    date = new Date(now);
    if (hours === null) {
      hours = 20;
      minutes = 0;
      hasTime = true; // "stasera" implica un orario
    }
    remainingText = remainingText.replace(/\bstasera\b/gi, '').trim();
  }
  // Controlla "stamattina"
  else if (/\bstamattina\b/i.test(text)) {
    date = new Date(now);
    if (hours === null) {
      hours = 9;
      minutes = 0;
      hasTime = true; // "stamattina" implica un orario
    }
    remainingText = remainingText.replace(/\bstamattina\b/gi, '').trim();
  }
  // Controlla "questo pomeriggio"
  else if (/\bquesto\s+pomeriggio\b/i.test(text)) {
    date = new Date(now);
    if (hours === null) {
      hours = 15;
      minutes = 0;
      hasTime = true; // "questo pomeriggio" implica un orario
    }
    remainingText = remainingText.replace(/\bquesto\s+pomeriggio\b/gi, '').trim();
  }
  // Controlla "la prossima settimana"
  else if (/\b(?:la\s+)?prossima\s+settimana\b/i.test(text)) {
    date = addDays(now, 7);
    remainingText = remainingText.replace(/\b(?:la\s+)?prossima\s+settimana\b/gi, '').trim();
  }
  // Controlla tempo relativo (fra X ore/minuti)
  else if (relativeTimePattern.test(text)) {
    const match = text.match(relativeTimePattern)!;
    const amount = parseNumber(match[1]) || 1;
    const unit = match[2].toLowerCase();

    if (unit.startsWith('or')) {
      date = addHours(now, amount);
    } else {
      date = addMinutes(now, amount);
    }
    hasTime = true; // tempo relativo specifica un orario esatto
    remainingText = remainingText.replace(match[0], '').trim();
  }
  // Controlla giorno relativo (fra X giorni)
  else if (relativeDayPattern.test(text)) {
    const match = text.match(relativeDayPattern)!;
    const amount = parseNumber(match[1]) || 1;
    date = addDays(now, amount);
    remainingText = remainingText.replace(match[0], '').trim();
  }
  // Controlla "prossimo lunedì" etc.
  else if (nextWeekdayPattern1.test(text)) {
    const match = text.match(nextWeekdayPattern1)!;
    const dayName = match[1].toLowerCase();
    const dayIndex = GIORNI_MAP[dayName];
    if (dayIndex !== undefined) {
      date = getNextWeekday(dayIndex, now);
      remainingText = remainingText.replace(match[0], '').trim();
    }
  }
  // Controlla "lunedì prossimo" etc.
  else if (nextWeekdayPattern2.test(text)) {
    const match = text.match(nextWeekdayPattern2)!;
    const dayName = match[1].toLowerCase();
    const dayIndex = GIORNI_MAP[dayName];
    if (dayIndex !== undefined) {
      date = getNextWeekday(dayIndex, now);
      remainingText = remainingText.replace(match[0], '').trim();
    }
  }
  // Controlla data esplicita "il 15 marzo"
  else if (explicitDatePattern.test(text)) {
    const match = text.match(explicitDatePattern)!;
    const day = parseInt(match[1], 10);
    const monthName = match[2].toLowerCase();
    const monthIndex = MESI.indexOf(monthName);
    if (monthIndex !== -1) {
      date = new Date(now.getFullYear(), monthIndex, day);
      if (date < now) {
        date.setFullYear(date.getFullYear() + 1);
      }
      remainingText = remainingText.replace(match[0], '').trim();
    }
  }
  // Controlla giorno della settimana semplice
  else if (weekdayPattern.test(text)) {
    const match = text.match(weekdayPattern)!;
    const dayName = match[1].toLowerCase();
    const dayIndex = GIORNI_MAP[dayName];
    if (dayIndex !== undefined) {
      date = getNextWeekday(dayIndex, now);
      remainingText = remainingText.replace(match[0], '').trim();
    }
  }

  // Applica l'orario se trovato
  if (date && hours !== null) {
    date = setTime(date, hours, minutes);
  } else if (hours !== null) {
    date = setTime(now, hours, minutes);
    if (date < now) {
      date = addDays(date, 1);
    }
  } else if (date && !hasTime) {
    // Se c'è una data ma nessun orario specificato, imposta a mezzanotte
    date = setTime(date, 0, 0);
  }

  // Pulisci il testo rimanente
  remainingText = remainingText
    .replace(/\s+/g, ' ')
    .replace(/^\s*[,.:;]\s*/, '')
    .replace(/\s*[,.:;]\s*$/, '')
    .trim();

  // Capitalizza la prima lettera
  if (remainingText.length > 0) {
    remainingText = remainingText.charAt(0).toUpperCase() + remainingText.slice(1);
  }

  return {
    date,
    hasTime,
    priority,
    remainingText
  };
}

export function formatDateTime(date: Date, showTime: boolean = true): string {
  const now = new Date();
  const tomorrow = addDays(now, 1);
  const dayAfterTomorrow = addDays(now, 2);

  const isToday = date.toDateString() === now.toDateString();
  const isTomorrow = date.toDateString() === tomorrow.toDateString();
  const isDayAfterTomorrow = date.toDateString() === dayAfterTomorrow.toDateString();

  // Non mostrare l'orario se è mezzanotte (indica data generica senza orario)
  const isMidnight = date.getHours() === 0 && date.getMinutes() === 0;
  const shouldShowTime = showTime && !isMidnight;

  const timeStr = shouldShowTime
    ? ` alle ${date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`
    : '';

  if (isToday) {
    return `Oggi${timeStr}`;
  } else if (isTomorrow) {
    return `Domani${timeStr}`;
  } else if (isDayAfterTomorrow) {
    return `Dopodomani${timeStr}`;
  } else {
    const dayName = GIORNI_SETTIMANA[date.getDay()];
    const day = date.getDate();
    const month = MESI[date.getMonth()];
    return `${dayName.charAt(0).toUpperCase() + dayName.slice(1)} ${day} ${month}${timeStr}`;
  }
}

export function getPriorityLabel(priority: Priority): string {
  switch (priority) {
    case 'urgent': return 'Urgente';
    case 'high': return 'Alta';
    case 'medium': return 'Media';
    case 'low': return 'Bassa';
    default: return '';
  }
}

export function getPriorityColor(priority: Priority): string {
  switch (priority) {
    case 'urgent': return '#ef4444';
    case 'high': return '#f97316';
    case 'medium': return '#eab308';
    case 'low': return '#22c55e';
    default: return 'transparent';
  }
}

export function isOverdue(date: Date): boolean {
  return date < new Date();
}

export function isToday(date: Date): boolean {
  const now = new Date();
  return date.toDateString() === now.toDateString();
}

export function isTomorrow(date: Date): boolean {
  const tomorrow = addDays(new Date(), 1);
  return date.toDateString() === tomorrow.toDateString();
}
