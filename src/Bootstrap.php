<?php

declare(strict_types=1);

use App\Application\Service\PasteService;
use App\Application\Service\RecaptchaService;
use App\Application\Service\SlugService;
use App\Config\SupportedOptions;
use App\Infrastructure\Persistence\SQLitePasteRepository;

spl_autoload_register(static function (string $className): void {
    $prefix = 'App\\';
    if (!str_starts_with($className, $prefix)) {
        return;
    }

    $relativeClass = substr($className, strlen($prefix));
    $filePath = __DIR__ . '/' . str_replace('\\', '/', $relativeClass) . '.php';

    if (is_file($filePath)) {
        require $filePath;
    }
});

$projectRoot = dirname(__DIR__);
loadEnvFile($projectRoot . '/.env');

$databaseDirectory = $projectRoot . '/storage';
if (!is_dir($databaseDirectory)) {
    mkdir($databaseDirectory, 0777, true);
}

$databasePath = $databaseDirectory . '/pastes.sqlite';
$repository = new SQLitePasteRepository($databasePath);
$slugService = new SlugService();
$options = new SupportedOptions();
$maxPasteChars = max(1, (int) (envValue('PASTE_MAX_CHARS') ?? '50000'));
$pasteService = new PasteService($repository, $slugService, $options, $maxPasteChars);

$recaptchaMinScore = (float) (envValue('RECAPTCHA_MIN_SCORE') ?? '0.5');
$recaptchaMinScore = max(0.0, min(1.0, $recaptchaMinScore));

$recaptchaService = new RecaptchaService(
    siteKey: envValue('RECAPTCHA_SITE_KEY'),
    secretKey: envValue('RECAPTCHA_SECRET_KEY'),
    minScore: $recaptchaMinScore,
    expectedAction: envValue('RECAPTCHA_ACTION') ?? 'create_paste',
);

return [
    'pasteService' => $pasteService,
    'options' => $options,
    'recaptchaService' => $recaptchaService,
    'recaptchaSiteKey' => $recaptchaService->siteKey(),
    'maxPasteChars' => $maxPasteChars,
    'assetVersion' => resolveAssetVersion($projectRoot),
];

function resolveAssetVersion(string $projectRoot): string
{
    $headFile = $projectRoot . '/.git/HEAD';
    if (!is_file($headFile)) {
        return '0';
    }

    $head = trim((string) file_get_contents($headFile));

    if (str_starts_with($head, 'ref: ')) {
        $refFile = $projectRoot . '/.git/' . substr($head, 5);
        if (!is_file($refFile)) {
            return '0';
        }
        $hash = trim((string) file_get_contents($refFile));
    } else {
        $hash = $head;
    }

    return substr($hash, 0, 8);
}

function loadEnvFile(string $filePath): void
{
    if (!is_file($filePath)) {
        return;
    }

    $lines = file($filePath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if ($lines === false) {
        return;
    }

    foreach ($lines as $line) {
        $trimmedLine = trim($line);
        if ($trimmedLine === '' || str_starts_with($trimmedLine, '#') || !str_contains($trimmedLine, '=')) {
            continue;
        }

        [$name, $value] = array_map('trim', explode('=', $trimmedLine, 2));
        if ($name === '') {
            continue;
        }

        $normalizedValue = trim($value, "\"'");

        if (getenv($name) === false) {
            putenv($name . '=' . $normalizedValue);
        }

        $_ENV[$name] = $normalizedValue;
    }
}

function envValue(string $name): ?string
{
    $envValue = $_ENV[$name] ?? getenv($name);
    if ($envValue === false) {
        return null;
    }

    $normalizedValue = trim((string) $envValue);

    return $normalizedValue === '' ? null : $normalizedValue;
}
