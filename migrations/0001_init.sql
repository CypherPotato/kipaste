CREATE TABLE pastes (
    code TEXT PRIMARY KEY,
    content TEXT NOT NULL,
    language TEXT NOT NULL DEFAULT 'plaintext',
    owner_hash TEXT NOT NULL,
    salt TEXT,
    iv TEXT,
    views INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
);

CREATE INDEX idx_pastes_expires_at ON pastes (expires_at);

CREATE TABLE create_events (
    ip_hash TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    size INTEGER NOT NULL,
    blocked INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_create_events_ip ON create_events (ip_hash, created_at);
CREATE INDEX idx_create_events_created_at ON create_events (created_at);
