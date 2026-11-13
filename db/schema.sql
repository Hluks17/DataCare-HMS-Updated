CREATE TABLE users (
  user_id      SERIAL PRIMARY KEY,
  firebase_uid VARCHAR(128) UNIQUE NOT NULL,
  email        VARCHAR(150) UNIQUE NOT NULL,
  first_name   VARCHAR(50) NOT NULL,
  last_name    VARCHAR(50) NOT NULL,
  phone_number VARCHAR(15),                       -- for the Profile screen
  role         VARCHAR(30) NOT NULL DEFAULT 'patient'
               CHECK (role IN ('patient','receptionist','doctor','nurse',
                               'pharmacist','billing_clerk','manager','admin')),
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE user_settings (
  user_id               INT PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
  notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  dark_mode             BOOLEAN NOT NULL DEFAULT FALSE,
  language              VARCHAR(10) NOT NULL DEFAULT 'en'
);

CREATE TABLE departments (
  department_id SERIAL PRIMARY KEY,
  name          VARCHAR(80) UNIQUE NOT NULL,
  location      VARCHAR(80)
);

CREATE TABLE patients (
  patient_id    SERIAL PRIMARY KEY,
  user_id       INT UNIQUE REFERENCES users(user_id),   -- links a patient to their login
  first_name    VARCHAR(50) NOT NULL,
  last_name     VARCHAR(50) NOT NULL,
  gender        VARCHAR(10) NOT NULL CHECK (gender IN ('Male','Female','Other')),
  date_of_birth DATE NOT NULL,
  phone_number  VARCHAR(15) NOT NULL,
  address       VARCHAR(255) NOT NULL,
  medical_aid   VARCHAR(80),
  created_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE doctors (
  doctor_id      SERIAL PRIMARY KEY,
  user_id        INT UNIQUE REFERENCES users(user_id),
  department_id  INT NOT NULL REFERENCES departments(department_id),
  full_name      VARCHAR(100) NOT NULL,
  specialisation VARCHAR(80) NOT NULL,
  contact_number VARCHAR(15) NOT NULL,
  availability   VARCHAR(20) NOT NULL DEFAULT 'Available'
);

CREATE TABLE wards (
  ward_id    SERIAL PRIMARY KEY,
  ward_name  VARCHAR(50) NOT NULL,
  bed_number INT NOT NULL,
  status     VARCHAR(20) NOT NULL DEFAULT 'Available',
  UNIQUE (ward_name, bed_number)
);

CREATE TABLE admissions (
  admission_id   SERIAL PRIMARY KEY,
  patient_id     INT NOT NULL REFERENCES patients(patient_id),
  ward_id        INT NOT NULL REFERENCES wards(ward_id),
  admission_date DATE NOT NULL,
  discharge_date DATE,
  status         VARCHAR(20) NOT NULL DEFAULT 'Admitted'
);

CREATE TABLE appointments (
  appointment_id   SERIAL PRIMARY KEY,
  patient_id       INT NOT NULL REFERENCES patients(patient_id),
  doctor_id        INT NOT NULL REFERENCES doctors(doctor_id),
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  appointment_type VARCHAR(30) NOT NULL DEFAULT 'Consultation',
  ward_allocation  VARCHAR(50),
  status           VARCHAR(20) NOT NULL DEFAULT 'Pending'
                   CHECK (status IN ('Pending','Confirmed','Cancelled','Completed')),
  UNIQUE (doctor_id, appointment_date, appointment_time)
);

CREATE TABLE medical_records (
  record_id   SERIAL PRIMARY KEY,
  patient_id  INT NOT NULL REFERENCES patients(patient_id),
  doctor_id   INT NOT NULL REFERENCES doctors(doctor_id),
  diagnosis   TEXT NOT NULL,
  treatment   TEXT,
  record_date DATE NOT NULL DEFAULT CURRENT_DATE
);

-- Price lists (new: supports the pricing and billing feature)
CREATE TABLE medications (
  medication_id SERIAL PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  strength      VARCHAR(30),
  unit_price    NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
  stock_qty     INT NOT NULL DEFAULT 0 CHECK (stock_qty >= 0)
);

CREATE TABLE services (
  service_id SERIAL PRIMARY KEY,
  name       VARCHAR(100) UNIQUE NOT NULL,
  price      NUMERIC(10,2) NOT NULL CHECK (price >= 0)
);

CREATE TABLE prescriptions (
  prescription_id   SERIAL PRIMARY KEY,
  patient_id        INT NOT NULL REFERENCES patients(patient_id),
  doctor_id         INT NOT NULL REFERENCES doctors(doctor_id),
  notes             TEXT,
  prescription_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status            VARCHAR(20) NOT NULL DEFAULT 'Active'
);

CREATE TABLE prescription_items (
  item_id         SERIAL PRIMARY KEY,
  prescription_id INT NOT NULL REFERENCES prescriptions(prescription_id) ON DELETE CASCADE,
  medication_id   INT NOT NULL REFERENCES medications(medication_id),
  quantity        INT NOT NULL CHECK (quantity > 0),
  dosage          VARCHAR(100) NOT NULL,
  unit_price      NUMERIC(10,2) NOT NULL        -- price at the time it was prescribed
);

CREATE TABLE invoices (
  invoice_id      SERIAL PRIMARY KEY,
  invoice_number  VARCHAR(20) UNIQUE NOT NULL,
  patient_id      INT NOT NULL REFERENCES patients(patient_id),
  prescription_id INT REFERENCES prescriptions(prescription_id),
  billing_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_status  VARCHAR(20) NOT NULL DEFAULT 'Outstanding'
                  CHECK (payment_status IN ('Outstanding','Paid','Pending'))
);

CREATE TABLE invoice_items (
  invoice_item_id SERIAL PRIMARY KEY,
  invoice_id  INT NOT NULL REFERENCES invoices(invoice_id) ON DELETE CASCADE,
  description VARCHAR(150) NOT NULL,
  quantity    INT NOT NULL CHECK (quantity > 0),
  unit_price  NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0)
);

CREATE TABLE payments (
  payment_id     SERIAL PRIMARY KEY,
  invoice_id     INT NOT NULL REFERENCES invoices(invoice_id),
  payment_method VARCHAR(30) NOT NULL,
  payment_date   DATE NOT NULL,
  amount_paid    NUMERIC(10,2) NOT NULL CHECK (amount_paid > 0)
);

CREATE TABLE notifications (
  notification_id SERIAL PRIMARY KEY,
  user_id    INT NOT NULL REFERENCES users(user_id),
  message    VARCHAR(255) NOT NULL,
  is_read    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Totals are calculated from the lines, never stored, so they can't go out of date
CREATE VIEW invoice_totals AS
  SELECT invoice_id, SUM(quantity * unit_price) AS total
  FROM invoice_items GROUP BY invoice_id;

   ALTER VIEW invoice_totals SET (security_invoker = true);

INSERT INTO medications (name, strength, unit_price, stock_qty) VALUES
 ('Paracetamol','500mg',45.00,200),   ('Ibuprofen','400mg',60.00,150),
 ('Amoxicillin','500mg',120.00,100),  ('Metformin','850mg',85.00,120),
 ('Amlodipine','5mg',95.00,90),       ('Salbutamol','Inhaler',150.00,60),
 ('Omeprazole','20mg',110.00,80),     ('Cetirizine','10mg',55.00,140),
 ('Atorvastatin','20mg',130.00,70),   ('Azithromycin','500mg',175.00,50);

INSERT INTO services (name, price) VALUES
 ('Consultation',500.00),        ('Follow-up consultation',350.00),
 ('Emergency visit',1200.00),    ('X-ray',650.00),
 ('Blood test',420.00),          ('ECG',480.00),
 ('Ultrasound',750.00),          ('Physiotherapy session',380.00),
 ('Vaccination',250.00),         ('Specialist consultation',850.00);