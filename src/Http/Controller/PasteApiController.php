<?php

declare(strict_types=1);

namespace App\Http\Controller;

use App\Application\Service\PasteService;
use App\Application\Service\RecaptchaService;
use App\Http\JsonResponder;
use InvalidArgumentException;
use RuntimeException;

final class PasteApiController
{
    public function __construct(
        private readonly PasteService $pasteService,
        private readonly JsonResponder $jsonResponder,
        private readonly RecaptchaService $recaptchaService,
    ) {}

    public function handle(string $method, string $path, array $body, string $clientIp, string $appBaseUrl): void
    {
        try {
            if ($method === 'POST' && $path === '/api/pastes') {
                $this->createPaste($body, $clientIp, $appBaseUrl);
                return;
            }

            if ($method === 'GET' && preg_match('#^/api/pastes/([a-f0-9]+)$#', $path, $matches) === 1) {
                $this->showPaste($matches[1], $clientIp);
                return;
            }

            if ($method === 'POST' && preg_match('#^/api/pastes/([a-f0-9]+)/fork$#', $path, $matches) === 1) {
                $this->forkPaste($matches[1], $body, $clientIp, $appBaseUrl);
                return;
            }

            if ($method === 'DELETE' && preg_match('#^/api/pastes/([a-f0-9]+)$#', $path, $matches) === 1) {
                $this->deletePaste($matches[1], $clientIp);
                return;
            }

            $this->jsonResponder->send([
                'success' => false,
                'message' => 'Endpoint not found.',
            ], 404);
        } catch (InvalidArgumentException $exception) {
            $this->jsonResponder->send([
                'success' => false,
                'message' => $exception->getMessage(),
            ], 422);
        } catch (RuntimeException $exception) {
            $this->jsonResponder->send([
                'success' => false,
                'message' => $exception->getMessage(),
            ], 404);
        }
    }

    private function createPaste(array $body, string $clientIp, string $appBaseUrl): void
    {
        if ($this->recaptchaService->isEnabled()) {
            $recaptchaToken = (string) ($body['recaptchaToken'] ?? '');
            if (!$this->recaptchaService->verify($recaptchaToken, $clientIp)) {
                throw new InvalidArgumentException('reCAPTCHA validation failed.');
            }
        }

        $paste = $this->pasteService->create(
            content: (string) ($body['content'] ?? ''),
            language: (string) ($body['language'] ?? 'plaintext'),
            expirationKey: (string) ($body['expiration'] ?? '1d'),
            creatorIp: $clientIp,
        );

        $this->jsonResponder->send([
            'success' => true,
            'slug' => $paste->slug(),
            'url' => $this->buildPasteUrl($appBaseUrl, $paste->slug()),
        ], 201);
    }

    private function showPaste(string $slug, string $clientIp): void
    {
        $pasteView = $this->pasteService->view($slug, $clientIp);

        if ($pasteView === null) {
            $this->jsonResponder->send([
                'success' => false,
                'message' => 'Paste not found or expired.',
            ], 404);

            return;
        }

        $this->jsonResponder->send([
            'success' => true,
            'paste' => $pasteView,
        ]);
    }

    private function forkPaste(string $slug, array $body, string $clientIp, string $appBaseUrl): void
    {
        $forkedPaste = $this->pasteService->fork(
            slug: $slug,
            creatorIp: $clientIp,
            expirationKey: (string) ($body['expiration'] ?? '1d'),
        );

        $this->jsonResponder->send([
            'success' => true,
            'slug' => $forkedPaste->slug(),
            'url' => $this->buildPasteUrl($appBaseUrl, $forkedPaste->slug()),
        ], 201);
    }

    private function deletePaste(string $slug, string $clientIp): void
    {
        $deleted = $this->pasteService->delete($slug, $clientIp);

        if (!$deleted) {
            $this->jsonResponder->send([
                'success' => false,
                'message' => 'Unable to delete this paste.',
            ], 403);

            return;
        }

        $this->jsonResponder->send([
            'success' => true,
        ]);
    }

    private function buildPasteUrl(string $appBaseUrl, string $slug): string
    {
        return rtrim($appBaseUrl, '/') . '/' . urlencode($slug);
    }
}
