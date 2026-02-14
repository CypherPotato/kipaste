export class PasteView {
    constructor(codeElement, codeWrapElement, markdownElement) {
        this.codeElement = codeElement;
        this.codeWrapElement = codeWrapElement;
        this.markdownElement = markdownElement;
    }

    render(paste) {
        if ((paste.language || '').toLowerCase() === 'markdown') {
            this.renderMarkdown(paste.content);
            return;
        }

        this.markdownElement.classList.add('hidden');
        this.codeWrapElement.classList.remove('hidden');
        this.codeElement.textContent = paste.content;
        this.codeElement.className = `language-${paste.language || 'plaintext'}`;

        if (window.Prism?.highlightElement) {
            window.Prism.highlightElement(this.codeElement);
        }
    }

    renderMarkdown(content) {
        this.codeWrapElement.classList.add('hidden');
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

        this.markdownElement.innerHTML = sanitizedHtml;
    }
}
