-- =====================================================================
-- FILE: sql_detective/hiring_ops_setup.sql
-- Part 2 - SQL Detective: the "hiring ops" dataset, loaded AS-IS
-- (schema and seed data copied unchanged from the assignment brief).
-- =====================================================================
-- HOW TO READ THIS FILE
--   Lines starting with -- are comments (ignored by the database).
--   ONLY comments were added to this file. Every table and every row of
--   data is exactly as given in the assignment PDF, because the PDF says
--   to load it "as-is" (no fixing, no cleaning).
--
-- WHAT THIS FILE IS, IN PLAIN ENGLISH
--   A small, separate database describing a company's hiring activity:
--     recruiters    - the company's recruiters (5 people)
--     job_postings  - the jobs they advertised (7 postings)
--     applicants    - people who applied (11 records)
--     interviews    - each interview round held (24 interviews)
--   The questions in sql_detective.sql are asked about THIS data.
--   It has nothing to do with the Recruiter Bot's candidates and jobs.
--
-- THE DATA IS DELIBERATELY A BIT MESSY. Things to notice:
--   * Applicants 1 and 2 are the SAME person (Ananya Rao). Her email is
--     written once in small letters and once with capitals.
--   * There is no "applications" table, so "who applied to which job"
--     has to be worked out from the interviews table.
--   * Some interview outcomes are NULL (empty) = still pending.
--   * Some applicants have no "source" (NULL).
--
-- HOW IT IS USED
--   scripts/run-detective.js (npm run detective) loads this file into a
--   temporary database and then runs the answers.
--
-- DATA TYPES USED BELOW
--   INT          = whole number
--   VARCHAR(100) = text up to 100 characters long
--   DATE         = a date written as 'YYYY-MM-DD', e.g. '2026-01-05'
-- =====================================================================


-- ---------------------------------------------------------------------
-- TABLE: recruiters - one row per recruiter.
-- Example row: 1 | Priya Shah | APAC   (APAC = Asia-Pacific region)
-- ---------------------------------------------------------------------
CREATE TABLE recruiters (
  -- Unique number for each recruiter.
  id INT PRIMARY KEY,
  -- Recruiter's name.
  name VARCHAR(100),
  -- Region they work in: APAC, NA (North America) or EMEA (Europe,
  -- Middle East and Africa).
  region VARCHAR(50)
);

-- ---------------------------------------------------------------------
-- TABLE: job_postings - one row per advertised job.
-- Example row: 1 | Backend Engineer I | 1 | Engineering | 2026-01-05 | open
--   -> "Posting 1, Backend Engineer I, owned by recruiter 1 (Priya Shah),
--       Engineering department, opened 5 Jan 2026, still open."
-- Note: the same title can appear several times (posting 1, 2 and 7 are
-- all "Backend Engineer I") - they are separate postings.
-- ---------------------------------------------------------------------
CREATE TABLE job_postings (
  -- Unique number for each posting.
  id INT PRIMARY KEY,
  -- Job title.
  title VARCHAR(100),
  -- Which recruiter owns this posting (a recruiters.id number).
  recruiter_id INT,
  -- Department, e.g. Engineering, Data, Infrastructure.
  department VARCHAR(50),
  -- The date the posting was opened.
  opened_date DATE,
  status VARCHAR(20) -- 'open', 'closed', 'on_hold'
);

-- ---------------------------------------------------------------------
-- TABLE: applicants - one row per applicant RECORD.
-- (Careful: one real person can have two records - see Ananya Rao.)
-- Example row: 3 | Ben Turner | ben.turner@mail.com | Job Board | 2026-01-07
-- ---------------------------------------------------------------------
CREATE TABLE applicants (
  -- Unique number for each applicant record.
  id INT PRIMARY KEY,
  -- Full name.
  full_name VARCHAR(100),
  -- Email address. The most reliable way to tell if two records are the
  -- same person - once capital letters are ignored.
  email VARCHAR(100),
  source VARCHAR(50), -- nullable
  -- (source = where they heard about the job, e.g. LinkedIn, Referral.
  --  "nullable" means it can be left empty.)
  -- The date they applied.
  applied_date DATE
);

-- ---------------------------------------------------------------------
-- TABLE: interviews - one row per interview round.
-- Example row: 1 | 1 | 1 | Screen | 2026-01-10 | passed
--   -> "Interview 1: applicant 1 (Ananya) for posting 1, the Screen
--       round, held 10 Jan 2026, she passed."
-- Interview stages, in usual order: Screen -> Technical -> Final.
-- A person who PASSES a FINAL interview counts as a successful hire
-- ("placement") in question Q5.
-- ---------------------------------------------------------------------
CREATE TABLE interviews (
  -- Unique number for each interview.
  id INT PRIMARY KEY,
  -- Which applicant record (an applicants.id).
  applicant_id INT,
  -- Which job posting (a job_postings.id).
  job_posting_id INT,
  stage VARCHAR(20), -- 'Screen', 'Technical', 'Final'
  -- The date of the interview.
  scheduled_date DATE,
  outcome VARCHAR(20) -- 'passed', 'failed', 'no_show', NULL (pending)
);

