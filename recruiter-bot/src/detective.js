// =====================================================================
// FILE: src/detective.js   -  "runs Part 2 (SQL Detective) for the web"
// =====================================================================
// HOW TO READ THIS FILE
//   Text after // is a comment (ignored by the computer).
//
// WHY THIS FILE WAS ADDED
//   Part 2's answers live in sql_detective/sql_detective.sql. Before this
//   file existed, the only way to see the results was the terminal
//   command `npm run detective`.
//   This file lets the WEB SERVER run the same 5 queries and send the
//   results back as JSON, so they can be viewed in a browser at:
//     http://localhost:3000/detective      (all 5 answers)
//     http://localhost:3000/detective/2    (just question 2)
//   and on the explorer page (http://localhost:3000/explorer).
//
// WHAT IT DOES, IN PLAIN ENGLISH (every time someone asks)
//   1. Builds a brand-new, temporary database in memory.
//   2. Loads the assignment's hiring data into it
//      (sql_detective/hiring_ops_setup.sql - unchanged from the PDF).
//   3. Cuts sql_detective.sql into its 5 questions.
//   4. Runs each question's SQL and collects the answer rows.
//   5. Throws the temporary database away.
//   The Recruiter Bot's own database (data/recruiter.db) is never touched:
//   Part 2 uses completely separate data.
//
// WHY A FRESH DATABASE EVERY TIME
//   It takes a few milliseconds, and it guarantees the answers always come
//   from the exact data in the PDF, never from something changed earlier.
//
// WHAT IT RETURNS (example, shortened)
//   [
//     { "number": 1,
//       "title": "Q1: All currently open job postings, with the owning recruiter's name.",
//       "sql": "-- Q1: All currently open ...\nSELECT jp.id AS job_posting_id, ...",
//       "columns": ["job_posting_id", "title", "department", "opened_date", "recruiter_name"],
//       "rows": [ { "job_posting_id": 1, "title": "Backend Engineer I", ... }, ... ] },
//     { "number": 2, ... },
//     ...
//   ]
//
// NOTE: scripts/run-detective.js (npm run detective) still exists and
// still prints the same answers in the terminal. It was left unchanged on
// purpose so nothing that already worked could break.
// =====================================================================


// 'fs' (built in) - read files from disk.
const fs = require('fs');
// 'path' (built in) - build file paths that work on Windows, Mac and Linux.
const path = require('path');
// The SQLite library the whole project uses (see src/db.js for details).
const initSqlJs = require('sql.js');

// The folder holding the Part 2 files.
// __dirname = this file's folder (src); '..' = up one; then sql_detective.
// Example result: C:\Users\Serah\recruiter-bot\sql_detective
const DIR = path.join(__dirname, '..', 'sql_detective');

// A box to remember the started SQL engine, so it is only started once.
// null = "not started yet". (Starting it takes a moment; re-using it is
// faster. The DATABASE is still brand-new for every request.)
let SQL = null;


// ---------------------------------------------------------------------
// readFile(name) - read one file from the sql_detective folder as text.
//   Example: readFile('sql_detective.sql') -> the whole text of that file.
// ---------------------------------------------------------------------
function readFile(name) {
  return fs.readFileSync(path.join(DIR, name), 'utf8');
}  // end of readFile


// ---------------------------------------------------------------------
// splitIntoQuestions(text) - cut sql_detective.sql into one piece per question.
//
//   Each question in that file starts with a title line such as:
//     -- Q1: All currently open job postings, ...
//   So we cut the text just BEFORE every line that starts with
//   "-- Q" followed by a digit.
//
//   The search pattern /^(?=-- Q\d)/m means:
//     ^        at the start of a line
//     (?= ...) "just before" this (without removing it)
//     -- Q\d   two dashes, a space, a capital Q and one digit
//     m        treat each line separately
//
//   Example: "header... \n-- Q1: ...sql1... \n-- Q2: ...sql2..."
//   becomes  ["header...", "-- Q1: ...sql1...", "-- Q2: ...sql2..."]
//
//   .slice(1) drops the first piece (the file's introduction, which
//   comes before Q1 and contains no query).
//   Result: exactly 5 pieces, one per question.
// ---------------------------------------------------------------------
function splitIntoQuestions(text) {
  return text.split(/^(?=-- Q\d)/m).slice(1);
}  // end of splitIntoQuestions


// ---------------------------------------------------------------------
// runDetective() - run all 5 questions and return their answers.
//   "async" because starting the SQL engine (the first time) takes a
//   moment; callers must "await" the result.
// ---------------------------------------------------------------------
async function runDetective() {
  // Start the SQL engine the first time only; re-use it afterwards.
  if (!SQL) SQL = await initSqlJs();

  // Make a brand-new, empty database in memory (never saved to disk).
  const db = new SQL.Database();

  // "try { ... } finally { ... }" = do the work, and ALWAYS run the
  // finally part afterwards, even if something went wrong. Here it makes
  // sure the temporary database is always closed (memory freed).
  try {
    // Load the PDF's hiring data: creates 4 tables and fills them.
    db.exec(readFile('hiring_ops_setup.sql'));

    // Read the answers file and cut it into the 5 questions.
    const questions = splitIntoQuestions(readFile('sql_detective.sql'));

    // For each question piece, build one result object.
    // .map((chunk, i) => ...) runs once per piece; i counts 0, 1, 2, 3, 4.
    return questions.map((chunk, i) => {
      // The title = the first line of the piece, without the leading "-- ".
      // Example: "Q1: All currently open job postings, with the owning recruiter's name."
      const title = chunk.split('\n')[0].replace(/^-- /, '');

      // Run this question's SQL. db.exec returns one result per SELECT
      // found in the text. Each question has exactly one final SELECT,
      // so we take the LAST result. If there were none, use an empty
      // result so the page still works ("||" = "otherwise").
      const results = db.exec(chunk);
      const last = results[results.length - 1] || { columns: [], values: [] };

      // sql.js gives rows as plain lists, e.g. [1, 'Backend Engineer I', ...].
      // Turn each into a labelled object, e.g.
      //   { job_posting_id: 1, title: 'Backend Engineer I', ... }
      // which is much easier to read as JSON.
      const rows = last.values.map(values =>
        Object.fromEntries(last.columns.map((col, c) => [col, values[c]]))
      );

      // The finished answer for this question.
      return {
        number: i + 1,          // 1 to 5 (i starts at 0, so add 1)
        title,                  // the question, in words
        sql: chunk.trim(),      // the SQL used, with its explanation comments
        columns: last.columns,  // the column headings, in order
        rows,                   // the answer rows
      };
    });
  } finally {
    // Always throw the temporary database away.
    db.close();
  }  // end of try/finally
}  // end of runDetective


// Share runDetective with other files (src/app.js uses it for the
// /detective web addresses).
module.exports = { runDetective };
