import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const CONFIG_PATH = "wrangler.json";

const ATTEMPTS = 3;

function run(args, { capture = false } = {}) {
    for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
        console.log(`> wrangler ${args.join(" ")}`);

        const result = spawnSync("bunx", ["wrangler", ...args], {
            stdio: capture ? ["inherit", "pipe", "inherit"] : "inherit",
            encoding: "utf8",
            shell: process.platform === "win32",
            env: { ...process.env, CI: "true" }
        });

        if (result.status === 0) return result.stdout;

        // Cloudflare API calls fail intermittently with "fetch failed"; every step here is idempotent, so retrying is safe.
        console.error(`wrangler ${args[0]} failed (attempt ${attempt}/${ATTEMPTS}).`);
        if (attempt === ATTEMPTS) process.exit(result.status ?? 1);
    }
}

const config = JSON.parse(readFileSync(CONFIG_PATH, "utf8"));
const database = config.d1_databases[0];

const databases = JSON.parse(run(["d1", "list", "--json"], { capture: true }));
let databaseId = databases.find(d => d.name === database.database_name)?.uuid;

if (!databaseId) {
    run(["d1", "create", database.database_name]);
    databaseId = JSON.parse(run(["d1", "list", "--json"], { capture: true }))
        .find(d => d.name === database.database_name)?.uuid;
}

if (!databaseId) {
    console.error(`Could not resolve the D1 database "${database.database_name}".`);
    process.exit(1);
}

if (database.database_id !== databaseId) {
    database.database_id = databaseId;
    writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + "\n");
    console.log(`Updated ${CONFIG_PATH} with database_id ${databaseId}.`);
}

run(["d1", "migrations", "apply", database.database_name, "--remote"]);
run(["deploy"]);