-- ---------------------------------------------------------------------
-- DATA: 5 recruiters.
-- "INSERT INTO recruiters VALUES (...)" = add these rows, filling the
-- columns in the order they were defined above (id, name, region).
-- ---------------------------------------------------------------------
INSERT INTO recruiters VALUES
(1, 'Priya Shah', 'APAC'),
(2, 'Daniel Ortiz', 'NA'),
(3, 'Fatima Al-Sayed', 'EMEA'),
(4, 'Wei Zhang', 'APAC'),
(5, 'Grace Okafor', 'EMEA');

-- ---------------------------------------------------------------------
-- DATA: 7 job postings (id, title, recruiter_id, department, opened_date, status).
-- Open ones: 1, 2, 4, 5. Closed: 3, 7. On hold: 6.
-- ---------------------------------------------------------------------
INSERT INTO job_postings VALUES
(1, 'Backend Engineer I', 1, 'Engineering', '2026-01-05', 'open'),
(2, 'Backend Engineer I', 2, 'Engineering', '2026-01-10', 'open'),
(3, 'Data Analyst', 3, 'Data', '2026-01-08', 'closed'),
(4, 'Backend Engineer II', 1, 'Engineering', '2026-02-01', 'open'),
(5, 'DevOps Engineer', 4, 'Infrastructure', '2026-01-20', 'open'),
(6, 'Data Analyst', 5, 'Data', '2026-02-05', 'on_hold'),
(7, 'Backend Engineer I', 2, 'Engineering', '2026-02-15', 'closed');

-- ---------------------------------------------------------------------
-- DATA: 11 applicant records (id, full_name, email, source, applied_date).
-- LOOK AT ROWS 1 AND 2: same name, and the emails differ ONLY in capital
-- letters (ananya.rao vs Ananya.Rao). It is one person with two records.
-- NULL in the source column = "not recorded".
-- ---------------------------------------------------------------------
INSERT INTO applicants VALUES
(1, 'Ananya Rao', 'ananya.rao@mail.com', 'LinkedIn', '2026-01-06'),
(2, 'Ananya Rao', 'Ananya.Rao@mail.com', 'Referral', '2026-02-04'),
(3, 'Ben Turner', 'ben.turner@mail.com', 'Job Board', '2026-01-07'),
(4, 'Chloe Martin', 'chloe.martin@mail.com', NULL, '2026-01-09'),
(5, 'Devansh Patel', 'devansh.patel@mail.com', 'LinkedIn', '2026-01-11'),
(6, 'Elena Popescu', 'elena.popescu@mail.com', 'Referral', '2026-01-12'),
(7, 'Farid Haidari', 'farid.haidari@mail.com', 'Job Board', '2026-01-13'),
(8, 'Grace Lin', 'grace.lin@mail.com', 'LinkedIn', '2026-01-15'),
(9, 'Hassan Malik', 'hassan.malik@mail.com', NULL, '2026-01-16'),
(10, 'Isla Fraser', 'isla.fraser@mail.com', 'Referral', '2026-01-18'),
(11, 'Jonas Weber', 'jonas.weber@mail.com', 'Job Board', '2026-02-10');

-- ---------------------------------------------------------------------
-- DATA: 24 interviews
-- (id, applicant_id, job_posting_id, stage, scheduled_date, outcome).
-- Things worth spotting:
--   * Row 7: applicant 3 (Ben) has a Final for posting 3 with no earlier
--     rounds - stages can be skipped.
--   * Row 15: 'no_show' = the applicant didn't turn up.
--   * Row 22: NULL outcome = result still pending.
--   * Applicant 6 (Elena) has interviews for postings 2 AND 7.
-- ---------------------------------------------------------------------
INSERT INTO interviews VALUES
(1, 1, 1, 'Screen', '2026-01-10', 'passed'),
(2, 1, 1, 'Technical', '2026-01-15', 'passed'),
(3, 1, 1, 'Final', '2026-01-22', 'passed'),
(4, 2, 4, 'Screen', '2026-02-05', 'passed'),
(5, 3, 1, 'Screen', '2026-01-11', 'passed'),
(6, 3, 1, 'Technical', '2026-01-16', 'failed'),
(7, 3, 3, 'Final', '2026-01-28', 'passed'),
(8, 4, 1, 'Screen', '2026-01-12', 'passed'),
(9, 4, 1, 'Final', '2026-01-24', 'failed'),
(10, 5, 2, 'Screen', '2026-01-14', 'passed'),
(11, 5, 2, 'Technical', '2026-01-19', 'passed'),
(12, 5, 2, 'Final', '2026-01-25', 'passed'),
(13, 6, 2, 'Screen', '2026-01-15', 'passed'),
(14, 6, 2, 'Final', '2026-01-26', 'failed'),
(15, 7, 2, 'Screen', '2026-01-16', 'no_show'),
(16, 8, 4, 'Screen', '2026-02-03', 'passed'),
(17, 8, 4, 'Technical', '2026-02-08', 'passed'),
(18, 8, 4, 'Final', '2026-02-12', 'passed'),
(19, 9, 4, 'Screen', '2026-02-04', 'passed'),
(20, 9, 4, 'Final', '2026-02-14', 'passed'),
(21, 10, 5, 'Screen', '2026-01-22', 'passed'),
(22, 10, 5, 'Technical', '2026-01-28', NULL),
(23, 11, 7, 'Final', '2026-02-20', 'passed'),
(24, 6, 7, 'Final', '2026-02-21', 'failed');
