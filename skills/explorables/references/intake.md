# Intake: situational questions and the learner profile

## Look before you ask

First find out what you were given: a playlist, a single video, a course page, a PDF, a book
chapter, docs, or a bare topic. Read the profile. Then ask only what would change the page's
**content**. Ask one question at a time, in plain words, and stop when you have enough.

## The questions (ask only the relevant ones)

- **Goal:** "What are you learning this for?" A project, a job, an exam, curiosity. Every "Why we
  need this" box points at the answer (for example "a small GPT of your own"). Without a goal,
  point forward to where the subject itself leads.
- **Starting point,** only when it matters: "What do you already know about X, and what feels
  shaky?" It doesn't change the tone or the depth. It decides:
  - which fundamentals get refreshers (for example, math done long ago in another language);
  - which earlier material gets linked back to (videos they already watched);
  - what Claude knows when they ask follow-up questions later.
- **Language for terms,** only if they learned the subject in another language: "Did you learn
  this subject in another language? I can show those terms next to the English ones." Then each
  word box gets that language's school term, and the notation table gets the school notation (the
  example page uses Arabic: المشتقة for derivative, د(س) for f(x), هـ for h).
- **Source-specific:**
  - a playlist: "Which part are you on?";
  - a logged-in site: "Do you have it open in Chrome with the Claude extension?";
  - a book: "Which chapter, and which edition?"
- **Preferences:**
  - the theme (Field Manual, the default, follows their light or dark setting; Chalkboard;
    Notebook; Manim Night);
  - the hands-on rule (on by default);
  - how many check questions (default 2 per section, 5 at the end).

## The profile

Write the answers to `~/.explorables/profile.md` and update it whenever something changes. Copy
the theme into every page's `plan.json` (`"theme"`) and into `course.json`, so new pages open in it. Later
pages don't ask again; at most, "Anything changed since last time?"

```markdown
# Learner profile
- Goal: <what they're building or aiming for>
- Starting point: <what they know, what's shaky>
- Term language: <none | language, plus notes on school notation>
- Hands-on rule: on
- Theme: auto
- Checks: 2 per section, 5 at the end

## Courses
### <course-id>: <title>
- Source: <link>
- Where: <cwd path>
- Notes: <what clicked, what was shaky, per part>
```

Also create `~/.explorables/pitfalls.md` with a one-line header if it's missing.
