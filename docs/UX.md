# Friendlier study flow (October 2026)

Goal: easier to follow with ADHD. One clear next step, short screens, a picture for every lesson,
something to try with your hands, and labs that say what you should see.

## What the current version does badly

Measured on a 390 px phone, first open (main at 18ce50e).

| # | Problem | Evidence |
|---|---|---|
| X1 | No clear "what do I do now" | The first screen shows 23 buttons and checkboxes and 15 lesson rows |
| X2 | A lesson is a long wall | Lesson 1 open is 1,219 px tall; its quiz starts 1,155 px down, below the fold |
| X3 | Reading only | No diagrams or pictures anywhere (0 visuals) |
| X4 | No worked examples | Key points and a quiz, nothing that shows the idea applied to a situation |
| X5 | Labs say what to click, not what happens | No "you should see", no link to the lesson they practise |
| X6 | Hard to find a fact again | No way to look up "what was Macie?" without opening lessons one by one |
| X7 | Small text and tab bar scrolls away | 15 px body text; the tab bar leaves the screen when you scroll |
| X8 | Little sense of progress | No streak, no per-domain picture, lesson done is a two-second toast |

## Features and acceptance criteria

### U1. Today screen (X1, X8)
A new first tab. It shows one "Next up" card, this week's plan, progress by exam domain, a study streak,
the exam facts and a look-up box.
- AC1.1 New users open on Today. Saved tabs still reopen where you left them.
- AC1.2 "Next up" names exactly one action, with how long it takes. Order: due review, then the lesson in
  progress or the next lesson. One button starts it.
- AC1.3 "This week" lists the lessons due in the next 7 days, with done ones ticked and late ones marked.
- AC1.4 One bar per exam domain shows lessons done in that domain, labelled with its exam weight.
- AC1.5 The streak counts days in a row with any study (an answer, a tick, a lesson done).

### U2. A lesson is a short walk (X2)
An open lesson replaces the list (a Back button returns to it) and shows one stage at a time:
Read, See, Try, Check, Done. Each stage fits about one phone screen.
- AC2.1 Only one stage is visible; a progress strip shows all five and which one you are on.
- AC2.2 Next and Back move between stages; the stage you reached is saved per lesson.
- AC2.3 The lesson's three "Do this" tasks stay, each on the stage it belongs to, with the same tick data.
- AC2.4 The Done stage offers the next lesson, a 5-minute break timer, and the related lab.
- AC2.5 No stage of any lesson is taller than 1.4 screens at 390 x 844.

### U3. A picture for every lesson (X3)
Each lesson has one diagram, drawn from data in `web/js/content/lessons.js` (HTML and CSS, no image files).
Kinds: who-manages-what grid, compare columns, nested boxes, a scale from one end to the other, and job tiles.
- AC3.1 All lessons have a diagram on their See stage.
- AC3.2 Diagrams use theme colours only and stay readable in light and dark (4.5:1 text contrast).
- AC3.3 Each diagram has a caption that says what it shows, readable by screen readers.
- AC3.4 Content files stay data only.

### U4. Try it: worked examples (X4)
Each lesson has scenario cards: a real situation, you think of the answer, then reveal it with the reason.
- AC4.1 Every lesson has at least one scenario.
- AC4.2 The answer is hidden until you press Show answer.
- AC4.3 Lessons with a related lab link to it.

### U5. Labs that tell you what to expect (X5)
- AC5.1 Every lab step has a "You should see" line.
- AC5.2 The next step to do is highlighted; finished steps are ticked and dimmed.
- AC5.3 Each lab shows the lessons it practises and its cost on the Free plan.

### U6. Look up (X6)
- AC6.1 Typing two or more letters lists matching key points, labs and questions with the match highlighted.
- AC6.2 Choosing a result opens that lesson, lab or question.
- AC6.3 Typing does not lose focus or redraw the rest of the page.

### U7. Comfort (X7)
- AC7.1 Body text is 16 px with at least 1.55 line height.
- AC7.2 The tab bar stays at the top while you scroll, with an icon and a word on each tab.
- AC7.3 The four tabs and the timer button fit at 320 px wide without sideways scrolling.
- AC7.4 Motion is skipped when the system asks for reduced motion.

### U8. The timer is always at hand, not a tab
The timer was a tab of its own, so starting it meant leaving what you were studying.
It now sits at the right of the sticky tab bar on every screen and opens a small panel.
- AC8.1 There is no Timer tab. The timer button shows 15:00 (or 5:00) when idle, the time left while
  running, and a pause sign while paused.
- AC8.2 Tapping it opens a panel with 15 min / 5 min, Start or Pause, Reset and "Working on". The panel
  closes with its Close button, Escape, Back, or a tap outside, and focus returns to the timer button.
