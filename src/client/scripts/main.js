import DOMPurify from "dompurify";
import { marked } from "marked";
import qrcode from "qrcode-generator";
import { decrypt, encrypt } from "./crypto.js";
import { findLanguage, hljs, LANGUAGES } from "./languages.js";

const $ = id => document.getElementById(id);

const THEMES = {
    system: "ri-contrast-2-line",
    light: "ri-sun-line",
    dark: "ri-moon-line"
};

const state = {
    config: { maxChars: 500000, expirations: ["10m", "1h", "1d", "1w", "10w"] },
    paste: null,
    content: "",
    password: null
};

function relativeTime(seconds) {
    const units = [["w", 604800], ["d", 86400], ["h", 3600], ["m", 60]];
    const abs = Math.abs(seconds);

    for (const [unit, size] of units) {
        if (abs >= size) return `${Math.floor(abs / size)}${unit}`;
    }

    return `${Math.max(1, Math.floor(abs))}s`;
}

function showMessage(text) {
    $("message").textContent = text;
    $("message").hidden = !text;
}

function toast(text) {
    const element = document.createElement("div");
    element.className = "toast";
    element.textContent = text;
    document.body.append(element);
    setTimeout(() => element.remove(), 2200);
}

function setMode(mode) {
    $("edit-actions").hidden = mode !== "edit";
    $("view-actions").hidden = mode !== "view";
    $("editor").hidden = mode !== "edit";
    $("char-counter").hidden = mode !== "edit";
    $("code-view").hidden = true;
    $("markdown-view").hidden = true;
    showMessage("");
}

function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("ki:theme", theme);
    $("theme").innerHTML = `<i class="${THEMES[theme]}"></i>`;
    $("theme").title = `Theme: ${theme}`;
}

function updateCounter() {
    const length = $("editor").value.length;
    $("char-counter").textContent = `${length.toLocaleString()} / ${state.config.maxChars.toLocaleString()}`;
    $("char-counter").classList.toggle("over", length > state.config.maxChars);
}

function updatePasswordButton() {
    $("password").classList.toggle("active", !!state.password);
    $("password").title = state.password ? "Password set" : "Set password";
    $("password").innerHTML = `<i class="${state.password ? "ri-lock-line" : "ri-lock-unlock-line"}"></i>`;
}

function openEditor({ content = "", language } = {}) {
    state.paste = null;
    state.password = null;

    setMode("edit");
    document.title = "Ki";

    $("editor").value = content;
    $("language").value = language ?? localStorage.getItem("ki:language") ?? "plaintext";

    updateCounter();
    updatePasswordButton();
    $("editor").focus();
}

function renderPaste() {
    const { paste, content } = state;
    const now = Date.now() / 1000;
    const language = findLanguage(paste.language);

    setMode("view");
    document.title = `${paste.code} · Ki`;

    const shortcode = Object.assign(document.createElement("button"), {
        className: "shortcode",
        textContent: paste.code,
        title: "Copy link",
        onclick: () => copyText(`${location.origin}/${paste.code}`, "Link copied.")
    });

    $("paste-meta").replaceChildren(shortcode, ...[
        `${paste.views} ${paste.views === 1 ? "view" : "views"}`,
        `created ${relativeTime(now - paste.createdAt)} ago`,
        `expires in ${relativeTime(paste.expiresAt - now)}`
    ].map(text => Object.assign(document.createElement("span"), { textContent: text })));

    $("delete").hidden = !localStorage.getItem(`ki:owner:${paste.code}`);

    if (language.id === "markdown") {
        $("markdown-view").innerHTML = DOMPurify.sanitize(marked.parse(content));
        $("markdown-view").hidden = false;
        return;
    }

    const lineCount = content.split("\n").length;
    $("line-numbers").textContent = Array.from({ length: lineCount }, (_, i) => i + 1).join("\n");
    $("code").innerHTML = hljs.highlight(content, { language: language.id }).value;
    $("code-view").hidden = false;
}

