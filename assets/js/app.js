import { appConfig, parseSlugFromLocation, toPagePath } from './config.js';
import { PasteApi } from './api/paste-api.js';
import { EditorView } from './editor/editor-view.js';
import { PasteView } from './view/paste-view.js';

if (window.Prism?.plugins?.autoloader) {
    window.Prism.plugins.autoloader.languages_path = 'https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/';
}

const elements = {
    topbar: document.querySelector('.topbar'),
    topbarLeft: document.querySelector('.topbar-left'),
    workspace: document.getElementById('workspace'),
    savePasteButton: document.getElementById('savePasteBtn'),
    languageSelect: document.getElementById('languageSelect'),
    expirationSelect: document.getElementById('expirationSelect'),
    viewModeToggleButton: document.getElementById('viewModeToggleBtn'),
    viewModeToggleIcon: document.getElementById('viewModeToggleIcon'),
    themeSelect: document.getElementById('themeSelect'),
    themeSelectPasteWrapper: document.getElementById('themeSelectPasteWrapper'),
    themeSelectPaste: document.getElementById('themeSelectPaste'),
    visitCounter: document.getElementById('visitCounter'),
    downloadButton: document.getElementById('downloadBtn'),
    copyButton: document.getElementById('copyBtn'),
    forkButton: document.getElementById('forkBtn'),
    deleteButton: document.getElementById('deleteBtn'),
    createButton: document.getElementById('createBtn'),
    editorSection: document.getElementById('editorSection'),
    viewerSection: document.getElementById('viewerSection'),
    editorInput: document.getElementById('editorInput'),
    viewerCodeWrap: document.getElementById('viewerCodeWrap'),
    viewerCode: document.getElementById('viewerCode'),
    viewerMarkdown: document.getElementById('viewerMarkdown'),
    statusMessage: document.getElementById('statusMessage'),
    prismLightTheme: document.getElementById('prismLightTheme'),
    prismDarkTheme: document.getElementById('prismDarkTheme'),
};

const api = new PasteApi();
const editorView = new EditorView(elements.editorInput);
const pasteView = new PasteView(elements.viewerCode, elements.viewerCodeWrap, elements.viewerMarkdown);

const state = {
    currentPaste: null,
    viewMode: 'condensed',
};

const THEME_STORAGE_KEY = 'kipaste-theme';
const VIEW_MODE_STORAGE_KEY = 'kipaste-view-mode';
const RECAPTCHA_ACTION = 'create_paste';

function normalizeViewMode(value) {
    if (value === 'expanded' || value === 'extended') {
        return 'expanded';
    }

    return 'condensed';
}

function initializeSelects() {
    const groupedLanguages = new Map();
    const languages = Object.entries(appConfig.languages);

    for (const [value, label] of languages) {
        const normalizedLabel = String(label).trim();
        const initialCharacter = normalizedLabel.charAt(0).toUpperCase();
        const groupLabel = /^[A-Z]$/.test(initialCharacter) ? initialCharacter : '#';

        if (!groupedLanguages.has(groupLabel)) {
            groupedLanguages.set(groupLabel, []);
        }

        groupedLanguages.get(groupLabel).push({ value, label: normalizedLabel });
    }

    const sortedGroupLabels = [...groupedLanguages.keys()].sort((left, right) => {
        if (left === '#') {
            return 1;
        }

        if (right === '#') {
            return -1;
        }

        return left.localeCompare(right, undefined, { sensitivity: 'base' });
    });

    for (const groupLabel of sortedGroupLabels) {
        const groupElement = document.createElement('optgroup');
        groupElement.label = groupLabel;

        const groupedOptions = groupedLanguages.get(groupLabel);
        groupedOptions.sort((left, right) => left.label.localeCompare(right.label, undefined, { sensitivity: 'base' }));

        for (const option of groupedOptions) {
            const optionElement = document.createElement('option');
            optionElement.value = option.value;
            optionElement.textContent = option.label;
            groupElement.append(optionElement);
        }

        elements.languageSelect.append(groupElement);
    }

    for (const value of appConfig.expirations) {
        const optionElement = document.createElement('option');
        optionElement.value = value;
        optionElement.textContent = value;
        elements.expirationSelect.append(optionElement);
    }

    elements.expirationSelect.value = appConfig.defaultExpiration;
}

