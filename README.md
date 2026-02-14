# kipaste

kipaste is a lightweight self-hosted paste service built with PHP, SQLite, and vanilla JavaScript.

## Features

- Create, view, fork, and delete pastes
- Syntax highlighting for multiple languages
- Markdown rendering with HTML sanitization
- Expiration support for pastes
- Optional invisible reCAPTCHA v3 validation on paste creation
- Garbage collection endpoint to remove expired pastes

## Requirements

- PHP 8.1+ with SQLite support
- Web server (or PHP built-in server)

## Project Structure

- `index.php`: main web entrypoint and router dispatcher
- `router.php`: router for PHP built-in server
- `gc.php`: endpoint to purge expired pastes
- `src/`: application source code
- `assets/`: frontend JS/CSS
- `storage/pastes.sqlite`: SQLite database file

## Quick Start

1. Copy environment template:

```bash
cp .env.example .env
```

2. Fill your `.env` values (reCAPTCHA keys are optional).

3. Start the app with PHP built-in server:

```bash
php -S 127.0.0.1:8080 router.php
```

4. Open:

```text
http://127.0.0.1:8080
```

## Environment Variables

Defined in `.env`:

- `RECAPTCHA_SITE_KEY=`
- `RECAPTCHA_SECRET_KEY=`
- `RECAPTCHA_MIN_SCORE=0.5`
- `RECAPTCHA_ACTION=create_paste`

Notes:

- If site/secret keys are empty, reCAPTCHA validation is skipped.
- If keys are set, paste creation requires a valid reCAPTCHA v3 token.

## API Endpoints

- `POST /api/pastes` — create paste
- `GET /api/pastes/{slug}` — fetch paste
- `POST /api/pastes/{slug}/fork` — fork paste
- `DELETE /api/pastes/{slug}` — delete paste (owner only)
- `GET /gc.php` or `POST /gc.php` — purge expired pastes

## Limits

- Paste content maximum length: **50,000 characters**.

## License

No license file is currently included in this repository.
