-- =====================================================================
-- FILE: db/matching.sql      (THE MOST IMPORTANT FILE IN THE PROJECT)
-- =====================================================================
-- HOW TO READ THIS FILE
--   Lines starting with -- are comments (ignored by the database).
--
-- WHAT THIS FILE DOES, IN PLAIN ENGLISH
--   This is the "brain" of the Recruiter Bot. For EVERY possible
--   (candidate, job) pair it works out a SCORE from 0 to 100 that says
--   how good a fit that person is for that job, plus a one-line REASON
--   that a human can read.
--
--   15 candidates x 6 jobs = 90 pairs, so it produces 90 scored rows.
--
-- HOW THE SCORE IS MADE (a recipe with 4 ingredients)
--   Skills        up to 60 points  - does the person have the skills the job needs?
--   Experience    up to 20 points  - do they have enough years?
--   Culture       up to 10 points  - do their personality words match the job's culture words?
--   Availability  up to 10 points  - can they start soon?
--                 ---------------
--   Total         up to 100 points
--
--   WHY THESE WEIGHTS: a recruiter can't hire someone who can't do the
--   work, so skills count the most. The assignment says experience must
--   count too, so it comes second. Culture and availability are "nice
--   to have" signals that mainly decide between people whose skills are
--   similar.
--
-- WORKED EXAMPLE (keep this in mind while reading)
--   Sherlock H. for the job "Backend Detective":
--     Skills:  job needs 3 skills, he has all 3   -> 3/3 = 1.0 -> 60 x 1.0 = 60
--     Exper.:  he has 8 yrs, job needs 3          ->  enough   -> 20 x 1.0 = 20
--     Culture: job wants 2 words, he has 1        -> 1/2 = 0.5 -> 10 x 0.5 =  5
--     Avail.:  "Immediate"                        ->      1.0  -> 10 x 1.0 = 10
--     TOTAL = 95
--
-- WHAT A "VIEW" IS
--   A VIEW is a saved question (a saved SELECT query) that you can use as
--   if it were a table. It stores NO data of its own. Every time the
--   program reads from it, the calculation runs again on the current
--   data. So if a new candidate is added, they are scored immediately -
--   nothing needs to be "recalculated" by hand.
--   Analogy: a formula cell in Excel. It always shows the up-to-date
--   answer based on the other cells.
--
-- WHO USES THIS VIEW
--   src/app.js reads from it for both web addresses:
--     GET /jobs/:id/matches        -> "rows WHERE job_id = this job",   sorted by score
--     GET /candidates/:id/matches  -> "rows WHERE candidate_id = this person", sorted by score
--   Both directions use the SAME calculation, so they can never disagree.
--
-- HOW TO CHANGE A WEIGHT
--   Go to "STEP 3" below and change the numbers 60 / 20 / 10 / 10 (in both
--   the score line and the matching *_points line). Then stop the server
--   (Ctrl+C) and start it again (npm run dev). src/db.js rebuilds this
--   view from this file every time the server starts.
-- =====================================================================


-- "CREATE VIEW match_scores AS" = create a saved query named match_scores.
-- Everything from here to the final semicolon (;) at the very end of
-- the file is that one saved query.
CREATE VIEW match_scores AS

-- "WITH" starts a list of named helper steps (called CTEs - Common Table
-- Expressions). Each step is a small temporary table that the next step
-- builds on, like the rough-work lines in a maths answer.
-- There are two helper steps (pair_counts, pair_fits) and then a final
-- SELECT that produces the answer.
WITH

