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
        private readonly string $assetVersion = '0',
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
        $bp = htmlspecialchars($basePath, ENT_QUOTES);
        $v  = htmlspecialchars($this->assetVersion, ENT_QUOTES);
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
            <link id="prismLightTheme" rel="stylesheet" href="<?= $bp ?>/assets/js/vendor/prism.css?v=<?= $v ?>">
            <link id="prismDarkTheme" rel="stylesheet" href="<?= $bp ?>/assets/js/vendor/prism.dark.css?v=<?= $v ?>" disabled>
            <link rel="stylesheet" href="<?= $bp ?>/assets/css/base.css?v=<?= $v ?>">
            <link rel="stylesheet" href="<?= $bp ?>/assets/css/editor.css?v=<?= $v ?>">
            <link rel="stylesheet" href="<?= $bp ?>/assets/css/viewer.css?v=<?= $v ?>">
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
                    <button id="qrCodeBtn" class="btn-icon hidden" type="button" aria-label="QR Code" title="QR Code">
                        <i class="ri-qr-code-line" aria-hidden="true"></i>
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

            <div id="qrCodeModal" class="qr-modal hidden" role="dialog" aria-modal="true" aria-labelledby="qrCodeTitle">
                <div class="qr-modal-card">
                    <div class="qr-modal-header">
                        <h2 id="qrCodeTitle" class="qr-modal-title">QR Code</h2>
                        <button id="qrCodeCloseBtn" class="btn-icon" type="button" aria-label="Close QR Code">
                            <i class="ri-close-line" aria-hidden="true"></i>
                        </button>
                    </div>
                    <div class="qr-modal-tabs" role="tablist" aria-label="Paste share options">
                        <button id="qrCodeTabQr" class="qr-modal-tab active" type="button" role="tab" aria-selected="true" aria-controls="qrCodePanelQr">
                            QR Code
                        </button>
                        <button id="qrCodeTabLink" class="qr-modal-tab" type="button" role="tab" aria-selected="false" aria-controls="qrCodePanelLink">
                            Link
                        </button>
                    </div>
                    <div id="qrCodePanelQr" class="qr-modal-panel" role="tabpanel" aria-labelledby="qrCodeTabQr">
                        <canvas id="qrCodeCanvas" class="qr-modal-canvas" width="420" height="420"></canvas>
                    </div>
                    <div id="qrCodePanelLink" class="qr-modal-panel qr-modal-panel-link hidden" role="tabpanel" aria-labelledby="qrCodeTabLink">
                        <a id="qrCodeLink" class="qr-modal-link" href="#" target="_blank" rel="noopener noreferrer"></a>
                    </div>
                </div>
            </div>

            <script>
                window.__APP_CONFIG = <?= $jsonConfig ?>;
            </script>
            <script src="<?= $bp ?>/assets/js/vendor/prism.js?v=<?= $v ?>"></script>
            <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
            <script src="https://cdn.jsdelivr.net/npm/dompurify@3.2.6/dist/purify.min.js"></script>
            <?php if ($this->recaptchaSiteKey !== null && $this->recaptchaSiteKey !== ''): ?>
                <script src="https://www.google.com/recaptcha/api.js?render=<?= urlencode($this->recaptchaSiteKey) ?>"></script>
            <?php endif; ?>
            <script type="module" src="<?= $bp ?>/assets/js/app.js?v=<?= $v ?>"></script>
        </body>

        </html>
<?php
    }
}