function showStatus(message) {
    elements.statusMessage.textContent = message;
    elements.statusMessage.classList.add('visible');

    window.setTimeout(() => {
        elements.statusMessage.classList.remove('visible');
    }, 1600);
}

async function resolveRecaptchaToken() {
    const siteKey = appConfig.recaptchaSiteKey.trim();
    if (siteKey === '') {
        return null;
    }

    if (typeof window.grecaptcha?.ready !== 'function' || typeof window.grecaptcha?.execute !== 'function') {
        throw new Error('reCAPTCHA is unavailable. Try again.');
    }

    return new Promise((resolve, reject) => {
        window.grecaptcha.ready(() => {
            window.grecaptcha.execute(siteKey, { action: RECAPTCHA_ACTION })
                .then((token) => resolve(token))
                .catch(() => reject(new Error('reCAPTCHA validation failed.')));
        });
    });
}

function setViewMode(value) {
    const normalizedViewMode = normalizeViewMode(value);

    state.viewMode = normalizedViewMode;
    elements.workspace.classList.remove('condensed', 'expanded');
    elements.workspace.classList.add(normalizedViewMode);
    elements.editorInput.wrap = normalizedViewMode === 'expanded' ? 'off' : 'soft';

    const isExpanded = normalizedViewMode === 'expanded';
    elements.viewModeToggleButton.setAttribute('aria-pressed', isExpanded ? 'true' : 'false');
    elements.viewModeToggleButton.setAttribute('aria-label', isExpanded ? 'Switch to condensed view' : 'Switch to expanded view');
    elements.viewModeToggleButton.title = isExpanded ? 'Condensed' : 'Expanded';
    elements.viewModeToggleIcon.className = isExpanded ? 'ri-expand-width-line' : 'ri-contract-left-right-line';
}

function initializeViewMode() {
    const savedViewMode = window.localStorage.getItem(VIEW_MODE_STORAGE_KEY);
    setViewMode(savedViewMode ?? 'condensed');
}

function toggleViewMode() {
    const nextViewMode = state.viewMode === 'expanded' ? 'condensed' : 'expanded';
    window.localStorage.setItem(VIEW_MODE_STORAGE_KEY, nextViewMode);
    setViewMode(nextViewMode);
}

function resolveThemeMode(themeSelection) {
    if (themeSelection === 'light' || themeSelection === 'dark') {
        return themeSelection;
    }

    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyPrismTheme(themeMode) {
    if (elements.prismLightTheme === null || elements.prismDarkTheme === null) {
        return;
    }

    const useDark = themeMode === 'dark';
    elements.prismLightTheme.disabled = useDark;
    elements.prismDarkTheme.disabled = !useDark;
}

function applyTheme(themeSelection) {
    const normalizedTheme = ['light', 'dark', 'system'].includes(themeSelection) ? themeSelection : 'system';
    document.documentElement.setAttribute('data-theme', normalizedTheme);
    applyPrismTheme(resolveThemeMode(normalizedTheme));
}

function setThemeSelection(themeSelection, persist = true) {
    const normalizedTheme = ['light', 'dark', 'system'].includes(themeSelection) ? themeSelection : 'system';

    elements.themeSelect.value = normalizedTheme;
    elements.themeSelectPaste.value = normalizedTheme;

    if (persist) {
        window.localStorage.setItem(THEME_STORAGE_KEY, normalizedTheme);
    }

    applyTheme(normalizedTheme);
}

function initializeTheme() {
    const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY) ?? 'system';
    setThemeSelection(savedTheme, false);

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onSystemChange = () => {
        if (elements.themeSelect.value === 'system') {
            applyTheme('system');
        }
    };

    if (typeof media.addEventListener === 'function') {
        media.addEventListener('change', onSystemChange);
    } else if (typeof media.addListener === 'function') {
        media.addListener(onSystemChange);
    }
}

function setEditorMode() {
    state.currentPaste = null;

    elements.topbar?.classList.remove('paste-toolbar-centered');
    elements.topbarLeft?.classList.remove('hidden');
    elements.editorSection.classList.remove('hidden');
    elements.viewerSection.classList.add('hidden');

    elements.savePasteButton.classList.remove('hidden');
    elements.themeSelectPasteWrapper.classList.add('hidden');
    elements.downloadButton.classList.add('hidden');
    elements.copyButton.classList.add('hidden');
    elements.forkButton.classList.add('hidden');
    elements.deleteButton.classList.add('hidden');
    elements.createButton.classList.add('hidden');
    elements.visitCounter.classList.add('hidden');

    editorView.focus();
}

