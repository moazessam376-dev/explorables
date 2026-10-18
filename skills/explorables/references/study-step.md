# The study step: when the learner finishes a part

Pages can't write to the course home, so finishing a part happens in chat. When the learner says
they finished (or wants to check whether they understood):

1. **The out-loud quiz.** Ask 3 to 5 explain-it-back questions, one at a time, drawn from the
   page's checks and its final quiz. Ask for explanations, not recall. After each answer, say what
   was right, fill the gap in plain words, and move on. The bar is "can explain it out loud
   without notes".
2. **Mark the part done** in `course.json` (`"status": "done"`). Set `"current"` to the next part.
3. **Note what was shaky** in the part's `notes` and in the profile's course notes. The next page
   gives those ideas a refresher and links back to them.
4. **Rebuild the course home:** `node ROOT/tools/build.mjs course <courseDir>`. Republish it if it
   was published.
5. **Offer the next page.** Don't start building until the learner says so.

## course.json

```json
{
  "id": "zero-to-hero",
  "title": "Neural Networks: Zero to Hero",
  "theme": "chalk",
  "source": { "provider": "youtube", "playlist": "PLAqhIrjkxbuWI23v9cThsA9GvCAUhRvKZ" },
  "parts": [
    { "id": "01-micrograd", "title": "micrograd", "status": "done", "page": "01-micrograd/index.html",
      "notes": "chain rule clicked; tanh saturation was shaky" },
    { "id": "02-makemore-bigram", "title": "makemore: bigram", "status": "page-ready", "page": "02-makemore-bigram/index.html" },
    { "id": "03-makemore-mlp", "title": "makemore: MLP", "status": "not-started" }
  ],
  "current": "02-makemore-bigram"
}
```

`status` is one of `not-started`, `page-ready` or `done`. A part that isn't `not-started` needs a
`page`. On a first run for a playlist, list every part as `not-started` and build only the part
the learner is on.

Sections inside a page are marked done on the page itself ("Mark this section done", or the
auto-complete switch). That progress stays in the browser and doesn't reach course.json.
