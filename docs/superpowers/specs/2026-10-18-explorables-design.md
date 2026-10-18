# Explorables: design

**Date:** 2026-10-18 · **Owner:** moazessam376-dev · **Status:** draft for review

Explorables turns anything someone is learning into an *explorable companion*: a page that sits
beside the source (a video, a course, a book chapter, docs, or just a topic). The page explains it
again in plain words, shows it with interactive 2D and 3D pictures, ties every idea to the learner's
own goal, gives the vocabulary in their own language, and checks understanding.

It grows out of a micrograd companion page built for one learner working through Karpathy's
lectures. That page is the reference implementation for everything below.

---

## 1. Intent: why this exists

People rarely get lost because the teacher is bad. They get lost because of three gaps:

- **Missing context.** *Why* are we doing this, and what does it connect to? The first
  learner understood Karpathy only after 3Blue1Brown showed why we tweak weights at all.
- **Vocabulary.** Math and science terms in a language you didn't learn them in. Plenty of people
  learned their math in another language, years ago.
- **Abstractions without pictures.** A derivative, a gradient or a chain rule is easier when you
  can drag it and watch it change.

A companion page fills these gaps without replacing the source: the learner still watches the
lecture or reads the book, with the page open beside it.

## 2. Who it's for

- **Anyone learning anything.** Neural networks, coding, quantum computing, math, game
  development, hardware, anatomy. It's open source, so the audience is unknown, and the design must
  not assume a subject.
- **Mainly Claude Code users** (terminal, desktop app, IDE extensions). Only there can it watch
  videos, because claudetube needs local tools.
- **Secondarily claude.ai chat users,** with a reduced version that builds from a topic, pasted
  text or uploaded files, and can't watch videos.

## 3. What success looks like

- A learner hands over a link or a topic, answers a few situational questions, and gets a working
  page **in one sitting**. For scale, the micrograd page (about 18 sections and 20 custom pictures)
  took roughly half an hour of building time.
- **The density bar is the reference page:** a picture for every chapter, and more wherever a
  picture teaches something prose can't. Speed is tuned later from real use on other projects.
- The page **works the first time**: no console errors, every button and slider does something, and
  it's readable in every theme and at phone width.
- Afterwards, the learner can **explain the topic out loud without notes**. That's the bar.

## 4. Goals

1. **Any subject, any source, or none.** YouTube videos and playlists, Udemy and other logged-in
   courses, PDFs and book chapters, documentation, or a bare topic ("teach me Fourier transforms").
2. **Personal.** A short, situational intake builds a learner profile that every page uses.
3. **Explanations.** Plain language first, math second; small numeric examples you can check by
   hand. Every learner gets the same clear explanations; the profile decides *which* refreshers and
   links appear, not the tone.
4. **Pictures you control.** Interactive wherever a picture teaches something: 2D plots, 3D scenes
   you orbit and drag, sliders, step-throughs, simulations, and loops that start by themselves.
5. **Keeping pace with a lecture.** When the source has a timeline: a follow-along clock, smart
   scroll, pictures that act out each moment, and must-read sections that can't be skipped by
   accident.
6. **Courses.** A course home page, plus one page per lecture or chapter, built when the learner
   reaches it.
7. **Themes.** Several finished looks, chosen by the learner.
8. **Quality built in.** Plan first, build from tested parts, verify while building, one review
   pass, and a pitfalls checklist that grows with every bug report.
9. **It remembers.** The learner profile and preferences carry over; feedback improves the tool for
   everyone.

## 5. Non-goals

- **Not a video player or a mirror of the source.** It never re-hosts, embeds or transcribes
  content it doesn't own. Explanations are in its own words; quotes stay under 15 words.
- **Not a replacement for the source.** The page sits beside the lecture; it doesn't stand in for it.
- **Not doing the learner's work.** It explains and shows. It doesn't write their exercises or
  their notebook code. (The first learner's rule, "the learner types the code", becomes a profile
  preference that is on by default.)
- **No accounts, servers or analytics.** Everything is local files plus, where available, a
  claude.ai artifact.
- **No credentials.** For logged-in sources it asks the learner to use their own browser through
  the Claude in Chrome extension. It never types passwords.

## 6. Anti-goals: failures even if it "works"

- A wall of text with decorative pictures. Every picture must make something visible that prose
  can't.
- Pictures that move for show: spinning things that teach nothing.
- A page that fights the reader: scrolling while they read, or auto-play taking over a picture
  they're using.
- Wrong timestamps or wrong facts. Every timestamp and number is checked against the source.
- A generic "why this matters" that ignores the learner's goal.
- A build that takes hours.

---

## 7. The experience

### 7.1 Intake: situational questions

Before asking anything, the skill looks at what it was given: a playlist, one video, a PDF, a bare
topic. Then it asks **only the questions whose answers would change the page's content**, one at a
time:

