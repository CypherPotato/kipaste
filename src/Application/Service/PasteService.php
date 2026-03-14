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
    public function __construct(
        private readonly PasteRepositoryInterface $repository,
        private readonly SlugService $slugService,
        private readonly SupportedOptions $options,
        private readonly int $maxContentLength = 50000,
    ) {}

    public function create(string $content, string $language, string $expirationKey, string $creatorIp): Paste
    {
        $normalizedContent = trim($content);
        if ($normalizedContent === '') {
            throw new InvalidArgumentException('Paste content is required.');
        }

        $contentLength = function_exists('mb_strlen') ? mb_strlen($content) : strlen($content);
        if ($contentLength > $this->maxContentLength) {
            throw new InvalidArgumentException("Paste content exceeds {$this->maxContentLength} characters.");
        }

        $supportedLanguages = $this->options->languages();
        if (!isset($supportedLanguages[$language])) {
            $language = 'plaintext';
        }

        $expirations = $this->options->expirations();
        if (!isset($expirations[$expirationKey])) {
            $expirationKey = $this->options->defaultExpirationKey();
        }

        $createdAt = new DateTimeImmutable('now');
        $expiresAt = $createdAt->add(new DateInterval('PT' . $expirations[$expirationKey] . 'S'));

        return $this->createPasteWithUniqueSlug(
            content: $content,
            language: $language,
            createdAt: $createdAt,
            expiresAt: $expiresAt,
            creatorIp: $creatorIp,
        );
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

    private function createPasteWithUniqueSlug(
        string $content,
        string $language,
        DateTimeImmutable $createdAt,
        DateTimeImmutable $expiresAt,
        string $creatorIp,
    ): Paste {
        $slugLength = $this->slugService->defaultLength();
        $conflicts = 0;

        for ($attempt = 0; $attempt < 32; $attempt++) {
            $slug = $this->slugService->generate($slugLength);

            if ($this->repository->findBySlug($slug) !== null) {
                [$slugLength, $conflicts] = $this->handleSlugConflict($slugLength, $conflicts + 1);
                continue;
            }

            try {
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
            } catch (\Throwable $throwable) {
                if ($this->repository->findBySlug($slug) === null) {
                    throw $throwable;
                }

                [$slugLength, $conflicts] = $this->handleSlugConflict($slugLength, $conflicts + 1);
            }
        }

        throw new RuntimeException('Failed to generate a unique slug after repeated collisions.');
    }

    private function handleSlugConflict(int $slugLength, int $conflicts): array
    {
        if ($conflicts <= 3) {
            return [$slugLength, $conflicts];
        }

        $nextSlugLength = $slugLength + 1;

        error_log(sprintf(
            'Slug generation exceeded %d collisions with length %d. Increasing slug length to %d.',
            $conflicts,
            $slugLength,
            $nextSlugLength,
        ));

        return [$nextSlugLength, 0];
    }
}
