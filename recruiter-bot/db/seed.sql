-- =====================================================================
-- FILE: db/seed.sql
-- =====================================================================
-- HOW TO READ THIS FILE
--   Lines starting with -- are comments (ignored by the database).
--   Everything else is a real instruction.
--
-- WHAT THIS FILE IS, IN PLAIN ENGLISH
--   db/schema.sql created EMPTY spreadsheets (tables). This file FILLS
--   them with the 15 candidates and 6 jobs given in the assignment PDF.
--   "Seed" data = the starting data a fresh database is planted with,
--   like seeds in an empty garden.
--
-- WHY THE PROJECT NEEDS IT
--   The assignment's first requirement is "Ingestion: load 15 candidates
--   and 6 jobs into a database, using a seed script or an endpoint".
--   This file is the seed script's data. It runs automatically on the
--   very first start, and again whenever you type `npm run seed`
--   (which wipes the database and rebuilds it from scratch).
--
-- THE MAIN SQL COMMAND USED HERE: INSERT
--   INSERT INTO <table> (<columns>) VALUES (<values>), (<values>) ...;
--   PLAIN ENGLISH: "add these rows to this spreadsheet".
--   Text values go inside single quotes: 'Sherlock H.'
--   Numbers do not: 8
--   A semicolon ; marks the end of one complete instruction.
--
-- A SPECIAL RULE ABOUT APOSTROPHES
--   Because text is wrapped in single quotes, an apostrophe INSIDE the
--   text must be written twice. Example: World''s best boss
--   is stored as:                         World's best boss
--
-- SPELLING RULE FOR SKILLS AND TRAITS
--   Always lower-case with hyphens, exactly as in the PDF:
--   'public-speaking', not 'Public Speaking'. One spelling = one row,
--   so matching works reliably.
-- =====================================================================


-- =====================================================================
-- STEP 1: the 15 candidates
-- =====================================================================
-- "INSERT INTO candidates (id, name, experience_years, availability, quirk)"
--   = add rows to the candidates table, filling these 5 columns in
--     this order. Each ( ... ) line below is one person.
-- We give each person a FIXED id (1 to 15) so that /candidates/1 is
-- always Sherlock, matching the order in the assignment PDF.
-- Example reading of the first line:
--   id 1, name Sherlock H., 8 years experience, can start Immediately,
--   and his quirk text.
INSERT INTO candidates (id, name, experience_years, availability, quirk) VALUES
 (1,  'Sherlock H.', 8,  'Immediate',   'Solves problems by eliminating the impossible; occasionally insufferable in standups.'),
 (2,  'Hermione G.', 4,  '2 weeks',     'Reads the entire documentation before writing a single line of code.'),
 (3,  'Tony S.',     12, 'Not looking', 'Ships an MVP overnight, refuses to write tests.'),
 (4,  'Leslie K.',   6,  'Immediate',   'Has a binder for everything, including the binder.'),
 (5,  'Ron S.',      15, 'Not looking', 'Refuses to use more than one monitor.'),
 (6,  'Rick S.',     20, 'Immediate',   'Solution works, mechanism deeply concerning.'),
 (7,  'Elle W.',     3,  'Immediate',   'Underestimated in every standup, correct in every retro.'),
 (8,  'MacGyver',    10, '2 weeks',     'Fixes production outages with duct tape and a paperclip metaphor.'),
 (9,  'Sheldon C.',  9,  'Immediate',   'Correct 95% of the time, insufferable 100% of the time.'),
 (10, 'Katniss E.',  5,  'Immediate',   'Excellent under pressure, terrible with public speaking.'),
 -- Note the doubled apostrophe in World''s (see the rule at the top).
 (11, 'Michael S.',  11, 'Not looking', 'World''s best boss, according to a mug he bought himself.'),
 (12, 'Olivia P.',   13, '2 weeks',     'Handles it. Whatever it is.'),
 (13, 'Ted L.',      7,  'Immediate',   'Turns every technical setback into a folksy metaphor.'),
 (14, 'Miranda P.',  18, 'Not looking', 'Reviews every PR personally. Says nothing. Everyone panics.'),
 -- The last row ends with ; instead of , because the instruction ends here.
 (15, 'Dwight S.',   9,  'Immediate',   'Assistant to the regional backend engineer.');


