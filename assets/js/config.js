const rawConfig = window.__APP_CONFIG ?? {};

export const appConfig = {
    basePath: typeof rawConfig.basePath === 'string' ? rawConfig.basePath : '',
    languages: rawConfig.languages ?? {},
    expirations: Array.isArray(rawConfig.expirations) ? rawConfig.expirations : [],
    defaultExpiration: rawConfig.defaultExpiration ?? '1d',
    initialPasteSlug: rawConfig.initialPasteSlug ?? null,
    recaptchaSiteKey: typeof rawConfig.recaptchaSiteKey === 'string' ? rawConfig.recaptchaSiteKey : '',
    maxPasteChars: typeof rawConfig.maxPasteChars === 'number' ? rawConfig.maxPasteChars : 50000,
};

export function toApiPath(pathname) {
    const normalizedBasePath = appConfig.basePath.replace(/\/$/, '');
    return `${normalizedBasePath}${pathname}`;
}

export function toPagePath(slug = null) {
    const normalizedBasePath = appConfig.basePath.replace(/\/$/, '');
    const rootPath = normalizedBasePath === '' ? '/' : `${normalizedBasePath}/`;

    if (slug === null) {
        return rootPath;
    }

    return `${rootPath}${encodeURIComponent(slug)}`;
}

export function parseSlugFromLocation() {
    const params = new URLSearchParams(window.location.search);
    const value = params.get('paste');
    if (value !== null && value.trim() !== '') {
        const normalizedSlug = value.replace(/[^a-z0-9]/gi, '').toLowerCase();
        return normalizedSlug === '' ? null : normalizedSlug;
    }

    const normalizedBasePath = appConfig.basePath.replace(/\/$/, '');
    let pathname = window.location.pathname;

    if (normalizedBasePath !== '' && pathname.startsWith(`${normalizedBasePath}/`)) {
        pathname = pathname.slice(normalizedBasePath.length);
    }

    const directSlugMatch = pathname.match(/^\/([a-z0-9]+)$/i);
    if (directSlugMatch !== null) {
        return directSlugMatch[1].toLowerCase();
    }

    const prefixedSlugMatch = pathname.match(/^\/p\/([a-z0-9]+)$/i);
    if (prefixedSlugMatch !== null) {
        return prefixedSlugMatch[1].toLowerCase();
    }

    return null;
}
