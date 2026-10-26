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
