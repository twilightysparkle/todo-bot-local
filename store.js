import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, 'todos.json');

/** @type {Record<string, string[]>} userId -> items */
let data = {};

export function load() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    data = JSON.parse(raw);
    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
      data = {};
    }
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
    data = {};
  }
}

function save() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

export function listFor(userId) {
  return data[String(userId)] ?? [];
}

export function addFor(userId, text) {
  const key = String(userId);
  if (!data[key]) data[key] = [];
  data[key].push(text);
  save();
  return data[key];
}
