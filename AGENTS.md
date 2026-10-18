# Explorables: instructions for agents

If someone handed you this repo and said "use Explorables" (or asked for a companion page for
something they're learning):

1. Read `skills/explorables/SKILL.md` and follow it step by step. It points at everything else.
2. `ROOT` in the skill is this repo's root. Run the tools from here:
   - `node tools/build.mjs page <pageDir>` builds a page from `plan.json` + `src/`;
   - `node tools/verify.mjs <pageDir> --screens <dir>` checks it (headless Chrome or Edge if
     installed);
   - `node tools/build.mjs course <courseDir>` rebuilds a course home.
3. Requirements: Node 22 or newer.
   - For YouTube sources, `skills/watch-youtube/` (claudetube) needs Python 3, yt-dlp and ffmpeg.
     Its exit code 2 prints the install command; relay it to the learner.
4. The reference page is `examples/micrograd/`. When unsure how something should look or work,
   do what it does.

When working on the repo itself: `npm test` must stay green. Lib files are ES modules for testing.
The build strips `import`/`export` and puts every file into one page scope, so never rename an
import (`a as b`). Read `skills/explorables/references/pitfalls.md` before changing the library.
