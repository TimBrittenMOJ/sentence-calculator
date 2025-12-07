
// calc.js
// Multi-sentence calculator (life, determinate, aggregate concurrency, suspended)
// All arithmetic in UTC to avoid DST issues.

// ----------------- Date helpers (UTC) -----------------
function makeUTCDate(y, m, d) {
  return new Date(Date.UTC(y, m, d));
}
function toUTCDate(d) {
  return makeUTCDate(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}
function parseISODateToUTC(dateStr) {
  // 'YYYY-MM-DD' -> midnight UTC
  return new Date(dateStr + 'T00:00:00Z');
}

/**
 * Add years, months, days (calendar-aware, UTC).
 * Weeks are added as 7-day blocks via days.
 * Order is: years -> months -> days
 */
function addYMD(base, years = 0, months = 0, days = 0) {
  const y = base.getUTCFullYear();
  const m = base.getUTCMonth();
  const d = base.getUTCDate();
  const afterYears  = makeUTCDate(y + years, m, d);
  const afterMonths = makeUTCDate(afterYears.getUTCFullYear(), afterYears.getUTCMonth() + months, afterYears.getUTCDate());
  const afterDays   = makeUTCDate(afterMonths.getUTCFullYear(), afterMonths.getUTCMonth(), afterMonths.getUTCDate() + days);
  return afterDays;
}
function subtractDays(base, days = 0) {
  return makeUTCDate(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate() - days);
}
const MS_PER_DAY = 24 * 60 * 60 * 1000;

// ----------------- Period & variance -----------------
function termToCalendarDays(anchorUTC, { years = 0, months = 0, weeks = 0, days = 0 }) {
  const afterYears   = addYMD(anchorUTC, years, 0, 0);
  const afterMonths  = addYMD(afterYears, 0, months, 0);
  const afterWeeks   = addYMD(afterMonths, 0, 0, (weeks || 0) * 7);
  const afterAll     = addYMD(afterWeeks, 0, 0, days);

  const calendarDays = Math.round((toUTCDate(afterAll) - toUTCDate(anchorUTC)) / MS_PER_DAY);
  const naiveDays    = (years * 365) + (months * 30) + ((weeks || 0) * 7) + days;

  const daysFromYears = Math.round((toUTCDate(afterYears) - toUTCDate(anchorUTC)) / MS_PER_DAY);
  const leapDays = daysFromYears - (years * 365);

  const daysFromMonths = Math.round((toUTCDate(afterMonths) - toUTCDate(afterYears)) / MS_PER_DAY);
  const monthAdjustment = daysFromMonths - (months * 30);

  const totalAdjustment = calendarDays - naiveDays;

  return { days: calendarDays, variance: { leapDays, monthAdjustment, totalAdjustment } };
}

function periodBetweenInclusive(startUTC, endUTC) {
  const endPlusOne = addYMD(endUTC, 0, 0, 1);

  let y1 = startUTC.getUTCFullYear(), m1 = startUTC.getUTCMonth(), d1 = startUTC.getUTCDate();
  let y2 = endPlusOne.getUTCFullYear(), m2 = endPlusOne.getUTCMonth(), d2 = endPlusOne.getUTCDate();

  let years  = y2 - y1;
  let months = m2 - m1;
  let days   = d2 - d1;
  if (days < 0) {
    months--;
    const prevMonth = makeUTCDate(y2, m2, 0);
    days += prevMonth.getUTCDate();
  }
  if (months < 0) {
    years--;
    months += 12;
  }

  let weeks = Math.floor(days / 7);
  let remDays = days % 7;

  const parts = [];
  if (years)  parts.push(`${years} year${years === 1 ? '' : 's'}`);
  if (months) parts.push(`${months} month${months === 1 ? '' : 's'}`);
  if (weeks)  parts.push(`${weeks} week${weeks === 1 ? '' : 's'}`);
  if (remDays)parts.push(`${remDays} day${remDays === 1 ? '' : 's'}`);
  const periodStr = parts.length ? parts.join(', ') : '0 days';

  const afterYears  = addYMD(startUTC, years, 0, 0);
  const daysFromNonYears = Math.round((toUTCDate(endPlusOne) - toUTCDate(afterYears)) / MS_PER_DAY);
  const periodYearsDaysStr =
    (years ? `${years} year${years === 1 ? '' : 's'}` : '') +
    (daysFromNonYears ? `${years ? ', ' : ''}${daysFromNonYears} day${daysFromNonYears === 1 ? '' : 's'}` : (years ? '' : '0 days'));

  return { periodStr, periodYearsDaysStr };
}

// ----------------- Concurrency aggregation -----------------
function aggregateComponentsToDays(anchorUTC, components) {
  let consecutiveDays = 0;
  const groups = new Map();

  components.forEach(c => {
    const { days } = termToCalendarDays(anchorUTC, c);
    if (c.relation === 'concurrent' && c.groupId !== null && c.groupId !== undefined) {
      const arr = groups.get(c.groupId) || [];
      arr.push(days);
      groups.set(c.groupId, arr);
    } else {
      consecutiveDays += days;
    }
  });

  let total = consecutiveDays;
  for (const [, arr] of groups.entries()) {
    total += Math.max(...arr);
  }
  return total;
}

// ----------------- Credits -----------------
function computeCredits(remandDays = 0, taggedBailDays = 0) {
  const remand = Number(remandDays) || 0;
  const tagged = Math.ceil((Number(taggedBailDays) || 0) * 0.5);
  return { remand, tagged, total: remand + tagged };
}

// ----------------- Sentence calculators -----------------
function calculateLife({ dateOfSentence, term, remandDays, taggedBailDays }) {
  const start = parseISODateToUTC(dateOfSentence);
  const { days: calendarDays, variance } = termToCalendarDays(start, term);

  let end = addYMD(start, 0, 0, calendarDays);
  end = subtractDays(end, 1);

  const { total } = computeCredits(remandDays, taggedBailDays);
  end = subtractDays(end, total);

  const totalDaysInclusive = Math.round((toUTCDate(end) - toUTCDate(start)) / MS_PER_DAY) + 1;
  const { periodStr, periodYearsDaysStr } = periodBetweenInclusive(start, end);

  return {
    sentenceEnd: end,
    erdDate: null,
    tariffExpiry: end,
    totalDaysInclusive,
    periodStr,
    periodYearsDaysStr,
    remandDays,
    taggedBailDays,
    calendarVariance: variance
  };
}

function calculateDeterminate({ dateOfSentence, term, releaseFraction = 0.5, remandDays, taggedBailDays }) {
  const start = parseISODateToUTC(dateOfSentence);
  const { days: calendarDays, variance } = termToCalendarDays(start, term);

  let sentenceEnd = addYMD(start, 0, 0, calendarDays);
  sentenceEnd = subtractDays(sentenceEnd, 1);

  const { remand, tagged, total } = computeCredits(remandDays, taggedBailDays);

  const toServeForERD = Math.max(0, Math.ceil(releaseFraction * calendarDays) - total);
  let erdDate = addYMD(start, 0, 0, toServeForERD);
  erdDate = subtractDays(erdDate, 1);

  const totalDaysInclusive = Math.round((toUTCDate(sentenceEnd) - toUTCDate(start)) / MS_PER_DAY) + 1;
  const { periodStr, periodYearsDaysStr } = periodBetweenInclusive(start, sentenceEnd);

  return {
    sentenceEnd,
    erdDate,
    tariffExpiry: null,
    totalDaysInclusive,
    periodStr,
    periodYearsDaysStr,
    remandDays: remand,
    taggedBailDays,
    calendarVariance: variance
  };
}

function calculateAggregate({ dateOfSentence, components = [], releaseFraction = 0.5, remandDays, taggedBailDays }) {
  const start = parseISODateToUTC(dateOfSentence);
  const calendarDays = aggregateComponentsToDays(start, components);

  let sentenceEnd = addYMD(start, 0, 0, calendarDays);
  sentenceEnd = subtractDays(sentenceEnd, 1);

  const { total } = computeCredits(remandDays, taggedBailDays);
  const toServeForERD = Math.max(0, Math.ceil(releaseFraction * calendarDays) - total);
  let erdDate = addYMD(start, 0, 0, toServeForERD);
  erdDate = subtractDays(erdDate, 1);

  const totalDaysInclusive = Math.round((toUTCDate(sentenceEnd) - toUTCDate(start)) / MS_PER_DAY) + 1;
  const { periodStr, periodYearsDaysStr } = periodBetweenInclusive(start, sentenceEnd);

  let leapDays = 0, monthAdjustment = 0, totalAdjustment = 0;
  components.forEach(c => {
    const { variance } = termToCalendarDays(start, c);
    leapDays += variance.leapDays;
    monthAdjustment += variance.monthAdjustment;
    totalAdjustment += variance.totalAdjustment;
  });

  return {
    sentenceEnd,
    erdDate,
    tariffExpiry: null,
    totalDaysInclusive,
    periodStr,
    periodYearsDaysStr,
    remandDays,
    taggedBailDays,
    calendarVariance: { leapDays, monthAdjustment, totalAdjustment }
  };
}

function calculateSuspended({ dateOfSentence, term, isActivated, activationDate, releaseFraction = 0.5, remandDays, taggedBailDays }) {
  if (!isActivated) {
    return {
      sentenceEnd: null,
      erdDate: null,
      tariffExpiry: null,
      totalDaysInclusive: 0,
      periodStr: '0 days',
      periodYearsDaysStr: '0 days',
      remandDays,
      taggedBailDays,
      calendarVariance: { leapDays: 0, monthAdjustment: 0, totalAdjustment: 0 }
    };
  }
  const start = parseISODateToUTC(activationDate);
  const { days: calendarDays, variance } = termToCalendarDays(start, term);

  let sentenceEnd = addYMD(start, 0, 0, calendarDays);
  sentenceEnd = subtractDays(sentenceEnd, 1);

  const { total } = computeCredits(remandDays, taggedBailDays);
  const toServeForERD = Math.max(0, Math.ceil(releaseFraction * calendarDays) - total);
  let erdDate = addYMD(start, 0, 0, toServeForERD);
  erdDate = subtractDays(erdDate, 1);

  const totalDaysInclusive = Math.round((toUTCDate(sentenceEnd) - toUTCDate(start)) / MS_PER_DAY) + 1;
  const { periodStr, periodYearsDaysStr } = periodBetweenInclusive(start, sentenceEnd);

  return {
    sentenceEnd,
    erdDate,
    tariffExpiry: null,
    totalDaysInclusive,
    periodStr,
    periodYearsDaysStr,
    remandDays,
    taggedBailDays,
    calendarVariance: variance
  };
}

// ----------------- Public entry -----------------
function calculateSentence(payload) {
  const t = payload.type;
  if (t === 'life') return calculateLife(payload);
  if (t === 'determinate') return calculateDeterminate(payload);
  if (t === 'aggregate') return calculateAggregate(payload);
  if (t === 'suspended') return calculateSuspended(payload);
  throw new Error('Unknown sentence type');
}

if (typeof window !== 'undefined') {
  window.calculateSentence = calculateSentence;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { calculateSentence };
}
