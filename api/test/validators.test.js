const v = require('../src/validators');

const goodPatient = {
  first_name: 'Thabo', last_name: 'Nkosi', gender: 'Male',
  date_of_birth: '1990-05-12', phone_number: '0821234567',
  address: '12 Main Road, Alberton'
};

describe('phone validation', () => {
  test('accepts 10 digits starting with 0', () => {
    expect(v.isValidPhone('0821234567')).toBe(true);
  });
  test('rejects wrong length and letters', () => {
    expect(v.isValidPhone('082123')).toBe(false);
    expect(v.isValidPhone('08212345ab')).toBe(false);
    expect(v.isValidPhone('')).toBe(false);
  });
});

describe('patient validation', () => {
  test('a complete patient has no errors', () => {
    expect(v.validatePatient(goodPatient)).toHaveLength(0);
  });
  test('missing name is rejected', () => {
    expect(v.validatePatient({ ...goodPatient, first_name: '  ' })).toContain('first_name is required');
  });
  test('future date of birth is rejected', () => {
    expect(v.validatePatient({ ...goodPatient, date_of_birth: '2999-01-01' }))
      .toContain('date_of_birth cannot be in the future');
  });
  test('empty body does not crash', () => {
    expect(v.validatePatient().length).toBeGreaterThan(0);
  });
});

describe('appointment validation', () => {
  test('bad time is rejected', () => {
    const errors = v.validateAppointment({ patient_id: 1, doctor_id: 1, appointment_date: '2026-11-02', appointment_time: '25:99' });
    expect(errors).toContain('appointment_time must be HH:MM');
  });
  test('valid appointment passes', () => {
    expect(v.validateAppointment({ patient_id: 1, doctor_id: 1, appointment_date: '2026-11-02', appointment_time: '09:30' })).toHaveLength(0);
  });
});

describe('prescription validation', () => {
  const good = { patient_id: 1, doctor_id: 1, service_id: 1,
    items: [{ medication_id: 1, quantity: 2, dosage: '1 tablet twice daily' }] };
  test('valid prescription passes', () => {
    expect(v.validatePrescription(good)).toHaveLength(0);
  });
  test('no medications is rejected', () => {
    expect(v.validatePrescription({ ...good, items: [] })).toContain('items must contain at least one medication');
  });
  test('quantity 0 is rejected', () => {
    const bad = { ...good, items: [{ medication_id: 1, quantity: 0, dosage: 'x' }] };
    expect(v.validatePrescription(bad)).toContain('items[0].quantity must be 1 or more');
  });
});