// =====================================================================
// FILE: src/app.js   -  "the web addresses (routes) the server answers"
// =====================================================================
// HOW TO READ THIS FILE
//   Text after // is a COMMENT (ignored by the computer).
//   Text inside `backticks` or 'quotes' that looks like SELECT ... is SQL
//   (a question for the database), and any text after -- INSIDE that SQL
//   is an SQL comment.
//
// WHAT THIS FILE DOES, IN PLAIN ENGLISH
//   A web server is like a shop counter. Customers (a web browser, or the
//   "curl" command) walk up and ask for something by WEB ADDRESS (URL),
//   for example:
//       http://localhost:3000/jobs/1/matches
//       "Please show me the best candidates for job number 1."
//   This file lists every question the counter knows how to answer, and
//   what to do for each one. Each entry is called a ROUTE (or ENDPOINT).
//
//   For each request, a route usually does 4 things:
//     1. READ the request         (e.g. which job number was asked for?)
//     2. CHECK it makes sense     (e.g. is "abc" a valid job number? no!)
//     3. ASK THE DATABASE         (using the helpers from src/db.js)
//     4. REPLY in JSON            (a simple text format for data, e.g.
//                                  { "name": "Sherlock H.", "score": 95 })
//
// KEY WORDS USED BELOW
//   GET  request = "give me some data"     (like reading a page)
//   POST request = "here is new data, save it" (like submitting a form)
//   req  = the REQUEST: everything the customer sent us
//   res  = the RESPONSE: what we send back
//   Status code = a number on every reply saying how it went:
//     200 OK, 201 Created, 400 Bad Request (your input is wrong),
//     404 Not Found, 409 Conflict (already exists), 500 Server Error.
//
// THE TWO ROUTES THE ASSIGNMENT REQUIRES
//   GET /jobs/:id/matches        - best candidates for one job
//   GET /candidates/:id/matches  - best jobs for one candidate
//   The others were added so the project is complete and easy to test.
// =====================================================================


// ---------------------------------------------------------------------
// IMPORTS
// ---------------------------------------------------------------------

// Express = a popular library that makes building web servers easy.
// It is listed in package.json and downloaded by `npm install`.
const express = require('express');

// Borrow 4 helpers from our own file src/db.js ('./db' = "the file
// db.js in this same folder"):
//   all()  - run a question, get every row back
//   get()  - run a question, get the first row back
//   run()  - make a change (add/edit/delete)
//   save() - write the database to disk
// The { ... } picks those 4 names out of everything db.js shares.
const { all, get, run, save } = require('./db');

// [ADDED FOR THE BROWSER EXPLORER]
// 'path' (built into Node.js) - builds file paths that work on every
// operating system. Used below to find public/explorer.html.
const path = require('path');

// [ADDED FOR THE BROWSER EXPLORER]
// Borrow runDetective() from src/detective.js. It runs the 5 Part 2
// (SQL Detective) queries and returns their answers, so the server can
// show them at /detective. See that file for full details.
const { runDetective } = require('./detective');


// ---------------------------------------------------------------------
// CREATE THE APP
// ---------------------------------------------------------------------

// Make a new, empty Express application. All routes are attached to it.
const app = express();

// Switch on JSON reading. When a POST request arrives with JSON text in
// its body (e.g. a new candidate's details), Express turns that text
// into a JavaScript object available as req.body.
// Example: the text {"name":"Lisbeth S."} becomes req.body.name === 'Lisbeth S.'
app.use(express.json());

// The only three availability phrases we accept. Kept in one list so the
// check below and the error message both use the same values.
// (Matches the CHECK rule in db/schema.sql.)
const AVAILABILITY_VALUES = ['Immediate', '2 weeks', 'Not looking'];


// =====================================================================
// SMALL HELPER FUNCTIONS
//   Little reusable tools used by the routes further down.
// =====================================================================

// ---------------------------------------------------------------------
// parseId(value) - turn the id from the web address into a real number.
//   Web addresses are always text, so /jobs/12 gives us the text "12".
//   EXAMPLES:  "12" -> 12      "abc" -> null     "-3" -> null
//              "2.5" -> null   "0" -> null
//   null means "not a valid id", and the route then replies 400.
// ---------------------------------------------------------------------
function parseId(value) {
  // Number("12") = 12.  Number("abc") = NaN ("Not a Number").
  const n = Number(value);
  // Valid only if it is a whole number (isInteger) AND greater than 0.
  // "condition ? A : B" means "if condition then A, otherwise B".
  return Number.isInteger(n) && n > 0 ? n : null;
}  // end of parseId