- AC8.3 A running or paused timer survives reloads and tab switches. A saved Timer tab opens Today.
- AC8.4 The bar and panel fit at 320 px wide; the panel never covers the tab bar.

### U9. Colour coding you can follow
- AC9.1 Each exam domain has one colour, used for its chip, lesson numbers in the list, the lesson's header band,
  the key terms inside the lesson, its progress bar on Today, and the question card in Practice.
- AC9.2 Each lesson stage has its own icon in the stage strip (Read, See, Try, Check, Done); the current one is
  in the brand colour. Stages get no colours of their own, so colour keeps meaning "domain".
- AC9.3 Numbers in key points and diagrams (times, percentages, limits, dates, 24/7) are highlighted like a
  highlighter pen, and the Read stage shows a colour key.
- AC9.5 Domain colours can't be mistaken for right (green), wrong (red) or the brand purple, in light and dark.
- AC9.4 Colour is never the only signal (text or a symbol goes with it), and all coloured text keeps 4.5:1
  contrast in light and dark.

### U10. Practise with your hands, not only your eyes
- AC10.1 Read has a Points / Flip cards switch. Every term a key point defines gets a card with its whole
  definition (nothing capped or cut), plus fill-the-gap cards for its numbers. Cards flip on tap, Enter or
  Space, and offer Got it / Again with a count; Again cards come back at the end of the deck.
- AC10.2 See has a Look / Test yourself switch. Every lesson's diagram has a game: sort items into columns,
  fill in who manages each layer, put a scale in order, match clues to services, or place items in boxes.
- AC10.3 Feedback is instant after every tap, shown with colour, a symbol (✓ or ✗) and words, and read out to
  screen readers. Wrong answers show the right one; order games show the right order at the end.
- AC10.6 Games only ask what has one right answer (tied steps may go in either order).
- AC10.4 Cards and games can be restarted, and change no saved progress except marking today as a study day.
- AC10.5 Every stage still fits within 1.4 screens at 390 x 844 in every mode (cards flipped, games answered).

## Kept as they were

Saved progress (`awsCourse1`, version 2, older data backed up), one thing open at a time, 15/5 minute timer,
wrong answers explaining themselves, each lesson's own quiz, Proton look, all three ways of running the app.

### U11. How it works: pictures that build up step by step
Each lesson's See step opens on "How it works": a picture of how the topic works in practice (a request
travelling through a VPC, a photo moving through S3 storage classes, IAM deciding yes or no) that adds one
step each time you tap Next, with one plain sentence per step. Data in `web/js/content/flows.js`.
- AC11.1 Every lesson and every exam domain has a step-through of at least 2 steps (lessons at least 4).
- AC11.2 It starts with one step; Next adds a step, Previous removes one; the current step is outlined and
  read out to screen readers, and the picture has a text description. Focus stays on the button.
- AC11.3 After the last step, "Put the steps in order" checks each tap at once, then shows the right order and a score.
- AC11.4 The Learn list has "How this section fits together" for each domain, one open at a time; each part
  opens its lesson, and Back folds it.
- AC11.5 Every service shown has an icon for its job (compute, storage, database, network, security, money,
  monitoring, AI and so on), drawn for this app, not AWS artwork. Icons use the lesson's domain colour.
- AC11.6 Every step fits within 1.4 screens at 390 x 844 with all steps shown and after the order game.

### U12. What if: see what each part makes possible, and what can't be done
Each lesson's Try step opens on "What if", a small sandbox (data in `web/js/content/sims.js`). Situations
(the worked examples and the lab link) is the other mode.
- AC12.1 Build sandboxes: switch parts on and off (a VPC's gateways and rules, IAM allow/deny/MFA, security
  services, AZs and Regions). Each goal shows ✓ or ✗ at once; open, it lists the parts it needs, each marked
  on or off, and says why, naming the missing part (or the part that blocks it, such as an explicit deny).
- AC12.2 Limits by design (the internet reaching a private subnet) show as "By design", not as a failure.
- AC12.3 Pick sandboxes: choose one option (storage, databases, pricing, support plans, service models);
  each goal shows ✓ or ✗ for it, and, open, which options can do it and why.
- AC12.4 Every part or option matters to at least one goal; every missing part has its own reason.
- AC12.5 After a tap the goal it changed opens with its reason, and the change is read out. Focus stays on the switch.
- AC12.6 Fits 1.4 screens at 390 x 844 with the longest reason open.
- AC12.7 Where the setup has a place (lessons 3, 6, 7, 9, 12) the sandbox is a live map: frames for Regions,
  AZs, subnets and accounts; parts switched by tapping them on the map; one test button per goal. A test sends
  a dot along its path; it stops with ✗ at the first missing or blocking part, with ✓ at a defence doing its job
  (WAF, MFA), or arrives. Test buttons carry the full goal name for screen readers; motion is skipped when
  reduced motion is asked for.
