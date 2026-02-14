import { toApiPath } from '../config.js';

export class PasteApi {
    async createPaste(payload) {
        return this.#request('/api/pastes', {
            method: 'POST',
            body: payload,
        });
    }

    async getPaste(slug) {
        return this.#request(`/api/pastes/${encodeURIComponent(slug)}`, {
            method: 'GET',
        });
    }

    async forkPaste(slug, expiration) {
        return this.#request(`/api/pastes/${encodeURIComponent(slug)}/fork`, {
            method: 'POST',
            body: { expiration },
        });
    }

    async deletePaste(slug) {
        return this.#request(`/api/pastes/${encodeURIComponent(slug)}`, {
            method: 'DELETE',
        });
    }

    async #request(path, options) {
        const response = await fetch(toApiPath(path), {
            method: options.method,
            headers: {
                'Content-Type': 'application/json',
            },
            body: options.body ? JSON.stringify(options.body) : undefined,
        });

        const payload = await response.json().catch(() => ({}));

        if (!response.ok || payload.success === false) {
            const message = payload.message ?? 'Operação não concluída.';
            throw new Error(message);
        }

        return payload;
    }
}