// ---------------------------------------------------------------------
// parseLimit(value, fallback) - read the optional "?limit=" setting,
//   which says how many results to send back.
//   EXAMPLES:  "5" -> 5     missing -> 10 (the fallback)
//              "abc" -> 10  "500" -> 100 (capped, so nobody can ask
//                                         for a huge list)
// ---------------------------------------------------------------------
function parseLimit(value, fallback = 10) {
  // Convert the text to a number.
  const n = Number(value);
  // Valid whole number above 0? Use it, but never more than 100
  // (Math.min picks the smaller of the two). Otherwise use the fallback.
  return Number.isInteger(n) && n > 0 ? Math.min(n, 100) : fallback;
}  // end of parseLimit

// ---------------------------------------------------------------------
// splitList(text) - turn a comma-joined text into a proper list.
//   The database gives skill names as ONE text: "deduction, forensics".
//   The JSON reply looks nicer as a list: ["deduction", "forensics"].
//   EXAMPLES: "a, b" -> ["a", "b"]      empty/null -> []
// ---------------------------------------------------------------------
function splitList(text) {
  // If there is text, split it at every ", ". Otherwise an empty list.
  return text ? text.split(', ') : [];
}  // end of splitList

// ---------------------------------------------------------------------
// normaliseWord(word) - tidy a skill/trait word into the house style.
//   The seed data stores words lower-case with hyphens. A user might type
//   "Public Speaking " instead. Without tidying, it would not match.
//   EXAMPLE: "Public Speaking " -> "public-speaking"
// ---------------------------------------------------------------------
function normaliseWord(word) {
  // String(word) = make sure it is text.
  // .trim() = remove spaces at the start and end.
  // .toLowerCase() = make every letter small.
  // .replace(/\s+/g, '-') = replace each run of spaces with one hyphen.
  //   (/\s+/g is a "regular expression", a search pattern meaning
  //    "one or more spaces, everywhere in the text".)
  return String(word).trim().toLowerCase().replace(/\s+/g, '-');
}  // end of normaliseWord

// ---------------------------------------------------------------------
// toMatchJson(row) - reshape one scored row from the database into the
//   tidy JSON we send back. The view match_scores (db/matching.sql) has
//   many columns; this picks the useful ones and groups them.
//   EXAMPLE OUTPUT:
//   { score: 95,
//     breakdown: { skills: 60, experience: 20, culture: 5, availability: 10 },
//     matched_skills: ["deduction", "pattern-recognition", "forensics"],
//     missing_skills: [],
//     reason: "Skills 3/3 (...); 8 yrs (needs 3+); ..." }
// ---------------------------------------------------------------------
function toMatchJson(row) {
  // Build and hand back a new object. { key: value, ... } is an object.
  return {
    // The total score, 0 to 100.
    score: row.score,
    // Where the points came from, so the score can be explained.
    breakdown: {
      skills: row.skill_points,
      experience: row.experience_points,
      culture: row.culture_points,
      availability: row.availability_points,
    },
    // Skills the person has that the job needs, as a list.
    matched_skills: splitList(row.matched_skill_names),
    // Skills the job needs that the person lacks, as a list.
    missing_skills: splitList(row.missing_skill_names),
    // The one-line human explanation built in matching.sql.
    reason: row.reason,
  };
}  // end of toMatchJson

// ---------------------------------------------------------------------
// findCandidate(id) - load one candidate WITH their skills and traits.
//   Returns null if no candidate has that id.
//   EXAMPLE: findCandidate(1) ->
//     { id: 1, name: 'Sherlock H.', experience_years: 8,
//       availability: 'Immediate', quirk: '...',
//       skills: ['deduction', 'forensics', 'pattern-recognition'],
//       traits: ['analytical', 'blunt'] }
// ---------------------------------------------------------------------
function findCandidate(id) {
  // Ask for the candidate's basic details. The ? is filled with id.
  const candidate = get(
    'SELECT id, name, experience_years, availability, quirk FROM candidates WHERE id = ?',
    [id]
  );
  // No such person? Return null ("nothing") and stop.
  if (!candidate) return null;
  // Add a "skills" list: join the link table to the skills dictionary to
  // turn skill numbers into words, sorted alphabetically (ORDER BY).
  // .map(r => r.name) turns [{name:'deduction'}, ...] into ['deduction', ...]
  candidate.skills = all(
    `SELECT s.name FROM candidate_skills cs JOIN skills s ON s.id = cs.skill_id
      WHERE cs.candidate_id = ? ORDER BY s.name`, [id]
  ).map(r => r.name);
  // Same again for personality traits.
  candidate.traits = all(
    `SELECT t.name FROM candidate_traits ct JOIN traits t ON t.id = ct.trait_id
      WHERE ct.candidate_id = ? ORDER BY t.name`, [id]
  ).map(r => r.name);
  // Hand back the complete candidate.
  return candidate;
}  // end of findCandidate

