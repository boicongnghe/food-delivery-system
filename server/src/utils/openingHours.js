const pad = (value) => String(value).padStart(2, '0');
const VIETNAM_OFFSET_MS = 7 * 60 * 60 * 1000; // UTC+7, no daylight saving

const toMinutes = (time) => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};
const toTime = (minutes) => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;

// Day of week and "HH:mm" in Vietnam, whatever the timezone of the server
const vietnamClock = (now) => {
  const vietnamTime = new Date(now.getTime() + VIETNAM_OFFSET_MS);
  return {
    day: vietnamTime.getUTCDay(),
    time: `${pad(vietnamTime.getUTCHours())}:${pad(vietnamTime.getUTCMinutes())}`,
  };
};

/**
 * The shift running now (Vietnam time), or null.
 * TO-09: no schedule / broken data = closed. Decision D1: a shift never crosses midnight
 * (the profile form requires close > open), so "18:00 - 02:00" is never treated as open.
 */
const findOpenShift = (openingHours, now) => {
  if (!Array.isArray(openingHours) || openingHours.length === 0) return null;
  const { day, time } = vietnamClock(now);
  const today = openingHours.find((entry) => entry.dayOfWeek === day);
  if (!today || today.isOpen === false || !Array.isArray(today.shifts)) return null;
  return (
    today.shifts.find((shift) => shift.open && shift.close && shift.open < shift.close && time >= shift.open && time < shift.close) ||
    null
  );
};

export const isRestaurantOpenNow = (openingHours = [], now = new Date()) => Boolean(findOpenShift(openingHours, now));

// At least one day with a shift: the restaurant can be shown and approved (TO-09)
export const hasOpeningSchedule = (openingHours = []) =>
  Array.isArray(openingHours) && openingHours.some((day) => day.isOpen !== false && day.shifts?.length > 0);

/**
 * TO-10 - can a new order be placed now? Orders stop `cutoffMinutes` before the end of the current shift,
 * so the kitchen never receives an order it cannot cook before closing.
 * @returns {{ accepting: boolean, reason?: 'closed' | 'cutoff', lastOrderTime?: string }}
 */
export const getOrderAcceptance = (openingHours = [], cutoffMinutes = 0, now = new Date()) => {
  const shift = findOpenShift(openingHours, now);
  if (!shift) return { accepting: false, reason: 'closed' };

  const lastOrderMinutes = toMinutes(shift.close) - cutoffMinutes;
  const lastOrderTime = toTime(Math.max(lastOrderMinutes, 0));
  if (toMinutes(vietnamClock(now).time) >= lastOrderMinutes) {
    return { accepting: false, reason: 'cutoff', lastOrderTime };
  }
  return { accepting: true, lastOrderTime };
};
