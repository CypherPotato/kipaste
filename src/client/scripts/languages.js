import hljs from "highlight.js/lib/core";
import bash from "highlight.js/lib/languages/bash";
import c from "highlight.js/lib/languages/c";
import cpp from "highlight.js/lib/languages/cpp";
import csharp from "highlight.js/lib/languages/csharp";
import css from "highlight.js/lib/languages/css";
import dart from "highlight.js/lib/languages/dart";
import diff from "highlight.js/lib/languages/diff";
import dockerfile from "highlight.js/lib/languages/dockerfile";
import elixir from "highlight.js/lib/languages/elixir";
import glsl from "highlight.js/lib/languages/glsl";
import go from "highlight.js/lib/languages/go";
import graphql from "highlight.js/lib/languages/graphql";
import handlebars from "highlight.js/lib/languages/handlebars";
import http from "highlight.js/lib/languages/http";
import ini from "highlight.js/lib/languages/ini";
import java from "highlight.js/lib/languages/java";
import javascript from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import julia from "highlight.js/lib/languages/julia";
import kotlin from "highlight.js/lib/languages/kotlin";
import latex from "highlight.js/lib/languages/latex";
import less from "highlight.js/lib/languages/less";
import lisp from "highlight.js/lib/languages/lisp";
import lua from "highlight.js/lib/languages/lua";
import makefile from "highlight.js/lib/languages/makefile";
import markdown from "highlight.js/lib/languages/markdown";
import nginx from "highlight.js/lib/languages/nginx";
import objectivec from "highlight.js/lib/languages/objectivec";
import perl from "highlight.js/lib/languages/perl";
import php from "highlight.js/lib/languages/php";
import plaintext from "highlight.js/lib/languages/plaintext";
import powershell from "highlight.js/lib/languages/powershell";
import python from "highlight.js/lib/languages/python";
import r from "highlight.js/lib/languages/r";
import ruby from "highlight.js/lib/languages/ruby";
import rust from "highlight.js/lib/languages/rust";
import scala from "highlight.js/lib/languages/scala";
import scss from "highlight.js/lib/languages/scss";
import sql from "highlight.js/lib/languages/sql";
import swift from "highlight.js/lib/languages/swift";
import typescript from "highlight.js/lib/languages/typescript";
import xml from "highlight.js/lib/languages/xml";
import yaml from "highlight.js/lib/languages/yaml";

export const LANGUAGES = [
    { id: "plaintext", name: "Plain text", ext: "txt", grammar: plaintext },
    { id: "bash", name: "Bash", ext: "sh", grammar: bash },
    { id: "c", name: "C", ext: "c", grammar: c },
    { id: "cpp", name: "C++", ext: "cpp", grammar: cpp },
    { id: "csharp", name: "C#", ext: "cs", grammar: csharp },
    { id: "css", name: "CSS", ext: "css", grammar: css },
    { id: "dart", name: "Dart", ext: "dart", grammar: dart },
    { id: "diff", name: "Diff", ext: "diff", grammar: diff },
    { id: "dockerfile", name: "Dockerfile", ext: "dockerfile", grammar: dockerfile },
    { id: "elixir", name: "Elixir", ext: "ex", grammar: elixir },
    { id: "glsl", name: "GLSL", ext: "glsl", grammar: glsl },
    { id: "go", name: "Go", ext: "go", grammar: go },
    { id: "graphql", name: "GraphQL", ext: "graphql", grammar: graphql },
    { id: "handlebars", name: "Handlebars", ext: "hbs", grammar: handlebars },
    { id: "html", name: "HTML", ext: "html", grammar: xml },
    { id: "http", name: "HTTP", ext: "http", grammar: http },
    { id: "ini", name: "INI", ext: "ini", grammar: ini },
    { id: "java", name: "Java", ext: "java", grammar: java },
    { id: "javascript", name: "JavaScript", ext: "js", grammar: javascript },
    { id: "json", name: "JSON", ext: "json", grammar: json },
    { id: "julia", name: "Julia", ext: "jl", grammar: julia },
    { id: "kotlin", name: "Kotlin", ext: "kt", grammar: kotlin },
    { id: "latex", name: "LaTeX", ext: "tex", grammar: latex },
    { id: "less", name: "Less", ext: "less", grammar: less },
    { id: "lisp", name: "Lisp", ext: "lisp", grammar: lisp },
    { id: "lua", name: "Lua", ext: "lua", grammar: lua },
    { id: "makefile", name: "Makefile", ext: "mk", grammar: makefile },
    { id: "markdown", name: "Markdown", ext: "md", grammar: markdown },
    { id: "nginx", name: "Nginx", ext: "conf", grammar: nginx },
    { id: "objectivec", name: "Objective-C", ext: "m", grammar: objectivec },
    { id: "perl", name: "Perl", ext: "pl", grammar: perl },
    { id: "php", name: "PHP", ext: "php", grammar: php },
    { id: "powershell", name: "PowerShell", ext: "ps1", grammar: powershell },
    { id: "python", name: "Python", ext: "py", grammar: python },
    { id: "r", name: "R", ext: "r", grammar: r },
    { id: "ruby", name: "Ruby", ext: "rb", grammar: ruby },
    { id: "rust", name: "Rust", ext: "rs", grammar: rust },
    { id: "scala", name: "Scala", ext: "scala", grammar: scala },
    { id: "scss", name: "SCSS", ext: "scss", grammar: scss },
    { id: "sql", name: "SQL", ext: "sql", grammar: sql },
    { id: "swift", name: "Swift", ext: "swift", grammar: swift },
    { id: "typescript", name: "TypeScript", ext: "ts", grammar: typescript },
    { id: "xml", name: "XML", ext: "xml", grammar: xml },
    { id: "yaml", name: "YAML", ext: "yaml", grammar: yaml }
];

for (const language of LANGUAGES) {
    hljs.registerLanguage(language.id, language.grammar);
}

export function findLanguage(id) {
    return LANGUAGES.find(l => l.id === id) ?? LANGUAGES[0];
}

export { hljs };