// ---------------------------------------------------------------------
// findJob(id) - load one job WITH its required skills and culture words.
//   Same pattern as findCandidate. Returns null if not found.
//   EXAMPLE: findJob(1) ->
//     { id: 1, title: 'Backend Detective', min_experience: 3, tagline: '...',
//       required_skills: ['deduction', 'forensics', 'pattern-recognition'],
//       culture_keywords: ['analytical', 'autonomous'] }
// ---------------------------------------------------------------------
function findJob(id) {
  // The job's basic details.
  const job = get('SELECT id, title, min_experience, tagline FROM jobs WHERE id = ?', [id]);
  // Not found? Stop.
  if (!job) return null;
  // The job's required skills, as words, alphabetically.
  job.required_skills = all(
    `SELECT s.name FROM job_skills js JOIN skills s ON s.id = js.skill_id
      WHERE js.job_id = ? ORDER BY s.name`, [id]
  ).map(r => r.name);
  // The job's culture keywords, as words, alphabetically.
  job.culture_keywords = all(
    `SELECT t.name FROM job_culture jc JOIN traits t ON t.id = jc.trait_id
      WHERE jc.job_id = ? ORDER BY t.name`, [id]
  ).map(r => r.name);
  // Hand back the complete job.
  return job;
}  // end of findJob

// ---------------------------------------------------------------------
// linkWords(...) - save a list of skill/trait words for a NEW candidate
//   or job. Used by both POST routes, so it is written generally.
//
//   For each word it does two things:
//     1. Add the word to the dictionary table (skills or traits) if it
//        isn't there yet. "INSERT OR IGNORE" = add it, but if it already
//        exists, quietly do nothing (no error).
//     2. Add a link row, e.g. "candidate 16 has skill 'security'".
//
//   INPUTS (example for a new candidate's skills):
//     words       = ['Forensics', 'Security']   (what the user typed)
//     dictTable   = 'skills'                    (the dictionary)
//     linkTable   = 'candidate_skills'          (the link table)
//     ownerColumn = 'candidate_id'              (column for the owner)
//     ownerId     = 16                          (the new candidate's id)
//     wordColumn  = 'skill_id'                  (column for the word)
//
//   SECURITY NOTE: the table and column NAMES are pasted into the SQL
//   with ${...}, but they always come from OUR code (fixed text such as
//   'skills'), never from the user. The user's WORDS always go through
//   the safe ? marks.
// ---------------------------------------------------------------------
function linkWords(words, dictTable, linkTable, ownerColumn, ownerId, wordColumn) {
  // words.map(normaliseWord) tidies every word ('Forensics' -> 'forensics').
  // "for (const word of ...)" repeats the steps inside { } once per word.
  for (const word of words.map(normaliseWord)) {
    // Step 1: make sure the word exists in the dictionary.
    // Example SQL: INSERT OR IGNORE INTO skills (name) VALUES ('security')
    run(`INSERT OR IGNORE INTO ${dictTable} (name) VALUES (?)`, [word]);
    // Step 2: link it to the owner, looking up the word's id by name.
    // Example SQL: INSERT OR IGNORE INTO candidate_skills (candidate_id, skill_id)
    //              SELECT 16, id FROM skills WHERE name = 'security'
    // OR IGNORE also means typing the same skill twice causes no error.
    run(
      `INSERT OR IGNORE INTO ${linkTable} (${ownerColumn}, ${wordColumn})
       SELECT ?, id FROM ${dictTable} WHERE name = ?`,
      [ownerId, word]
    );
  }  // end of the loop over words
}  // end of linkWords

