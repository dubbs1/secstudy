# Architecture

## What ships

One web app, delivered three ways. All three run the same files from `web/`.

```
                 web/  (the app: HTML, CSS, classic JS files, icons, manifest, service worker)
                  |
   +--------------+-------------------+---------------------------+
   |                                  |                           |
 open web/index.html          GitHub Pages (pages job)    Windows app (desktop/, Tauri 2)
 from disk (file://)          installable, offline         NSIS installer on Releases
```

No build step and no runtime dependencies. Classic `<script src>` files (not ES modules) so the app
still works when opened straight from disk: browsers block module scripts on `file://`.

## The app (`web/`)

```
web/index.html            page shell: header, tab bar, <main>, footer, script tags in load order
web/css/app.css           Proton look; colour tokens on :root, dark tokens via data-theme or the system
web/js/version.js         APP_VERSION (one place; checked against desktop/ by a test)
web/js/content/           data only, no logic
    exam.js               EXAM (code, date, format, pass mark, cost, retake) and DOMAINS (weights)
    lessons.js            LESSONS: id, domain, due date, steps, key points
    questions.js          QUESTIONS: id, lesson, question, options with "why wrong", answer, explanation
    labs.js               LABS: console steps for the Free plan
web/js/util.js            DOM and date helpers, toast
web/js/store.js           saved progress: KEY 'awsCourse1', DEFAULTS, load() (cleans and migrates), save(),
                          export and import
web/js/review.js          spaced repetition (schedule, dueNow) and weak-spot statistics
web/js/views/*.js         one file per screen: header, question, learn, practice, labs, timer.
                          Each returns an HTML string from the current state; no side effects
web/js/app.js             render loop, event handlers, focus and scroll keeping, theme, install, startup
web/sw.js                 offline copy (network first); precache list checked against web/ by a test
```

Load order matters only in one direction: content and helpers first, `app.js` last. Every file
defines top-level names; classic scripts share one global scope, so later files see earlier ones.

### State and rendering

- One state object `S`, saved to `localStorage['awsCourse1']` after every change.
- `load()` is the only way data gets in (saved data, older versions, imported files). It fills
  defaults, keeps unknown fields, moves clashing ones to `old_<name>`, and coerces every field the
  views read. The first time it meets older data it stores an untouched copy in `awsCourse1_backup`.
- Per-visit view state that is not saved: `live` (answers picked on screen), `lqi` (which quiz
  question a lesson shows), `pCur` (current practice question).
- `render()` rebuilds the header and the current tab from `S` as HTML strings. After it runs, the
  element that had keyboard focus gets it back, and an opened card is scrolled into view.
- Events are delegated: one click, change and input handler for the whole page, keyed on `data-act`.

### Saved data (`awsCourse1`, version 2)

| Field | Meaning |
|---|---|
| `done[lessonId]` | lesson marked done |
| `steps[lessonId][i]`, `labs[labId][i]` | ticked steps |
| `ans[qid]` | `{n, wrong, pick, ok, at}` attempts on a question |
| `srs[qid]` | `{box 0-3, due YYYY-MM-DD}` review schedule (gaps 1, 3, 7, 14 days) |
| `review` | review in progress `{ids, i, right}` or null |
| `tab`, `open`, `openLesson`, `openLab`, `pFilter`, `pMode` | where you were |
| `timer` | `{len, end, left, task}` |
| `theme` | `system`, `light` or `dark` |

## Desktop (`desktop/`)

Tauri 2 shell: `src-tauri/src/main.rs` opens one window on `web/index.html` (`frontendDist: ../../web`).
It opens the WebView2 debug port only when `SECSTUDY_DEBUG_PORT` is set, for the CI checks.
The version lives in `tauri.conf.json` and `Cargo.toml`; a test keeps both equal to `APP_VERSION`.

## Checks (`tests/`, `.github/workflows/test.yml`)

| Job | What it does |
|---|---|
| `browser` | `npm test`: structure checks (no browser) and the app checks (Playwright, Chromium) |
| `windows` | builds the installer, installs it, runs `exe.test.js` against the running app, restarts it, uninstalls |
| `release` (main) | publishes the installer when the version has no release yet |
| `pages` (main) | publishes `web/` as the website |
