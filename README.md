# secstudy

AWS Cloud Practitioner (CLF-C02) study tool. One file: `index.html`. No build step, no dependencies.

Open `index.html` in a browser. Progress is saved in that browser's localStorage under the key `awsCourse1`
(keep this key on any rewrite). Use **Export** at the bottom of the page to back it up, **Import** on another device.

Tabs: Learn (today's review + 15 lessons, each with its own 3-question quiz), Practice (weak spots + 45 questions), Labs (6 console labs, Free plan), Timer (15 / 5 min).

UI follows Proton's design language (purple #6D4AFF, pill segmented nav, rounded cards) in hand-written CSS.
Proton's own packages (@proton/atoms, @proton/components) live in the GPLv3 ProtonMail/WebClients monorepo and are not on npm.

Deploy later: private repo -> Cloudflare Pages or Netlify. A private repo does not make a GitHub Pages site private.

Smart review: every answered question is scheduled. A miss comes back the next day; each right answer on a due
question waits longer (1, 3, 7, 14 days). Up to 10 due questions per sitting. Weak spots (Practice tab) show
accuracy per exam domain and the lessons with the most misses.
