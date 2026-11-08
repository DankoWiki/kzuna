# תרגול חוברת קצונה

A study app for the IDF officer-course preparation booklet (בה״ד 1, January 2021 edition): lessons per chapter, spaced-repetition practice, mock and real-format exams, a blank map, ordered lists, contour-line drills and listen-while-driving mode. Install it to your phone's home screen and it opens and works with no reception. Progress is stored only on your device.

**App:** https://dankowiki.github.io/kzuna/

## What's here

| Path | What it is |
| --- | --- |
| `src/kzuna.html` | The whole app: one HTML file. The same file runs as a Claude artifact (with account sync) and as this offline app. |
| `src/icon.svg`, `src/icons/` | App icon source and the rendered PNGs |
| `build.mjs` | Builds `dist/`: proper `<head>`, self-hosted fonts, manifest, service worker |
| `icons.mjs` | Re-renders `src/icons/` from `src/icon.svg` (needs Playwright) |

## Claude features outside claude.ai

Grading answers typed in your own words, and the "explain + memory trick" notes, come from Claude.

- **Inside claude.ai** (the artifact), the page asks Claude as the signed-in viewer. No key needed.
- **Anywhere else** (this app), the page has no `window.claude`, so it calls the Claude API directly from the browser with the student's own API key (footer → **Claude: מפתח API**). The key is kept in that browser's `localStorage`, is never included in a backup, and is sent only to `api.anthropic.com`. Grading uses `claude-haiku-5-5`, explanations `claude-sonnet-5-5`, both at low effort.

Without a key, or with no connection, everything else works and typed answers fall back to comparing against the booklet yourself.

## Build and deploy

```sh
npm install
npm run build          # writes dist/
```

Deploy by pushing the contents of `dist/` to the `gh-pages` branch. Each build stamps a new cache version into `sw.js`, so installed copies update the next time they open with a connection.

## Moving progress between versions

Footer → **גיבוי והעברה** (in the browser tab it's **התקנה וגיבוי**). Use **העתק גיבוי כטקסט** on one version, paste it into the other, tap **בדוק את הטקסט**, then **מזג לכאן**. Restoring merges: for each question the more recent state wins, so nothing is lost. The backup carries progress, saved explanations and your error reports.
