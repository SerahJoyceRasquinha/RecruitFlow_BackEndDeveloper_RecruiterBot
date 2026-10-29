-- =====================================================================
-- FILE: sql_detective/sql_detective.sql
-- Part 2 - SQL Detective Challenge
-- Run against the dataset in hiring_ops_setup.sql (loaded unchanged).
-- Written in standard SQL; tested on SQLite (npm run detective).
-- Should also run on PostgreSQL and MySQL 8+.
-- =====================================================================
-- HOW TO READ THIS FILE
--   Lines starting with -- are comments (ignored by the database).
--   There are 5 questions. Each question has: a title line, a plain-
--   English explanation, the SQL answer, and the result it produces.
--
--   (Technical note: scripts/run-detective.js prints the 5 title lines -
--   the lines starting with two dashes, a space, a capital Q and a digit.
--   So no other comment line in this file starts that way.)
--
-- THE DATA (see hiring_ops_setup.sql for the full details)
--   recruiters (5), job_postings (7), applicants (11), interviews (24).
--
-- THREE DATA PROBLEMS SPOTTED BEFORE WRITING ANY QUERY
--
-- Data-quality issues noticed:
--   * Applicants 1 and 2 are the same person (Ananya Rao): same email
--     with different capitalisation. A "person" is therefore identified
--     by LOWER(TRIM(email)), not by applicants.id.
--       PLAIN ENGLISH: to tell people apart we compare their email
--       addresses after making every letter small (LOWER) and removing
--       spaces at the ends (TRIM). 'Ananya.Rao@mail.com' and
--       'ananya.rao@mail.com' then become identical.
--   * There is no applications table, so "applied to a job" is inferred
--     from interviews.job_posting_id.
--       PLAIN ENGLISH: if someone had an interview for a posting, we
--       treat that as "they applied to that posting".
--   * Some applicants skip stages (e.g. Ben Turner goes straight to a
--     Final for posting 3), so "reached Final" means "has a Final-stage
--     interview row", not "passed every earlier stage".
--
-- SQL WORDS YOU WILL SEE (quick dictionary)
--   SELECT ... FROM ...  = "show these columns from this table"
--   WHERE                = "only rows that meet this condition"
--   JOIN ... ON ...      = "combine two tables where these columns match"
--   LEFT JOIN            = same, but KEEP rows from the first table even
--                          when the second table has no match
--   GROUP BY             = "put rows into groups" (e.g. one group per
--                          recruiter) so we can count per group
--   COUNT, SUM           = count rows / add numbers up, per group
--   HAVING               = "only groups that meet this condition"
--   ORDER BY             = sort the results
--   AS                   = give a column a friendly name
--   jp, r, a, i          = short nicknames for tables, set after the
--                          table name (e.g. "job_postings jp")
-- =====================================================================


-- Q1: All currently open job postings, with the owning recruiter's name.
-- ---------------------------------------------------------------------
-- PLAIN ENGLISH: list every job posting whose status is "open", and next
-- to each one show the NAME of the recruiter in charge of it.
-- HOW: the postings table only stores the recruiter's NUMBER
-- (recruiter_id), so we JOIN to the recruiters table to fetch the name.
-- LEFT JOIN so a posting whose recruiter row is missing still appears.
--   (With a plain JOIN, such a posting would silently disappear.)
-- LOWER(TRIM(status)) also accepts messy values like 'Open' or ' open '.
-- RESULT: postings 1, 2, 4, 5
--   1 Backend Engineer I  - Priya Shah
--   2 Backend Engineer I  - Daniel Ortiz
--   4 Backend Engineer II - Priya Shah
--   5 DevOps Engineer     - Wei Zhang
-- ---------------------------------------------------------------------
-- The columns to show. "jp.id AS job_posting_id" = show the posting's id
-- under the heading job_posting_id.
SELECT jp.id            AS job_posting_id,
       jp.title,
       jp.department,
       jp.opened_date,
       r.name           AS recruiter_name
-- Start from the postings table (nicknamed jp).
FROM job_postings jp
-- Attach each posting's recruiter: match recruiters.id to the posting's
-- recruiter_id.
LEFT JOIN recruiters r ON r.id = jp.recruiter_id
-- Keep only open postings.
WHERE LOWER(TRIM(jp.status)) = 'open'
-- Sort by posting number.
ORDER BY jp.id;