// ---------------------------------------------------------------------
// inTransaction(work) - run several changes as ONE all-or-nothing unit.
//
//   PLAIN ENGLISH: saving a new candidate takes several steps (add the
//   person, add each skill link, add each trait link). If step 3 failed,
//   we would be left with a half-saved person. A TRANSACTION prevents
//   that: either EVERY step is kept, or NONE are.
//   Analogy: a bank transfer. Money must leave one account AND arrive in
//   the other - never just one half.
//
//   work = a function containing the steps to perform.
//   SQL words used:  BEGIN    = start the all-or-nothing unit
//                    COMMIT   = everything worked, keep it all
//                    ROLLBACK = something failed, undo it all
// ---------------------------------------------------------------------
function inTransaction(work) {
  // Start the unit.
  run('BEGIN');
  // "try { ... } catch (err) { ... }" = try these steps; if anything
  // goes wrong (an "error"), jump to the catch part instead of crashing.
  try {
    // Do the actual work and remember what it returns (the new id).
    const result = work();
    // All steps succeeded: make them permanent.
    run('COMMIT');
    // Write the database file to disk so the change survives a restart.
    save();
    // Hand the result (e.g. the new candidate's id) back.
    return result;
  } catch (err) {
    // Something failed: undo every step of this unit.
    run('ROLLBACK');
    // Pass the error on, so the error handler at the bottom of this file
    // replies "500 Internal server error".
    throw err;
  }  // end of try/catch
}  // end of inTransaction

// ---------------------------------------------------------------------
// isStringArray(value) - is this a list where every item is real text?
//   Used to check the "skills" and "traits" sent in a POST request.
//   EXAMPLES: ['sales', 'negotiation'] -> true
//             'sales'           -> false (text, but not a list)
//             ['sales', 42]     -> false (42 is a number)
//             ['sales', '   ']  -> false (blank text)
//             []                -> true  (an empty list has no bad items;
//                                         the routes check "not empty"
//                                         separately where needed)
// ---------------------------------------------------------------------
function isStringArray(value) {
  // Array.isArray = is it a list?  .every(...) = is this true for EVERY item?
  // typeof v === 'string' = the item is text; v.trim() !== '' = not blank.
  return Array.isArray(value) && value.every(v => typeof v === 'string' && v.trim() !== '');
}  // end of isStringArray


// =====================================================================
// ROUTES
//   FORMAT:  app.get('/address', (req, res) => { ...what to do... });
//   READ AS: "When someone asks for GET /address, run these steps."
//   A ":id" in the address is a placeholder for whatever the user puts
//   there. In /jobs/:id, visiting /jobs/4 gives req.params.id = "4".
//   The "?..." part of an address (e.g. ?limit=5) arrives in req.query.
// =====================================================================

// ---------------------------------------------------------------------
// GET /  -  the home page: a list of everything this server can do.
//   Try it: open http://localhost:3000/ in a browser.
// ---------------------------------------------------------------------
app.get('/', (req, res) => {
  // res.json(...) = send this object back as JSON, with status 200 OK.
  res.json({
    service: 'Recruiter Bot',
    endpoints: [
      'GET  /candidates',
      'GET  /candidates/:id',
      'GET  /candidates/:id/matches?limit=10',
      'POST /candidates',
      'GET  /jobs',
      'GET  /jobs/:id',
      'GET  /jobs/:id/matches?limit=10&available_only=true',
      'POST /jobs',
      // [ADDED] The Part 2 answers as JSON, and the browser viewing page.
      'GET  /detective',
      'GET  /detective/:n   (n = 1 to 5)',
      'GET  /explorer       (simple browser page to try the API)',
    ],
  });
});  // end of GET /


// ----- CANDIDATE ROUTES ----------------------------------------------

// ---------------------------------------------------------------------
// GET /candidates  -  list every candidate (short version).
//   Example reply: [ { "id": 1, "name": "Sherlock H.", "experience_years": 8,
//                      "availability": "Immediate" }, ... 15 people ]
// ---------------------------------------------------------------------
app.get('/candidates', (req, res) => {
  // Ask the database for all candidates in id order and send them back.
  res.json(all('SELECT id, name, experience_years, availability FROM candidates ORDER BY id'));
});  // end of GET /candidates

// ---------------------------------------------------------------------
// GET /candidates/:id  -  one candidate in full (with skills and traits).
//   Example: /candidates/1 -> Sherlock's full details.
//            /candidates/abc -> 400 error.  /candidates/99 -> 404 error.
// ---------------------------------------------------------------------
app.get('/candidates/:id', (req, res) => {
  // Turn the id from the address into a number (or null if invalid).
  const id = parseId(req.params.id);
  // Invalid id? Reply "400 Bad Request" with an explanation, and stop.
  // ("return" ends the route here, so nothing below runs.)
  if (!id) return res.status(400).json({ error: 'Candidate id must be a positive integer' });
  // Load the candidate (with skills and traits).
  const candidate = findCandidate(id);
  // Nobody with that id? Reply "404 Not Found", and stop.
  // `Candidate ${id} not found` = text with the id slotted in,
  // e.g. "Candidate 99 not found".
  if (!candidate) return res.status(404).json({ error: `Candidate ${id} not found` });
  // Found: send the candidate back (status 200 OK).
  res.json(candidate);
});  // end of GET /candidates/:id

