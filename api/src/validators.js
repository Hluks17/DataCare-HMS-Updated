const nonEmpty = v => typeof v === 'string' && v.trim().length > 0;
const isValidPhone = v => nonEmpty(v) && /^0\d{9}$/.test(v.trim());
const isValidDate = v => nonEmpty(v) && /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(Date.parse(v));
const isValidTime = v => nonEmpty(v) && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);

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

function validateAppointment(b = {}) {
  const e = [];
  if (!Number.isInteger(b.patient_id)) e.push('patient_id is required');
  if (!Number.isInteger(b.doctor_id)) e.push('doctor_id is required');
  if (!isValidDate(b.appointment_date)) e.push('appointment_date must be YYYY-MM-DD');
  if (!isValidTime(b.appointment_time)) e.push('appointment_time must be HH:MM');
  return e;
}

function validatePrescription(b = {}) {
  const e = [];
  if (!Number.isInteger(b.patient_id)) e.push('patient_id is required');
  if (!Number.isInteger(b.doctor_id)) e.push('doctor_id is required');
  if (!Number.isInteger(b.service_id)) e.push('service_id is required (consultation type)');
  if (!Array.isArray(b.items) || b.items.length === 0) e.push('items must contain at least one medication');
  else b.items.forEach((it, i) => {
    if (!Number.isInteger(it.medication_id)) e.push(`items[${i}].medication_id is required`);
    if (!Number.isInteger(it.quantity) || it.quantity < 1) e.push(`items[${i}].quantity must be 1 or more`);
    if (!nonEmpty(it.dosage)) e.push(`items[${i}].dosage is required`);
  });
  return e;
}

module.exports = { nonEmpty, isValidPhone, isValidDate, isValidTime,
  validateProfile, validatePatient, validateAppointment, validatePrescription };