-- Q2: For each job posting, how many applicants reached the Final stage?
-- ---------------------------------------------------------------------
-- PLAIN ENGLISH: for EVERY posting (all 7), count how many different
-- people had a Final-round interview for it. Postings where nobody got
-- that far must still be listed, with 0.
-- LEFT JOIN keeps postings with zero Final interviews (they show 0).
--   TRAP: with a plain JOIN, postings 5 and 6 (no Finals) would vanish.
-- The condition stage = 'Final' is placed inside the JOIN's ON part,
--   not in a WHERE. A WHERE would throw away the "no match" rows again
--   and postings 5 and 6 would disappear after all.
-- COUNT(DISTINCT LOWER(email)) counts PEOPLE, so duplicate applicant
-- records or repeated Final rows for one person are counted once.
--   DISTINCT = "count each different value only once".
-- RESULT (posting: count): 1:2, 2:2, 3:1, 4:2, 5:0, 6:0, 7:2
-- ---------------------------------------------------------------------
-- Show the posting and the number of different people (by email).
SELECT jp.id                                        AS job_posting_id,
       jp.title,
       COUNT(DISTINCT LOWER(TRIM(a.email)))         AS applicants_reached_final
-- Start from ALL postings.
FROM job_postings jp
-- Attach only the FINAL-stage interviews for each posting
-- (postings with none are kept, with empty values).
LEFT JOIN interviews i ON i.job_posting_id = jp.id
                      AND i.stage = 'Final'
-- Attach the applicant for each of those interviews, to get the email.
LEFT JOIN applicants a ON a.id = i.applicant_id
-- One group (one result row) per posting.
GROUP BY jp.id, jp.title
-- Sort by posting number.
ORDER BY jp.id;


-- Q3: People who effectively applied to more than one job posting.
-- ---------------------------------------------------------------------
-- PLAIN ENGLISH: find the real PEOPLE (not records) who show up for two
-- or more different postings.
-- Trap: Ananya Rao has two applicant ids (emails differ only in case),
-- so grouping by applicant id would hide that she applied to postings
-- 1 and 4. Group by the normalised email instead.
--   "Normalised" = tidied into one standard form (small letters, no
--   extra spaces), so both of her records land in the same group.
-- RESULT: Ananya Rao (2), Ben Turner (2), Elena Popescu (2)
-- ---------------------------------------------------------------------
-- Show the tidied email, a name, and how many different postings.
--   MIN(a.full_name) = pick one name from the group (needed because the
--   group may contain several records; for Ananya both say the same).
SELECT LOWER(TRIM(a.email))                          AS person_email,
       MIN(a.full_name)                              AS full_name,
       COUNT(DISTINCT i.job_posting_id)              AS postings_applied_to
-- Start from applicant records.
FROM applicants a
-- Attach their interviews (an interview = evidence of an application).
JOIN interviews i ON i.applicant_id = a.id
-- One group per real person (per tidied email).
GROUP BY LOWER(TRIM(a.email))
-- Keep only people with MORE than 1 different posting.
--   HAVING (not WHERE) because this condition is about a COUNT, which
--   only exists after the rows are grouped.
HAVING COUNT(DISTINCT i.job_posting_id) > 1
-- Sort alphabetically by email.
ORDER BY person_email;


