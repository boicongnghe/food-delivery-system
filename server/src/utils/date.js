const VIETNAM_OFFSET_MS = 7 * 60 * 60 * 1000; // UTC+7, no daylight saving

// "20261025" for today in Vietnam time (keys for daily counters)
export const vietnamDateKey = (now = new Date()) =>
  new Date(now.getTime() + VIETNAM_OFFSET_MS).toISOString().slice(0, 10).replace(/-/g, '');

// 00:00 today in Vietnam time, regardless of the server's timezone
export const startOfTodayInVietnam = (now = new Date()) => {
  const vietnamTime = new Date(now.getTime() + VIETNAM_OFFSET_MS);
  vietnamTime.setUTCHours(0, 0, 0, 0);
  return new Date(vietnamTime.getTime() - VIETNAM_OFFSET_MS);
};

// "2026-10-25": calendar day in Vietnam (date-only fields such as commission rule periods)
export const vietnamDateString = (now = new Date()) =>
  new Date(now.getTime() + VIETNAM_OFFSET_MS).toISOString().slice(0, 10);

// "2026-10-25" -> the Date of 00:00 that day in Vietnam time
export const startOfVietnamDay = (dateString) =>
  new Date(new Date(`${dateString}T00:00:00.000Z`).getTime() - VIETNAM_OFFSET_MS);

// ("2026-10-31", 1) -> "2026-11-01"
export const addDays = (dateString, days) => {
  const date = new Date(`${dateString}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};
