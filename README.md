# Ki

Dead-simple paste service running on Cloudflare Workers + D1.

## Commands

```sh
bun install
bun run dev      # local D1 migrations + wrangler dev (http://localhost:8787)
bun run deploy   # provisions D1 (if missing), applies remote migrations, deploys the worker
```

`deploy` requires being logged in (`bunx wrangler login`). On first run it creates the `ki` D1 database and writes its `database_id` into `wrangler.json` — commit that change.

## Configuration

Edit `vars` in `wrangler.json`:

| Variable | Default | Description |
| --- | --- | --- |
| `MAX_PASTE_CHARS` | `500000` | Maximum paste length in characters |
| `CREATE_LIMIT_PER_MINUTE` | `10` | Pastes per IP per minute |
| `CREATE_LIMIT_PER_HOUR` | `60` | Pastes per IP per hour |
| `CREATE_LIMIT_PER_DAY` | `300` | Pastes per IP per day |

## How it works

- **Passwords**: content is encrypted in the browser with AES-256-GCM (PBKDF2-SHA256, 250k iterations). The server only stores ciphertext, salt and IV; the password never leaves the browser.
- **Ownership**: creating a paste returns an owner token, kept in `localStorage`. Only the creator's browser shows the delete button, and the server checks the token hash.
- **Abuse metrics**: every creation attempt is recorded in `create_events` (hashed IP, timestamp, size, blocked flag) and used for the per-IP rate limits.
- **Raw**: `/<code>?raw` (any value) returns the paste as `text/plain`. Password-protected pastes return `403`, since the server only holds ciphertext.
- **Cleanup**: a cron (`*/15 * * * *`) deletes expired pastes and create events older than 24h. Expired pastes are also hidden immediately on read.

Test the cron locally with `curl "http://localhost:8787/__scheduled?cron=*/15+*+*+*+*"`.
