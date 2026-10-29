// =====================================================================
// FILE: scripts/run-detective.js   -  "runs Part 2 and prints the answers"
// =====================================================================
// HOW TO READ THIS FILE
//   Text after // is a comment (ignored by the computer).
//
// WHAT THIS FILE DOES, IN PLAIN ENGLISH
//   Part 2 of the assignment ("SQL Detective") gives a separate little
//   database about recruiters, job postings, applicants and interviews,
//   and asks 5 questions about it. The answers are SQL queries in
//   sql_detective/sql_detective.sql.
//
//   This script lets you SEE those answers:
//     1. Builds a temporary database in memory (never saved to disk, and
//        completely separate from the Recruiter Bot's data/recruiter.db).
//     2. Loads the assignment's data into it
//        (sql_detective/hiring_ops_setup.sql).
//     3. Runs the 5 answer queries (sql_detective/sql_detective.sql).
//     4. Prints each answer as a neat table in the terminal.
//
// HOW YOU RUN IT
//   npm run detective
//
// WHAT YOU SEE (shortened)
//   Q1: All currently open job postings, with the owning recruiter's name.
//   +---------+----------------+----------------------+ ...
//   | (index) | job_posting_id | title                | ...
//   | 0       | 1              | 'Backend Engineer I' | ...
//   ... and so on for Q2 to Q5.
//
// NOTE: the reviewers only need sql_detective.sql. This script is a
// convenience so the answers can be checked with one command.
// =====================================================================


// 'fs' (built in) - read files.
const fs = require('fs');
// 'path' (built in) - build file paths that work on every system.
const path = require('path');
// The SQLite library, same one the main project uses.
const initSqlJs = require('sql.js');

// The folder holding the Part 2 files.
// __dirname = this file's folder (scripts); '..' = up one level;
// then into sql_detective.
const dir = path.join(__dirname, '..', 'sql_detective');

// ---------------------------------------------------------------------
// main() - the steps of the script, grouped in one function.
//   "async" because starting the SQL engine takes a moment ("await").
// ---------------------------------------------------------------------
async function main() {
  // Start the SQL engine.
  const SQL = await initSqlJs();
  // Create an empty database in memory only; nothing is saved
  const db = new SQL.Database(); // in memory only; nothing is saved

  // Load the assignment's dataset: creates the 4 tables and inserts the
  // rows exactly as given in the PDF.
  db.exec(fs.readFileSync(path.join(dir, 'hiring_ops_setup.sql'), 'utf8'));
  // Read the 5 answer queries as one block of text.
  const queries = fs.readFileSync(path.join(dir, 'sql_detective.sql'), 'utf8');

  // Run all 5 queries at once.
  // db.exec runs every statement and returns one result per SELECT,
  // in the same order as Q1..Q5 in the file.
  // Each result looks like: { columns: ['job_posting_id', 'title', ...],
  //                           values: [[1, 'Backend Engineer I', ...], ...] }
  const results = db.exec(queries);

  // Find the question titles to print above each answer.
  // This searches the SQL file for lines starting with "-- Q" and a digit,
  // e.g. "-- Q1: All currently open job postings, ..."
  //   /^-- Q\d.*$/gm is a search pattern ("regular expression"):
  //     ^ start of a line, "-- Q" literally, \d one digit,
  //     .* the rest of the line, $ end of line,
  //     g = find all, m = treat each line separately.
  //   "|| []" = if none are found, use an empty list instead of failing.
  // (Because of this, other comments in sql_detective.sql are written so
  //  that no other line starts with "-- Q" followed by a digit.)
  const titles = queries.match(/^-- Q\d.*$/gm) || [];

  // Go through the results one by one. "index" counts 0, 1, 2, 3, 4.
  results.forEach((result, index) => {
    // Print a blank line ('\n') and the matching question title, with the
    // leading "-- " removed. If there's no title, print "Query 1" etc.
    console.log('\n' + (titles[index] || `Query ${index + 1}`).replace(/^-- /, ''));
    // Turn the raw result into a list of objects that console.table can
    // draw nicely.
    // Example: columns ['id','name'] + values [[1,'Priya']]
    //          becomes [ { id: 1, name: 'Priya' } ]
    const rows = result.values.map(values =>
      Object.fromEntries(result.columns.map((col, i) => [col, values[i]]))
    );
    // Draw the rows as a table in the terminal.
    console.table(rows);
  });  // end of the loop over results
}  // end of main

// Run main(). If anything goes wrong (e.g. a typo in the SQL), print the
// error and exit with code 1 ("finished with an error").
main().catch(err => {
  console.error(err);
  process.exit(1);
});
