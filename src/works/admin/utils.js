export const getInitials = (name = '') => {
  if (!name) return 'UA';
  const trimmed = String(name).trim();
  if (!trimmed) return 'UA';

  // If Hangul name (common case), show given name: remove first char, limit to 2 chars
  const isHangul = /^[가-힣]+$/.test(trimmed);
  if (isHangul && trimmed.length >= 2) {
    return trimmed.slice(1, 3);
  }

  // Fallback: return first 2 characters (as before)
  return trimmed.length <= 2 ? trimmed : `${trimmed[0]}${trimmed[1]}`;
};