// ---------------------------------------------------------------------
// GET /candidates/:id/matches  -  REQUIRED BY THE ASSIGNMENT.
//   "Which jobs suit this candidate best?" - ranked, best first.
//   Example: /candidates/12/matches -> Olivia P.'s best jobs, starting
//            with Incident Commander (score 90).
//   Optional: ?limit=3 to get only the top 3.
// ---------------------------------------------------------------------
app.get('/candidates/:id/matches', (req, res) => {
  // Read and check the id (same as above).
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Candidate id must be a positive integer' });
  // Make sure the candidate exists, and keep a few details to show at
  // the top of the reply.
  const candidate = get('SELECT id, name, availability FROM candidates WHERE id = ?', [id]);
  if (!candidate) return res.status(404).json({ error: `Candidate ${id} not found` });

  // THE MAIN QUESTION. All the scoring was already done by the
  // match_scores view (db/matching.sql). Here we only:
  //   - pick this candidate's rows        (WHERE candidate_id = ?)
  //   - drop jobs with no shared skill    (matched_skills > 0)
  //   - sort best first                   (ORDER BY score DESC)
  //   - break ties fairly                 (more shared skills first,
  //                                        then lower job id, so the
  //                                        order is always the same)
  //   - keep only the top N               (LIMIT ?)
  // The two ? marks are filled, in order, by the values in [ ... ]:
  // the candidate's id and the limit (default 10).
  const rows = all(
    `SELECT *
       FROM match_scores
      WHERE candidate_id = ?
        AND matched_skills > 0          -- no shared skill = not a match
      ORDER BY score DESC,
               matched_skills DESC,     -- tie-break 1: more skills in common
               job_id ASC               -- tie-break 2: stable order
      LIMIT ?`,
    [id, parseLimit(req.query.limit)]
  );

  // Send the reply: the candidate, then the ranked list of jobs.
  // rows.map(...) reshapes every row. For each row r we build:
  //   { job_id, job_title, ...plus everything from toMatchJson(r) }
  // The "..." (spread) copies all of toMatchJson's fields into this object.
  res.json({
    candidate,
    matches: rows.map(r => ({ job_id: r.job_id, job_title: r.job_title, ...toMatchJson(r) })),
  });
});  // end of GET /candidates/:id/matches

