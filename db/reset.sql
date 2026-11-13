DROP VIEW IF EXISTS invoice_totals;
DROP TABLE IF EXISTS notifications, payments, invoice_items, invoices,
  prescription_items, prescriptions, medical_records, appointments,
  admissions, wards, doctors, patients, services, medications,
  departments, user_settings, users CASCADE;