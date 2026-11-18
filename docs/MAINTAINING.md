# Maintaining Sapu Berita

This is the runbook for the scheduled maintenance runs. Each run starts in a fresh session that remembers nothing of earlier runs, so this file is the handover. Read it once at the start of a run. Then open other docs only when the task needs them: grep first, and read only the lines you need. Reading costs the same budget that fixing does.

There are two runs:

| Run | When | What it does | Supervision |
|---|---|---|---|
| **Daily** | every morning | fixes broken sites and small bugs, then ships a patch | none, automatic |
| **Weekly** | Friday after 20:00 CET, just after the user's weekly token budget resets | additions, features, anything bigger | the user reviews and approves the PR |

## Where things are

- **Checkout:** `Y:\Documents\3_Play\Indonesian News Overlay`, branch `master`. It is on an exFAT drive:
  - `git worktree` fails there ("dubious ownership"). If you need an isolated copy, clone into a temp folder.
  - Never change the global git config or system settings.
- **Docs:**
  - [ARCHITECTURE.md](ARCHITECTURE.md): the pipeline.
  - [RULES.md](RULES.md): writing and fixing site rules.
  - [DEVELOPING.md](DEVELOPING.md): build, release, report link.
  - [SETTINGS.md](SETTINGS.md): what the settings panel holds and which build shows what.
  - [FEEDBACK.md](FEEDBACK.md): the feedback page and the editor's internals.
  - `PRODUCT.md`, `DESIGN.md`: principles and the visual system. Read them for UI work only.
- **Tools:**
  - `npm run inspect -- <url> [--desktop] [--dark] [--shot <dir>]`: runs the built reader on a live article in the installed Chrome and reports what it extracted. Works on sites that block plain downloads. Add `--all-sites` for every outlet's first sample.
  - `npm run canary`: the daily live check, run without a browser.
  - `npm run probe -- <site>`: drafts a rule for a new site.
  - `npm run capture -- <url>`: saves a live article as a test fixture.
  - `node tools/live-edit.ts editor`: live check of the article editor.
  - `npm run check`: typecheck and all tests.
  - Run `npm run build` before inspect or live-edit.
- **Saved news pages:** these are copyrighted. They live only in the private repo `dhantyo/sapu-berita-fixtures`; use `npm run fixtures:pull` and `npm run fixtures:push`. Never add them to this public repo.
- **The APK signing key:** it is in GitHub secrets and outside the repo. Never read it, print it or commit it.

## Inputs

1. **Reader feedback sheets.** Read them with the Google Drive connector's `read_file_content` (the Sheets connector has no access to them); the run prompt gives their file IDs.
   - **The Google Form's sheet** (0.7 and later): columns Timestamp, kind, url, site, version, platform, note, detail. `kind` is `report`, `site`, `idea` or `edit`. An `edit` row is a reader's change from Atur isi artikel: `detail` holds their personal rule as JSON (`add`/`remove` selectors or `t:`/`i:` fingerprints, `fields`), or a draft site rule for a new site. Several readers sending the same change for one outlet is a strong sign the official rule should change. Its ID in `triage.tsv` is `g:` plus the Timestamp.
   - **The old Tally sheet** (0.6.3 and older still send there until they update): columns Submission ID, Respondent ID, Submitted at, url, site, version, platform, note, screenshot link, extra comment. Retire it once it has been quiet for two weeks after the 0.7 release: say so in the report; the user deletes the form.
   - Our triage log is `triage.tsv` in the private repo, checked out at `.saved-pages/` (`npm run fixtures:pull` clones it). Columns: submission ID, date, status (`fixed`, `weekly`, `duplicate`, `cannot-reproduce`, `wontfix`), a one-line summary, and a link to the commit or backlog entry. Commit and push it there with `git -c safe.directory=<that folder> …` (exFAT).
   - A submission is new if its ID is not in `triage.tsv` yet.
   - Test rows (note says test or setup) are not feedback: record them as `wontfix`.
   - The `note` field is the text the app built from what the reader picked and typed on the feedback page; the kind of feedback is in it.
2. **GitHub issues:** `gh issue list --state open`. Labels: `broken article`, `site request`, `enhancement`, `bug`.
3. **Canary:** `gh run list --workflow canary.yml --limit 3`. For a failed run, `gh run view <id> --log-failed` names the sites.
   - A *blocked* warning means the site refused GitHub's datacenter IP (403, or a dropped connection). It is not a failure. Check that site with `npm run inspect` only if readers report it.
4. **[BACKLOG.md](BACKLOG.md):** work queued for the weekly run, plus items the user has pinned.

## Daily run (automatic)

Goal: whatever is broken is fixed and shipped the same day, with no one watching. When there is nothing new, the run should be cheap.

1. **Gather** all four inputs with cheap commands. If nothing is new and the canary is green, report that in one line and stop. Don't open other docs.
2. **Triage** each new item as: duplicate, cannot reproduce, fix now, weekly, or won't do. Record it in `triage.tsv`, or on the issue via its labels.
3. **Fix** what meets the safe-fix bar below:
   - Reproduce it first on the live page: `npm run inspect -- <url>`, with the phone UA for sites whose mobile layout differs (Tribun, Liputan6).
   - Fix it. Add a fixture when it pins the fix (`npm run capture`, then `npm run fixtures:push`).
   - `npm run check` must be green, and the page must be right on a second inspect.
