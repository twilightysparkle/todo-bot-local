/**
 * Local Telegram to-do bot.
 *
 * Same behaviour as the tgcloud version:
 *   plain text → add to that user's list
 *   /list      → show their list
 *
 * Uses the official Bot API with long polling (getUpdates):
 *   https://core.telegram.org/bots/api#getupdates
 *   https://core.telegram.org/bots/api#sendmessage
 *
 * Requires Node.js 18+ (native fetch). Set BOT_TOKEN in the environment
 * or in a .env file next to this script.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { load as loadStore, listFor, addFor } from './store.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const API = 'https://api.telegram.org';

// ── env ──────────────────────────────────────────────────────────────────────

function loadEnvFile() {
  const envPath = path.join(__dirname, '.env');
  let raw;
  try {
    raw = fs.readFileSync(envPath, 'utf8');
  } catch {
    return;
  }
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

loadEnvFile();

const TOKEN = process.env.BOT_TOKEN;
if (!TOKEN) {
  console.error(
    'Missing BOT_TOKEN. Copy .env.example to .env and paste your token from @BotFather.',
  );
  process.exit(1);
}

const BASE = `${API}/bot${TOKEN}`;

// ── Bot API helpers ──────────────────────────────────────────────────────────

async function api(method, body = {}) {
  const res = await fetch(`${BASE}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!data.ok) {
    const err = new Error(data.description || `API error on ${method}`);
    err.code = data.error_code;
    err.parameters = data.parameters;
    throw err;
  }
  return data.result;
}

async function sendMessage(chatId, text) {
  return api('sendMessage', { chat_id: chatId, text });
}

// ── Message handling (same rules as my-bot) ──────────────────────────────────

function isCommand(text, name) {
  return text === `/${name}` || text.startsWith(`/${name}@`);
}

async function handleMessage(message) {
  const text = message.text?.trim();
  if (!text) return;

  const userId = message.from?.id;
  const chatId = message.chat.id;
  if (userId == null) return;

  if (isCommand(text, 'list')) {
    const items = listFor(userId);
    if (items.length === 0) {
      await sendMessage(
        chatId,
        'Your to-do list is empty. Send any text to add an item.',
      );
      return;
    }
    const list = items.map((item, i) => `${i + 1}. ${item}`).join('\n');
    await sendMessage(chatId, `Your to-do list:\n${list}`);
    return;
  }

  // Don't store other bot commands as to-dos
  if (text.startsWith('/')) {
    if (isCommand(text, 'start') || isCommand(text, 'help')) {
      await sendMessage(
        chatId,
        'Send any text to add a to-do.\nSend /list to see your list.',
      );
    }
    return;
  }

  addFor(userId, text);
  await sendMessage(chatId, `Added: ${text}`);
}

// ── Long polling loop ────────────────────────────────────────────────────────

async function poll() {
  // getUpdates does not work while a webhook is set — clear it first.
  // https://core.telegram.org/bots/api#getupdates
  await api('deleteWebhook', { drop_pending_updates: false });

  const me = await api('getMe');
  console.log(`Logged in as @${me.username} (id ${me.id})`);
  console.log('Long-polling for updates… (Ctrl+C to stop)');

  let offset = 0;

  for (;;) {
    let updates;
    try {
      // timeout > 0 = long polling; Telegram holds the request until updates arrive
      updates = await api('getUpdates', {
        offset,
        timeout: 30,
        allowed_updates: ['message'],
      });
    } catch (err) {
      console.error('getUpdates failed:', err.message);
      await sleep(3000);
      continue;
    }

    for (const update of updates) {
      // Confirm this update on the next call (offset = last update_id + 1)
      offset = update.update_id + 1;

      if (!update.message) continue;
      try {
        await handleMessage(update.message);
      } catch (err) {
        console.error(
          `Failed to handle update ${update.update_id}:`,
          err.message,
        );
      }
    }
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── main ─────────────────────────────────────────────────────────────────────

loadStore();
poll().catch((err) => {
  console.error(err);
  process.exit(1);
});
