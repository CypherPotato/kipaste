import { bindIndentationBehavior } from './indentation.js';

export class EditorView {
    constructor(textareaElement) {
        this.textareaElement = textareaElement;
        bindIndentationBehavior(this.textareaElement);
    }

    content() {
        return this.textareaElement.value;
    }

    setContent(value) {
        this.textareaElement.value = value;
    }

    clear() {
        this.textareaElement.value = '';
    }

    focus() {
        this.textareaElement.focus();
    }
}