-- Q4: Final-stage conversion rate per recruiter
--     (passed / total Final-stage interviews),
--     only for recruiters with at least 3 Final-stage interviews.
-- ---------------------------------------------------------------------
-- PLAIN ENGLISH: for each recruiter, of all the Final interviews on
-- their postings, what fraction ended in "passed"? Only show recruiters
-- with at least 3 Finals (fewer is too small to judge fairly).
-- Example: 3 passed out of 4 Finals = 0.75 (75%).
-- 1.0 * forces decimal division (in integer division 3 / 4 = 0).
--   PLAIN ENGLISH: dividing two whole numbers in SQL throws away the
--   decimals, so 3 / 4 would give 0. Multiplying by 1.0 first gives 0.75.
-- Pending (NULL outcome) Finals still count in the total, as asked.
-- RESULT: Priya Shah 0.75 (3 of 4), Daniel Ortiz 0.5 (2 of 4).
--   Other recruiters have fewer than 3 Finals, so they are left out.
-- ---------------------------------------------------------------------
-- Show the recruiter, total Finals, Finals passed, and the rate.
--   SUM(CASE WHEN outcome = 'passed' THEN 1 ELSE 0 END)
--   = give each passed row a 1 and every other row a 0, then add them
--     up. Result: the number of passed Finals. (This trick is called
--     "conditional counting".)
--   ROUND(..., 2) = round the rate to 2 decimal places.
SELECT r.id                                                     AS recruiter_id,
       r.name                                                   AS recruiter_name,
       COUNT(*)                                                 AS final_interviews,
       SUM(CASE WHEN i.outcome = 'passed' THEN 1 ELSE 0 END)    AS final_passed,
       ROUND(1.0 * SUM(CASE WHEN i.outcome = 'passed' THEN 1 ELSE 0 END)
             / COUNT(*), 2)                                     AS conversion_rate
-- Start from recruiters.
FROM recruiters r
-- Attach the postings each recruiter owns.
JOIN job_postings jp ON jp.recruiter_id = r.id
-- Attach the interviews for those postings.
JOIN interviews i    ON i.job_posting_id = jp.id
-- Keep only Final-stage interviews.
WHERE i.stage = 'Final'
-- One group per recruiter.
GROUP BY r.id, r.name
-- Only recruiters with 3 or more Finals.
HAVING COUNT(*) >= 3
-- Best rate first; if two rates tie, lower recruiter id first.
ORDER BY conversion_rate DESC, r.id;


-- Q5 (Bonus): Recruiter with the most successful placements
--             (passed at Final stage) per department, using a window function.
-- ---------------------------------------------------------------------
-- PLAIN ENGLISH: a "placement" = someone who PASSED a Final interview
-- (i.e. got hired). For each department, which recruiter made the most
-- placements?
-- HOW, in two helper steps (WITH ... AS = named helper steps):
--   Step A "placements": count placements per (department, recruiter).
--   Step B "ranked": inside each department, give 1st place, 2nd place...
--   Final: keep only the 1st-place rows.
-- WINDOW FUNCTION: RANK() OVER (PARTITION BY department ORDER BY ... DESC)
--   PLAIN ENGLISH: "rank the rows, but restart the ranking for each
--   department", like separate league tables per department. Unlike
--   GROUP BY, it keeps every row and just adds a rank number to each.
-- RANK() gives ties the same rank, so if two recruiters tie for the top
-- spot in a department, both are returned.
--   Example: scores 5, 5, 3 get ranks 1, 1, 3.
--   (ROW_NUMBER would give 1, 2, 3 and unfairly drop one of the tied.)
-- Departments with zero placements have no row to rank, so they do not appear.
--   (Infrastructure has none, so it is not listed.)
-- RESULT: Data - Fatima Al-Sayed (1);  Engineering - Priya Shah (3)
-- ---------------------------------------------------------------------
-- Step A: placements per department and recruiter.
WITH placements AS (
    -- Show department, recruiter, and how many placements.
    SELECT jp.department,
           r.id                 AS recruiter_id,
           r.name               AS recruiter_name,
           COUNT(*)             AS successful_placements
    -- Start from interviews...
    FROM interviews i
    -- ...attach the posting (to know its department and recruiter)...
    JOIN job_postings jp ON jp.id = i.job_posting_id
    -- ...and attach the recruiter (to know their name).
    JOIN recruiters r    ON r.id = jp.recruiter_id
    -- Only PASSED FINAL interviews count as placements.
    WHERE i.stage = 'Final'
      AND i.outcome = 'passed'
    -- One group per (department, recruiter) combination.
    GROUP BY jp.department, r.id, r.name
),
-- Step B: rank recruiters within each department.
ranked AS (
    -- Keep every column from step A (p.*) and add the rank number.
    SELECT p.*,
           RANK() OVER (PARTITION BY department
                        ORDER BY successful_placements DESC) AS rank_in_department
    FROM placements p
)
-- Final answer: only the top-ranked recruiter(s) of each department.
SELECT department, recruiter_name, successful_placements
FROM ranked
WHERE rank_in_department = 1
-- Sort by department name.
ORDER BY department;
