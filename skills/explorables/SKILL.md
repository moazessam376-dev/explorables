---
name: explorables
description: Use when someone wants to learn something with a companion page beside it - a YouTube lecture or playlist, a course, a book chapter, docs, or a bare topic - or says "use Explorables". Builds an interactive page with plain-language re-explanations, 2D/3D pictures they control, vocabulary in their language, checks, and a follow-along that keeps pace with a video. Also use when they say they finished a part (the study step).
---

# Explorables

Turn what someone is learning into a **companion page** they keep open beside it. The page
explains again in plain words, shows it with pictures they can turn and drag, ties every idea to
*their* goal, gives the vocabulary in their language, and checks understanding. It never replaces
the source.

`ROOT` below is this skill's base directory, two levels up (the repo root). Tools need Node 22+.
The reference page is `ROOT/examples/micrograd/` (plan, source, built page): when in doubt, do what
it does.

## The workflow

Work through these in order. Each step points at the reference that holds the details. Keep the
learner posted in one short line per step.

1. **Profile.** Read `~/.explorables/profile.md` and `~/.explorables/pitfalls.md`. If they don't
   exist, create them at the end of intake. → `references/intake.md`
2. **Intake.** Look at what you were given first. Then ask only the questions whose answers change
   the page, one at a time. Skip anything the profile already answers. → `references/intake.md`
3. **Read or watch the source.**
   - YouTube: the bundled `watch-youtube` skill (claudetube). Read the transcript first, then
     frames where the screen matters.
   - Files: Read them.
   - A bare topic: your own knowledge, plus web research with sources.
   - Logged-in sites (Udemy and similar): ask the learner to open the page in their own Chrome
     and use the Claude in Chrome extension. Never type their password.
4. **Plan the page.** Write `plan.json`: sections, chapters, moments, anchors, actions, pictures and
   what each picture proves. Check every timestamp against the transcript. Run
   `node ROOT/tools/build.mjs page <dir>` early: it refuses an invalid plan.
   → `references/plan-format.md`
5. **Build.** Write `src/body.html` station by station from `ROOT/templates/station.html`, and the
   pictures in `src/js/`, reusing the library. → `references/anatomy.md`, `references/pictures.md`
6. **Verify.** Run `node ROOT/tools/verify.mjs <dir> --screens <dir>/.screens` until it prints
   `static: ok` and `browser: ok`. Look at one screenshot per theme. Check every item in
   `references/pitfalls.md` that applies.
7. **Review once.** Dispatch one fresh reviewer subagent with the prompt in `references/review.md`.
   It checks the facts and timestamps against the source, and that the page works. Fix what it
   finds, then verify again. No second review.
8. **Deliver.** Publish as an artifact when the Artifact tool exists; otherwise open the local
   file. Update `course.json` and rebuild the course home. → `references/delivery.md`
9. **The study step,** when the learner says they finished a part: the out-loud quiz, mark the
   part done, note what was shaky, rebuild the course home, and offer the next page.
   → `references/study-step.md`

## Where things go

```
<cwd>/explorables/<course-id>/            course.json, index.html (the course home)
<cwd>/explorables/<course-id>/<NN-part>/  plan.json, src/ (body.html, page.css, js/), index.html
~/.explorables/profile.md                 the learner profile (all courses)
~/.explorables/pitfalls.md                this learner's own lessons, read on every build
```

A single video or a single topic is a course with one part.

## Rules that always hold

- **The source stays the teacher.** No transcripts, and quotes stay under 15 words. Explain in
  your own words.
- **Plain words first, math second,** with small numbers the learner can check by hand. Everyone
  gets the same clear explanation. The profile decides which refreshers and links appear, not the
  tone.
- **Every section gets at least one picture** that makes something visible that prose can't. No
  decorative motion.
- **The page never fights the reader.** Smart scroll and auto-play come from the library. Don't
  write your own scrolling.
- **Hands-on rule (on by default):** never write or fix code in the learner's own exercise files
  unless they ask for that exact edit. Explain errors and point to the cause.
- **Nothing personal in anything you share,** unless the learner asks. Pages for the learner can
  be personal; examples and issues can't.
- **Bugs teach the tool.** When the learner reports a bug, fix it in the page. If the fix belongs
  in the library, say so. Append the lesson to `~/.explorables/pitfalls.md`. Offer to draft a
  GitHub issue on `moazessam376-dev/explorables`, and only file it with their permission.
