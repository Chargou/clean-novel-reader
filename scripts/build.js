#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TEMPLATE = path.join(ROOT, 'src', 'userscript.js');
const SITES = path.join(ROOT, 'src', 'sites.json');
const DIST = path.join(ROOT, 'dist');
const OUTPUT = path.join(DIST, 'clean-novel-reader.user.js');

const DEFAULT_VERSION = '1.0.0';

const DEFAULT_SITES = {
    "https://novelphoenix.com": {
        "name": "NovelPhoenix",
        "alwaysHidden": [
            ".nf-ads",
            ".box-notification",
            ".box-notice",
            ".report-container"
        ],
        "topUI": [
            "header.main-header",
            "#chapter-article .titles",
            "#chapter-article .chapternav"
        ],
        "comments": [
            "#chapter-comments"
        ]
    }
};

function ensureDir(dir) {
    fs.mkdirSync(dir, { recursive: true });
}

function ensureSites() {
    ensureDir(path.dirname(SITES));
    if (!fs.existsSync(SITES)) {
        fs.writeFileSync(SITES, JSON.stringify(DEFAULT_SITES, null, 2) + '\n');
        console.log(`Created ${path.relative(ROOT, SITES)}`);
    }
}

function previousVersion() {
    if (!fs.existsSync(OUTPUT)) return DEFAULT_VERSION;

    const text = fs.readFileSync(OUTPUT, 'utf8');
    const match = text.match(/^\s*\/\/\s*@version\s+(\d+\.\d+\.\d+)\s*$/m);
    return match ? match[1] : DEFAULT_VERSION;
}

function incrementPatch(version) {
    const parts = version.split('.').map(Number);
    if (parts.length !== 3 || parts.some(Number.isNaN)) {
        throw new Error(`Invalid previous version: ${version}`);
    }
    return `${parts[0]}.${parts[1]}.${parts[2] + 1}`;
}

function matchFor(siteURL) {
    const url = new URL(siteURL);
    return `${url.protocol}//${url.host}/*`;
}

function repositoryURL() {
    return (process.env.CNR_REPOSITORY_URL ||
        'https://github.com/Chargou/clean-novel-reader')
        .replace(/\/+$/, '');
}

function rawURL(repo) {
    const match = repo.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+)$/);
    if (!match) return null;
    return `https://raw.githubusercontent.com/${match[1]}/${match[2]}/main/dist/clean-novel-reader.user.js`;
}

function main() {
    ensureSites();

    const sites = JSON.parse(fs.readFileSync(SITES, 'utf8'));
    if (!sites || typeof sites !== 'object' || Array.isArray(sites)) {
        throw new Error('src/sites.json must be a JSON object.');
    }

    const version = incrementPatch(previousVersion());
    const matches = Object.keys(sites).map(matchFor);
    const repo = repositoryURL();
    const updateURL = rawURL(repo);

    let template = fs.readFileSync(TEMPLATE, 'utf8');

    template = template.replace(
        /^\/\/ ==UserScript==[\s\S]*?^\/\/ ==\/UserScript==/m,
        [
            '// ==UserScript==',
            '// @name         Clean Novel Reader',
            `// @namespace    ${repo}`,
            `// @version      ${version}`,
            '// @description  Clean, consistent reading UI across supported novel websites.',
            ...matches.map(m => `// @match        ${m}`),
            ...(updateURL ? [
                `// @updateURL    ${updateURL}`,
                `// @downloadURL  ${updateURL}`
            ] : []),
            '// @grant        none',
            '// @run-at       document-idle',
            '// ==/UserScript=='
        ].join('\n')
    );

    template = template.replace(
        'const CONFIG = __CLEAN_NOVEL_READER_CONFIG__;',
        `const CONFIG = ${JSON.stringify({ sites }, null, 4)};`
    );

    ensureDir(DIST);
    fs.writeFileSync(OUTPUT, template);

    console.log(`Built ${path.relative(ROOT, OUTPUT)}`);
    console.log(`Version: ${version}`);
    console.log(`Matches: ${matches.length}`);
}

try {
    main();
} catch (error) {
    console.error(`Build failed: ${error.message}`);
    process.exit(1);
}
