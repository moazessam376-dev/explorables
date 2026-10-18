# Pitfalls: lessons from real bugs

Check every build against this list. When a learner reports a new bug, fix it, then add the lesson
to `~/.explorables/pitfalls.md` (their own list, which every build reads). If it belongs in the
library, offer a GitHub issue, and only file it with their permission.

| Pitfall | What happened | Do this |
|---|---|---|
| **slider** step rounding | An animation read its position back from a slider with `step=0.01`, so every tiny per-frame step was rounded away and "Spin" didn't move. | Keep animation state in a variable; set the slider only for display. |
| **sticky** bar height | The sticky bar is part of the page flow; when its text wrapped, the whole page jumped about 35px. | Fixed heights for the bar's rows; text truncates with an ellipsis. |
| **.ghost** class collision | A graph used `.ghost` for faded nodes, and `.btn.ghost` buttons became 14% opaque. | Use specific class names (`.faded`); `base.css` must not contain a bare `.ghost`. |
| **PowerShell** encoding | PowerShell 5.1 `Get-Content`/`Set-Content` read UTF-8 as ANSI and wrote back garbage (✓ → â€“). | Edit sources with the editor tools or Node, never a PowerShell round trip. |
| continuous **scroll** | The first follow-along scrolled every frame for 2.5 hours. | Use the library's smart scroll: move only on a new moment, only if it's off screen, never while the learner is busy. |
| controls counted as reading | Clicking ±10s counted as "busy reading", so the page refused to jump. | Clicks on the follow bar are intent: they jump straight there (`intent()`). |
| **hidden tab** catch-up | After 30 minutes in another tab, the page crawled through the whole lecture with smooth scrolling. | `needsCatchUp` jumps instantly after a hidden tab or a long frame gap; trips longer than 2 screens jump. |
| **`[hidden]`** overridden | `display:flex` on a card beat the `hidden` attribute. | `base.css` keeps `[hidden]{display:none!important}`. |
| 3D **camera** too close | Scenes were clipped at the top. | Set `dist` so the whole object fits; look at the screenshot. |
| labels over lines | Weight labels sat on the line they described. | Place labels beside lines, with room. |
| **localStorage** unavailable | `data:` URLs and private windows throw on storage access. | Wrap every access in try/catch (a test checks this). |
| **renamed import** | `import { idxAt as idxIn }` broke in the page, because the build strips imports. | The build refuses renamed imports; use the original names. |
| greedy word checks | A "no personal words" test matched CSS names like `--h-track`. | Check visible text only (strip `<style>` and `<script>`). |
| file previews | The app's browser pane shows files outside the project as script-less snapshots. | Use `tools/verify.mjs` (headless Chrome) to test pages. |
| **quirks** mode | A built page opened straight from disk had no doctype, so the browser used quirks mode and guessed the encoding. | Pages start with `<!doctype html>` and a UTF-8 charset; inside the artifact host's skeleton the extra doctype is ignored. |
| last section never done | Auto-complete only fired when the clock entered the next chapter, and the last section has none. | The last section ends at `source.duration`; tell listeners the final time before stopping. |
| **three.js** offline | Without the cdnjs script, 3D stages stayed blank (or blamed WebGL) until scrolled to. | `three-stage.js` fills every stage with a "three.js couldn't load" notice right away. |
| ids in a **RegExp** | A section id with `+` or `.` went into `new RegExp` unescaped and verify missed the section. | Escape anything you build a RegExp from. |
| tests touching tracked files | The example test rebuilt the tracked `index.html` on every run. | Tests build copies under `tests/.out`. |
