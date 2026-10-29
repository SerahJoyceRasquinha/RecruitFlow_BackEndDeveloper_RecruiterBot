// =====================================================================
// FILE: tests/api.test.js   -  "the automatic checker"
// =====================================================================
// HOW TO READ THIS FILE
//   Text after // is a comment (ignored by the computer).
//
// WHAT THIS FILE DOES, IN PLAIN ENGLISH
//   Instead of checking the project by hand every time, this file checks
//   it automatically. It contains 13 small "tests". Each test asks the
//   server a question and checks the answer is what we expect.
//   Example: "ask for the best candidates for job 1 -> is Sherlock first,
//   with a score of 95?"
//   If every answer is right, all tests PASS. If something breaks after a
//   code change, a test FAILS and tells you which one.
//   Analogy: a teacher's answer key, used to mark the program's work.
//
// HOW YOU RUN IT
//   npm test
//   Expected ending:   # pass 13
//                      # fail 0
//
// IMPORTANT: these tests use a temporary database in memory. Your real
// data (data/recruiter.db) is NEVER touched, so running tests is safe.
//
// TECHNICAL NOTES
//   * Uses "node:test", the testing tool built into Node.js (no extra
//     library needed).
//   * "assert" = the checking tool. assert.equal(a, b) means "a must
//     equal b, otherwise this test fails".
// =====================================================================


// Borrow the testing tools built into Node.js:
//   test   - defines one test
//   before - steps to run once BEFORE all the tests (set-up)
//   after  - steps to run once AFTER all the tests (clean-up)
const { test, before, after } = require('node:test');

// Borrow the checking tool. "strict" = compare exactly (e.g. 95 is not
// the same as "95").
const assert = require('node:assert/strict');

// Borrow openDb from our database file, to create the test database.
const { openDb } = require('../src/db');

// Borrow the finished web app (all routes) from src/app.js.
const app = require('../src/app');

// Two empty boxes, filled during set-up:
//   server - the running test server (so we can stop it at the end)
//   base   - its address, e.g. "http://localhost:51234"
let server;
let base;


// ---------------------------------------------------------------------
// SET-UP: runs once before any test.
// ---------------------------------------------------------------------
before(async () => {
  // Build a fresh database in memory only (never saved to disk), filled
  // with the standard 15 candidates and 6 jobs.
  await openDb({ inMemoryOnly: true });
  // Start the app on port 0 = "any free door number" - so it never
  // clashes with your real server running on 3000.
  server = app.listen(0); // 0 = any free port
  // Wait until the server has actually started ('listening').
  await new Promise(resolve => server.once('listening', resolve));
  // Work out its address from the door number it was given.
  base = `http://localhost:${server.address().port}`;
});

// ---------------------------------------------------------------------
// CLEAN-UP: runs once after all tests - stop the test server.
// ---------------------------------------------------------------------
after(() => server.close());


// ---------------------------------------------------------------------
// HELPER: getJson(path) - send a GET request and read the reply.
//   Example: getJson('/jobs/1/matches') returns
//            { status: 200, body: { job: {...}, matches: [...] } }
//   fetch() = send a web request (built into Node.js).
//   await   = wait for the reply to arrive.
// ---------------------------------------------------------------------
async function getJson(path) {
  // Send the request to e.g. http://localhost:51234/jobs/1/matches
  const res = await fetch(base + path);
  // Return the status number and the reply turned from JSON text into an object.
  return { status: res.status, body: await res.json() };
}  // end of getJson

// ---------------------------------------------------------------------
// HELPER: postJson(path, data) - send a POST request carrying data.
//   Example: postJson('/candidates', { name: 'Test', ... })
// ---------------------------------------------------------------------
async function postJson(path, data) {
  const res = await fetch(base + path, {
    // It's a POST (sending new data), not a GET.
    method: 'POST',
    // Tell the server "the body is JSON".
    headers: { 'Content-Type': 'application/json' },
    // Turn our JavaScript object into JSON text for sending.
    body: JSON.stringify(data),
  });
  // Return the status number and the reply.
  return { status: res.status, body: await res.json() };
}  // end of postJson


// =====================================================================
// THE 10 TESTS
//   FORMAT: test('description', async () => { ...checks... });
// =====================================================================

