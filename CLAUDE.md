# Notes for Claude Code

AWS Cloud Practitioner study tool. The app is one file, `index.html` (no build step, no dependencies).
It also ships as an installable website (`manifest.webmanifest`, `sw.js`, `icons/`, GitHub Pages) and a
Windows app (`desktop/`, Tauri 2, NSIS per-user installer on the Releases page). See README.md.

## Working rule: do it all automatically

Changes are finished end to end without manual steps:
make the change → review your own diff → run the tests → fix and re-run until everything passes →
push → open a pull request → wait for the GitHub `test` check to go green → merge into `main` → tell them.
Never merge with a failing or missing check. If a failure can't be fixed, stop and explain it in plain words.
Explain results step by step, in plain words.
No personal details (names, emails, chat or session links) in files, commit messages or pull requests: the repo is public.
No AI attribution or filler: no "Generated with" or co-author lines, no cheerful asides, no em-dash flourishes. Plain, short text.

## Never break

- **localStorage key `awsCourse1`.** Changing it loses all progress. New fields must have defaults in
  `DEFAULTS`; `load()` keeps unknown fields, moves clashing ones to `old_<name>` and backs up older
  data to `awsCourse1_backup` once. Imported files are cleaned in `load()` too.
- Focus-friendly design: one thing open at a time; tasks 10–20 min and concrete; timer 15 min default with 5 min;
  wrong answers explain themselves inline (each wrong option has its own "why"); each lesson has its own quiz.
- Proton look (purple `#6D4AFF`, pill nav, rounded white cards) in hand-written CSS. Proton's packages
  (`@proton/atoms`, `@proton/components`) are GPLv3, only in ProtonMail/WebClients, not on npm: don't install them.
- Labs assume the AWS **Free plan** (since July 2025: $100 credits, up to $200 with console activities;
  ends at 6 months or when credits run out; overruns hit credits, not the card).

## Exam

CLF-C02 on 30 Nov 2026: 65 questions (50 scored), 90 min, pass 700/1000, $100, retake after 14 days.
Domains: Cloud Concepts 24 %, Security & Compliance 30 %, Cloud Technology & Services 34 %, Billing, Pricing & Support 12 %.
Lessons follow this: 4 / 4 / 5 / 2.

## Tests

`cd tests && npm ci && npm test` (Playwright, pinned in `tests/package.json`; in a Claude Code cloud
session the preinstalled Chromium is used, elsewhere run `npx playwright install chromium` once).
One PASS/FAIL line per check. Add a check for every new feature.

`.github/workflows/test.yml`: `browser` (the checks) → `windows` (build the installer, silent install,
`tests/exe.test.js` against the running app through WebView2's debug port, opened only when `SECSTUDY_DEBUG_PORT` is set (see `desktop/src-tauri/src/main.rs`), restart, uninstall) →
on main: `release` (when the version has no release) and `pages` (needs Settings > Pages > Source: GitHub Actions).
Rust: `cargo check --release --target x86_64-pc-windows-msvc` in `desktop/src-tauri` after `node desktop/prepare.js`
catches most Windows build errors from Linux. Pinned: @tauri-apps/cli 2.12.3, tauri 2.12.4, tauri-build 2.7.3.
The service worker is registered only on https or localhost, so it stays off in the Windows app and in file:// use.

## Known next tasks

1. 65-question, 90-minute timed mock weighted ~16/20/22/8 (needs ~40 more questions).
2. Code signing for the Windows installer (removes the SmartScreen prompt; needs a paid certificate).
