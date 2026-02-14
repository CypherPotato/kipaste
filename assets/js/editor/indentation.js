export function bindIndentationBehavior(textarea) {
    textarea.addEventListener('keydown', (event) => {
        if (event.key !== 'Tab') {
            return;
        }

        event.preventDefault();

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;

        if (event.shiftKey) {
            outdentSelection(textarea, text, start, end);
            return;
        }

        if (start === end) {
            textarea.value = `${text.slice(0, start)}\t${text.slice(end)}`;
            textarea.selectionStart = start + 1;
            textarea.selectionEnd = end + 1;
            return;
        }

        const lineStart = text.lastIndexOf('\n', start - 1) + 1;
        const selectedBlock = text.slice(lineStart, end);
        const lines = selectedBlock.split('\n');
        const indented = lines.map((line) => `\t${line}`).join('\n');
        textarea.value = `${text.slice(0, lineStart)}${indented}${text.slice(end)}`;
        textarea.selectionStart = start + 1;
        textarea.selectionEnd = end + lines.length;
    });
}

function outdentSelection(textarea, text, start, end) {
    const lineStart = text.lastIndexOf('\n', start - 1) + 1;
    const selectedBlock = text.slice(lineStart, end);
    const lines = selectedBlock.split('\n');

    let removedChars = 0;
    const outdented = lines.map((line, index) => {
        if (line.startsWith('\t')) {
            removedChars += 1;
            return line.slice(1);
        }

        if (line.startsWith('    ')) {
            removedChars += 4;
            return line.slice(4);
        }

        if (index === 0 && lineStart < start && line.startsWith(' ')) {
            removedChars += 1;
            return line.slice(1);
        }

        return line;
    }).join('\n');

    textarea.value = `${text.slice(0, lineStart)}${outdented}${text.slice(end)}`;

    const firstLineOutdented = lines[0].startsWith('\t') || lines[0].startsWith('    ');
    const startOffset = firstLineOutdented && start > lineStart ? 1 : 0;

    textarea.selectionStart = Math.max(lineStart, start - startOffset);
    textarea.selectionEnd = Math.max(textarea.selectionStart, end - removedChars);
}
