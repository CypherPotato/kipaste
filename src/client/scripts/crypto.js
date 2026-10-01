const ITERATIONS = 250000;

const toBase64 = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes)));
const fromBase64 = text => Uint8Array.from(atob(text), c => c.charCodeAt(0));

async function deriveKey(password, salt) {
    const material = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(password),
        "PBKDF2",
        false,
        ["deriveKey"]
    );

    return crypto.subtle.deriveKey(
        { name: "PBKDF2", salt, iterations: ITERATIONS, hash: "SHA-256" },
        material,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
    );
}

export async function encrypt(text, password) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKey(password, salt);
    const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(text));

    // Chunked conversion avoids call-stack overflow from spreading large arrays into String.fromCharCode.
    const bytes = new Uint8Array(cipher);
    let binary = "";
    for (let i = 0; i < bytes.length; i += 0x8000) {
        binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    }

    return {
        content: btoa(binary),
        encryption: { salt: toBase64(salt), iv: toBase64(iv) }
    };
}

export async function decrypt(content, encryption, password) {
    const key = await deriveKey(password, fromBase64(encryption.salt));
    const plain = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: fromBase64(encryption.iv) },
        key,
        fromBase64(content)
    );

    return new TextDecoder().decode(plain);
}
