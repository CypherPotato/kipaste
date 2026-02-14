<?php

declare(strict_types=1);

namespace App\Application\Service;

final class SlugService
{
    public function generate(): string
    {
        return substr(bin2hex(random_bytes(6)), 0, 10);
    }
}
