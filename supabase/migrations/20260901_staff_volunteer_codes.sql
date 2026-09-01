-- Rename teachers -> staff (covers Teacher/Helper/Director/Adviser roles, not just teachers)
ALTER TABLE teachers RENAME TO staff;

-- Add unique roll-number-style codes, matching the pattern already used for students
ALTER TABLE staff ADD COLUMN staff_code text UNIQUE;
ALTER TABLE staff ADD COLUMN designation text;

ALTER TABLE volunteers ADD COLUMN volunteer_code text UNIQUE;
ALTER TABLE volunteers ADD COLUMN school_class text;

-- Keep staff_attendance's person_type check aligned with the renamed table
ALTER TABLE staff_attendance DROP CONSTRAINT IF EXISTS staff_attendance_person_type_check;
ALTER TABLE staff_attendance ADD CONSTRAINT staff_attendance_person_type_check CHECK (person_type IN ('staff', 'volunteer'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_staff_code ON staff(staff_code);
CREATE UNIQUE INDEX IF NOT EXISTS idx_volunteers_volunteer_code ON volunteers(volunteer_code);