// ---------------------------------------------------------------------
// POST /candidates  -  ADD A NEW CANDIDATE.
//   The new person's details arrive as JSON in the request body.
//   Example body (see examples/new-candidate.json):
//     { "name": "Lisbeth S.", "experience_years": 6,
//       "availability": "Immediate",
//       "skills": ["forensics", "security", "deduction"],
//       "traits": ["autonomous", "blunt"] }
//   Possible replies: 201 Created, 400 (bad input), 409 (name taken).
// ---------------------------------------------------------------------
app.post('/candidates', (req, res) => {
  // Pull each field out of the body into its own named box.
  // "traits = []" and "quirk = null" are defaults: if the user leaves
  // them out, use an empty list / nothing. "req.body || {}" protects us
  // if no body was sent at all.
  const { name, experience_years, availability, skills, traits = [], quirk = null } = req.body || {};
  // A list to collect EVERY problem, so the user can fix them all at once.
  const errors = [];
  // Name must be text and not blank.
  if (typeof name !== 'string' || name.trim() === '') errors.push('name is required');
  // Experience must be a whole number, 0 or more. (6 OK; -1, 2.5, "six" not OK.)
  if (!Number.isInteger(experience_years) || experience_years < 0) errors.push('experience_years must be a whole number >= 0');
  // Availability must be one of the three allowed phrases.
  if (!AVAILABILITY_VALUES.includes(availability)) errors.push(`availability must be one of: ${AVAILABILITY_VALUES.join(', ')}`);
  // Skills must be a list of text with at least one item.
  if (!isStringArray(skills) || skills.length === 0) errors.push('skills must be a non-empty array of strings');
  // Traits must be a list of text (may be empty).
  if (!isStringArray(traits)) errors.push('traits must be an array of strings');
  // Any problems found? Reply 400 with the whole list, and stop.
  if (errors.length) return res.status(400).json({ errors });

  // Is the name already taken? If so, reply 409 Conflict and stop.
  // (The database's UNIQUE rule would also refuse it, but this gives a
  // clear, friendly message instead of a generic error.)
  if (get('SELECT id FROM candidates WHERE name = ?', [name.trim()])) {
    return res.status(409).json({ error: `Candidate "${name.trim()}" already exists` });
  }

  // SAVE EVERYTHING AS ONE ALL-OR-NOTHING UNIT (see inTransaction above).
  // The steps inside "() => { ... }" are the "work".
  const newId = inTransaction(() => {
    // Add the person. Four ? marks, filled in order by the four values.
    run(
      'INSERT INTO candidates (name, experience_years, availability, quirk) VALUES (?, ?, ?, ?)',
      [name.trim(), experience_years, availability, quirk]
    );
    // Ask SQLite which id it just gave the new row (e.g. 16).
    const id = get('SELECT last_insert_rowid() AS id').id;
    // Save and link their skills (adds new words to the dictionary if needed).
    linkWords(skills, 'skills', 'candidate_skills', 'candidate_id', id, 'skill_id');
    // Save and link their traits.
    linkWords(traits, 'traits', 'candidate_traits', 'candidate_id', id, 'trait_id');
    // Hand the new id out of the transaction.
    return id;
  });

  // Reply "201 Created" with the full new candidate as now stored.
  // They will appear in match results straight away, because the
  // match_scores view always calculates from the current data.
  res.status(201).json(findCandidate(newId));
});  // end of POST /candidates


// ----- JOB ROUTES ----------------------------------------------------

// ---------------------------------------------------------------------
// GET /jobs  -  list every job (short version).
//   Example reply: [ { "id": 1, "title": "Backend Detective",
//                      "min_experience": 3 }, ... 6 jobs ]
// ---------------------------------------------------------------------
app.get('/jobs', (req, res) => {
  res.json(all('SELECT id, title, min_experience FROM jobs ORDER BY id'));
});  // end of GET /jobs

// ---------------------------------------------------------------------
// GET /jobs/:id  -  one job in full (with required skills and culture).
//   Same pattern as GET /candidates/:id.
// ---------------------------------------------------------------------
app.get('/jobs/:id', (req, res) => {
  // Read and check the id.
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Job id must be a positive integer' });
  // Load the job; 404 if it doesn't exist.
  const job = findJob(id);
  if (!job) return res.status(404).json({ error: `Job ${id} not found` });
  // Send it back.
  res.json(job);
});  // end of GET /jobs/:id

// ---------------------------------------------------------------------
// GET /jobs/:id/matches  -  REQUIRED BY THE ASSIGNMENT.
//   "Who are the best candidates for this job?" - ranked, best first.
//   Example: /jobs/1/matches -> Sherlock H. (95), then Sheldon C. (50).
//   Optional settings in the address:
//     ?limit=3               only the top 3
//     ?available_only=true   hide people who are "Not looking"
//     Both together:         /jobs/4/matches?available_only=true&limit=3
// ---------------------------------------------------------------------
app.get('/jobs/:id/matches', (req, res) => {
  // Read and check the id.
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Job id must be a positive integer' });
  // Make sure the job exists, and keep its details for the reply.
  const job = get('SELECT id, title, min_experience FROM jobs WHERE id = ?', [id]);
  if (!job) return res.status(404).json({ error: `Job ${id} not found` });

  // ?available_only=true hides candidates who are "Not looking"
  // Turn the setting into a number for the SQL below:
  //   1 = filter is ON, 0 = filter is OFF (the default).
  const availableOnly = req.query.available_only === 'true' ? 1 : 0;

  // THE MAIN QUESTION. Same idea as the candidate version above, but
  // picking this JOB's rows. The three ? marks are filled in order by:
  //   id, availableOnly, limit.
  //
  // HOW THE OPTIONAL FILTER LINE WORKS:  (? = 0 OR availability <> 'Not looking')
  //   "<>" means "is not equal to".
  //   Filter OFF -> the ? is 0 -> "0 = 0" is always true -> every row passes.
  //   Filter ON  -> the ? is 1 -> "1 = 0" is false, so only the second
  //                 half decides -> only people NOT "Not looking" pass.
  //
  // TIE-BREAKS (when two people have the same score), in order:
  //   more shared skills first -> more years of experience first ->
  //   lower candidate id first (so the order never changes randomly).
  //   Example: Tony and MacGyver both score 85 for job 2; Tony (12 yrs)
  //   comes before MacGyver (10 yrs).
  const rows = all(
    `SELECT *
       FROM match_scores
      WHERE job_id = ?
        AND matched_skills > 0                          -- no shared skill = not a match
        AND (? = 0 OR availability <> 'Not looking')    -- optional filter
      ORDER BY score DESC,
               matched_skills DESC,                     -- tie-break 1: more skills in common
               experience_years DESC,                   -- tie-break 2: more experience
               candidate_id ASC                         -- tie-break 3: stable order
      LIMIT ?`,
    [id, availableOnly, parseLimit(req.query.limit)]
  );

  // Send the reply: the job, then the ranked candidates. Each entry gets
  // the candidate's id and name, plus score, breakdown, skills and reason.
  res.json({
    job,
    matches: rows.map(r => ({
      candidate_id: r.candidate_id,
      candidate_name: r.candidate_name,
      ...toMatchJson(r),
    })),
  });
});  // end of GET /jobs/:id/matches

