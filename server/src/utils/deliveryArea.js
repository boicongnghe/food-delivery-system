// "12 Phố Huế, Hai Bà Trưng, Hà Nội" -> "Hai Bà Trưng, Hà Nội"
// Gives shippers enough to judge a trip without exposing the exact address before they are assigned.
export const getDeliveryArea = (address = '') => {
  const parts = address
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.length > 1 ? parts.slice(-2).join(', ') : 'Khu vực chưa xác định';
};
