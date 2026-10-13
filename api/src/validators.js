const nonEmpty = v => typeof v === 'string' && v.trim().length > 0;
const isValidPhone = v => nonEmpty(v) && /^0\d{9}$/.test(v.trim());

function validateProfile(b = {}) {
  const e = [];
  if (!nonEmpty(b.first_name)) e.push('first_name is required');
  if (!nonEmpty(b.last_name)) e.push('last_name is required');
  if (b.phone_number && !isValidPhone(b.phone_number)) e.push('phone_number must be 10 digits starting with 0');
  return e;
}

module.exports = { nonEmpty, isValidPhone, validateProfile };