# Delivery

## When the Artifact tool exists (Claude desktop and claude.ai)

- Publish the built `index.html` with the Artifact tool. Give it an `icon` on the first publish
  and a one-sentence `description`.
- **Republish from the same file path to keep the same URL.** From a later conversation, pass the
  artifact's URL, and read it first.
- Artifacts allow scripts only from cdnjs and other allowlisted CDNs, and stylesheets only from
  Google Fonts. The build already follows this (three.js from cdnjs, fonts from Google). Don't add
  other outside files: inline them.
- Artifacts can't embed YouTube, so the follow-along runs on its own clock. Say so once, when you
  hand over the page.
- Tell the learner the link, what's new, and anything you couldn't verify.

## Otherwise (Claude Code in a terminal, or any agent)

- Open `index.html` in the learner's browser (`start` on Windows, `open` on macOS, `xdg-open` on
  Linux), or give them the path.
- The file is self-contained except three.js and the fonts. It works from `file://`.

## Every time

- Update `course.json` (`status: "page-ready"`, `page`), then rebuild the course home.
- Keep `plan.json` and `src/` next to the page. A later library fix can then rebuild the page with
  `node ROOT/tools/build.mjs page <dir>` and republish it to the same URL. Offer this; never do it
  without asking.