// ---------------------------------------------------------------------
// POST /jobs  -  ADD A NEW JOB.
//   Works exactly like POST /candidates. Example body
//   (see examples/new-job.json):
//     { "title": "Security Analyst", "min_experience": 4,
//       "required_skills": ["security", "forensics", "pattern-recognition"],
//       "culture_keywords": ["analytical", "autonomous"] }
// ---------------------------------------------------------------------
app.post('/jobs', (req, res) => {
  // Pull the fields out of the body. culture_keywords and tagline are optional.
  const { title, min_experience, required_skills, culture_keywords = [], tagline = null } = req.body || {};
  // Collect every problem.
  const errors = [];
  // Title must be non-blank text.
  if (typeof title !== 'string' || title.trim() === '') errors.push('title is required');
  // Minimum experience must be a whole number, 0 or more.
  if (!Number.isInteger(min_experience) || min_experience < 0) errors.push('min_experience must be a whole number >= 0');
  // At least one required skill, all as text.
  if (!isStringArray(required_skills) || required_skills.length === 0) errors.push('required_skills must be a non-empty array of strings');
  // Culture keywords must be a list of text (may be empty).
  if (!isStringArray(culture_keywords)) errors.push('culture_keywords must be an array of strings');
  // Any problems? 400 with the list.
  if (errors.length) return res.status(400).json({ errors });

  // Title already used? 409 Conflict.
  if (get('SELECT id FROM jobs WHERE title = ?', [title.trim()])) {
    return res.status(409).json({ error: `Job "${title.trim()}" already exists` });
  }

  // Save everything as one all-or-nothing unit.
  const newId = inTransaction(() => {
    // Add the job row.
    run('INSERT INTO jobs (title, min_experience, tagline) VALUES (?, ?, ?)',
      [title.trim(), min_experience, tagline]);
    // Find out the new job's id (e.g. 7).
    const id = get('SELECT last_insert_rowid() AS id').id;
    // Save and link the required skills.
    linkWords(required_skills, 'skills', 'job_skills', 'job_id', id, 'skill_id');
    // Save and link the culture keywords (they live in the traits dictionary).
    linkWords(culture_keywords, 'traits', 'job_culture', 'job_id', id, 'trait_id');
    // Hand the new id out.
    return id;
  });

  // Reply 201 Created with the full new job.
  res.status(201).json(findJob(newId));
});  // end of POST /jobs


// =====================================================================
// [ADDED] PART 2 ROUTES - SQL DETECTIVE ANSWERS AS JSON
//   WHY: so the Part 2 results can be seen in a browser (and on the
//   explorer page), not only in the terminal with `npm run detective`.
//   The queries themselves are unchanged in sql_detective/sql_detective.sql;
//   src/detective.js runs them on a temporary copy of the PDF's data.
// =====================================================================

// ---------------------------------------------------------------------
// GET /detective  -  all 5 SQL Detective answers.
//   Example: open http://localhost:3000/detective in a browser.
//   Reply: a list of 5 objects, each with number, title, sql, columns, rows.
//
//   "async (req, res, next)" - async because runDetective() takes a
//   moment, so we "await" it. "next" is Express's way of passing an
//   error to the error handler at the bottom of this file.
// ---------------------------------------------------------------------
app.get('/detective', async (req, res, next) => {
  // Try to run the queries and send the answers back as JSON...
  try {
    res.json(await runDetective());
  } catch (err) {
    // ...and if anything fails (e.g. a typo in a .sql file), hand the
    // error to the error handler, which replies "500 Internal server error".
    next(err);
  }
});  // end of GET /detective

