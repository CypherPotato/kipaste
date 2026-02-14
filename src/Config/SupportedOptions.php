<?php

declare(strict_types=1);

namespace App\Config;

final class SupportedOptions
{
    public function languages(): array
    {
        $languages = [
            'plaintext' => 'Plain text',
            'javascript' => 'JavaScript',
            'typescript' => 'TypeScript',
            'php' => 'PHP',
            'html' => 'HTML',
            'css' => 'CSS',
            'json' => 'JSON',
            'yaml' => 'YAML',
            'xml' => 'XML',
            'markdown' => 'Markdown',
            'bash' => 'Bash',
            'toml' => 'TOML',
            'ini' => 'INI',
            'sql' => 'SQL',
            'python' => 'Python',
            'rust' => 'Rust',
            'go' => 'Go',
            'java' => 'Java',
            'c' => 'C',
            'cpp' => 'C++',
            'csharp' => 'C#',
            'swift' => 'Swift',
            'kotlin' => 'Kotlin',
            'ruby' => 'Ruby',
            'lua' => 'Lua',
            'perl' => 'Perl',
            'powershell' => 'PowerShell',
            'r' => 'R',
            'haskell' => 'Haskell',
            'glsl' => 'GLSL',
            'fsharp' => 'F#',
            'ocaml' => 'OCaml',
            'lisp' => 'LISP',
            'batch' => 'BATCH',
            'vbnet' => 'Visual Basic .NET',
        ];

        asort($languages, SORT_NATURAL | SORT_FLAG_CASE);

        return $languages;
    }

    public function expirations(): array
    {
        return [
            '10m' => 600,
            '1h' => 3600,
            '1d' => 86400,
            '1w' => 604800,
            '10w' => 6048000,
        ];
    }

    public function defaultExpirationKey(): string
    {
        return '1d';
    }
}
