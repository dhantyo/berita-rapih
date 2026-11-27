# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Everyday Indonesian news readers ("normies", not power users) who open news links from WhatsApp, social media and search on their phone or laptop. They are annoyed enough by ads, "Baca Juga" interruptions and split pages to install one thing once, but will not configure anything technical. The primary audience leans toward people who care about clean information (and skews iPhone), but phone and desktop matter equally.

## Product Purpose

Berita Rapih turns a messy Indonesian news article into a clean, complete, readable page the moment it opens: the article only, every page merged into one, no ads, no "Baca Juga" links, no promos. Success: a reader opens a Detik/Kompas/Tribun/CNN Indonesia/Liputan6 link and reads the whole story without fighting the page.

## Positioning

Runs entirely on the reader's own device (no proxy server, nothing redistributed), merges multi-page articles that browser reader modes leave split, and is tuned for Indonesian outlets with community-maintained, remotely updatable rules. Existing tools only merge pages (desktop userscripts) and none work automatically on phones.

## Operating Context

- Delivered as: iOS Shortcut (Share → Berita Rapih), Android link-router app (planned), desktop browser extension (dev; tested in Brave).
- The overlay sits on top of the original page in a Shadow DOM; the original stays underneath and is one tap away ("Tampilkan asli").
- Readers arrive mid-scroll from chat apps; sessions are short, one article at a time.

## Capabilities and Constraints

- Hand-verified rules for Detik, CNN Indonesia, Kompas, Tribunnews (incl. regional subdomains), Liputan6; ~20 more outlets via imported page-merging rules and generic extraction.
- Rendering constraints: everything inside one Shadow DOM, CSS as a string, no framework; bundle ~175 kB including the bundled Geist font, kept small for the iOS Shortcut time limit. Fonts are registered from bytes (immune to news sites' CSP); optional faces download only when the reader picks them.
- Brave Shields hides every `<strong>` on some news domains even inside Shadow DOM; the overlay renders bold as `<b>`.
- iOS Shortcut builds should avoid `#` characters where possible (hex colors → `rgb()`).
- UI language: Indonesian and English, switchable; Indonesian by default.
- Settings are needed (fonts, size, theme, toggles); storage is per-browser and best-effort.

## Brand Commitments

- Name: **Berita Rapih** ("rapih" = tidy, uncluttered). Renamed from Sapu Berita on 2026-11-27 so the maintainer's projects share one pattern: *[subject] Rapih*. "Rapih" (not the dictionary spelling "rapi") is a deliberate choice. Copy avoids "bersih" (reads as honest or anti-corruption) and no longer uses the sweep wording; the broom mark stays as the logo.
- Tagline: "Beritanya saja. Tanpa berantakan." / "Just the news. None of the mess."
- Each news outlet's own logo is shown in the overlay so readers know whose journalism they're reading.

## Evidence on Hand

- Real article fixtures for all five outlets in `test/fixtures/` (desktop and mobile layouts).
- No users, testimonials or metrics yet; do not fabricate any.

## Product Principles

1. Never leave the reader worse off: if anything looks wrong, show the original page.
2. The outlet's journalism is the content; Berita Rapih only clears the clutter around it, and credits the outlet visibly.
3. Zero setup after install: defaults must be right for a normie; settings are optional refinements.
4. Everything happens on the reader's device; no server sees what they read.

## Accessibility & Inclusion

Long-form reading on small phones and in dark rooms: adjustable text size, light/dark themes, comfortable line length, and readable contrast are product requirements, not extras.
