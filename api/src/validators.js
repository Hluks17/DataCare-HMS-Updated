
const nonEmpty = v => typeof v === 'string' && v.trim().length > 0;
const isValidEmail = v => nonEmpty(v) && /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/.test(v.trim()) && v.trim().length <= 150;
const isValidPhone = v => {
  if (!nonEmpty(v)) return false;
  const n = v.replace(/[\s()-]/g, '');
  return /^(?:\+27|0)(?:6|7|8)\d{8}$/.test(n);
};

function isValidSAID(value) {
  if (!nonEmpty(value)) return false;

  const id = value.trim();

  // Must contain exactly 13 digits
  if (!/^\d{13}$/.test(id)) return false;

  // First six digits must represent a valid date: YYMMDD
  const yy = Number(id.slice(0, 2));
  const mm = Number(id.slice(2, 4));
  const dd = Number(id.slice(4, 6));

  const now = new Date();
  const currentYear = now.getFullYear() % 100;

  const year = yy <= currentYear ? 2000 + yy : 1900 + yy;

  const date = new Date(year, mm - 1, dd);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== mm - 1 ||
    date.getDate() !== dd ||
    date > now
  ) {
    return false;
  }

  // Remaining seven digits only need to be numeric.
  // Strict South African ID checksum validation is removed.
  return true;
}

const isStrongPassword = p => typeof p === 'string' &&
  p.length >= 10 && p.length <= 128 &&
  /[a-z]/.test(p) && /[A-Z]/.test(p) && /\d/.test(p) && /[^A-Za-z0-9]/.test(p);
const isValidDate = v => nonEmpty(v) && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));
const isValidTime = v => nonEmpty(v) && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
function validateRegistration(b={}) {
  const e=[];
  for (const [field,label] of [['first_name','Name'],['last_name','Surname']])
    if (!nonEmpty(b[field]) || b[field].trim().length > 60) e.push(`${label} is required (maximum 60 characters)`);
  if (!isValidPhone(b.phone_number)) e.push('Enter a valid South African cell number, e.g. 0821234567 or +27821234567');
  if (!isValidSAID(b.id_number)) e.push('Enter a valid 13-digit South African ID number');
  if (!isValidEmail(b.email)) e.push('Enter a valid email address');
  if (!isStrongPassword(b.password)) e.push('Password must be at least 10 characters and include uppercase, lowercase, a number and a special character');
  return e;
}
function validateProfile(b={}) {
  const e=[];
  if (!nonEmpty(b.first_name)) e.push('first_name is required');
  if (!nonEmpty(b.last_name)) e.push('last_name is required');
  if (b.phone_number && !isValidPhone(b.phone_number)) e.push('Invalid South African cell number');
  return e;
}
function validatePatient(b={}) {
  const e=[];
  if (!nonEmpty(b.first_name)) e.push('first_name is required');
  if (!nonEmpty(b.last_name)) e.push('last_name is required');
  if (b.gender && !['Male','Female','Other'].includes(b.gender)) e.push('gender must be Male, Female or Other');
  if (b.date_of_birth && !isValidDate(b.date_of_birth)) e.push('date_of_birth must be YYYY-MM-DD');
  else if (b.date_of_birth && Date.parse(b.date_of_birth) > Date.now()) e.push('date_of_birth cannot be in the future');
  if (b.phone_number && !isValidPhone(b.phone_number)) e.push('Invalid South African cell number');
  if (b.address !== undefined && !nonEmpty(b.address)) e.push('address is required');
  return e;
}
function validateAppointment(b={}) {
  const e=[];
  if (!Number.isInteger(Number(b.doctor_id))) e.push('doctor_id is required');
  if (!isValidDate(b.appointment_date) || b.appointment_date < new Date().toISOString().slice(0,10)) e.push('Choose a valid future date');
  if (!isValidTime(b.appointment_time)) e.push('appointment_time must be HH:MM');
  return e;
}
function validatePrescription(b={}) {
 const e=[];
 if(!Number.isInteger(b.patient_id))e.push('patient_id is required');
 if(!Number.isInteger(b.doctor_id))e.push('doctor_id is required');
 if(!Number.isInteger(b.service_id))e.push('service_id is required (consultation type)');
 if(!Array.isArray(b.items)||!b.items.length)e.push('items must contain at least one medication');
 else b.items.forEach((it,i)=>{if(!Number.isInteger(it.medication_id))e.push(`items[${i}].medication_id is required`);if(!Number.isInteger(it.quantity)||it.quantity<1)e.push(`items[${i}].quantity must be 1 or more`);if(!nonEmpty(it.dosage))e.push(`items[${i}].dosage is required`);});
 return e;
}
module.exports={nonEmpty,isValidEmail,isValidPhone,isValidSAID,isStrongPassword,isValidDate,isValidTime,
 validateRegistration,validateProfile,validatePatient,validateAppointment,validatePrescription};
