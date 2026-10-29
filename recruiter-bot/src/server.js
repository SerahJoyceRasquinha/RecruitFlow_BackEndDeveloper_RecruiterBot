// =====================================================================
// FILE: src/server.js   -  "the ON switch"
// =====================================================================
// HOW TO READ THIS FILE
//   Text after // is a comment (ignored by the computer).
//
// WHAT THIS FILE DOES, IN PLAIN ENGLISH
//   This is the file that actually STARTS the Recruiter Bot. It does two
//   things, in order:
//     1. Opens the database (using src/db.js).
//     2. Starts the web server so it begins answering requests on
//        port 3000 (using the routes in src/app.js).
//   Analogy: opening a shop. First unlock the stockroom (the database),
//   then open the front door to customers (the web server).
//
// HOW YOU RUN IT
//   npm run dev  -> runs this file, and restarts it automatically every
//                   time you save a change to a .js file (handy while
//                   editing). This is what package.json's "dev" script does.
//   npm start    -> runs this file without auto-restart.
//
// WHAT YOU SEE WHEN IT WORKS
//   Recruiter Bot running at http://localhost:3000
//   Database file: C:\...\recruiter-bot\data\recruiter.db
//   Try: http://localhost:3000/jobs/1/matches
//   Explorer page: http://localhost:3000/explorer
// =====================================================================


// Borrow two things from src/db.js:
//   openDb  - the function that opens (or builds) the database
//   DB_FILE - where the database file lives, so we can print it
const { openDb, DB_FILE } = require('./db');

// Borrow the finished web application (all the routes) from src/app.js.
const app = require('./app');

// WHICH PORT TO LISTEN ON.
//   A "port" is like a door number on your computer; different programs
//   use different doors. "localhost:3000" = this computer, door 3000.
//   process.env.PORT = an optional outside setting. Number(...) turns it
//   from text into a number. If it isn't set, "||" picks 3000.
//   Example (Windows PowerShell) to use door 4000 instead:
//     $env:PORT=4000; npm run dev
const PORT = Number(process.env.PORT) || 3000;

// STEP 1: open the database.
//   openDb() takes a moment (it starts the SQL engine), so it returns a
//   "promise" - an IOU that says "I'll tell you when I'm done".
//   .then(...) = "when it's done, do this next".
//   .catch(...) = "if it fails, do this instead".
openDb()
  .then(() => {
    // STEP 2: the database is ready, so start the web server.
    // app.listen(PORT, ...) = start answering requests on that door.
    // The part in ( ) => { ... } runs once the server is up.
    app.listen(PORT, () => {
      // Print friendly messages in the terminal so you know it worked.
      // `...${PORT}` = text with the port number slotted in.
      console.log(`Recruiter Bot running at http://localhost:${PORT}`);
      console.log(`Database file: ${DB_FILE}`);
      console.log(`Try: http://localhost:${PORT}/jobs/1/matches`);
      // [ADDED] Also point to the optional browser page (see GET /explorer
      // in src/app.js and the file public/explorer.html).
      console.log(`Explorer page: http://localhost:${PORT}/explorer`);
    });
  })
  .catch(err => {
    // Something went wrong opening the database (e.g. a broken .sql file).
    // Print the problem so it can be fixed...
    console.error('Could not open the database:', err);
    // ...and stop the program. Exit code 1 = "finished with an error"
    // (0 would mean "finished fine").
    process.exit(1);
  });
