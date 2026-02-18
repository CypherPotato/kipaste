<?php

declare(strict_types=1);

namespace App\Http\Controller;

use App\Config\SupportedOptions;

final class PageController
{
    public function __construct(
        private readonly SupportedOptions $options,
        private readonly ?string $recaptchaSiteKey,
        private readonly int $maxPasteChars = 50000,
    ) {}

    public function render(string $basePath, ?string $initialPasteSlug): void
    {
        header('Content-Type: text/html; charset=utf-8');

        $config = [
            'basePath' => $basePath,
            'languages' => $this->options->languages(),
            'expirations' => array_keys($this->options->expirations()),
            'defaultExpiration' => $this->options->defaultExpirationKey(),
            'initialPasteSlug' => $initialPasteSlug,
            'recaptchaSiteKey' => $this->recaptchaSiteKey,
            'maxPasteChars' => $this->maxPasteChars,
        ];

        $jsonConfig = json_encode($config, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
?>
        <!doctype html>
        <html lang="en" data-theme="system">

        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>kipaste</title>
            <link rel="preconnect" href="https://cdn.jsdelivr.net">
            <link
                href="https://cdn.jsdelivr.net/npm/remixicon@4.9.0/fonts/remixicon.css"
                rel="stylesheet" />
            <link id="prismLightTheme" rel="stylesheet" href="<?= htmlspecialchars($basePath, ENT_QUOTES) ?>/assets/js/vendor/prism.css">
            <link id="prismDarkTheme" rel="stylesheet" href="<?= htmlspecialchars($basePath, ENT_QUOTES) ?>/assets/js/vendor/prism.dark.css" disabled>
            <link rel="stylesheet" href="<?= htmlspecialchars($basePath, ENT_QUOTES) ?>/assets/css/base.css">
            <link rel="stylesheet" href="<?= htmlspecialchars($basePath, ENT_QUOTES) ?>/assets/css/editor.css">
            <link rel="stylesheet" href="<?= htmlspecialchars($basePath, ENT_QUOTES) ?>/assets/css/viewer.css">
        </head>

        <body>
            <header class="topbar">
                <div class="topbar-left">
                    <div class="topbar-group topbar-group-publish">
                        <label class="select-wrapper" for="languageSelect">
                            <i class="ri-code-s-slash-line" aria-hidden="true"></i>
                            <select id="languageSelect" aria-label="Language"></select>
                        </label>

                        <label class="select-wrapper" for="expirationSelect">
                            <i class="ri-timer-flash-line" aria-hidden="true"></i>
                            <select id="expirationSelect" aria-label="Time to expire"></select>
                        </label>

                        <button id="savePasteBtn" class="btn-primary" type="button">
                            <i class="ri-upload-cloud-2-line" aria-hidden="true"></i>
                            <span>Publish</span>
                        </button>
                    </div>

                    <div class="topbar-group topbar-group-editor">
                        <button id="viewModeToggleBtn" class="btn-icon" type="button" aria-label="Toggle view mode" aria-pressed="false">
                            <i id="viewModeToggleIcon" class="ri-expand-width-line" aria-hidden="true"></i>
                        </button>

                        <label class="select-wrapper" for="themeSelect">
                            <i class="ri-contrast-2-line" aria-hidden="true"></i>
                            <select id="themeSelect" aria-label="Theme">
                                <option value="system">System</option>
                                <option value="light">Light</option>
                                <option value="dark">Dark</option>
                            </select>
                        </label>
                    </div>
                </div>

                <div class="topbar-right">
                    <span id="visitCounter" class="pill hidden" aria-live="polite"></span>

                    <span class="toolbar-spacer" aria-hidden="true"></span>

                    <button id="downloadBtn" class="btn-icon hidden" type="button" aria-label="Download raw">
                        <i class="ri-download-2-line" aria-hidden="true"></i>
                    </button>
                    <button id="copyBtn" class="btn-icon hidden" type="button" aria-label="Copy">
                        <i class="ri-file-copy-2-line" aria-hidden="true"></i>
                    </button>

                    <span class="toolbar-spacer" aria-hidden="true"></span>

                    <button id="forkBtn" class="btn-icon hidden" type="button" aria-label="Fork paste">
                        <i class="ri-git-branch-line" aria-hidden="true"></i>
                    </button>
                    <button id="createBtn" class="btn-icon hidden" type="button" aria-label="Create paste">
                        <i class="ri-add-line" aria-hidden="true"></i>
                    </button>

                    <span class="toolbar-spacer" aria-hidden="true"></span>

                    <label id="themeSelectPasteWrapper" class="select-wrapper icon-only hidden" for="themeSelectPaste">
                        <i class="ri-contrast-2-line" aria-hidden="true"></i>
                        <select id="themeSelectPaste" aria-label="Theme">
                            <option value="system">System</option>
                            <option value="light">Light</option>
                            <option value="dark">Dark</option>
                        </select>
                    </label>
                    <button id="deleteBtn" class="btn-icon danger hidden" type="button" aria-label="Delete paste">
                        <i class="ri-delete-bin-7-line" aria-hidden="true"></i>
                    </button>
                </div>
            </header>

            <main id="workspace" class="workspace condensed">
                <section id="editorSection" class="editor-panel">
                    <textarea id="editorInput" class="editor-textarea" spellcheck="false" autocorrect="off" autocomplete="off" autocapitalize="off" aria-label="Paste editor" placeholder="Start typing..." maxlength="<?= $this->maxPasteChars ?>"></textarea>
                </section>

                <section id="viewerSection" class="viewer-panel hidden">
                    <pre id="viewerCodeWrap" class="viewer-pre"><code id="viewerCode" class="language-plaintext"></code></pre>
                    <article id="viewerMarkdown" class="viewer-markdown hidden"></article>
                </section>
            </main>

            <div id="statusMessage" class="status-message" aria-live="assertive"></div>

            <script>
                window.__APP_CONFIG = <?= $jsonConfig ?>;
            </script>
            <script src="<?= htmlspecialchars($basePath, ENT_QUOTES) ?>/assets/js/vendor/prism.js"></script>
            <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
            <script src="https://cdn.jsdelivr.net/npm/dompurify@3.2.6/dist/purify.min.js"></script>
            <?php if ($this->recaptchaSiteKey !== null && $this->recaptchaSiteKey !== ''): ?>
                <script src="https://www.google.com/recaptcha/api.js?render=<?= urlencode($this->recaptchaSiteKey) ?>"></script>
            <?php endif; ?>
            <script type="module" src="<?= htmlspecialchars($basePath, ENT_QUOTES) ?>/assets/js/app.js"></script>
        </body>

        </html>
<?php
    }
}