async function loadPaste(code) {
    setMode("view");
    $("view-actions").hidden = true;
    showMessage("Loading...");

    const response = await fetch(`/api/pastes/${encodeURIComponent(code)}`);

    if (!response.ok) {
        showMessage(response.status === 404 ? "This paste doesn't exist or has expired." : "Failed to load paste.");
        return;
    }

    state.paste = await response.json();
    state.content = state.paste.content;

    if (state.paste.encryption && state.password) {
        const password = state.password;
        state.password = null;
        state.content = await decrypt(state.content, state.paste.encryption, password).catch(() => null);
        if (state.content !== null) return renderPaste();
    }

    if (state.paste.encryption) {
        showMessage("This paste is password protected.");
        openPasswordDialog("unlock");
        return;
    }

    renderPaste();
}

function route() {
    const code = location.pathname.slice(1);

    if (code) {
        loadPaste(code).catch(() => showMessage("Failed to load paste."));
    } else {
        openEditor();
    }
}

function navigate(path) {
    history.pushState(null, "", path);
    route();
}

async function publish() {
    const text = $("editor").value;

    if (!text.trim()) return toast("Nothing to publish.");
    if (text.length > state.config.maxChars) return toast(`Paste exceeds ${state.config.maxChars.toLocaleString()} characters.`);

    $("publish").disabled = true;

    try {
        const payload = {
            content: text,
            language: $("language").value,
            expiresIn: $("expiration").value
        };

        if (state.password) Object.assign(payload, await encrypt(text, state.password));

        const response = await fetch("/api/pastes", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(payload)
        });

        const result = await response.json().catch(() => ({}));
        if (!response.ok) return toast(result.error ?? "Failed to publish.");

        localStorage.setItem(`ki:owner:${result.code}`, result.ownerToken);
        localStorage.setItem("ki:language", payload.language);
        localStorage.setItem("ki:expiration", payload.expiresIn);

        navigate(`/${result.code}`);
    } finally {
        $("publish").disabled = false;
    }
}

async function deletePaste() {
    const { code } = state.paste;
    const token = localStorage.getItem(`ki:owner:${code}`);

    if (!token || !confirm(`Delete paste "${code}" permanently? This cannot be undone.`)) return;

    const response = await fetch(`/api/pastes/${code}`, {
        method: "DELETE",
        headers: { authorization: `Bearer ${token}` }
    });

    if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        return toast(result.error ?? "Failed to delete paste.");
    }

    localStorage.removeItem(`ki:owner:${code}`);
    toast("Paste deleted.");
    navigate("/");
}

function openPasswordDialog(mode) {
    const unlock = mode === "unlock";

    $("password-dialog").dataset.mode = mode;
    $("password-title").textContent = unlock ? "Unlock paste" : "Set password";
    $("password-hint").textContent = unlock
        ? "Enter the password to decrypt this paste."
        : "The paste will be encrypted in your browser. Without the password it cannot be recovered.";
    $("password-clear").hidden = unlock || !state.password;
    $("password-input").value = unlock ? "" : state.password ?? "";
    $("password-error").hidden = true;
    $("password-dialog").showModal();
}

async function submitPassword(event) {
    event.preventDefault();

    const value = $("password-input").value;

    if ($("password-dialog").dataset.mode === "set") {
        state.password = value || null;
        updatePasswordButton();
        $("password-dialog").close();
        return;
    }

    try {
        $("password-submit").disabled = true;
        state.content = await decrypt(state.paste.content, state.paste.encryption, value);
        $("password-dialog").close();
        renderPaste();
    } catch {
        $("password-error").textContent = "Wrong password.";
        $("password-error").hidden = false;
    } finally {
        $("password-submit").disabled = false;
    }
}

function openQrDialog() {
    const url = `${location.origin}/${state.paste.code}`;
    const qr = qrcode(0, "M");

    qr.addData(url);
    qr.make();

    $("qr-box").innerHTML = qr.createSvgTag({ cellSize: 8, margin: 0, scalable: true });
    $("share-link").value = url;
    selectTab("qr");
    $("qr-dialog").showModal();
}

