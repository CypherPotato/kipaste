<?php

declare(strict_types=1);

namespace App\Config;

final class SupportedOptions
{
    public function languages(): array
    {
        $languages = [
            'plaintext' => 'Plain text',
            'markdown' => 'Markdown',
            'html' => 'HTML',
            'xml' => 'XML',
            'css' => 'CSS',
            'clike' => 'C-like',
            'javascript' => 'JavaScript',
            'actionscript' => 'ActionScript',
            'ada' => 'Ada',
            'apacheconf' => 'Apache Configuration',
            'bash' => 'Bash',
            'basic' => 'BASIC',
            'batch' => 'Batch',
            'c' => 'C',
            'csharp' => 'C#',
            'cpp' => 'C++',
            'clojure' => 'Clojure',
            'csv' => 'CSV',
            'docker' => 'Docker',
            'fsharp' => 'F#',
            'gdscript' => 'GDScript',
            'glsl' => 'GLSL',
            'go' => 'Go',
            'graphql' => 'GraphQL',
            'handlebars' => 'Handlebars',
            'http' => 'HTTP',
            'java' => 'Java',
            'json' => 'JSON',
            'latex' => 'LaTeX',
            'lua' => 'Lua',
            'markup-templating' => 'Markup Templating',
            'nginx' => 'Nginx',
            'ocaml' => 'OCaml',
            'pascal' => 'Pascal',
            'perl' => 'Perl',
            'php' => 'PHP',
            'powershell' => 'PowerShell',
            'jsx' => 'React JSX',
            'ruby' => 'Ruby',
            'rust' => 'Rust',
            'sass' => 'Sass',
            'scss' => 'SCSS',
            'scheme' => 'Scheme',
            'sql' => 'SQL',
            'toml' => 'TOML',
            'typescript' => 'TypeScript',
            'v' => 'V',
            'vbnet' => 'Visual Basic .NET',
            'yaml' => 'YAML',
            'zig' => 'Zig',
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
