# Page anatomy and writing rules

## The page

- **The sticky bar comes from the template:** the theme picker, the follow controls, the
  timeline, the "now" line, and the switches (auto-scroll, auto-play, auto-complete). Don't write
  it yourself.
- **The intro** (`<div class="intro">`):
  - an eyebrow;
  - an `<h1>` with one `<em>` phrase;
  - one paragraph on what the page is;
  - the colour legend (value, slope/gradient, nudge, downhill/positive, negative);
  - short "how to use" bullets;
  - part links (`.partnav`) when the page is long.
- **Must-read sections** first (for example "The one loop behind all of it"), with a
  `<span class="mustread">Must-read · 2 minutes</span>` chip.
- **Part headers** (`<div class="part-head">`) only when the page has big parts.
- **One station per chapter or section** (copy `ROOT/templates/station.html`).
- **A final out-loud quiz** (5 checks) in the last section.

## A station, top to bottom

1. **`st-head`:** the time chip (`<a class="time" data-v="k" data-t="488">▶ 8:08 – 14:12</a>`) and
   the teacher's chapter name; an `<h2>` that names the idea; a bold one-line `lead` that says it
   in one breath.
2. **Play with it:** one or more `<figure>`s, each with controls the learner uses and a
   `figcaption` that says what to try and what to notice.
3. **What he means** (or "What she means" or "What they mean", matching the teacher): the same
   idea in different words, as a `.prose` list. Use small numbers the learner can check by hand
   (2.0001 × (−3) + 10 = 3.9997). Anchors can point at a single bullet, so give each bullet one
   idea.
4. **Why we need this** (`.why`): where it leads, tied to the learner's goal; links back to sources
   they already know (`.xref` chips with a timestamp), and forward to later chapters.
5. **Words and refreshers** (`.words`): term · the term in their language (if any) · plain
   meaning. Add a `.notation` table when notation differs from what they learned. Add a phrase
   decoder ("His English, decoded") for the teacher's informal words: nudge, bump, the crux.
6. **Tool notes** ("The Python in this chapter", `.pybox`) when the chapter teaches syntax.
7. **Moments to watch** (`.moments`): one `<li>` per moment: `<a data-v="k" data-t="759">12:39</a><span>what happens</span>`.
   They must match the plan exactly.
8. **Check yourself:** 2 `details.check` questions with hidden answers, asking the learner to
   explain it back rather than recall a fact.

On wide screens the library moves words, phrases, tool notes and moments into a margin column.
The headings it looks for are: "Words and refreshers", "His/Her/Their English, decoded", "How to
read it out loud", "Moments to watch", "Landmarks", and "The … in this chapter".

## Writing rules

- Plain English, short sentences, active voice. No em-dash asides, no "not X but Y", no stock
  phrases.
- Write for the learner's side: name things by what they see ("the orange arrow"), not how the
  code works.
- Colour roles are fixed: `--data` a value, `--grad` a slope or gradient, `--nudge` the nudge,
  `--ok` downhill or positive, `--neg` negative. Use the `.c-data`, `.c-grad` and other classes in
  prose.
- Quotes from the source stay under 15 words. Never paste a transcript.
- Every number on the page is checked: either by the page's own JS, or by hand against the
  source.
