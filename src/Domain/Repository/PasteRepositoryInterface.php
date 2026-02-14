<?php

declare(strict_types=1);

namespace App\Domain\Repository;

use App\Domain\Entity\Paste;

interface PasteRepositoryInterface
{
    public function create(Paste $paste): Paste;

    public function findBySlug(string $slug): ?Paste;

    public function findActiveBySlug(string $slug): ?Paste;

    public function registerUniqueView(string $slug, string $viewerIp): void;

    public function softDelete(string $slug): void;

    public function purgeExpired(): int;
}