-- =====================================================================
-- STEP 1: pair_counts  -  "COUNT THINGS FOR EVERY PAIR"
--   For every (candidate, job) pair, count how many skills the job
--   needs, how many the person has, and the same for culture words.
--   Also collect the NAMES of matched and missing skills, for the
--   reason sentence later.
-- =====================================================================
-- "pair_counts AS ( ... )" = name this helper step "pair_counts".
pair_counts AS (
    -- SELECT = "give me these columns". The list below is the columns
    -- this step produces. "X AS y" means "take X and call it y".
    SELECT
        -- Copy basic facts about the candidate. "c" is a short nickname
        -- for the candidates table (given at the bottom: FROM candidates c).
        -- Example values: 1, 'Sherlock H.', 8, 'Immediate'
        c.id               AS candidate_id,
        c.name             AS candidate_name,
        c.experience_years AS experience_years,
        c.availability     AS availability,
        -- Copy basic facts about the job. "j" is the nickname for jobs.
        -- Example values: 1, 'Backend Detective', 3
        j.id               AS job_id,
        j.title            AS job_title,
        j.min_experience   AS min_experience,

        -- ---------------------------------------------------------------
        -- required_skills: HOW MANY SKILLS DOES THE JOB NEED?
        --   The bracket ( SELECT ... ) is a "sub-query": a small question
        --   asked once for each pair.
        --   COUNT(*) = count the rows.
        --   "FROM job_skills js" = look in the job_skills table (nicknamed js).
        --   "WHERE js.job_id = j.id" = only rows belonging to THIS job.
        --   Example: Backend Detective has 3 rows -> 3.
        -- ---------------------------------------------------------------
        (SELECT COUNT(*) FROM job_skills js
          WHERE js.job_id = j.id)                                   AS required_skills,

        -- ---------------------------------------------------------------
        -- matched_skills: HOW MANY OF THOSE DOES THE CANDIDATE HAVE?
        --   "JOIN candidate_skills cs ON cs.skill_id = js.skill_id"
        --     = line up the job's skills with the candidate's skills and
        --       keep only the ones with the SAME skill number.
        --   "cs.candidate_id = c.id" = only THIS candidate's skills.
        --   Example: Sheldon has 1 of Backend Detective's 3 skills -> 1.
        --   (This only works because skills are stored as numbers in a
        --   shared dictionary - see db/schema.sql.)
        -- ---------------------------------------------------------------
        (SELECT COUNT(*) FROM job_skills js
           JOIN candidate_skills cs ON cs.skill_id = js.skill_id
          WHERE js.job_id = j.id AND cs.candidate_id = c.id)        AS matched_skills,

        -- ---------------------------------------------------------------
        -- matched_skill_names: THE NAMES OF THE SHARED SKILLS, as one text.
        --   Same matching as above, plus a JOIN to the skills table to turn
        --   numbers back into words.
        --   GROUP_CONCAT(s.name, ', ') = glue all the names together with
        --   a comma and space between them.
        --   Example: 'deduction, pattern-recognition, forensics'
        --   If nothing matches, the result is empty (NULL).
        -- ---------------------------------------------------------------
        (SELECT GROUP_CONCAT(s.name, ', ') FROM job_skills js
           JOIN candidate_skills cs ON cs.skill_id = js.skill_id
           JOIN skills s            ON s.id = js.skill_id
          WHERE js.job_id = j.id AND cs.candidate_id = c.id)        AS matched_skill_names,

        -- ---------------------------------------------------------------
        -- missing_skill_names: SKILLS THE JOB NEEDS BUT THE PERSON LACKS.
        --   "NOT IN (SELECT ... )" = keep only the job's skills that are
        --   NOT in this candidate's own list of skills.
        --   Example: Sheldon for Backend Detective -> 'deduction, forensics'
        --   If nothing is missing, the result is empty (NULL).
        -- ---------------------------------------------------------------
        (SELECT GROUP_CONCAT(s.name, ', ') FROM job_skills js
           JOIN skills s ON s.id = js.skill_id
          WHERE js.job_id = j.id
            AND js.skill_id NOT IN (SELECT cs.skill_id FROM candidate_skills cs
                                     WHERE cs.candidate_id = c.id))  AS missing_skill_names,

        -- ---------------------------------------------------------------
        -- culture_total: HOW MANY CULTURE WORDS DOES THE JOB LIST?
        --   Every job in the data lists 2. Example: 2.
        -- ---------------------------------------------------------------
        (SELECT COUNT(*) FROM job_culture jc
          WHERE jc.job_id = j.id)                                   AS culture_total,

        -- ---------------------------------------------------------------
        -- matched_culture: HOW MANY OF THOSE WORDS ARE ALSO THE PERSON'S TRAITS?
        --   Same matching pattern as skills, using the traits numbers.
        --   Example: Backend Detective wants 'analytical' + 'autonomous';
        --   Sherlock is 'analytical' -> 1.
        -- ---------------------------------------------------------------
        (SELECT COUNT(*) FROM job_culture jc
           JOIN candidate_traits ct ON ct.trait_id = jc.trait_id
          WHERE jc.job_id = j.id AND ct.candidate_id = c.id)        AS matched_culture,

        -- ---------------------------------------------------------------
        -- matched_culture_names: THE MATCHING CULTURE WORDS, as one text.
        --   Example: 'analytical'. Empty (NULL) if none match.
        -- ---------------------------------------------------------------
        (SELECT GROUP_CONCAT(t.name, ', ') FROM job_culture jc
           JOIN candidate_traits ct ON ct.trait_id = jc.trait_id
           JOIN traits t            ON t.id = jc.trait_id
          WHERE jc.job_id = j.id AND ct.candidate_id = c.id)        AS matched_culture_names

    -- -------------------------------------------------------------------
    -- WHERE THE ROWS COME FROM:
    --   "FROM candidates c CROSS JOIN jobs j"
    --   CROSS JOIN = pair EVERY candidate with EVERY job.
    --   15 candidates x 6 jobs = 90 rows. Each row is one pair, and all
    --   the counting above is done once per pair.
    --   Analogy: making a table of every student against every subject.
    -- -------------------------------------------------------------------
    FROM candidates c
    CROSS JOIN jobs j
),  -- end of step 1. The comma means "another helper step follows".