-- =====================================================================
-- STEP 2: the 6 jobs
-- =====================================================================
-- Same idea: add 6 rows to the jobs table.
-- Columns in order: id, title, minimum years of experience, tagline.
-- Example: job 1 is "Backend Detective", needs at least 3 years.
INSERT INTO jobs (id, title, min_experience, tagline) VALUES
 (1, 'Backend Detective',               3, 'We have a bug. We have no leads. We have you.'),
 (2, 'Rapid Prototyping Engineer',      2, 'Ship first, document never (kidding - please document).'),
 (3, 'Developer Relations Lead',        2, 'Explain complex things to confused humans, cheerfully.'),
 (4, 'Engineering Manager, Chaos Team', 5, 'Herd cats. The cats are senior engineers.'),
 -- You''re = You're (doubled apostrophe again).
 (5, 'Incident Commander',              4, '3am page. You''re the one who picks up.'),
 (6, 'Sales Engineer',                  3, 'Sell the vision, then go build it.');


-- =====================================================================
-- STEP 3: the skills dictionary (every skill word, once)
-- =====================================================================
-- We only give the "name" column. We do NOT give an id: the database
-- numbers them automatically in order: deduction = 1,
-- pattern-recognition = 2, forensics = 3, and so on.
-- There are 27 distinct skill words across all candidates and jobs.
-- Example: 'public-speaking' appears for 5 candidates and 2 jobs, but it
-- is written ONCE here.
INSERT INTO skills (name) VALUES
 ('deduction'), ('pattern-recognition'), ('forensics'), ('research'),
 ('time-management'), ('public-speaking'), ('systems-design'),
 ('rapid-prototyping'), ('leadership'), ('project-management'),
 ('stakeholder-management'), ('woodworking'), ('minimalism'),
 ('negotiation'), ('chemistry'), ('persuasion'), ('resourcefulness'),
 ('theoretical-analysis'), ('precision'), ('strategy'),
 ('crisis-management'), ('sales'), ('team-building'), ('optimism'),
 ('mentorship'), ('security'), ('loyalty');


-- =====================================================================
-- STEP 4: the traits dictionary (personality + culture words, once)
-- =====================================================================
-- Same idea as skills. 32 words in total.
INSERT INTO traits (name) VALUES
 -- These 27 are the personality traits the candidates have.
 ('analytical'), ('blunt'), ('detail-oriented'), ('overachiever'),
 ('confident'), ('innovative'), ('tenacious'), ('organized'),
 ('stubborn'), ('principled'), ('genius'), ('reckless'),
 ('optimistic'), ('sharp'), ('calm'), ('improviser'), ('rigid'),
 ('brilliant'), ('resilient'), ('decisive'), ('enthusiastic'),
 ('chaotic'), ('intense'), ('empathetic'), ('persistent'),
 ('demanding'), ('loyal'),
 -- These 5 appear ONLY as job culture keywords - no candidate has them.
 -- They still need a row, so the jobs can point at them.
 -- Note: 'calm' (MacGyver) and 'calm-under-pressure' (Incident
 -- Commander) are different words, so they do NOT count as a match.
 ('autonomous'), ('fast-paced'), ('energetic'), ('curious'),
 ('calm-under-pressure');


