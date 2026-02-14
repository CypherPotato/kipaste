<?php

declare(strict_types=1);

namespace App\Application\Service;

final class RecaptchaService
{
    private const VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';

    public function __construct(
        private readonly ?string $siteKey,
        private readonly ?string $secretKey,
        private readonly float $minScore,
        private readonly string $expectedAction,
    ) {}

    public function siteKey(): ?string
    {
        if ($this->siteKey === null || trim($this->siteKey) === '') {
            return null;
        }

        return $this->siteKey;
    }

    public function isEnabled(): bool
    {
        return $this->siteKey() !== null
            && $this->secretKey !== null
            && trim($this->secretKey) !== '';
    }

    public function verify(string $token, string $remoteIp): bool
    {
        if (!$this->isEnabled()) {
            return true;
        }

        $normalizedToken = trim($token);
        if ($normalizedToken === '') {
            return false;
        }

        $postBody = http_build_query([
            'secret' => $this->secretKey,
            'response' => $normalizedToken,
            'remoteip' => $remoteIp,
        ]);

        $streamContext = stream_context_create([
            'http' => [
                'method' => 'POST',
                'header' => "Content-Type: application/x-www-form-urlencoded\r\n",
                'content' => $postBody,
                'timeout' => 8,
            ],
        ]);

        $rawResponse = @file_get_contents(self::VERIFY_URL, false, $streamContext);
        if ($rawResponse === false) {
            return false;
        }

        $payload = json_decode($rawResponse, true);
        if (!is_array($payload) || ($payload['success'] ?? false) !== true) {
            return false;
        }

        $action = (string) ($payload['action'] ?? '');
        if ($action !== $this->expectedAction) {
            return false;
        }

        $score = (float) ($payload['score'] ?? 0.0);

        return $score >= $this->minScore;
    }
}