-- =====================================================================
-- STEP 2: pair_fits  -  "TURN THE COUNTS INTO FRACTIONS FROM 0 TO 1"
--   A fraction of 1.0 means "perfect", 0.5 means "half", 0 means "none".
--   Using fractions means a job needing 2 skills and a job needing 3
--   skills can be compared fairly.
--
--   IMPORTANT DETAIL - why "1.0 *" appears in every division:
--   In SQL, dividing one whole number by another throws away the
--   decimals: 2 / 3 gives 0 (not 0.67). Multiplying by 1.0 first turns
--   the sum into decimal maths: 1.0 * 2 / 3 gives 0.666...
--   Without this, almost every score would wrongly be 0.
-- =====================================================================
pair_fits AS (
    SELECT
        -- "pc.*" = keep ALL the columns from step 1 (pc = pair_counts).
        pc.*,

        -- ---------------------------------------------------------------
        -- skill_fit = matched skills / required skills
        --   CASE ... WHEN ... THEN ... ELSE ... END is SQL's "if / else".
        --   IF the job needs 0 skills, count it as a perfect 1.0 (this
        --   also avoids dividing by zero, which is an error).
        --   ELSE divide.
        --   Example: 2 of 3 skills -> 0.67.  3 of 3 -> 1.0.
        -- ---------------------------------------------------------------
        CASE WHEN required_skills = 0 THEN 1.0
             ELSE 1.0 * matched_skills / required_skills END             AS skill_fit,

        -- ---------------------------------------------------------------
        -- experience_fit
        --   IF the job needs 0 years, OR the person has at least the
        --   minimum, they get a full 1.0.
        --   ELSE they get partial credit: their years / required years.
        --   Example: 8 yrs for a 3-yr job -> 1.0.
        --            2 yrs for a 4-yr job -> 0.5 (half marks, not zero).
        --   Note: having MORE experience than needed gives no bonus and
        --   no penalty (a deliberate choice explained in the README).
        -- ---------------------------------------------------------------
        CASE WHEN min_experience = 0 OR experience_years >= min_experience THEN 1.0
             ELSE 1.0 * experience_years / min_experience END            AS experience_fit,

        -- ---------------------------------------------------------------
        -- culture_fit = matching culture words / total culture words
        --   IF the job lists no culture words, give 0 (nothing to match).
        --   Example: 1 of 2 words -> 0.5.
        -- ---------------------------------------------------------------
        CASE WHEN culture_total = 0 THEN 0.0
             ELSE 1.0 * matched_culture / culture_total END              AS culture_fit,

        -- ---------------------------------------------------------------
        -- availability_fit
        --   'Immediate'   -> 1.0  (full marks)
        --   '2 weeks'     -> 0.5  (half marks)
        --   anything else ('Not looking') -> 0.0
        --   WHY: "Not looking" people are NOT removed - they are only
        --   ranked lower. Recruiters still contact passive candidates.
        -- ---------------------------------------------------------------
        CASE availability WHEN 'Immediate' THEN 1.0
                          WHEN '2 weeks'   THEN 0.5
                          ELSE 0.0 END                                   AS availability_fit

    -- Read all 90 rows produced by step 1 (nicknamed pc).
    FROM pair_counts pc
)  -- end of step 2. No comma: the final answer comes next.

