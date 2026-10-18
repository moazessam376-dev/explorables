# plan.json: the page plan

Write the plan before any page code. The build refuses a plan that `validatePlan`
(`ROOT/tools/plan.mjs`) rejects, and the verifier checks the built page against it. The full
reference plan is `ROOT/examples/micrograd/plan.json`.

```json
{
  "id": "makemore-bigram",                      // storage key prefix: unique per page
  "title": "Makemore Companion",
  "subtitle": "Karpathy · Lecture 2",
  "source": { "kind": "video", "provider": "youtube", "id": "PaCmpygFfXo", "duration": 6971, "title": "..." },
  "refs": { "k": "PaCmpygFfXo", "c2": "IHZwWFHWa-w" },   // keys used by <a data-v="k" data-t="...">
  "mustRead": ["s-big"],                          // asked before following from the very start
  "sections": [
    { "id": "s-big", "title": "The one idea behind it", "pictures": [{ "id": "land", "proves": "..." }], "moments": [] },
    { "id": "s-counts", "title": "Counting bigrams",
      "chapter": [180, "counting bigrams"],      // or "chapters": [[t, title], [t, title]]
      "pictures": [{ "id": "bigram-grid", "proves": "the 27x27 count table is just pairs of letters" }],
      "moments": [
        { "t": 180, "text": "Start counting pairs of letters." },
        { "t": 412, "text": "The count table as an image.", "anchor": "#bigram-grid", "action": ["#bg-show"] }
      ] }
  ],
  "intro": { "bigram-grid": ["#bg-play"] }        // loops that start on first view
}
```

## Rules

- `source.kind` is `"video"` (with `duration` in seconds) or `"text"` (books, docs, topics). Text
  pages use `{ "page": "12", "text": "..." }` landmarks instead of `t`, and get no follow clock.
- Moments are in time order across the whole page, and none is past the end of the video.
- **Every section has at least one picture,** with a `proves` line: what it makes visible that
  prose can't. If you can't write that line, the picture doesn't earn its place.
- **Anchors** say which element a moment is about: `head`, `fig`, `fig2`, `why`, `words`, `py`,
  `means`, `means:N` (the Nth bullet of "What he means"), or a CSS selector starting with `#`.
  Defaults: the first moment of a section is `head`, the rest are `fig`. Set an anchor whenever
  the moment is about something else, such as a specific bullet, a notation table or a printout.
- **Actions** make a picture act out the moment: a list of CSS selectors to click, or
  `demo:name(args)` to call `DEMO.name(...)` from the page JS. Use `demo:ensurePlaying(#sel)` to
  start a loop without toggling it off, and `demo:wait(ms)` to pause.
- **`mustRead`** lists sections the learner should read before the lecture starts (context they
  would otherwise miss).
- Every `#id` the plan names must exist in the page. The verifier checks it.
