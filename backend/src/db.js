// Read (mostly) connection to the same SQLite DB the Python scraper writes
// to. better-sqlite3 is synchronous, which keeps the query layer simple for
// an API this size and avoids an extra async DB driver dependency.
const Database = require("better-sqlite3");
const fs = require("fs");
const { DB_PATH } = require("./config");

let db;

function getDb() {
  if (!db) {
    if (!fs.existsSync(DB_PATH)) {
      // Don't crash on boot if the scraper hasn't run yet - endpoints will
      // just return empty results until POST /ingest/trigger populates it.
      console.warn(`[db] SQLite file not found at ${DB_PATH}. It will be created on first scraper run.`);
    }
    db = new Database(DB_PATH, { fileMustExist: false });
    db.pragma("journal_mode = WAL");
  }
  return db;
}

module.exports = { getDb };
