const nonEmpty = v => typeof v === 'string' && v.trim().length > 0;
const isValidPhone = v => nonEmpty(v) && /^0\d{9}$/.test(v.trim());
const isValidDate = v => nonEmpty(v) && /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(Date.parse(v));

function validateProfile(b = {}) {
  const e = [];
  if (!nonEmpty(b.first_name)) e.push('first_name is required');
  if (!nonEmpty(b.last_name)) e.push('last_name is required');
  if (b.phone_number && !isValidPhone(b.phone_number)) e.push('phone_number must be 10 digits starting with 0');
  return e;
}

function validatePatient(b = {}) {
  const e = [];
  if (!nonEmpty(b.first_name)) e.push('first_name is required');
  if (!nonEmpty(b.last_name)) e.push('last_name is required');
  if (!['Male', 'Female', 'Other'].includes(b.gender)) e.push('gender must be Male, Female or Other');
  if (!isValidDate(b.date_of_birth)) e.push('date_of_birth must be YYYY-MM-DD');
  else if (Date.parse(b.date_of_birth) > Date.now()) e.push('date_of_birth cannot be in the future');
  if (!isValidPhone(b.phone_number)) e.push('phone_number must be 10 digits starting with 0');
  if (!nonEmpty(b.address)) e.push('address is required');
  return e;
}

module.exports = { nonEmpty, isValidPhone, isValidDate, validateProfile, validatePatient };