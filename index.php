<?php

declare(strict_types=1);

use App\Http\Controller\PageController;
use App\Http\Controller\PasteApiController;
use App\Http\JsonResponder;

$container = require __DIR__ . '/src/Bootstrap.php';

$pasteService = $container['pasteService'];
$options = $container['options'];
$recaptchaService = $container['recaptchaService'];
$recaptchaSiteKey = $container['recaptchaSiteKey'];
$maxPasteChars = $container['maxPasteChars'];

$scriptName = str_replace('\\', '/', $_SERVER['SCRIPT_NAME'] ?? '/index.php');
$basePath = str_replace('\\', '/', dirname($scriptName));
$basePath = rtrim($basePath, '/');
if ($basePath === '/' || $basePath === '.') {
    $basePath = '';
}

$requestPath = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
if ($basePath !== '' && str_starts_with($requestPath, $basePath)) {
    $trimmedPath = substr($requestPath, strlen($basePath));
    $requestPath = $trimmedPath === '' ? '/' : $trimmedPath;
}

$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
$clientIp = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
$scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$host = $_SERVER['HTTP_HOST'] ?? 'localhost';
$appBaseUrl = $scheme . '://' . $host . $basePath;

if (str_starts_with($requestPath, '/api/')) {
    $rawBody = file_get_contents('php://input');
    $jsonBody = json_decode($rawBody ?: '{}', true);
    $parsedBody = is_array($jsonBody) ? $jsonBody : [];

    $apiController = new PasteApiController($pasteService, new JsonResponder(), $recaptchaService);
    $apiController->handle(
        method: $method,
        path: $requestPath,
        body: $parsedBody,
        clientIp: $clientIp,
        appBaseUrl: $appBaseUrl,
    );

    exit;
}

$initialPasteSlug = null;
if (isset($_GET['paste']) && is_string($_GET['paste']) && $_GET['paste'] !== '') {
    $initialPasteSlug = preg_replace('/[^a-f0-9]/', '', $_GET['paste']);
}

if ($initialPasteSlug === null && preg_match('#^/p/([a-f0-9]+)$#', $requestPath, $matches) === 1) {
    $initialPasteSlug = $matches[1];
}

if ($initialPasteSlug === null && preg_match('#^/([a-f0-9]+)$#', $requestPath, $matches) === 1) {
    $initialPasteSlug = $matches[1];
}

$rawMode = isset($_GET['raw']) && (string) $_GET['raw'] === '1';
if ($rawMode) {
    if ($initialPasteSlug === null) {
        http_response_code(404);
        header('Content-Type: text/plain; charset=utf-8');
        echo 'Paste not found or expired.';
        exit;
    }

    $pasteView = $pasteService->view($initialPasteSlug, $clientIp);
    if ($pasteView === null) {
        http_response_code(404);
        header('Content-Type: text/plain; charset=utf-8');
        echo 'Paste not found or expired.';
        exit;
    }

    header('Content-Type: text/plain; charset=utf-8');
    header('X-Content-Type-Options: nosniff');
    echo (string) $pasteView['content'];
    exit;
}

$pageController = new PageController($options, $recaptchaSiteKey, $maxPasteChars);
$pageController->render($basePath, $initialPasteSlug);
