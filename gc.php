<?php

declare(strict_types=1);

$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
if (!in_array($method, ['GET', 'POST'], true)) {
    http_response_code(405);
    header('Allow: GET, POST');
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'success' => false,
        'message' => 'Method not allowed.',
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

$container = require __DIR__ . '/src/Bootstrap.php';
$pasteService = $container['pasteService'];

$deletedCount = $pasteService->purgeExpired();

header('Content-Type: application/json; charset=utf-8');
echo json_encode([
    'success' => true,
    'deleted' => $deletedCount,
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
