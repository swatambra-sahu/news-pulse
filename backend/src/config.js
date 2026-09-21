// Centralized config, all sourced from environment variables so nothing is
// hardcoded (DB paths, secrets, ports). See .env.example for documentation.
require("dotenv").config();
const path = require("path");

const REPO_ROOT = path.resolve(__dirname, "..", "..");

module.exports = {
  PORT: parseInt(process.env.PORT, 10) || 4000,
  DB_PATH: path.resolve(
    __dirname,
    "..",
    process.env.DB_PATH || path.join("..", "data", "newspulse.sqlite3")
  ),
  CORS_ORIGIN: process.env.CORS_ORIGIN || "*",
  // If PYTHON_BIN is a relative/absolute path (contains a separator),
  // resolve it relative to this backend directory so it works regardless
  // of the shell's current working directory. A bare command like
  // "python3" is left as-is to be resolved via PATH.
  PYTHON_BIN:
    process.env.PYTHON_BIN && process.env.PYTHON_BIN.includes(path.sep)
      ? path.resolve(__dirname, "..", process.env.PYTHON_BIN)
      : process.env.PYTHON_BIN || "python3",
  SCRAPER_PATH: path.resolve(
    __dirname,
    "..",
    process.env.SCRAPER_PATH || path.join("..", "scraper", "main.py")
  ),
  SCRAPER_CWD: path.resolve(
    __dirname,
    "..",
    path.dirname(process.env.SCRAPER_PATH || path.join("..", "scraper", "main.py"))
  ),
  REPO_ROOT,
};
