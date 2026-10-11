-- Enable foreign keys in SQLite
PRAGMA foreign_keys = ON;

-- Drop if exists (so you can re-run)
DROP TABLE IF EXISTS enrolments;
DROP TABLE IF EXISTS students;
DROP TABLE IF EXISTS courses;

-- 1. STUDENTS TABLE
CREATE TABLE students (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 2. COURSES TABLE
CREATE TABLE courses (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 3. ENROLMENTS TABLE - join table for many-to-many
CREATE TABLE enrolments (
  id INTEGER PRIMARY KEY,
  student_id INTEGER NOT NULL,
  course_id INTEGER NOT NULL,
  grade TEXT,
  enrolled_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  UNIQUE(student_id, course_id)
);

-- SAMPLE DATA: 3 students
INSERT INTO students (name, email) VALUES ('Amina Otieno', 'amina@example.com');
INSERT INTO students (name, email) VALUES ('Brian Kamau', 'brian@example.com');
INSERT INTO students (name, email) VALUES ('Cynthia Wafula', 'cynthia@example.com');
INSERT INTO students (name, email) VALUES ('David Ochieng', 'david@example.com');

-- SAMPLE DATA: 3 courses
INSERT INTO courses (title, code) VALUES ('Web Development Foundations', 'WEB101');
INSERT INTO courses (title, code) VALUES ('Database Systems', 'DB202');
INSERT INTO courses (title, code) VALUES ('System Design', 'SYS303');

-- SAMPLE DATA: 5+ enrolments
INSERT INTO enrolments (student_id, course_id, grade) VALUES (1, 1, 'A');
INSERT INTO enrolments (student_id, course_id, grade) VALUES (1, 2, 'B');
INSERT INTO enrolments (student_id, course_id, grade) VALUES (2, 1, 'B+');
INSERT INTO enrolments (student_id, course_id, grade) VALUES (2, 3, 'A-');
INSERT INTO enrolments (student_id, course_id, grade) VALUES (3, 1, 'A');
INSERT INTO enrolments (student_id, course_id, grade) VALUES (3, 2, 'C');

-- QUERY 1: All courses for one student (by name) - Amina Otieno
SELECT courses.title, courses.code, enrolments.grade
FROM enrolments
JOIN students ON enrolments.student_id = students.id
JOIN courses ON enrolments.course_id = courses.id
WHERE students.name = 'Amina Otieno';

-- QUERY 2: All students on one course - WEB101
SELECT students.name, students.email, enrolments.grade
FROM enrolments
JOIN students ON enrolments.student_id = students.id
JOIN courses ON enrolments.course_id = courses.id
WHERE courses.code = 'WEB101';

-- QUERY 3: Number of students per course
SELECT courses.title, courses.code, COUNT(enrolments.student_id) AS student_count
FROM courses
LEFT JOIN enrolments ON courses.id = enrolments.course_id
GROUP BY courses.id;

-- QUERY 4: Students who have no enrolments
SELECT students.name, students.email
FROM students
LEFT JOIN enrolments ON students.id = enrolments.student_id
WHERE enrolments.student_id IS NULL;

-- QUERY 5: Update one enrolment's grade
UPDATE enrolments SET grade = 'A+' WHERE student_id = 1 AND course_id = 1;

-- Verify update
SELECT * FROM enrolments WHERE student_id = 1 AND course_id = 1;

-- Bonus: Index you would add
CREATE INDEX idx_enrolments_student_id ON enrolments(student_id);
CREATE INDEX idx_enrolments_course_id ON enrolments(course_id);