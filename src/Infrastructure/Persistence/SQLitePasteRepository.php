<?php

declare(strict_types=1);

namespace App\Infrastructure\Persistence;

use App\Domain\Entity\Paste;
use App\Domain\Repository\PasteRepositoryInterface;
use PDO;

final class SQLitePasteRepository implements PasteRepositoryInterface
{
    private PDO $connection;

    public function __construct(string $databasePath)
    {
        $this->connection = new PDO('sqlite:' . $databasePath);
        $this->connection->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $this->connection->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
        $this->createSchema();
    }

    public function create(Paste $paste): Paste
    {
        $statement = $this->connection->prepare(
            'INSERT INTO pastes (slug, content, language, created_at, expires_at, creator_ip, visit_count, is_deleted)
             VALUES (:slug, :content, :language, :createdAt, :expiresAt, :creatorIp, :visitCount, :isDeleted)'
        );

        $statement->execute([
            ':slug' => $paste->slug(),
            ':content' => $paste->content(),
            ':language' => $paste->language(),
            ':createdAt' => $paste->createdAt()->format(DATE_ATOM),
            ':expiresAt' => $paste->expiresAt()->format(DATE_ATOM),
            ':creatorIp' => $paste->creatorIp(),
            ':visitCount' => $paste->visitCount(),
            ':isDeleted' => $paste->isDeleted() ? 1 : 0,
        ]);

        return $this->findBySlug($paste->slug()) ?? $paste;
    }

    public function findBySlug(string $slug): ?Paste
    {
        $statement = $this->connection->prepare('SELECT * FROM pastes WHERE slug = :slug LIMIT 1');
        $statement->execute([':slug' => $slug]);
        $row = $statement->fetch();

        return $row !== false ? Paste::fromRow($row) : null;
    }

    public function findActiveBySlug(string $slug): ?Paste
    {
        $statement = $this->connection->prepare(
            'SELECT * FROM pastes
             WHERE slug = :slug
             AND is_deleted = 0
             AND expires_at > :now
             LIMIT 1'
        );

        $statement->execute([
            ':slug' => $slug,
            ':now' => gmdate(DATE_ATOM),
        ]);

        $row = $statement->fetch();

        return $row !== false ? Paste::fromRow($row) : null;
    }

    public function registerUniqueView(string $slug, string $viewerIp): void
    {
        $this->connection->beginTransaction();

        try {
            $insertViewStatement = $this->connection->prepare(
                'INSERT OR IGNORE INTO paste_views (paste_slug, viewer_ip, viewed_at)
                 VALUES (:slug, :viewerIp, :viewedAt)'
            );

            $insertViewStatement->execute([
                ':slug' => $slug,
                ':viewerIp' => $viewerIp,
                ':viewedAt' => gmdate(DATE_ATOM),
            ]);

            if ($insertViewStatement->rowCount() > 0) {
                $incrementStatement = $this->connection->prepare(
                    'UPDATE pastes SET visit_count = visit_count + 1 WHERE slug = :slug'
                );
                $incrementStatement->execute([':slug' => $slug]);
            }

            $this->connection->commit();
        } catch (\Throwable $throwable) {
            if ($this->connection->inTransaction()) {
                $this->connection->rollBack();
            }

            throw $throwable;
        }
    }

    public function softDelete(string $slug): void
    {
        $statement = $this->connection->prepare('UPDATE pastes SET is_deleted = 1 WHERE slug = :slug');
        $statement->execute([':slug' => $slug]);
    }

    public function purgeExpired(): int
    {
        $now = gmdate(DATE_ATOM);

        $this->connection->beginTransaction();

        try {
            $deleteViewsStatement = $this->connection->prepare(
                'DELETE FROM paste_views
                 WHERE paste_slug IN (
                     SELECT slug FROM pastes WHERE expires_at <= :now
                 )'
            );
            $deleteViewsStatement->execute([':now' => $now]);

            $deletePastesStatement = $this->connection->prepare(
                'DELETE FROM pastes WHERE expires_at <= :now'
            );
            $deletePastesStatement->execute([':now' => $now]);

            $deletedCount = $deletePastesStatement->rowCount();

            $this->connection->commit();

            return $deletedCount;
        } catch (\Throwable $throwable) {
            if ($this->connection->inTransaction()) {
                $this->connection->rollBack();
            }

            throw $throwable;
        }
    }

    private function createSchema(): void
    {
        $this->connection->exec(
            'CREATE TABLE IF NOT EXISTS pastes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                slug TEXT NOT NULL UNIQUE,
                content TEXT NOT NULL,
                language TEXT NOT NULL,
                created_at TEXT NOT NULL,
                expires_at TEXT NOT NULL,
                creator_ip TEXT NOT NULL,
                visit_count INTEGER NOT NULL DEFAULT 0,
                is_deleted INTEGER NOT NULL DEFAULT 0
            )'
        );

        $this->connection->exec(
            'CREATE TABLE IF NOT EXISTS paste_views (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                paste_slug TEXT NOT NULL,
                viewer_ip TEXT NOT NULL,
                viewed_at TEXT NOT NULL,
                UNIQUE(paste_slug, viewer_ip)
            )'
        );
    }
}
