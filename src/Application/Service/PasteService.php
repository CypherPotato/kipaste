<?php

declare(strict_types=1);

namespace App\Application\Service;

use App\Config\SupportedOptions;
use App\Domain\Entity\Paste;
use App\Domain\Repository\PasteRepositoryInterface;
use DateInterval;
use DateTimeImmutable;
use InvalidArgumentException;
use RuntimeException;

final class PasteService
{
    private const MAX_CONTENT_LENGTH = 50000;

    public function __construct(
        private readonly PasteRepositoryInterface $repository,
        private readonly SlugService $slugService,
        private readonly SupportedOptions $options,
    ) {}

    public function create(string $content, string $language, string $expirationKey, string $creatorIp): Paste
    {
        $normalizedContent = trim($content);
        if ($normalizedContent === '') {
            throw new InvalidArgumentException('Paste content is required.');
        }

        $contentLength = function_exists('mb_strlen') ? mb_strlen($content) : strlen($content);
        if ($contentLength > self::MAX_CONTENT_LENGTH) {
            throw new InvalidArgumentException('Paste content exceeds 50000 characters.');
        }

        $supportedLanguages = $this->options->languages();
        if (!isset($supportedLanguages[$language])) {
            $language = 'plaintext';
        }

        $expirations = $this->options->expirations();
        if (!isset($expirations[$expirationKey])) {
            $expirationKey = $this->options->defaultExpirationKey();
        }

        $slug = $this->nextAvailableSlug();
        $createdAt = new DateTimeImmutable('now');
        $expiresAt = $createdAt->add(new DateInterval('PT' . $expirations[$expirationKey] . 'S'));

        return $this->repository->create(new Paste(
            id: null,
            slug: $slug,
            content: $content,
            language: $language,
            createdAt: $createdAt,
            expiresAt: $expiresAt,
            creatorIp: $creatorIp,
            visitCount: 0,
            deleted: false,
        ));
    }

    public function view(string $slug, string $viewerIp): ?array
    {
        $paste = $this->repository->findActiveBySlug($slug);
        if ($paste === null) {
            return null;
        }

        $this->repository->registerUniqueView($slug, $viewerIp);
        $updatedPaste = $this->repository->findActiveBySlug($slug);
        if ($updatedPaste === null) {
            return null;
        }

        return [
            'slug' => $updatedPaste->slug(),
            'content' => $updatedPaste->content(),
            'language' => $updatedPaste->language(),
            'createdAt' => $updatedPaste->createdAt()->format(DATE_ATOM),
            'expiresAt' => $updatedPaste->expiresAt()->format(DATE_ATOM),
            'visitCount' => $updatedPaste->visitCount(),
            'canDelete' => $updatedPaste->creatorIp() === $viewerIp,
        ];
    }

    public function fork(string $slug, string $creatorIp, string $expirationKey): Paste
    {
        $sourcePaste = $this->repository->findActiveBySlug($slug);
        if ($sourcePaste === null) {
            throw new RuntimeException('Paste not found for fork.');
        }

        return $this->create(
            content: $sourcePaste->content(),
            language: $sourcePaste->language(),
            expirationKey: $expirationKey,
            creatorIp: $creatorIp,
        );
    }

    public function delete(string $slug, string $requesterIp): bool
    {
        $paste = $this->repository->findBySlug($slug);
        if ($paste === null || $paste->isDeleted()) {
            return false;
        }

        if ($paste->creatorIp() !== $requesterIp) {
            return false;
        }

        $this->repository->softDelete($slug);

        return true;
    }

    public function purgeExpired(): int
    {
        return $this->repository->purgeExpired();
    }

    private function nextAvailableSlug(): string
    {
        for ($attempt = 0; $attempt < 5; $attempt++) {
            $slug = $this->slugService->generate();
            if ($this->repository->findBySlug($slug) === null) {
                return $slug;
            }
        }

        throw new RuntimeException('Failed to generate a unique slug.');
    }
}
