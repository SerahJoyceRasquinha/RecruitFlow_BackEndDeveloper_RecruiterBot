-- =====================================================================
-- FILE: db/schema.sql
-- =====================================================================
-- HOW TO READ THE COMMENTS IN THIS FILE
--   Any line starting with two dashes (--) is a COMMENT. The database
--   ignores it completely; it is only there for humans to read.
--   Lines WITHOUT the two dashes are the real instructions.
--
-- WHAT THIS FILE IS, IN PLAIN ENGLISH
--   Think of a database as a set of spreadsheets (Excel sheets) that
--   live inside one file. Each spreadsheet is called a TABLE. Each
--   table has COLUMNS (the headings across the top, e.g. "name") and
--   ROWS (one line per person or thing, e.g. one row for Sherlock).
--
--   This file does NOT put any people or jobs into the database.
--   It only creates the EMPTY spreadsheets and decides their column
--   headings and their rules (for example, "a name can't be blank").
--   Filling them with data happens later in db/seed.sql.
--
--   TECHNICAL NAME: this is "DDL" (Data Definition Language) - the part
--   of SQL used to define the structure of the data.
--
-- WHY THE PROJECT NEEDS IT
--   The assignment says: "design your own schema, written as raw SQL".
--   "Schema" just means "the layout of the tables". This file is that.
--
-- WHEN IT RUNS
--   Automatically the first time the server starts (or when you type
--   `npm run seed`). The file src/db.js reads this file and runs it.
--
-- THE BIG IDEA (the most important design decision in the project)
--   A candidate has a LIST of skills (Sherlock: deduction, forensics,
--   pattern-recognition). A spreadsheet cell is bad at holding lists.
--   So instead of writing "deduction, forensics" in one cell, we keep:
--     * one table with every skill word written ONCE   (skills)
--     * one table that says "person X has skill Y", one row per pair
--                                                        (candidate_skills)
--   It is like a school register: one list of students, one list of
--   subjects, and a third sheet saying "Riya takes Maths", "Riya takes
--   Physics", "Arjun takes Maths"... Finding "who shares a subject"
--   becomes very easy that way.
--
--   Picture of how the tables connect (">--<" means "many to many"):
--   candidates --< candidate_skills >-- skills --< job_skills >-- jobs
--   candidates --< candidate_traits >-- traits --< job_culture >-- jobs
--
--   Candidate "traits" (personality words like "analytical") and job
--   "culture keywords" (also words like "analytical") are the same kind
--   of word, so they share ONE table called traits. That is what lets
--   the program compare them.
--
--   A "match" (how well a person fits a job) is NOT stored in any table
--   here. It is calculated fresh every time it is asked for, by the
--   file db/matching.sql. That way it can never be out of date.
-- =====================================================================


-- ---------------------------------------------------------------------
-- SETTING: switch on "foreign key" checking.
--   PLAIN ENGLISH: tell the database to actually enforce the links
--   between tables. Example: it will refuse to record "person 99 has
--   skill forensics" if there is no person number 99.
--   WHY: SQLite (our database) has this safety check turned OFF by
--   default, for historical reasons. We turn it ON.
--   TECH: a PRAGMA is a SQLite-specific setting command.
-- ---------------------------------------------------------------------
PRAGMA foreign_keys = ON;


