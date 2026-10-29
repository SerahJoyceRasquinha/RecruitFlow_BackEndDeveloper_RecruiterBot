// =====================================================================
// FILE: src/db.js   -  "the database connector"
// =====================================================================
// HOW TO READ THIS FILE
//   Any text after two slashes // is a COMMENT. The computer ignores it;
//   it is only there for humans. Everything else is real JavaScript code.
//
// WHAT THIS FILE DOES, IN PLAIN ENGLISH
//   This is the ONLY file in the project that talks directly to the
//   database. Think of it as the receptionist at a records office:
//     1. When the server starts, it OPENS the records (the database file),
//        or builds a brand-new set of records if none exist yet.
//     2. It offers three simple services to the rest of the program:
//          all()  - "fetch me every row that answers this question"
//          get()  - "fetch me just the first row"
//          run()  - "make this change (add / update / delete)"
//     3. It SAVES the records back to the file after changes.
//
// TECHNICAL NOTES
//   * The database engine is SQLite: a complete SQL database that lives
//     inside ONE ordinary file (data/recruiter.db). No separate database
//     server needs installing.
//   * We use the "sql.js" library: SQLite translated into WebAssembly
//     (a format that runs anywhere Node.js runs). WHY: other SQLite
//     libraries need extra C++ build tools on Windows and often fail to
//     install. sql.js always installs cleanly with `npm install`.
//   * sql.js is NOT an "ORM" (a tool that writes SQL for you, which the
//     assignment bans). We hand it SQL we wrote ourselves.
//   * sql.js keeps the whole database in the computer's memory (RAM)
//     while running. So after every change we save it to the file, and
//     at start-up we load the file back.
// =====================================================================


// ---------------------------------------------------------------------
// IMPORTS - borrowing ready-made tools.
//   "require('x')" = load a tool/library called x.
//   "const name = ..." = store it under a name we can use below.
//   (const = a "constant", a named box whose contents won't be swapped.)
// ---------------------------------------------------------------------

// 'fs' = File System. Built into Node.js. Lets us read and write files.
// We use it to read the .sql files and to save/load data/recruiter.db.
const fs = require('fs');

// 'path' = built into Node.js. Joins folder and file names correctly on
// every operating system. Example: Windows uses \ between folders,
// Mac/Linux use / . path.join() picks the right one automatically.
const path = require('path');

// 'sql.js' = the SQLite library (listed in package.json, downloaded by
// `npm install`). It gives us a function that starts the SQL engine.
const initSqlJs = require('sql.js');


// ---------------------------------------------------------------------
// SETTINGS - where things live on disk.
// ---------------------------------------------------------------------

// __dirname = the folder THIS file is in (the "src" folder).
// '..' = "go up one folder". So ROOT = the main project folder.
// Example: if the project is at C:\Users\Serah\recruiter-bot then
//          ROOT = C:\Users\Serah\recruiter-bot
const ROOT = path.join(__dirname, '..');

// DB_FILE = the full path of the database file.
//   process.env.DB_FILE = an optional setting you can give from outside
//   (an "environment variable"). If nobody sets it, the "||" (meaning
//   "otherwise") picks the default: ROOT/data/recruiter.db
//   Example result: C:\Users\Serah\recruiter-bot\data\recruiter.db
//   WHY allow an override: handy for testing with a separate file.
const DB_FILE = process.env.DB_FILE || path.join(ROOT, 'data', 'recruiter.db');

// "db" will hold the open database once openDb() has run.
// "let" (instead of const) because its value changes later.
// "null" = "nothing yet".
let db = null;


// ---------------------------------------------------------------------
// readSql(fileName) - read one of our .sql files and return its text.
//   A "function" is a named, reusable set of steps. fileName is the input.
//   Example: readSql('schema.sql') returns the whole text of
//            ROOT/db/schema.sql
//   'utf8' = read it as normal text (not raw bytes).
// ---------------------------------------------------------------------
function readSql(fileName) {
  // Build the path ROOT/db/<fileName>, read the file, hand back the text.
  return fs.readFileSync(path.join(ROOT, 'db', fileName), 'utf8');
}  // end of readSql


// ---------------------------------------------------------------------
// createFresh(SQL) - build a brand-new database from our SQL files.
//   Used on the very first start, and by `npm run seed`.
//   SQL = the started SQL engine, passed in from openDb() below.
// ---------------------------------------------------------------------
function createFresh(SQL) {
  // Make a new, completely empty database in memory.
  const fresh = new SQL.Database();
  // Run schema.sql: creates the 8 empty tables.
  // ".exec()" = execute (run) all the SQL instructions in that text.
  fresh.exec(readSql('schema.sql'));
  // Run seed.sql: fills them with the 15 candidates and 6 jobs.
  fresh.exec(readSql('seed.sql'));
  // Hand the new, filled database back to whoever asked.
  // (The scoring view from matching.sql is added afterwards in openDb.)
  return fresh;
}  // end of createFresh