// TEST 1: Did the seed data load? Expect 15 candidates and 6 jobs.
test('seed data is loaded: 15 candidates and 6 jobs', async () => {
  // .body.length = how many items are in the returned list.
  assert.equal((await getJson('/candidates')).body.length, 15);
  assert.equal((await getJson('/jobs')).body.length, 6);
});

// TEST 2: Does the scoring formula give the expected result?
// Sherlock has all 3 skills Backend Detective needs, so he should be
// first, with nothing missing, and score 60 + 20 + 5 + 10 = 95.
test('Sherlock is the top match for Backend Detective with all 3 skills', async () => {
  // Ask for job 1's matches.
  const { status, body } = await getJson('/jobs/1/matches');
  // The request should succeed (200 OK).
  assert.equal(status, 200);
  // matches[0] = the first (best) match.
  const top = body.matches[0];
  // It should be Sherlock...
  assert.equal(top.candidate_name, 'Sherlock H.');
  // ...with no missing skills...
  assert.equal(top.missing_skills.length, 0);
  // ...and a score of exactly 95.
  assert.equal(top.score, 95); // 60 skills + 20 exp + 5 culture + 10 availability
});

// TEST 3: For EVERY job, are results sorted best-first, and is every
// score sensible (between 0 and 100)?
test('matches are sorted by score and every score is between 0 and 100', async () => {
  // Repeat for job 1, 2, 3, 4, 5 and 6.
  for (let jobId = 1; jobId <= 6; jobId++) {
    // Get up to 100 matches (i.e. all of them).
    const { body } = await getJson(`/jobs/${jobId}/matches?limit=100`);
    // Pull out just the scores, e.g. [95, 50].
    const scores = body.matches.map(m => m.score);
    // The list must equal a copy of itself sorted from high to low.
    // ([...scores] makes a copy, so the original isn't changed.)
    assert.deepEqual(scores, [...scores].sort((a, b) => b - a));
    // Every single score must be from 0 to 100.
    for (const s of scores) assert.ok(s >= 0 && s <= 100);
  }  // end of the loop over jobs
});

// TEST 4: People with NO skill in common with the job must not appear.
test('candidates with no shared skill are not returned', async () => {
  const { body } = await getJson('/jobs/1/matches?limit=100');
  // assert.ok(x) = "x must be true". Each match must share at least 1 skill.
  for (const m of body.matches) assert.ok(m.matched_skills.length > 0);
});

// TEST 5: Does the ?available_only=true filter work?
// Miranda P. is "Not looking". She should appear normally for job 4,
// but disappear when the filter is switched on.
test('available_only=true hides candidates who are not looking', async () => {
  // Without the filter...
  const all = await getJson('/jobs/4/matches?limit=100');
  // ...and with it.
  const filtered = await getJson('/jobs/4/matches?limit=100&available_only=true');
  // .some(...) = "is there at least one item where this is true?"
  // Miranda IS in the normal list...
  assert.ok(all.body.matches.some(m => m.candidate_name === 'Miranda P.'));
  // ...and is NOT in the filtered list ("!" means NOT).
  assert.ok(!filtered.body.matches.some(m => m.candidate_name === 'Miranda P.'));
});

// TEST 6: Does the reverse direction (best jobs for a candidate) work?
// Olivia P. (candidate 12) should fit Incident Commander best.
test('reverse direction: Olivia P. best fits Incident Commander', async () => {
  const { body } = await getJson('/candidates/12/matches');
  assert.equal(body.matches[0].job_title, 'Incident Commander');
});

// TEST 7: Does ?limit work? Asking for 2 should return exactly 2.
test('limit restricts the number of results', async () => {
  const { body } = await getJson('/jobs/6/matches?limit=2');
  assert.equal(body.matches.length, 2);
});

// TEST 8: Are wrong requests handled politely?
//   Job 999 / candidate 999 don't exist -> 404 Not Found.
//   "abc" isn't a number                -> 400 Bad Request.
test('unknown ids return 404 and bad ids return 400', async () => {
  assert.equal((await getJson('/jobs/999/matches')).status, 404);
  assert.equal((await getJson('/candidates/999/matches')).status, 404);
  assert.equal((await getJson('/candidates/abc')).status, 400);
});

