# Local Telegram to-do bot

Runs on your machine with the
[Telegram Bot API](https://core.telegram.org/bots/api) and long polling.

| You send | Bot does |
| --- | --- |
| Any plain text | Adds it to **your** list |
| `/list` | Shows your full list |
| `/start` or `/help` | Brief usage |

Lists are per Telegram user id. Data is stored in `todos.json` next to the bot.

## Requirements

- [Node.js](https://nodejs.org/) 18+ (uses native `fetch`)
- A bot token from [@BotFather](https://t.me/BotFather)

### Important: use a dedicated bot (or disable serverless)

Long polling (`getUpdates`) and webhooks are **mutually exclusive**. If this bot
shares a token with the tgcloud serverless project, delete the webhook first
(this script calls `deleteWebhook` on start) — but only one consumer should
process updates for a given token.

**Recommended:** create a second bot with BotFather for local development.

## Setup

```powershell
cd C:\Users\Pipp\todo-bot-local
copy .env.example .env
# Edit .env and set BOT_TOKEN=... from BotFather
```

## Run

```powershell
npm start
```

Leave the terminal open. Message the bot in Telegram.

## How it talks to Telegram

Requests go to:

```text
https://api.telegram.org/bot<token>/<method>
```

- [`deleteWebhook`](https://core.telegram.org/bots/api#deletewebhook) — so polling works
- [`getMe`](https://core.telegram.org/bots/api#getme) — confirm the token
- [`getUpdates`](https://core.telegram.org/bots/api#getupdates) — long poll (`timeout: 30`), advance `offset` after each batch
- [`sendMessage`](https://core.telegram.org/bots/api#sendmessage) — replies

No npm runtime dependencies; only Node’s built-in modules.