-- =====================================================================
-- STEP 5: which candidate has which skills (filling the link table)
-- =====================================================================
-- THE TRICK USED ON EVERY LINE BELOW: "INSERT ... SELECT"
--   Instead of typing skill NUMBERS by hand (easy to get wrong), each
--   line looks the numbers up by NAME.
--
--   Read the first line like a sentence:
--     "Look in the skills table for the rows whose name is deduction,
--      pattern-recognition or forensics. For EACH one found, add a row
--      to candidate_skills saying (candidate 1, that skill's id)."
--
--   TECH BREAKDOWN:
--     INSERT INTO candidate_skills (candidate_id, skill_id)  = add rows here
--     SELECT 1, id FROM skills                               = the values to add:
--                                                              the fixed number 1,
--                                                              and the skill's id
--     WHERE name IN ('deduction', ...)                       = only these skills
--
--   RESULT for line 1: 3 new rows -> (1,1), (1,2), (1,3)
--   i.e. Sherlock has deduction, pattern-recognition and forensics.
-- ---------------------------------------------------------------------
-- Sherlock H. (1)
INSERT INTO candidate_skills (candidate_id, skill_id) SELECT 1,  id FROM skills WHERE name IN ('deduction', 'pattern-recognition', 'forensics');
-- Hermione G. (2)
INSERT INTO candidate_skills (candidate_id, skill_id) SELECT 2,  id FROM skills WHERE name IN ('research', 'time-management', 'public-speaking');
-- Tony S. (3)
INSERT INTO candidate_skills (candidate_id, skill_id) SELECT 3,  id FROM skills WHERE name IN ('systems-design', 'rapid-prototyping', 'leadership');
-- Leslie K. (4)
INSERT INTO candidate_skills (candidate_id, skill_id) SELECT 4,  id FROM skills WHERE name IN ('project-management', 'stakeholder-management', 'public-speaking');
-- Ron S. (5)
INSERT INTO candidate_skills (candidate_id, skill_id) SELECT 5,  id FROM skills WHERE name IN ('woodworking', 'minimalism', 'negotiation');
-- Rick S. (6)
INSERT INTO candidate_skills (candidate_id, skill_id) SELECT 6,  id FROM skills WHERE name IN ('systems-design', 'rapid-prototyping', 'chemistry');
-- Elle W. (7)
INSERT INTO candidate_skills (candidate_id, skill_id) SELECT 7,  id FROM skills WHERE name IN ('persuasion', 'research', 'public-speaking');
-- MacGyver (8) - the only candidate with 4 skills
INSERT INTO candidate_skills (candidate_id, skill_id) SELECT 8,  id FROM skills WHERE name IN ('rapid-prototyping', 'resourcefulness', 'chemistry', 'systems-design');
-- Sheldon C. (9)
INSERT INTO candidate_skills (candidate_id, skill_id) SELECT 9,  id FROM skills WHERE name IN ('theoretical-analysis', 'pattern-recognition', 'research');
-- Katniss E. (10)
INSERT INTO candidate_skills (candidate_id, skill_id) SELECT 10, id FROM skills WHERE name IN ('precision', 'strategy', 'crisis-management');
-- Michael S. (11)
INSERT INTO candidate_skills (candidate_id, skill_id) SELECT 11, id FROM skills WHERE name IN ('sales', 'public-speaking', 'team-building');
-- Olivia P. (12)
INSERT INTO candidate_skills (candidate_id, skill_id) SELECT 12, id FROM skills WHERE name IN ('crisis-management', 'negotiation', 'strategy', 'leadership');
-- Ted L. (13)
INSERT INTO candidate_skills (candidate_id, skill_id) SELECT 13, id FROM skills WHERE name IN ('team-building', 'optimism', 'mentorship', 'public-speaking');
-- Miranda P. (14)
INSERT INTO candidate_skills (candidate_id, skill_id) SELECT 14, id FROM skills WHERE name IN ('leadership', 'negotiation', 'stakeholder-management', 'precision');
-- Dwight S. (15)
INSERT INTO candidate_skills (candidate_id, skill_id) SELECT 15, id FROM skills WHERE name IN ('sales', 'negotiation', 'security', 'loyalty');


-- =====================================================================
-- STEP 6: which candidate has which personality traits
-- =====================================================================
-- Exactly the same trick, but looking words up in the traits table.
-- Example (first line): Sherlock (1) is 'analytical' and 'blunt'
-- -> 2 new rows in candidate_traits.
-- ---------------------------------------------------------------------
-- Sherlock H. (1)
INSERT INTO candidate_traits (candidate_id, trait_id) SELECT 1,  id FROM traits WHERE name IN ('analytical', 'blunt');
-- Hermione G. (2)
INSERT INTO candidate_traits (candidate_id, trait_id) SELECT 2,  id FROM traits WHERE name IN ('detail-oriented', 'overachiever');
-- Tony S. (3)
INSERT INTO candidate_traits (candidate_id, trait_id) SELECT 3,  id FROM traits WHERE name IN ('confident', 'innovative');
-- Leslie K. (4)
INSERT INTO candidate_traits (candidate_id, trait_id) SELECT 4,  id FROM traits WHERE name IN ('tenacious', 'organized');
-- Ron S. (5)
INSERT INTO candidate_traits (candidate_id, trait_id) SELECT 5,  id FROM traits WHERE name IN ('stubborn', 'principled');
-- Rick S. (6)
INSERT INTO candidate_traits (candidate_id, trait_id) SELECT 6,  id FROM traits WHERE name IN ('genius', 'reckless');
-- Elle W. (7)
INSERT INTO candidate_traits (candidate_id, trait_id) SELECT 7,  id FROM traits WHERE name IN ('optimistic', 'sharp');
-- MacGyver (8)
INSERT INTO candidate_traits (candidate_id, trait_id) SELECT 8,  id FROM traits WHERE name IN ('calm', 'improviser');
-- Sheldon C. (9)
INSERT INTO candidate_traits (candidate_id, trait_id) SELECT 9,  id FROM traits WHERE name IN ('rigid', 'brilliant');
-- Katniss E. (10)
INSERT INTO candidate_traits (candidate_id, trait_id) SELECT 10, id FROM traits WHERE name IN ('resilient', 'decisive');
-- Michael S. (11)
INSERT INTO candidate_traits (candidate_id, trait_id) SELECT 11, id FROM traits WHERE name IN ('enthusiastic', 'chaotic');
-- Olivia P. (12)
INSERT INTO candidate_traits (candidate_id, trait_id) SELECT 12, id FROM traits WHERE name IN ('decisive', 'intense');
-- Ted L. (13)
INSERT INTO candidate_traits (candidate_id, trait_id) SELECT 13, id FROM traits WHERE name IN ('empathetic', 'persistent');
-- Miranda P. (14)
INSERT INTO candidate_traits (candidate_id, trait_id) SELECT 14, id FROM traits WHERE name IN ('demanding', 'decisive');
-- Dwight S. (15)
INSERT INTO candidate_traits (candidate_id, trait_id) SELECT 15, id FROM traits WHERE name IN ('intense', 'loyal');


-- =====================================================================
-- STEP 7: which skills each job REQUIRES
-- =====================================================================
-- Same trick again, filling job_skills.
-- Example (first line): Backend Detective (job 1) requires deduction,
-- pattern-recognition and forensics -> 3 rows. Later, the matching
-- calculation compares these rows with each candidate's skills.
-- ---------------------------------------------------------------------
-- Job 1: Backend Detective
INSERT INTO job_skills (job_id, skill_id) SELECT 1, id FROM skills WHERE name IN ('deduction', 'pattern-recognition', 'forensics');
-- Job 2: Rapid Prototyping Engineer (only 2 required skills)
INSERT INTO job_skills (job_id, skill_id) SELECT 2, id FROM skills WHERE name IN ('rapid-prototyping', 'systems-design');
-- Job 3: Developer Relations Lead (only 2 required skills)
INSERT INTO job_skills (job_id, skill_id) SELECT 3, id FROM skills WHERE name IN ('public-speaking', 'research');
-- Job 4: Engineering Manager, Chaos Team
INSERT INTO job_skills (job_id, skill_id) SELECT 4, id FROM skills WHERE name IN ('team-building', 'stakeholder-management', 'leadership');
-- Job 5: Incident Commander
INSERT INTO job_skills (job_id, skill_id) SELECT 5, id FROM skills WHERE name IN ('crisis-management', 'strategy', 'negotiation');
-- Job 6: Sales Engineer
INSERT INTO job_skills (job_id, skill_id) SELECT 6, id FROM skills WHERE name IN ('sales', 'public-speaking', 'negotiation');


-- =====================================================================
-- STEP 8: which culture keywords each job is looking for
-- =====================================================================
-- Same trick, filling job_culture from the traits dictionary.
-- Example: Backend Detective wants 'analytical' and 'autonomous'.
-- Sherlock is 'analytical', so he will later earn culture points.
-- ---------------------------------------------------------------------
-- Job 1: Backend Detective
INSERT INTO job_culture (job_id, trait_id) SELECT 1, id FROM traits WHERE name IN ('analytical', 'autonomous');
-- Job 2: Rapid Prototyping Engineer
INSERT INTO job_culture (job_id, trait_id) SELECT 2, id FROM traits WHERE name IN ('innovative', 'fast-paced');
-- Job 3: Developer Relations Lead (no candidate has either word)
INSERT INTO job_culture (job_id, trait_id) SELECT 3, id FROM traits WHERE name IN ('energetic', 'curious');
-- Job 4: Engineering Manager, Chaos Team
INSERT INTO job_culture (job_id, trait_id) SELECT 4, id FROM traits WHERE name IN ('empathetic', 'organized');
-- Job 5: Incident Commander
INSERT INTO job_culture (job_id, trait_id) SELECT 5, id FROM traits WHERE name IN ('decisive', 'calm-under-pressure');
-- Job 6: Sales Engineer
INSERT INTO job_culture (job_id, trait_id) SELECT 6, id FROM traits WHERE name IN ('enthusiastic', 'persistent');
