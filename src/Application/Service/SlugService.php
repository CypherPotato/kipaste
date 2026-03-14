<?php

declare(strict_types=1);

namespace App\Application\Service;

final class SlugService
{
    private const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz';

    public function __construct(
        private readonly int $defaultLength = 4,
    ) {}

    public function defaultLength(): int
    {
        return max(1, $this->defaultLength);
    }

    public function generate(?int $length = null): string
    {
        $normalizedLength = max(1, $length ?? $this->defaultLength());
        $alphabetLength = strlen(self::ALPHABET);
        $slug = '';

        for ($index = 0; $index < $normalizedLength; $index++) {
            $slug .= self::ALPHABET[random_int(0, $alphabetLength - 1)];
        }

        return $slug;
    }
}