function selectTab(name) {
    for (const tab of $("qr-dialog").querySelectorAll("[data-tab]")) {
        tab.setAttribute("aria-selected", String(tab.dataset.tab === name));
    }

    for (const panel of $("qr-dialog").querySelectorAll("[data-panel]")) {
        panel.hidden = panel.dataset.panel !== name;
    }
}

async function copyText(text, message) {
    await navigator.clipboard.writeText(text);
    toast(message);
}

function download() {
    const { code, language } = state.paste;
    const blob = new Blob([state.content], { type: "text/plain;charset=utf-8" });
    const link = Object.assign(document.createElement("a"), {
        href: URL.createObjectURL(blob),
        download: `${code}.${findLanguage(language).ext}`
    });

    link.click();
    URL.revokeObjectURL(link.href);
}

function setupLanguagePicker() {
    const sorted = [...LANGUAGES].sort((a, b) => a.name.localeCompare(b.name));
    const groups = Map.groupBy(sorted, l => l.name[0].toUpperCase());

    for (const [letter, languages] of groups) {
        const group = document.createElement("optgroup");
        group.label = letter;
        group.append(...languages.map(l => new Option(l.name, l.id)));
        $("language").append(group);
    }
}

function setupExpirationPicker() {
    $("expiration").replaceChildren(...state.config.expirations.map(e => new Option(e, e)));
    $("expiration").value = localStorage.getItem("ki:expiration") ?? "1d";
    if (!$("expiration").value) $("expiration").value = state.config.expirations[0];
}

function bindEvents() {
    $("editor").addEventListener("input", updateCounter);

    $("editor").addEventListener("keydown", event => {
        if (event.key !== "Tab" || event.ctrlKey || event.altKey) return;
        event.preventDefault();
        document.execCommand("insertText", false, "\t");
    });

    document.addEventListener("keydown", event => {
        if ((event.ctrlKey || event.metaKey) && event.key === "s") {
            event.preventDefault();
            if (!$("edit-actions").hidden) publish();
        }
    });

    $("publish").addEventListener("click", publish);
    $("password").addEventListener("click", () => openPasswordDialog("set"));
    $("password-form").addEventListener("submit", submitPassword);

    $("password-clear").addEventListener("click", () => {
        state.password = null;
        updatePasswordButton();
        $("password-dialog").close();
    });

    $("download").addEventListener("click", download);
    $("copy").addEventListener("click", () => copyText(state.content, "Paste copied."));
    $("qrcode").addEventListener("click", openQrDialog);
    $("copy-link").addEventListener("click", () => copyText($("share-link").value, "Link copied."));
    $("fork").addEventListener("click", () => {
        const { content, paste } = state;
        history.pushState(null, "", "/");
        openEditor({ content, language: paste.language });
    });
    $("delete").addEventListener("click", deletePaste);
    $("new").addEventListener("click", () => navigate("/"));

    $("theme").addEventListener("click", () => {
        const order = Object.keys(THEMES);
        applyTheme(order[(order.indexOf(document.documentElement.dataset.theme) + 1) % order.length]);
    });

    for (const tab of $("qr-dialog").querySelectorAll("[data-tab]")) {
        tab.addEventListener("click", () => selectTab(tab.dataset.tab));
    }

    for (const dialog of document.querySelectorAll("dialog")) {
        dialog.addEventListener("click", event => {
            if (event.target === dialog || event.target.closest("[data-close]")) dialog.close();
        });
    }

    $("language").addEventListener("change", () => $("editor").focus());
    window.addEventListener("popstate", route);
}

const config = await fetch("/api/config").then(r => r.ok ? r.json() : null).catch(() => null);
if (config) state.config = config;

applyTheme(document.documentElement.dataset.theme in THEMES ? document.documentElement.dataset.theme : "system");
setupLanguagePicker();
setupExpirationPicker();
bindEvents();
route();
