# School Database Design

## Tables

### 1. students
- id (INTEGER PRIMARY KEY) - unique id for each student, auto-incremented
- name (TEXT NOT NULL) - student's full name, must exist
- email (TEXT NOT NULL UNIQUE) - unique email, no two students can share it
- created_at (TEXT DEFAULT CURRENT_TIMESTAMP) - auto-filled date

### 2. courses
- id (INTEGER PRIMARY KEY) - unique id
- title (TEXT NOT NULL) - course name e.g. Web Development Foundations
- code (TEXT NOT NULL UNIQUE) - short code e.g. WEB101, unique to avoid duplicates
- created_at (TEXT DEFAULT CURRENT_TIMESTAMP)

### 3. enrolments (join table)
- id (INTEGER PRIMARY KEY)
- student_id (INTEGER NOT NULL, FK -> students.id) - which student
- course_id (INTEGER NOT NULL, FK -> courses.id) - which course
- grade (TEXT) - grade for that enrolment, e.g. A, B+
- enrolled_at (TEXT DEFAULT CURRENT_TIMESTAMP)
- UNIQUE(student_id, course_id) - prevents same student enrolling on same course twice

## Relationships

- **students -> enrolments: one-to-many.** One student can have many enrolments, but each enrolment belongs to exactly one student. Implemented with enrolments.student_id foreign key.

- **courses -> enrolments: one-to-many.** One course can have many enrolments, but each enrolment belongs to one course. Implemented with enrolments.course_id foreign key.

- **students <-> courses: many-to-many.** A student can take many courses, and a course can have many students. You cannot model this with a single foreign key because you'd need a list in one column (which violates normalization rules).

  **Why a join table is needed:** The enrolments table is the join table. It stores pairs (student_id, course_id) plus extra data about the enrolment itself (grade, date). This is the standard way to break a many-to-many into two one-to-many relationships.

## Index

**Index I would add:** `CREATE INDEX idx_enrolments_student_id ON enrolments(student_id);`

**Reason:** Most queries filter by student_id (e.g. "all courses for Amina") and course_id. Without an index, the database must scan every row in enrolments. With an index on student_id, it jumps directly to that student's rows, like an index at the back of a book. This makes reads much faster for the common query pattern. Primary keys are already indexed automatically.

An additional index on course_id (`idx_enrolments_course_id`) would speed up "all students on one course" queries for the same reason.

## SQL vs NoSQL for this system

I would choose **SQL (relational)** for this school system.

**Why SQL:**
- Data is highly structured: students, courses, enrolments all have fixed fields.
- Relationships are clear and important: we need JOINs to get courses for a student.
- Correctness is critical: we must enforce rules like "email must be unique" and "cannot enrol twice" and "every enrolment must point to a real student and course" - SQL enforces this with UNIQUE, NOT NULL, FOREIGN KEY.
- Transactions (ACID) ensure enrolments are consistent.

**When NoSQL would be better:** If the system stored very flexible, unstructured data like student portfolios with images, videos, checklists, where each student has different fields, a document database like MongoDB/Firestore would be more flexible. But for grades, enrolments and attendance where correctness matters, SQL is the better fit.

This is the same design pattern used for QuickNotes if it had multiple users: users -> notes is one-to-many, notes <-> tags is many-to-many needing a join table note_tags.