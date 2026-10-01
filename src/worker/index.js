const EXPIRATIONS = {
    "10m": 10 * 60,
    "1h": 60 * 60,
    "1d": 24 * 60 * 60,
    "1w": 7 * 24 * 60 * 60,
    "10w": 70 * 24 * 60 * 60
};

const CODE_ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789";
const LANGUAGE_PATTERN = /^[a-z0-9+#-]{1,32}$/;
const BASE64_PATTERN = /^[A-Za-z0-9+/]*={0,2}$/;

function json(body, status = 200, headers = {}) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { "content-type": "application/json; charset=utf-8", ...headers }
    });
}

function error(message, status, headers) {
    return json({ error: message }, status, headers);
}

function randomString(length, alphabet) {
    const bytes = crypto.getRandomValues(new Uint8Array(length));
    return Array.from(bytes, b => alphabet[b % alphabet.length]).join("");
}

async function sha256(text) {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
}

function limits(env) {
    return {
        maxChars: Number(env.MAX_PASTE_CHARS) || 500000,
        perMinute: Number(env.CREATE_LIMIT_PER_MINUTE) || 10,
        perHour: Number(env.CREATE_LIMIT_PER_HOUR) || 60,
        perDay: Number(env.CREATE_LIMIT_PER_DAY) || 300
    };
}

async function checkRateLimit(env, ipHash, now) {
    const { perMinute, perHour, perDay } = limits(env);

    const usage = await env.DB.prepare(`
        SELECT
            COALESCE(SUM(created_at > ?2), 0) AS minute,
            COALESCE(SUM(created_at > ?3), 0) AS hour,
            COUNT(*) AS day
        FROM create_events
        WHERE ip_hash = ?1 AND blocked = 0 AND created_at > ?4
    `).bind(ipHash, now - 60, now - 3600, now - 86400).first();

    if (usage.minute >= perMinute) return 60;
    if (usage.hour >= perHour) return 3600;
    if (usage.day >= perDay) return 86400;
    return 0;
}

async function createPaste(request, env) {
    const now = Math.floor(Date.now() / 1000);
    const ipHash = await sha256(request.headers.get("cf-connecting-ip") ?? "unknown");

    const retryAfter = await checkRateLimit(env, ipHash, now);

    if (retryAfter) {
        await env.DB.prepare("INSERT INTO create_events (ip_hash, created_at, size, blocked) VALUES (?, ?, 0, 1)")
            .bind(ipHash, now)
            .run();

        return error("Too many pastes created. Try again later.", 429, { "retry-after": String(retryAfter) });
    }

    const body = await request.json().catch(() => null);

    if (!body || typeof body.content !== "string" || !body.content.length) {
        return error("Paste content is required.", 400);
    }

    const language = typeof body.language === "string" && LANGUAGE_PATTERN.test(body.language)
        ? body.language
        : "plaintext";

    const ttl = EXPIRATIONS[body.expiresIn];
    if (!ttl) return error("Invalid expiration.", 400);

    const { maxChars } = limits(env);
    const encryption = body.encryption;
    let maxLength = maxChars;

    if (encryption) {
        const validEncryption = typeof encryption.salt === "string"
            && typeof encryption.iv === "string"
            && BASE64_PATTERN.test(encryption.salt)
            && BASE64_PATTERN.test(encryption.iv)
            && BASE64_PATTERN.test(body.content);

        if (!validEncryption) return error("Invalid encrypted payload.", 400);

        // Ciphertext is base64 of UTF-8 bytes (up to 3 bytes per UTF-16 unit) plus the 16-byte GCM tag.
        maxLength = Math.ceil((maxChars * 3 + 16) / 3) * 4;
    }

    if (body.content.length > maxLength) {
        return error(`Paste exceeds the maximum of ${maxChars} characters.`, 413);
    }

    const ownerToken = randomString(32, CODE_ALPHABET);
    const ownerHash = await sha256(ownerToken);

    for (let attempt = 0; attempt < 5; attempt++) {
        const code = randomString(5 + Math.floor(attempt / 2), CODE_ALPHABET);

        try {
            await env.DB.batch([
                env.DB.prepare(`
                    INSERT INTO pastes (code, content, language, owner_hash, salt, iv, created_at, expires_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `).bind(
                    code,
                    body.content,
                    language,
                    ownerHash,
                    encryption?.salt ?? null,
                    encryption?.iv ?? null,
                    now,
                    now + ttl
                ),
                env.DB.prepare("INSERT INTO create_events (ip_hash, created_at, size) VALUES (?, ?, ?)")
                    .bind(ipHash, now, body.content.length)
            ]);

            return json({ code, ownerToken }, 201);
        } catch (e) {
            if (!String(e?.message).includes("UNIQUE")) throw e;
        }
    }

    return error("Could not allocate a shortcode.", 503);
}

async function getPaste(code, env) {
    const now = Math.floor(Date.now() / 1000);

    const paste = await env.DB.prepare(`
        UPDATE pastes SET views = views + 1
        WHERE code = ? AND expires_at > ?
        RETURNING code, content, language, salt, iv, views, created_at, expires_at
    `).bind(code, now).first();

    if (!paste) return error("Paste not found.", 404);

    return json({
        code: paste.code,
        content: paste.content,
        language: paste.language,
        views: paste.views,
        createdAt: paste.created_at,
        expiresAt: paste.expires_at,
        encryption: paste.salt ? { salt: paste.salt, iv: paste.iv } : null
    }, 200, { "cache-control": "no-store" });
}

async function deletePaste(code, request, env) {
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) return error("Owner token is required.", 401);

    const result = await env.DB.prepare("DELETE FROM pastes WHERE code = ? AND owner_hash = ?")
        .bind(code, await sha256(token))
        .run();

    if (!result.meta.changes) return error("Paste not found or you are not its owner.", 403);

    return new Response(null, { status: 204 });
}

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        const match = url.pathname.match(/^\/api\/pastes\/([a-z0-9]{1,16})$/);

        try {
            if (url.pathname === "/api/config" && request.method === "GET") {
                return json({ maxChars: limits(env).maxChars, expirations: Object.keys(EXPIRATIONS) });
            }

            if (url.pathname === "/api/pastes" && request.method === "POST") {
                return await createPaste(request, env);
            }

            if (match && request.method === "GET") return await getPaste(match[1], env);
            if (match && request.method === "DELETE") return await deletePaste(match[1], request, env);

            return error("Not found.", 404);
        } catch (e) {
            console.error(e);
            return error("Internal error.", 500);
        }
    },

    async scheduled(controller, env) {
        const now = Math.floor(Date.now() / 1000);

        const [pastes, events] = await env.DB.batch([
            env.DB.prepare("DELETE FROM pastes WHERE expires_at <= ?").bind(now),
            env.DB.prepare("DELETE FROM create_events WHERE created_at <= ?").bind(now - 86400)
        ]);

        console.log(`Cleanup: ${pastes.meta.changes} expired pastes, ${events.meta.changes} old create events.`);
    }
};
