# secstudy

Study tool for the AWS Cloud Practitioner exam (CLF-C02): 15 lessons with short quizzes, 45 practice
questions, 6 console labs for the AWS Free plan, a review schedule for missed questions, and a 15/5 minute timer.

The whole app is `index.html`. There are three ways to use it:

- **Open the file** in any browser.
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
| `index.html` | the app |
| `manifest.webmanifest`, `sw.js`, `icons/` | install and offline support for the website |
| `desktop/` | Windows app build (Tauri 2). `desktop/prepare.js` copies the web files into `desktop/dist/` |
| `tests/app.test.js` | browser checks for the app |
| `tests/exe.test.js` | checks run against the installed Windows app |
| `.github/workflows/test.yml` | runs the checks, builds and tests the installer, publishes the website and releases |

## Checks

```
cd tests && npm ci && npm test
```

GitHub runs these on every push, then builds the Windows installer, installs it, runs `exe.test.js`
against the app, and uninstalls it. On `main` it also publishes the website, and publishes a release
when the version in `desktop/src-tauri/tauri.conf.json` has no release yet.

To release a new Windows version, raise `version` in `desktop/src-tauri/tauri.conf.json` and
`desktop/src-tauri/Cargo.toml`.