- **Goal:** what the learner is building or aiming for (for example "train my own small language
  model"). Every "why this matters" points at it.
- **Starting point,** only when it matters. It doesn't change the tone or the depth. It decides which
  fundamentals get refreshers, which earlier material gets linked, and what Claude knows when the
  learner asks follow-up questions.
- **Language for terms,** only if they learned the subject in another language. Each word box then
  shows the term in that language (for example Arabic school terms, and notation such as
  د(س) and هـ).
- **Source-specific:** "which lecture are you on?" for a playlist, "do you have it open in Chrome?"
  for logged-in sites, "which chapter?" for a book.
- **Preferences:** theme, the hands-on rule, how many check questions.

The answers are saved as a **learner profile**. Later pages don't ask again; at most, "anything
changed since last time?"

### 7.2 Page anatomy (proven in the micrograd page)

- **Sticky bar:** title; theme picker; follow controls (−10s, the clock, +10s, speed, Resume,
  Follow); a timeline of chapters you can click to set the time; a "now" line with the current
  moment; auto-scroll and auto-play switches.
- **Must-read sections** come before the lecture (for example "the one loop behind all of it",
  which joins the learner's earlier videos to this one). A card asks the learner to read them before
  following starts.
- **One "station" per chapter or section,** each with:
  - a time chip,
  - a title and a bold one-line lead,
  - *Play with it* (the figures),
  - *What he means* (the same idea in different words),
  - *Why we need this* (links back to earlier sources, forward to the learner's goal),
  - *Words and refreshers* (term, the term in the learner's language, meaning; plus a phrase
    decoder for the teacher's informal English),
  - tool or language notes when relevant (for example "The Python in this chapter"),
  - *Moments to watch* (timestamps with what's on screen),
  - *Check yourself* (questions with hidden answers).
- **Margin notes** on wide screens: the words, phrases, notes and moments move into a side column,
  which works as a live tracker while following.
- **Marking sections done:**
  - Each section ends with a "Mark done" control.
  - An **auto-complete** switch, next to auto-scroll and auto-play, marks a section done when the
    follow-along moves past its end.
  - Done sections show a tick on the timeline and next to their title.
  - This is remembered per page, in the browser. Whole parts of a course are marked done through
    the study step (§8), because pages can't write to the course home.
- **A final out-loud quiz** before the learner marks the topic as understood.
- **Sources without a timeline** (books, docs, topics) keep the same anatomy. Moments become
  *landmarks* (page or section references), and there's no follow clock.

### 7.3 Following along (sources with a timeline)

- The clock starts from the section in view, or from **Resume** (the saved spot), or from a typed
  time. It also responds to ±10s, timeline clicks, speed, and the keys k/j/l.
- **Anchors:** each moment points at the exact element it's about (a figure, a specific bullet, a
  table, a code block).
- **Smart scroll:** the page moves only when a new moment arrives, only if that part is off screen,
  and never while the learner is busy: scrolling, typing, dragging, text selected, or the mouse
  moving over the page. A resting mouse on the page counts as reading for up to 20 seconds. Using
  the follow controls means "take me there" and jumps straight away. Anything skipped shows up as a
  "Jump to" button.
- **Auto-play:** moments can trigger picture actions (press the tiny-h button at 12:39, spin the
  gears at 43:11, start training at 2:08:51). Pictures with loops start once the first time they're
  reached.
- **Known limit:** the page can't read the learner's video player, so pausing there means pausing
  here too.

### 7.4 Courses

At the first run on a playlist or course, it builds a **course home**: every part with its status
(not started, page ready, done), links to the finished pages, a summary of the learner's profile,
and where they are now. Pages are built one at a time, when the learner reaches that part, so each
one can use what came up on the previous one.

---

## 8. How it's built (decided)

- **Name:** Explorables. **Repo:** `moazessam376-dev/explorables`, public, created only when the
  owner says so. It lives locally at `F:\explorables` until then. *License: MIT (my call).*
- **Packaging:** a Claude Code plugin with a marketplace manifest, the same pattern as claudetube.
  It contains:
  - the `explorables` skill: intake → plan → build → verify → review → deliver;
  - claudetube's `watch-youtube` skill, bundled (or depended on) for video sources;
  - a second, chat-only skill variant for claude.ai with no video watching.
- **Output:** one self-contained HTML file per page, with inline CSS and JS. three.js r128 comes
  from cdnjs, fonts from Google Fonts. The same file opens locally in any browser and publishes as
  a claude.ai artifact when the Artifact tool is available.
- **Build approach:** page source pieces plus a small build script that joins them into one file,
  as the original micrograd page did.
- **Component library (tested parts):** shared helpers; the 3D stage (orbit camera, theme colours,
  labels, picking, dragging); surfaces and contours; the 2D expression graph; the follow-along
  engine (anchors, smart scroll, auto-play actions, Resume, must-read card); themes and the theme
  picker; margin notes. New pages reuse these and write only their topic's own pictures.
- **Sources:**
  - **YouTube:** claudetube, transcript first, then targeted frames.
  - **Logged-in sites (Udemy and others):** the learner's own Chrome through Claude in Chrome,
    after asking.
  - **Local PDFs and text:** read directly.
  - **A bare topic:** Claude's own knowledge plus optional web research, with sources cited.
- **Quality process (fast, with no loops):**
  1. **Intake** (§7.1).
  2. **Page plan:** a short file listing chapters with their timestamps or landmarks, the picture
     for each chapter and what it must prove, each moment's anchor, and the auto-play actions.
     Checked against the transcript before any code.
  3. **Build** from the library.
  4. **Verify while building:** syntax check (`node --check`), a headless render with no console
     errors, number checks for anything computed (for example, the engine reproduces the teacher's
     values), and every theme rendered once.
  5. **One review pass:** a fresh reviewer subagent checks facts and timestamps against the source
     and checks that the page runs (controls, themes, phone width), in parallel. Fix what it finds,
     then deliver.
- **Pitfalls checklist,** seeded from the micrograd build:
  - a slider's step size rounding away per-frame animation steps (keep state in a variable);
  - a sticky header changing height and shifting the page;
  - a CSS class name colliding with a component (`.ghost`);
  - PowerShell 5.1 corrupting UTF-8 when it rewrites files;
  - continuous scroll that never stops, and the page treating clicks on its own controls as
    "reading";
  - `[hidden]` overridden by `display: flex`;
  - the 3D camera too close, so the scene is clipped;
  - labels overlapping lines;
  - localStorage being unavailable (wrap every call).
- **Feedback loop:** when someone reports a bug, the fix goes into the library, and the lesson goes
  into the pitfalls checklist. *My calls on the mechanics:*
  - **For any user:** with their permission, the skill drafts a GitHub issue on
    `moazessam376-dev/explorables`, with the bug, what they did, and the page's plan file. It never
    files the issue without asking.
  - **A learner's own lessons** go into a pitfalls file next to their learner profile, outside the
    plugin folder, so plugin updates don't erase it. Every build reads both checklists: the
    plugin's and the learner's.
  - **Every page keeps its source pieces and its plan file** next to the built page, plus a rebuild
    command. When the library gets a fix, a page can be rebuilt and republished at the same address.
    This is offered, never automatic.
- **Themes:** Field Manual light and dark (the default; it follows the system setting),
  Chalkboard, Notebook light and dark, and Manim Night. The colour roles are fixed across themes:
  a value, a slope or gradient, the nudge, downhill or positive, negative.
- **The original learner's pages** move to use the repo's library, so improvements land in one
  place.
- **The repo's first example is the micrograd page** (`examples/micrograd/`), made impersonal.
  - **Keep:** all the content and pictures, and the word boxes with another language's school
    terms (they show what the language option does).
  - **Remove:** anything about the person: their name, their goals, their study plan and tracker,
    and "for X" lines.
  - **Rewrite** the "why this matters" parts against a neutral example goal.
  - The original live page stays where it is, untouched.
- **Works without installing.** Someone can hand Claude the repo (a clone or the GitHub URL) and
  say "use Explorables", and it must work. The repo root carries plain instructions for Claude
  (README plus an agent instructions file) that point at the skill and the library. The plugin
  install is the convenient path, not the only one.
- **The study step after a page.** When the learner tells Claude they've finished a part, a short
  study step runs:
  1. the out-loud quiz;
  2. mark the part done in the course state, a small file next to the course home, owned by
     Claude, not by the pages;
  3. note what the learner struggled with, for the next page;
  4. rebuild the course home.
  
  Nothing is synced to personal trackers.

## 9. Constraints

- **Artifacts:** no embeds or iframes (so no YouTube player inside the page); scripts only from the
  CDN allowlist; localStorage only for conveniences, and it may be unavailable; no file downloads.
- **Copyright:** no transcripts or long quotes; images are diagrams it draws itself, or openly
  licensed with the source credited.
- **Accessibility:** respect reduced motion; keyboard controls for 3D scenes; contrast in every
  theme; works at phone width with no sideways page scroll.
- **Windows:** PowerShell encoding; a guided install of yt-dlp and ffmpeg when they're missing.
- **Speed:** one lecture page per sitting.

## 10. Left to the builder

- The repo's file layout, the component APIs and the build script's interface.
- The test harness (Claude's browser, Playwright, or a headless Chrome script).
- The reviewer's exact prompt.
- The learner profile's file format and location (it must be readable by future sessions and not
  tied to one project folder).
- Visual details of the course home page.
- How claudetube is included (vendored or a plugin dependency).
- The packaging details of the claude.ai chat variant.

## 11. Version 1 (my call; the owner didn't object)

- **In:**
  - the Claude Code plugin, and use straight from the repo;
  - the parts library pulled out of the micrograd page;
  - all six themes;
  - the situational intake and the learner profile;
  - YouTube sources through claudetube;
  - the course home and the study step;
  - the impersonal micrograd example.
- **Acceptance test:** the learner's next lecture. On his own, Explorables builds the companion for
  Karpathy's makemore (bigram) lecture in one sitting, at the reference page's density. It must
  pass its own verify and review steps, and the learner must be happy to use it.
- **Version 2:**
  - logged-in sites through Claude in Chrome (Udemy);
  - PDFs and books;
  - bare topics;
  - the claude.ai chat variant;
  - a first example outside machine learning, to prove "any subject".