// ---------------------------------------------------------------------
// openDb(options) - OPEN THE DATABASE. Called once when the program starts.
//
//   Options (both optional, both default to false):
//     reset        = true  -> throw the old data away and rebuild it.
//                            Used by `npm run seed`.
//     inMemoryOnly = true  -> build a fresh database that is NEVER saved
//                            to disk. Used by the automated tests, so
//                            testing never touches your real data.
//
//   "async" = this function contains a step that takes a moment
//   (starting the SQL engine), so callers must wait for it to finish.
//   The "{ reset = false, inMemoryOnly = false } = {}" part just means:
//   "read these two options, and use false for any that weren't given".
// ---------------------------------------------------------------------
async function openDb({ reset = false, inMemoryOnly = false } = {}) {
  // Start the SQL engine. "await" = pause here until it is ready.
  const SQL = await initSqlJs();

  // DECISION: load the existing file, or build a new database?
  //   "!" means NOT. "&&" means AND.
  //   Read it as: IF we were NOT asked to reset, AND this is NOT a
  //   test-only database, AND the file already exists on disk ...
  if (!reset && !inMemoryOnly && fs.existsSync(DB_FILE)) {
    // ... THEN read the saved file and open it.
    // Example: you added a candidate yesterday -> they are still here.
    db = new SQL.Database(fs.readFileSync(DB_FILE));
  } else {
    // ... OTHERWISE (first run, reset, or test) build a fresh one.
    db = createFresh(SQL);
  }  // end of the if/else decision

  // Switch ON foreign-key checking for this connection (SQLite has it
  // OFF by default). This makes the database refuse broken links, e.g.
  // "candidate 99 has skill 3" when there is no candidate 99.
  db.exec('PRAGMA foreign_keys = ON;');

  // REBUILD THE SCORING VIEW EVERY TIME THE SERVER STARTS.
  //   First delete the old saved copy of the view (if there is one)...
  //   WHY: the view is stored inside the database file. Without this,
  //   editing a weight in matching.sql would have no effect until you
  //   also re-seeded. This way, a simple restart applies your change.
  db.exec('DROP VIEW IF EXISTS match_scores;');
  // ...then create it again from the current text of db/matching.sql.
  db.exec(readSql('matching.sql'));

  // Save to disk now (unless this is a test-only database).
  // This is what creates data/recruiter.db on the very first run.
  if (!inMemoryOnly) save();
  // Remember on the database object whether it is test-only, so save()
  // knows to skip writing later.
  db.inMemoryOnly = inMemoryOnly;
  // Hand the open database back to the caller.
  return db;
}  // end of openDb


// ---------------------------------------------------------------------
// save() - WRITE THE IN-MEMORY DATABASE TO THE FILE ON DISK.
//   Called after start-up and after every successful change (POST).
//   WHY: sql.js works in memory; without saving, everything added while
//   the server ran would vanish when it stops.
// ---------------------------------------------------------------------
function save() {
  // Test-only database? Then do nothing and leave ("return" = stop here).
  if (db.inMemoryOnly) return;
  // Make sure the "data" folder exists. recursive: true = also create
  // any missing parent folders, and don't complain if it already exists.
  fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
  // db.export() = turn the whole database into raw bytes.
  // Buffer.from(...) = wrap those bytes in a form Node can write.
  // fs.writeFileSync(...) = write them into data/recruiter.db
  // (replacing the old file).
  fs.writeFileSync(DB_FILE, Buffer.from(db.export()));
}  // end of save


// ---------------------------------------------------------------------
// all(sql, params) - RUN A QUESTION (SELECT) AND RETURN EVERY ANSWER ROW.
//
//   sql    = the question in SQL, with ? marks where values go.
//   params = the values for the ? marks, in order. Defaults to [] (none).
//
//   EXAMPLE:
//     all('SELECT id, name FROM candidates WHERE experience_years > ?', [10])
//     returns a list like:
//     [ { id: 3, name: 'Tony S.' }, { id: 5, name: 'Ron S.' }, ... ]
//
//   WHY THE ? MARKS (SECURITY - VERY IMPORTANT):
//     We never paste a user's input straight into the SQL text. If we
//     did, someone could type SQL commands as their "name" and, for
//     example, delete a table (an attack called "SQL injection").
//     With ? marks, the database treats the value purely as data, never
//     as a command.
// ---------------------------------------------------------------------
function all(sql, params = []) {
  // Prepare the question: the database checks the SQL and gets ready.
  // "stmt" is short for "statement".
  const stmt = db.prepare(sql);
  // Safely slot the values into the ? marks (this is "binding").
  stmt.bind(params);
  // An empty list that we will fill with answer rows.
  const rows = [];
  // stmt.step() moves to the next answer row; it returns true while
  // there are rows left and false when finished. "while" repeats the
  // line for as long as that is true.
  // stmt.getAsObject() turns the current row into an object such as
  // { id: 1, name: 'Sherlock H.' }, and rows.push(...) adds it to the list.
  while (stmt.step()) rows.push(stmt.getAsObject());
  // Tell the database we are done with this question (frees memory).
  stmt.free();
  // Hand back the full list of rows.
  return rows;
}  // end of all


// ---------------------------------------------------------------------
// get(sql, params) - SAME AS all(), BUT RETURN ONLY THE FIRST ROW.
//   Used when we expect one answer, e.g. "find candidate number 5".
//   [0] = "the first item in the list" (lists count from 0).
//   If there were no rows at all, the result is "undefined" (nothing),
//   which the rest of the code treats as "not found".
//   Example: get('SELECT name FROM candidates WHERE id = ?', [1])
//            returns { name: 'Sherlock H.' }
// ---------------------------------------------------------------------
function get(sql, params = []) {
  return all(sql, params)[0];
}  // end of get


// ---------------------------------------------------------------------
// run(sql, params) - RUN A CHANGE: INSERT (add), UPDATE (edit),
//   DELETE (remove), or transaction commands like BEGIN / COMMIT.
//   Returns nothing. Uses the same safe ? marks.
//   Example: run('INSERT INTO skills (name) VALUES (?)', ['security'])
// ---------------------------------------------------------------------
function run(sql, params = []) {
  db.run(sql, params);
}  // end of run


// ---------------------------------------------------------------------
// EXPORTS - make these functions available to other files.
//   Another file can now write:  const { all, get } = require('./db');
//   and use all() and get() as if they were written there.
//   DB_FILE is shared too, so start-up messages can print where the
//   database file is.
// ---------------------------------------------------------------------
module.exports = { openDb, save, all, get, run, DB_FILE };
