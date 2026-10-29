# secstudy

Study tool for the AWS Cloud Practitioner exam (CLF-C02): 15 lessons with short quizzes, 45 practice
questions, 6 console labs for the AWS Free plan, a review schedule for missed questions, and a 15/5 minute timer.

The app lives in `web/`: open `web/index.html` in any browser (keep the folder together), or use it
one of the installed ways:

- **Install from the website** (GitHub Pages). Phone: open the site, then Share > Add to Home Screen (iPhone)
  or the menu's Install app (Android). Desktop Chrome or Edge: the Install app link at the bottom of the page.
  It works offline once installed.
- **Windows app**: `AWS-CP-Study-Setup-<version>.exe` on the Releases page. It is not code-signed, so Windows
  asks first: More info > Run anyway.

Progress is stored per browser or app (localStorage key `awsCourse1`). To move it, use Export at the bottom of
the page and Import in the other place.

## Files

| Path | What it is |
|---|---|
| `web/` | the app, shipped as it is to the website and the Windows app. See `docs/ARCHITECTURE.md` |
| `web/js/content/` | lessons, questions, labs, exam facts (data only: edit these to change what you study) |
| `desktop/` | Windows app shell (Tauri 2) around `web/` |
| `tests/` | `structure.test.js` (files), `app.test.js` (the app in a browser), `exe.test.js` (the installed Windows app) |
| `docs/` | `ARCHITECTURE.md` (how it fits together), `RESTRUCTURE.md` (the October 2026 plan and its acceptance criteria) |
| `.github/workflows/test.yml` | runs the checks, builds and tests the installer, publishes the website and releases |

## Checks

```
cd tests && npm ci && npm test
```

GitHub runs these on every push, then builds the Windows installer, installs it, runs `exe.test.js`
against the app, and uninstalls it. On `main` it also publishes the website, and publishes a release
when the version in `desktop/src-tauri/tauri.conf.json` has no release yet.

To release a new version, raise it in `web/js/version.js`, `desktop/src-tauri/tauri.conf.json` and
`desktop/src-tauri/Cargo.toml` (a check fails if they differ).
