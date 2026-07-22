// Tiny JSON-file store. Swap for Postgres/SQLite later without touching callers.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FILE = path.join(__dirname, '..', 'data', 'timesheets.json');

function readAll() {
  try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); }
  catch { return {}; }
}
function writeAll(obj) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(obj, null, 2));
}

export function put(ts) {
  const all = readAll();
  all[ts.id] = ts;
  writeAll(all);
  return ts;
}
export function get(id) {
  return readAll()[id] || null;
}
export function all() {
  return Object.values(readAll());
}
