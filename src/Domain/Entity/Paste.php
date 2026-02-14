<?php

declare(strict_types=1);

namespace App\Domain\Entity;

use DateTimeImmutable;

final class Paste
{
    public function __construct(
        private readonly ?int $id,
        private readonly string $slug,
        private readonly string $content,
        private readonly string $language,
        private readonly DateTimeImmutable $createdAt,
        private readonly DateTimeImmutable $expiresAt,
        private readonly string $creatorIp,
        private readonly int $visitCount,
        private readonly bool $deleted,
    ) {}

    public static function fromRow(array $row): self
    {
        return new self(
            isset($row['id']) ? (int) $row['id'] : null,
            (string) $row['slug'],
            (string) $row['content'],
            (string) $row['language'],
            new DateTimeImmutable((string) $row['created_at']),
            new DateTimeImmutable((string) $row['expires_at']),
            (string) $row['creator_ip'],
            (int) $row['visit_count'],
            (bool) ((int) $row['is_deleted']),
        );
    }

    public function id(): ?int
    {
        return $this->id;
    }

    public function slug(): string
    {
        return $this->slug;
    }

    public function content(): string
    {
        return $this->content;
    }

    public function language(): string
    {
        return $this->language;
    }

    public function createdAt(): DateTimeImmutable
    {
        return $this->createdAt;
    }

    public function expiresAt(): DateTimeImmutable
    {
        return $this->expiresAt;
    }

    public function creatorIp(): string
    {
        return $this->creatorIp;
    }

    public function visitCount(): int
    {
        return $this->visitCount;
    }

    public function isDeleted(): bool
    {
        return $this->deleted;
    }
}