4. **Commit** each fix on `master`:
   - one changelog line under `## [Unreleased]`, in plain words a reader would use;
   - `Fixes #N` in the commit message when it came from an issue.
5. **Release** once, if anything a reader would notice was fixed.
   - `npm run release -- <next patch>`, then `gh run watch` until the release run is green. At most one release a day.
   - The `stores` job (`stores.yml`) submits the package to every store that has keys ([STORES.md](STORES.md)). Read its summary (`gh run view <id>`). A store marked `failure` because it is still reviewing the previous version needs nothing. Any other refusal (expired or wrong key, a rejected package) goes in the report, with the step log's error line. A store marked `skipped` has no keys yet and is still uploaded by hand: mention that the release needs it.
   - If `[Unreleased]` holds anything that isn't a daily fix (for example a weekly merge the user hasn't released), don't release; say so in the report.
6. **Queue** everything else in [BACKLOG.md](BACKLOG.md): one line per item, with its source (sheet ID or issue number).
7. **Report** in at most 10 lines: what came in, what shipped (version), what was queued, and what needs the user.
   - Send a push notification only if a release went out, a release failed, or something needs the user before Friday.

### The safe-fix bar

All of these must hold:

- The change is to a site rule (`rules/sites/*.json`), or it is a code fix of about 60 lines or fewer outside tests, with a regression test that failed before the fix.
- It adds no feature, no setting and no new app text (typo fixes are fine). It changes no layout or visuals, no storage format, no permissions or manifests, no dependencies, and no CI, build or release tooling.
- It was reproduced before the fix and verified after on the live page, and `npm run check` is green.

If you are not sure, it is not safe: queue it.

**Urgent but not safe:** if a big outlet (Detik, Kompas, Tribun, CNN Indonesia, Liputan6) is broken for everyone and the fix doesn't meet the bar, don't wait for Friday. Put the fix on a branch, open a PR, and send the user a push notification.

## Weekly run (supervised)

Goal: additions and bigger changes, ready for the user's approval. The budget has just reset. Spend it on the 1 to 3 most valuable items, not on everything.

1. **Read** [BACKLOG.md](BACKLOG.md), the `triage.tsv` rows with status `weekly`, and open `site request` / `enhancement` issues.
   - Rank them by how many readers asked, how many readers it helps, and how much effort it takes.
   - Skip the *Pinned* section unless the user asked for it.
2. **Branch** `weekly/YYYY-MM-DD` off `master`, then build the items.
   - **UI and design:** do it yourself, not in a subagent. Follow `DESIGN.md`.
   - **Check visually** on a real article with playwright-core and `dist/shortcut.js` (see `tools/live-edit.ts` for the harness):
     - phone at 390×844 with the mobile UA and touch;
     - desktop at 1280×800;
     - light and dark.
   - **Mechanical, well-specified code** (rule JSON, plumbing) can go to a Sonnet subagent.
3. **Check:** `npm run check`, the live checks that touch the change, and changelog lines.
4. **Open the PR:** push the branch and open it. Say what changes for readers, why (with backlog refs), and how it was checked. Show the screenshots in the session.
   - Switch the checkout back to `master` before you end; the daily run uses it.
5. **End** with the PR link and one question: merge and release? Never merge without the user's yes in that session.
   - On yes: merge, then `npm run release -- <next minor>` (a patch if nothing a reader sees was added). Watch CI, then remove the done items from BACKLOG.md.

## How we work

These are the user's standing preferences; they apply to every run.

- **Communication:** terse, no preamble, no moralizing.
- **Reuse first:** look for tested libraries and prior art before writing code ([PRIOR-ART.md](PRIOR-ART.md)).
- **Hard limits:** no proxy server, no server of our own, no analytics, no paid accounts, no paywall bypassing.
- **Phone and desktop** matter equally.
- **Language:**
  - Commits, PRs, issues, docs and the changelog are in English.
  - The app's own text is in everyday Indonesian: "link" and "update", not "tautan" and "pembaruan".
  - Write Indonesian in full, descriptive sentences, the way a native speaker would explain it to a friend. Don't compress it to mirror short English. Use the English word where that's what people actually say (extension, install, store, user). Prefer "tersebut" when pointing back to something just named. The user says forced or shortened Indonesian "feels like AI".
  - Keep a visible note on public pages that Sapu Berita is made with the help of AI, without naming the model.
- **Versions:** plain semver. PATCH for fixes, site rules and docs; MINOR for features a reader sees. 0.x means beta.
- **No `#` in the overlay's CSS:** iOS Shortcuts breaks on it, so use `rgb()` or named colours. `npm run build` prints how many `#` are in `shortcut.js`; that number must not grow.
- **Commit trailer:** every commit ends with `Co-Authored-By:` naming the model that wrote it, e.g. `Claude Opus 5.5 <noreply@anthropic.com>`.
- **Reader privacy:** feedback stays private.
  - Never copy a reader's own words, an email address or anything personal into commits, issues, PRs, the changelog or BACKLOG.md. Summarise the problem; article links are fine.
  - Speaking in public (issue comments, Reddit) is the user's job. The one exception: `Fixes #N` in a commit message, which closes the issue.
