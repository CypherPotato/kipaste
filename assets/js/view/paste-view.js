export class PasteView {
    constructor(codeElement, codeWrapElement, markdownElement, topbarElement) {
        this.codeElement = codeElement;
        this.codeWrapElement = codeWrapElement;
        this.markdownElement = markdownElement;
        this.topbarElement = topbarElement;
    }

    render(paste) {
        const normalizedLanguage = String(paste.language || '').toLowerCase();
        if (normalizedLanguage === 'markdown') {
            this.topbarElement?.classList.add('topbar-dimmed');
            this.renderMarkdown(paste.content);
            return;
        }

        this.topbarElement?.classList.remove('topbar-dimmed');
        this.setLineNumbersEnabled(normalizedLanguage !== 'plaintext');
        this.markdownElement.classList.add('hidden');
        this.codeWrapElement.classList.remove('hidden');
        const codeContent = typeof paste.content === 'string' ? paste.content : '';
        this.codeElement.textContent = codeContent;
        this.codeElement.className = `language-${paste.language || 'plaintext'}`;
        this.clearLineNumberRows();

        if (window.Prism?.highlightElement) {
            window.Prism.highlightElement(this.codeElement);
        }
    }

    renderMarkdown(content) {
        this.codeWrapElement.classList.add('hidden');
        this.setLineNumbersEnabled(false);
        this.clearLineNumberRows();
        this.markdownElement.classList.remove('hidden');

        const markdownContent = typeof content === 'string' ? content : '';
        const parsedHtml = typeof window.marked?.parse === 'function'
            ? window.marked.parse(markdownContent)
            : markdownContent;

        const sanitizedHtml = typeof window.DOMPurify?.sanitize === 'function'
            ? window.DOMPurify.sanitize(parsedHtml, {
                USE_PROFILES: { html: true },
                FORBID_TAGS: ['script'],
            })
            : parsedHtml;

        this.markdownElement.innerHTML = `<div class="viewer-markdown-inner">${sanitizedHtml}</div>`;

        if (window.Prism?.highlightAllUnder) {
            window.Prism.highlightAllUnder(this.markdownElement);
        }
    }

    setLineNumbersEnabled(enabled) {
        this.codeWrapElement.classList.toggle('line-numbers', enabled);
    }

    clearLineNumberRows() {
        const lineNumberRows = this.codeWrapElement.querySelector('.line-numbers-rows');
        if (lineNumberRows !== null) {
            lineNumberRows.remove();
        }
    }
}
