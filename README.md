# Clean Novel Reader

A reusable Tampermonkey userscript for cleaning up novel-reading websites.

The core behavior is written once. Website-specific DOM selectors live in `src/sites.json`, so moving to another novel website normally only requires adding a new configuration entry.

## Files

```text
clean-novel-reader/
├── src/
│   ├── userscript.js
│   └── sites.json
├── scripts/
│   └── build.js
├── dist/
│   └── clean-novel-reader.user.js
└── README.md
```

## src/userscript.js

Generic behavior:

- `alwaysHidden` — permanently hides configured selectors.
- `topUI` — toggled together with **X** / 📖.
- `comments` — toggled with **C** / 💬.
- Floating buttons are hidden by default.
- Scrolling up shows the buttons.
- Scrolling down hides them.
- Visible groups glow slightly; hidden groups become translucent.
- Keyboard shortcuts are ignored while typing.
- State is remembered in localStorage.
- A MutationObserver handles dynamically inserted DOM.
- Only configured sites are affected.

## src/sites.json

Website-specific configuration:

```json
{
  "https://example.com": {
    "name": "Example",
    "alwaysHidden": [],
    "topUI": [],
    "comments": []
  }
}
```

The initial configuration targets NovelPhoenix:

```json
{
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
}
```

The bottom chapter navigation and chapter text are never touched because they are not included in any toggle selector.

## Build

Requires Node.js 18+.

From the repository root:

```bash
node scripts/build.js
```

The builder:

1. Creates `src/sites.json` with the NovelPhoenix defaults if it does not exist.
2. Reads the configured sites.
3. Generates the userscript `@match` list from the JSON keys.
4. Reads the previous generated version from `dist/clean-novel-reader.user.js`.
5. Increments the patch number: 1.2.5 → 1.2.6.
6. Injects the site configuration.
7. Generates `dist/clean-novel-reader.user.js`.

The first build starts at 1.0.0.

## GitHub Actions

Recommended workflow:

```
push to main
    ↓
GitHub Action
    ↓
node scripts/build.js
    ↓
generated userscript
```

A future `.github/workflows/build.yml` can run the builder automatically.

Because the generated file is intended to be served from GitHub, the simplest distribution model is to commit `dist/clean-novel-reader.user.js` to the repository. Tampermonkey can then use its raw GitHub URL as the update source.

No Greasy Fork integration is required.

## Repository URL

Before publishing, replace:

```
REPLACE_WITH_YOUR_USERNAME
```

in the builder's fallback repository URL, or build with:

```bash
CNR_REPOSITORY_URL=https://github.com/YOUR_USERNAME/clean-novel-reader node scripts/build.js
```

The generated userscript will then contain an update/download URL such as:

```
https://raw.githubusercontent.com/YOUR_USERNAME/clean-novel-reader/main/dist/clean-novel-reader.user.js
```

## Adding a new novel website

Inspect the site's DOM and add another top-level entry to `src/sites.json`.

For example:

```json
{
  "https://newsite.example": {
    "name": "New Site",
    "alwaysHidden": [
      ".advertisement"
    ],
    "topUI": [
      "header.site-header",
      ".chapter-header",
      ".top-navigation"
    ],
    "comments": [
      "#comments"
    ]
  }
}
```

Then run:

```bash
node scripts/build.js
```

No core userscript changes should normally be necessary.

## Current behavior

### Always hidden

NovelPhoenix:

- `.nf-ads`
- `.box-notification`
- `.box-notice`
- `.report-container`

### X / 📖

Toggles:

- `header.main-header`
- `#chapter-article .titles`
- `#chapter-article .chapternav`

### C / 💬

Toggles:

- `#chapter-comments`

### Never hidden

The chapter text (`#content`) and bottom chapter navigation are not targeted.

## Important design goal

When a website disappears, do not create another one-off userscript.

Instead:

1. Inspect the new site's DOM.
2. Find its header/title/top-navigation selectors.
3. Find its comment selector.
4. Find unwanted permanent elements.
5. Add the selectors to `src/sites.json`.
6. Rebuild.

The generic behavior stays in `src/userscript.js`.