-- =====================================================================
-- TABLE 1: candidates  -  one row per job seeker
-- Example row:  1 | Sherlock H. | 8 | Immediate | Solves problems by...
-- =====================================================================
-- "CREATE TABLE candidates (" = make a new empty spreadsheet called
-- "candidates". Everything between the brackets ( ... ) lists its columns.
CREATE TABLE candidates (
    -- COLUMN "id": a unique number for each candidate (1, 2, 3 ...).
    --   INTEGER = whole number.
    --   PRIMARY KEY = this column is the row's official ID card; no two
    --   rows may share the same id, and it can never be empty.
    --   WHY: names can repeat or change; a number is a reliable handle.
    --   The web address /candidates/1 uses this number.
    id               INTEGER PRIMARY KEY,

    -- COLUMN "name": the person's name, e.g. 'Sherlock H.'
    --   TEXT = words/letters.
    --   NOT NULL = must always be filled in (can't be blank).
    --   UNIQUE = two candidates cannot have exactly the same name.
    --   WHY: stops the same person being added twice by mistake.
    name             TEXT    NOT NULL UNIQUE,

    -- COLUMN "experience_years": years of work experience, e.g. 8.
    --   CHECK (experience_years >= 0) = a rule the database enforces:
    --   the number may not be negative. Example: -3 would be refused.
    experience_years INTEGER NOT NULL CHECK (experience_years >= 0),

    -- COLUMN "availability": when the person can start.
    --   The CHECK rule only allows these three exact phrases:
    --   'Immediate', '2 weeks' or 'Not looking'.
    --   WHY: stops typos such as 'Immediatly' sneaking in, because the
    --   scoring later gives points based on these exact phrases.
    availability     TEXT    NOT NULL
                     CHECK (availability IN ('Immediate', '2 weeks', 'Not looking')),

    -- COLUMN "quirk": the fun one-line description from the assignment.
    --   No NOT NULL here, so it is optional (may be left empty).
    quirk            TEXT
);  -- ");" = end of the candidates table definition.


-- =====================================================================
-- TABLE 2: jobs  -  one row per job opening
-- Example row:  1 | Backend Detective | 3 | We have a bug. We have no leads...
-- =====================================================================
CREATE TABLE jobs (
    -- Unique number for each job (1 to 6). Used in /jobs/1/matches.
    id             INTEGER PRIMARY KEY,

    -- Job title, e.g. 'Backend Detective'. Required and no duplicates.
    title          TEXT    NOT NULL UNIQUE,

    -- Minimum years of experience the job asks for, e.g. 3.
    -- Cannot be negative.
    min_experience INTEGER NOT NULL CHECK (min_experience >= 0),

    -- The job's fun tagline. Optional.
    tagline        TEXT
);  -- end of the jobs table.


-- =====================================================================
-- TABLE 3: skills  -  a "dictionary": every skill word, written ONCE.
-- Example rows:  1 | deduction      2 | pattern-recognition   ...
-- WHY A SEPARATE TABLE: if "forensics" is stored once with one number,
-- then "does this person have a skill this job needs?" becomes a simple
-- comparison of numbers, instead of comparing pieces of text.
-- Words are stored lower-case with hyphens, e.g. 'public-speaking'.
-- =====================================================================
CREATE TABLE skills (
    -- The skill's number. The database hands these out automatically
    -- (1, 2, 3 ...) when a new skill is added.
    id   INTEGER PRIMARY KEY,
    -- The skill word itself. UNIQUE means 'forensics' can exist only once.
    name TEXT NOT NULL UNIQUE
);  -- end of the skills table.


-- =====================================================================
-- TABLE 4: traits  -  a dictionary of personality / culture words.
-- Example rows:  1 | analytical     2 | blunt    ...
-- Used for BOTH candidate personality traits AND job culture keywords,
-- so the same word (e.g. 'decisive') has the same number on both sides.
-- =====================================================================
CREATE TABLE traits (
    -- The word's number, assigned automatically.
    id   INTEGER PRIMARY KEY,
    -- The word itself, stored once.
    name TEXT NOT NULL UNIQUE
);  -- end of the traits table.


-- =====================================================================
-- TABLE 5: candidate_skills  -  "which person has which skill".
-- This is a LINK table (also called a "junction" table).
-- Each row is one pair. Sherlock (id 1) with 3 skills = 3 rows:
--     candidate_id | skill_id
--          1       |    1        (deduction)
--          1       |    2        (pattern-recognition)
--          1       |    3        (forensics)
-- TECH: this is how a "many-to-many" relationship is stored: one person
-- has many skills, and one skill belongs to many people.
-- =====================================================================
CREATE TABLE candidate_skills (
    -- Which candidate. INTEGER NOT NULL = a required whole number.
    -- REFERENCES candidates(id) = it must be the id of a person that
    --   really exists in the candidates table (a "foreign key").
    -- ON DELETE CASCADE = if that person is ever deleted, delete these
    --   link rows too, automatically, so nothing is left dangling.
    candidate_id INTEGER NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,

    -- Which skill. Must be the id of a skill that exists in "skills".
    skill_id     INTEGER NOT NULL REFERENCES skills(id),

    -- PRIMARY KEY on the PAIR of columns: the same (person, skill)
    -- combination may appear only once.
    -- Example: Sherlock cannot be given 'forensics' twice.
    PRIMARY KEY (candidate_id, skill_id)
);  -- end of the candidate_skills table.


-- =====================================================================
-- TABLE 6: job_skills  -  "which job requires which skill".
-- Same pattern as candidate_skills, but for jobs.
-- Example: Backend Detective (job 1) needs 3 skills = 3 rows.
-- =====================================================================
CREATE TABLE job_skills (
    -- Which job (must exist in jobs). Deleting the job deletes these rows.
    job_id   INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    -- Which skill (must exist in skills).
    skill_id INTEGER NOT NULL REFERENCES skills(id),
    -- A job cannot list the same required skill twice.
    PRIMARY KEY (job_id, skill_id)
);  -- end of the job_skills table.


-- =====================================================================
-- TABLE 7: candidate_traits  -  "which person has which personality trait".
-- Example: Sherlock is 'analytical' and 'blunt' = 2 rows.
-- =====================================================================
CREATE TABLE candidate_traits (
    -- Which candidate.
    candidate_id INTEGER NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    -- Which trait word (from the traits dictionary).
    trait_id     INTEGER NOT NULL REFERENCES traits(id),
    -- No duplicate (person, trait) pairs.
    PRIMARY KEY (candidate_id, trait_id)
);  -- end of the candidate_traits table.


-- =====================================================================
-- TABLE 8: job_culture  -  "which culture keywords a job is looking for".
-- Example: Backend Detective wants 'analytical' and 'autonomous'.
-- It points at the SAME traits table as candidate_traits. So when
-- Sherlock is 'analytical' and the job wants 'analytical', both rows
-- hold the same trait number, and the program can spot the match.
-- =====================================================================
CREATE TABLE job_culture (
    -- Which job.
    job_id   INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    -- Which culture word (from the traits dictionary).
    trait_id INTEGER NOT NULL REFERENCES traits(id),
    -- No duplicate (job, word) pairs.
    PRIMARY KEY (job_id, trait_id)
);  -- end of the job_culture table.


-- =====================================================================
-- INDEXES  -  speed-ups for searching.
--   PLAIN ENGLISH: an index is like the index at the back of a textbook.
--   Without it, to find "every person who has skill number 7", the
--   database must read every single row. With an index on skill_id, it
--   jumps straight to the right rows.
--   WHY THESE FOUR: the matching calculation often asks "who has THIS
--   skill?" or "which jobs want THIS trait?". The primary keys above
--   already make lookups by candidate_id / job_id fast; these four make
--   lookups in the other direction (by skill_id / trait_id) fast too.
--   With only 15 people the speed difference is tiny, but this is what a
--   real system with millions of rows would need.
--   FORMAT: CREATE INDEX <name of the index> ON <table> (<column>);
-- =====================================================================
-- Fast lookup: "which candidates have skill X?"
CREATE INDEX idx_candidate_skills_skill ON candidate_skills (skill_id);
-- Fast lookup: "which jobs need skill X?"
CREATE INDEX idx_job_skills_skill       ON job_skills (skill_id);
-- Fast lookup: "which candidates have trait X?"
CREATE INDEX idx_candidate_traits_trait ON candidate_traits (trait_id);
-- Fast lookup: "which jobs want culture word X?"
CREATE INDEX idx_job_culture_trait      ON job_culture (trait_id);
