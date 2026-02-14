<?php

declare(strict_types=1);

$requestPath = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$requestedFile = __DIR__ . $requestPath;

if ($requestPath !== '/' && is_file($requestedFile)) {
    return false;
}

require __DIR__ . '/index.php';
