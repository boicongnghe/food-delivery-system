// "0901234456" -> "090***456" (hide customer phone from restaurants)
export const maskPhone = (phone = '') => {
  if (phone.length < 7) return '***';
  return `${phone.slice(0, 3)}***${phone.slice(-3)}`;
};
