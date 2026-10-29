# Restructure plan (October 2026)

## Pain points found

Measured on main at b07e8bb.

| # | Pain point | Evidence | Effect |
|---|---|---|---|
| P1 | Everything in one 1,000-line file | `index.html`: 123 lines CSS, 213 lines content, 513 lines logic | Adding the 40 questions the mock exam needs means editing a file that also holds all the code |
| P2 | Three lists of the files that ship | `sw.js` precache list, `desktop/prepare.js`, `cp` line in the pages job | A new file missing from one list breaks offline use, the exe or the site, and no check notices |
| P3 | Version in two places, never shown | `tauri.conf.json`, `Cargo.toml`; nothing in the app; service worker cache name fixed at `v1` | You can't tell which version you are running; the two can drift |
| P4 | Facts written twice | year `2026` typed next to `EXAM_DATE`; "65 questions · 90 min · pass 700" in two strings; "All 15 lessons"; "4 concepts, 4 security, 5 technology, 2 billing" | Change the exam date or add a lesson and the text goes wrong |
| P5 | Opening a lesson lower down scrolls it off screen | probe: lesson 14 opened while lesson 1 open lands 559 px above the viewport | Looks like nothing happened, mainly on phones |
| P6 | Keyboard focus lost after every action | probe: answering with Enter leaves focus on `<body>` | Keyboard users start from the top after each click |
| P7 | Answer feedback not announced | no `aria-live` region | Screen readers say nothing after an answer |
| P8 | Filter rows claim to be tabs | `.seg.small` has `role=tablist` but plain buttons with `aria-selected` | Wrong semantics for assistive tech |
| P9 | No theme choice | dark follows the system only | No way to read in light mode at night or the reverse |
| P10 | One 300-line test file | `tests/app.test.js` | Hard to find a check; no structure checks without a browser |
| P11 | Import uses `confirm()` | untested in the Windows app | May silently do nothing in WebView2 |

Not changed here (noted for later): the 65-question timed mock (needs about 40 new questions; P1 makes
that safer), code signing, computing lesson due dates from the exam date.

## Features and acceptance criteria

Every criterion has a check in `tests/`.

### F1. Split the app into files (P1, P10)
Move the app to `web/` as separate CSS, content and logic files, loaded with classic script tags.
No behaviour change.
- AC1.1 `web/index.html` is under 80 lines and holds no `<style>` or inline script logic.
- AC1.2 Lessons, questions, labs and exam facts live in `web/js/content/` and contain no functions.
- AC1.3 The app works opened straight from disk (`file://`), from a web server, and in the Windows app.
- AC1.4 Progress saved by the current release loads unchanged: same key, same fields, same screens.
- AC1.5 All existing checks pass; structure checks run without a browser.

### F2. One list of shipped files (P2)
`web/` is what ships. Pages publishes `web/` as it is; Tauri points at `web/` directly
(`desktop/prepare.js` is removed).
- AC2.1 The pages job copies the folder, not a file list.
- AC2.2 A check fails if any file in `web/` is missing from the service worker's precache list,
  or the list names a file that does not exist.

### F3. One version number, shown in the app (P3)
- AC3.1 `web/js/version.js` holds the version; the footer shows it.
- AC3.2 A check fails if `tauri.conf.json` or `Cargo.toml` disagree with it.
- AC3.3 The service worker cache name includes the version.

### F4. Facts from data (P4)
- AC4.1 The exam card, header and done message are built from `EXAM`, `DOMAINS`, `LESSONS`.
- AC4.2 A check changes the exam date and lesson list in the page and finds the text follows.

### F5. Opened cards stay in view (P5)
- AC5.1 Opening any lesson, lab or the exam facts card leaves its header inside the viewport.

### F6. Keyboard and screen reader (P6, P7, P8)
- AC6.1 After answering with the keyboard, focus is on the answer feedback.
- AC6.2 After ticking a step with the keyboard, focus stays on that checkbox.
- AC6.3 After any other action, focus returns to the same control if it still exists.
- AC6.4 Answer feedback is in a `role="status"` region.
- AC6.5 Filter rows use `aria-pressed` buttons, not tabs; the main tab bar keeps `role="tab"`.

### F7. Theme choice (P9)
- AC7.1 A Theme button in the header cycles System, Light, Dark.
- AC7.2 The choice is saved with progress and survives a reload.
- AC7.3 Light and Dark apply whatever the system setting is.
- AC7.4 Body text, muted text and links reach 4.5:1 contrast in both themes.

### F8. Import without `confirm()` (P11)
- AC8.1 Import shows an in-page Replace / Cancel bar instead of a browser dialog.
- AC8.2 Cancel leaves progress unchanged; Replace imports it. Checked in the browser and in the Windows app.

## Process

1. Write the specs (this file). 2. Implement. 3. Test, plus a styling pass with screenshots at phone,
desktop and dark. 4. Independent review. 5. Refactor from findings. 6. Retest. 7. Second review.
8. Mockup for the owner to try. 9. Push and merge only after the owner approves.