-- =====================================================================
-- STEP 3: THE FINAL ANSWER  -  score, points breakdown and reason
--   This SELECT is what you actually see when you read match_scores.
-- =====================================================================
SELECT
    -- Who and which job this row is about.
    candidate_id,
    candidate_name,
    job_id,
    job_title,

    -- -------------------------------------------------------------------
    -- THE SCORE (0 to 100)
    --   = 60 x skill_fit + 20 x experience_fit + 10 x culture_fit
    --     + 10 x availability_fit
    --   ROUND( ..., 1) = round to 1 decimal place, e.g. 73.33 -> 73.3
    --   Example (Sherlock / Backend Detective): 60 + 20 + 5 + 10 = 95
    -- -------------------------------------------------------------------
    ROUND(60 * skill_fit
        + 20 * experience_fit
        + 10 * culture_fit
        + 10 * availability_fit, 1)                    AS score,

    -- The same four parts, shown separately, so anyone can see WHERE the
    -- points came from. The API sends these as "breakdown".
    -- Example: skill_points 60, experience_points 20, culture_points 5,
    --          availability_points 10
    ROUND(60 * skill_fit, 1)                           AS skill_points,
    ROUND(20 * experience_fit, 1)                      AS experience_points,
    ROUND(10 * culture_fit, 1)                         AS culture_points,
    ROUND(10 * availability_fit, 1)                    AS availability_points,

    -- Pass through some of the raw facts from step 1. src/app.js uses
    -- matched_skills (to hide pairs with zero shared skills and to break
    -- ties), experience_years (tie-break), availability (optional
    -- filter) and the name lists (for the JSON reply).
    matched_skills,
    required_skills,
    matched_skill_names,
    missing_skill_names,
    matched_culture_names,
    experience_years,
    min_experience,
    availability,

    -- -------------------------------------------------------------------
    -- THE REASON SENTENCE (a human-readable explanation of the score)
    --   || means "glue these pieces of text together".
    --   CASE ... END chooses different wording in different situations.
    --   Example of the finished sentence:
    --     'Skills 3/3 (deduction, pattern-recognition, forensics);
    --      8 yrs (needs 3+); culture fit: analytical; available immediately'
    -- -------------------------------------------------------------------
    -- Part 1: skills count, e.g. 'Skills 1/3'
    'Skills ' || matched_skills || '/' || required_skills
      -- Part 2: if some skills matched, add their names in brackets,
      -- e.g. ' (pattern-recognition)'. Otherwise add nothing ('').
      || CASE WHEN matched_skills > 0 THEN ' (' || matched_skill_names || ')' ELSE '' END
      -- Part 3: if some skills are missing, list them,
      -- e.g. ', missing deduction, forensics'. Otherwise add nothing.
      || CASE WHEN missing_skill_names IS NOT NULL THEN ', missing ' || missing_skill_names ELSE '' END
      -- A separator between sections.
      || '; '
      -- Part 4: experience. Enough years -> '8 yrs (needs 3+)'.
      -- Not enough -> 'only 2 yrs (needs 4+)'.
      || CASE WHEN experience_years >= min_experience
              THEN experience_years || ' yrs (needs ' || min_experience || '+)'
              ELSE 'only ' || experience_years || ' yrs (needs ' || min_experience || '+)' END
      || '; '
      -- Part 5: culture. Some match -> 'culture fit: analytical'.
      -- None -> 'no culture keyword overlap'.
      || CASE WHEN matched_culture_names IS NOT NULL
              THEN 'culture fit: ' || matched_culture_names
              ELSE 'no culture keyword overlap' END
      || '; '
      -- Part 6: availability in plain words.
      || CASE availability WHEN 'Immediate' THEN 'available immediately'
                           WHEN '2 weeks'   THEN 'available in 2 weeks'
                           ELSE 'not currently looking' END   AS reason

-- Read from step 2 (which itself read from step 1).
-- The semicolon ends the whole CREATE VIEW instruction.
FROM pair_fits;