// TEST 9: Can a new candidate be added, and do they then appear in the
// rankings straight away? Is adding the same name twice refused?
test('POST /candidates adds a candidate who then appears in matches', async () => {
  // Add a new person. Note the capital letters in the skills on purpose.
  const created = await postJson('/candidates', {
    name: 'Test Detective',
    experience_years: 5,
    availability: 'Immediate',
    skills: ['Deduction', 'Forensics'], // mixed case is normalised
    traits: ['analytical'],
  });
  // Should reply 201 Created...
  assert.equal(created.status, 201);
  // ...with the skills tidied to lower case and sorted.
  assert.deepEqual(created.body.skills, ['deduction', 'forensics']);

  // The new person should now be in job 1's matches.
  const { body } = await getJson('/jobs/1/matches?limit=100');
  assert.ok(body.matches.some(m => m.candidate_name === 'Test Detective'));

  // Adding the same name again...
  const duplicate = await postJson('/candidates', {
    name: 'Test Detective', experience_years: 5, availability: 'Immediate', skills: ['deduction'],
  });
  // ...should be refused with 409 Conflict.
  assert.equal(duplicate.status, 409);
});

// TEST 10: Is bad input rejected with a list of what's wrong?
// The body below has a blank name, empty skills, and is missing
// experience_years and availability -> at least 3 problems.
test('POST /candidates rejects invalid input', async () => {
  const { status, body } = await postJson('/candidates', { name: '', skills: [] });
  // Should reply 400 Bad Request...
  assert.equal(status, 400);
  // ...listing at least 3 problems.
  assert.ok(body.errors.length >= 3);
});


// =====================================================================
// [ADDED] TESTS 11-13: the browser explorer and the Part 2 endpoints.
// =====================================================================

// TEST 11: Does /detective return all 5 Part 2 answers, with the
// expected results? (These are the same answers `npm run detective` prints.)
test('GET /detective returns the 5 SQL Detective answers', async () => {
  const { status, body } = await getJson('/detective');
  // 200 OK and exactly 5 answers.
  assert.equal(status, 200);
  assert.equal(body.length, 5);
  // Q1: open postings are 1, 2, 4 and 5.
  assert.deepEqual(body[0].rows.map(r => r.job_posting_id), [1, 2, 4, 5]);
  // Q3: the Ananya Rao trap - she must be found once, with 2 postings.
  const ananya = body[2].rows.find(r => r.full_name === 'Ananya Rao');
  assert.equal(ananya.postings_applied_to, 2);
  // Q4: Priya Shah's conversion rate is 0.75.
  assert.equal(body[3].rows[0].recruiter_name, 'Priya Shah');
  assert.equal(body[3].rows[0].conversion_rate, 0.75);
});

// TEST 12: Does /detective/:n return one answer, and reject bad numbers?
test('GET /detective/:n returns one answer; bad numbers give 404 / 400', async () => {
  // Question 5: top recruiter per department -> Data and Engineering.
  const q5 = await getJson('/detective/5');
  assert.equal(q5.status, 200);
  assert.equal(q5.body.number, 5);
  assert.deepEqual(q5.body.rows.map(r => r.department), ['Data', 'Engineering']);
  // There is no question 9 -> 404.  "x" is not a number -> 400.
  assert.equal((await getJson('/detective/9')).status, 404);
  assert.equal((await getJson('/detective/x')).status, 400);
});

// TEST 13: Is the explorer page served, and do the original addresses
// still work exactly as before? (Adding the page must not change them.)
test('GET /explorer serves the HTML page and original routes still work', async () => {
  // The page: 200 OK, and it is HTML (not JSON), so read it as text.
  const page = await fetch(base + '/explorer');
  assert.equal(page.status, 200);
  assert.match(page.headers.get('content-type'), /text\/html/);
  assert.match(await page.text(), /Recruiter Bot - API Explorer/);
  // An original address, unchanged: Sherlock still tops job 1.
  const { body } = await getJson('/jobs/1/matches');
  assert.equal(body.matches[0].candidate_name, 'Sherlock H.');
});
