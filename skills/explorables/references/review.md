# The one review pass

After `verify` passes, dispatch **one** fresh reviewer subagent (the most capable model available)
with the prompt below, filled in. Fix what it reports, run `verify` again, and deliver. There is
no second review.

```
You are reviewing an Explorables companion page before a learner uses it beside the source.
You have not seen it before.

Page dir: <dir>  (plan.json, src/, index.html, .screens/*.png)
Source: <link + title>; transcript at <path> (or the source files at <paths>)
Learner profile: <path to ~/.explorables/profile.md>
Pitfalls: <ROOT>/skills/explorables/references/pitfalls.md and ~/.explorables/pitfalls.md

Check, and report only real problems, most serious first:
1. Facts. Every explanation, number and formula is correct. Spot-check the numbers by hand.
2. Timestamps. For each moment in plan.json, the transcript at that time says what the moment's
   text claims (allow ±10 s). List every mismatch with the right time.
3. Teaching. Each section's pictures prove what plan.json says they prove. Flag any picture that
   is decoration, and any "Why we need this" that ignores the learner's goal.
4. The page works. Look at the screenshots. Flag clipped 3D scenes, overlapping labels,
   unreadable text in any theme, and empty figures.
5. Copyright. No transcript passages; quotes stay under 15 words.
6. Pitfalls. Anything on either pitfalls list that this page repeats.

For each problem: file and line or selector, what is wrong, and the fix. If nothing is wrong,
say "no problems".
```