function setPasteMode(paste) {
    state.currentPaste = paste;

    elements.topbar?.classList.add('paste-toolbar-centered');
    elements.topbarLeft?.classList.add('hidden');
    elements.editorSection.classList.add('hidden');
    elements.viewerSection.classList.remove('hidden');

    elements.savePasteButton.classList.add('hidden');
    elements.themeSelectPasteWrapper.classList.remove('hidden');
    elements.downloadButton.classList.remove('hidden');
    elements.copyButton.classList.remove('hidden');
    elements.forkButton.classList.remove('hidden');
    elements.createButton.classList.remove('hidden');
    elements.visitCounter.classList.remove('hidden');
    elements.visitCounter.textContent = `${paste.visitCount} views`;

    elements.deleteButton.classList.toggle('hidden', !paste.canDelete);
    elements.languageSelect.value = paste.language;

    pasteView.render(paste);
}

async function loadPaste(slug, updateHistory = false) {
    if (!slug) {
        setEditorMode();
        return;
    }

    try {
        const response = await api.getPaste(slug);
        const paste = response.paste;
        setPasteMode(paste);

        if (updateHistory) {
            window.history.pushState({}, '', toPagePath(slug));
        }
    } catch (error) {
        setEditorMode();
        showStatus(error.message);
    }
}

async function savePaste() {
    try {
        const recaptchaToken = await resolveRecaptchaToken();
        const payload = {
            content: editorView.content(),
            language: elements.languageSelect.value,
            expiration: elements.expirationSelect.value,
        };

        if (recaptchaToken !== null) {
            payload.recaptchaToken = recaptchaToken;
        }

        const response = await api.createPaste(payload);
        window.location.href = response.url;
    } catch (error) {
        showStatus(error.message);
    }
}

async function copyPaste() {
    if (state.currentPaste === null) {
        return;
    }

    try {
        await navigator.clipboard.writeText(state.currentPaste.content);
        showStatus('Content copied');
    } catch {
        showStatus('Copy failed');
    }
}

function downloadPaste() {
    if (state.currentPaste === null) {
        return;
    }

    const rawUrl = `${toPagePath(state.currentPaste.slug)}?raw=1`;
    const link = document.createElement('a');
    link.href = rawUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.append(link);
    link.click();
    link.remove();
}

function forkPaste() {
    if (state.currentPaste === null) {
        return;
    }

    const sourcePaste = state.currentPaste;
    setEditorMode();
    editorView.setContent(sourcePaste.content);
    elements.languageSelect.value = sourcePaste.language;
    window.history.pushState({}, '', toPagePath());
    showStatus('Fork loaded in editor');
}

async function deletePaste() {
    if (state.currentPaste === null) {
        return;
    }

    const confirmed = window.confirm('Delete this paste?');
    if (!confirmed) {
        return;
    }

    try {
        await api.deletePaste(state.currentPaste.slug);
        editorView.clear();
        window.history.pushState({}, '', toPagePath());
        setEditorMode();
        showStatus('Paste deleted');
    } catch (error) {
        showStatus(error.message);
    }
}

function createNewPaste() {
    editorView.clear();
    window.history.pushState({}, '', toPagePath());
    setEditorMode();
}

function registerEvents() {
    elements.savePasteButton.addEventListener('click', savePaste);
    elements.downloadButton.addEventListener('click', downloadPaste);
    elements.copyButton.addEventListener('click', copyPaste);
    elements.forkButton.addEventListener('click', forkPaste);
    elements.deleteButton.addEventListener('click', deletePaste);
    elements.createButton.addEventListener('click', createNewPaste);
    elements.viewModeToggleButton.addEventListener('click', toggleViewMode);
    elements.themeSelect.addEventListener('change', (event) => {
        setThemeSelection(event.target.value);
    });
    elements.themeSelectPaste.addEventListener('change', (event) => {
        setThemeSelection(event.target.value);
    });

    window.addEventListener('popstate', () => {
        loadPaste(parseSlugFromLocation());
    });
}

function bootstrap() {
    initializeSelects();
    initializeTheme();
    initializeViewMode();
    registerEvents();

    const initialSlug = appConfig.initialPasteSlug ?? parseSlugFromLocation();
    if (initialSlug) {
        loadPaste(initialSlug);
        return;
    }

    setEditorMode();
}

bootstrap();
