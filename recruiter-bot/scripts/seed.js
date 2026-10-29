// =====================================================================
// FILE: scripts/seed.js   -  "the reset button" (the ingestion script)
// =====================================================================
// HOW TO READ THIS FILE
//   Text after // is a comment (ignored by the computer).
//
// WHAT THIS FILE DOES, IN PLAIN ENGLISH
//   Throws away the current database and builds a clean one from the
//   SQL files:
//     db/schema.sql   - the empty tables
//     db/seed.sql     - the 15 candidates and 6 jobs from the PDF
//     db/matching.sql - the scoring calculation
//   Anything added with POST (e.g. a test candidate) is wiped.
//
// WHY THE PROJECT NEEDS IT
//   The assignment's first requirement is "Ingestion: load the 15
//   candidates and 6 jobs into a database using a seed script or an
//   endpoint". This is that seed script. It is also useful whenever the
//   data gets messy from experiments: just reset.
//
// HOW YOU RUN IT
//   npm run seed      (package.json's "seed" script runs this file)
//
// WHAT YOU SEE
//   Database rebuilt: 15 candidates, 6 jobs
//   Saved to C:\...\recruiter-bot\data\recruiter.db
//
// NOTE: you do NOT need to run this before the first start. The server
// builds the database automatically if the file doesn't exist yet.
// =====================================================================


// Borrow helpers from src/db.js ('../src/db' = go up one folder, then
// into src, then db.js):
//   openDb  - opens / rebuilds the database
//   get     - asks a question and returns the first answer row
//   DB_FILE - the database file's location, to print it
const { openDb, get, DB_FILE } = require('../src/db');

// Open the database with reset: true = delete the old data and rebuild
// it from the SQL files. This takes a moment, hence .then / .catch
// (see the explanation in src/server.js).
openDb({ reset: true })
  .then(() => {
    // Count the rows as a quick check that everything loaded.
    // COUNT(*) counts rows; "AS n" names the answer n; ".n" reads it.
    // Expected: c = 15, j = 6.
    const c = get('SELECT COUNT(*) AS n FROM candidates').n;
    const j = get('SELECT COUNT(*) AS n FROM jobs').n;
    // Print the result in the terminal.
    console.log(`Database rebuilt: ${c} candidates, ${j} jobs`);
    console.log(`Saved to ${DB_FILE}`);
  })
  .catch(err => {
    // If anything failed, show the problem and exit with an error code (1).
    console.error('Seeding failed:', err);
    process.exit(1);
  });