// ---------------------------------------------------------------------
// GET /detective/:n  -  ONE SQL Detective answer, n = 1 to 5.
//   Examples: /detective/3 -> question 3 (Ananya Rao, Ben Turner, Elena Popescu)
//             /detective/9 -> 404 (there is no question 9)
//             /detective/x -> 400 (not a number)
// ---------------------------------------------------------------------
app.get('/detective/:n', async (req, res, next) => {
  // Re-use parseId (defined near the top of this file) to turn "3" into 3.
  const n = parseId(req.params.n);
  // Not a positive whole number? Reply 400 Bad Request.
  if (!n) return res.status(400).json({ error: 'Question number must be 1 to 5' });
  try {
    // Run all 5, then pick the one whose number matches.
    // .find(...) returns the first item where the test is true, or
    // "undefined" if none is.
    const answer = (await runDetective()).find(q => q.number === n);
    // No such question (e.g. 9)? Reply 404 Not Found.
    if (!answer) return res.status(404).json({ error: `Question ${n} not found (use 1 to 5)` });
    // Found: send it back.
    res.json(answer);
  } catch (err) {
    // Unexpected problem: pass it to the error handler.
    next(err);
  }
});  // end of GET /detective/:n


// =====================================================================
// [ADDED] GET /explorer  -  A SIMPLE BROWSER PAGE TO TRY THE API.
//
//   WHAT IT IS: one plain HTML page (public/explorer.html) with dropdown
//   menus. Pick a candidate and it shows their matching jobs; pick a job
//   and it shows its matching candidates; pick a Part 2 question and it
//   shows the answer. Each result is shown as a small table AND as the
//   raw JSON the API returned.
//
//   WHAT IT IS NOT: it is NOT a "frontend" in the sense of the assignment
//   (no React, no framework, no build step, almost no styling). It only
//   CALLS the existing API addresses above - exactly like curl does - and
//   prints what comes back. Every original address still works on its own.
//   Think of it as a viewing window onto the API, for demos.
//
//   HOW: res.sendFile(...) sends a file from disk to the browser.
//   path.join(__dirname, '..', 'public', 'explorer.html') = from this
//   file's folder (src), go up one, into "public", the file explorer.html.
//   Example full path: C:\Users\Serah\recruiter-bot\public\explorer.html
// =====================================================================
app.get('/explorer', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'explorer.html'));
});  // end of GET /explorer


// =====================================================================
// FALLBACKS - safety nets. These MUST stay at the very bottom, because
// Express checks routes from top to bottom and these catch whatever
// nothing above handled.
// =====================================================================

// ---------------------------------------------------------------------
// UNKNOWN ADDRESS -> 404.
//   If no route above matched (e.g. someone visits /hello), reply with a
//   JSON "404 Not Found" message instead of Express's default HTML page.
//   Example reply: { "error": "No route for GET /hello" }
// ---------------------------------------------------------------------
app.use((req, res) => res.status(404).json({ error: `No route for ${req.method} ${req.path}` }));

// ---------------------------------------------------------------------
// ERROR HANDLER - runs if something went wrong anywhere above.
//   Express recognises this as the error handler because it takes FOUR
//   inputs (err, req, res, next) instead of two.
//
// Bad JSON body or unexpected error -> JSON error instead of an HTML page.
// ---------------------------------------------------------------------
app.use((err, req, res, next) => {
  // Case 1: the POST body was not valid JSON, e.g. {oops
  // Express labels this error 'entity.parse.failed'. Reply 400.
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Request body is not valid JSON' });
  }
  // Case 2: anything else is a bug on our side. Print the details in the
  // terminal (for the developer to see)...
  console.error(err);
  // ...and give the user a short, safe message (500 = server error).
  // We don't send the technical details, which could reveal internals.
  res.status(500).json({ error: 'Internal server error' });
});  // end of the error handler


// ---------------------------------------------------------------------
// EXPORT the finished app so other files can use it:
//   * src/server.js starts it on port 3000 (the real server).
//   * tests/api.test.js starts it on a random free port for testing.
// Keeping "build the app" (this file) separate from "start the server"
// (server.js) is what makes testing possible.
// ---------------------------------------------------------------------
module.exports = app;
