---
name: Sapu Berita
description: The article alone, set like a great newspaper's own web edition, swept clean on the reader's device.
colors:
  paper: "rgb(255 255 255)"
  ink: "rgb(18 18 18)"
  muted: "rgb(92 92 92)"
  rule: "rgb(0 0 0 / 0.1)"
  rule-strong: "rgb(0 0 0 / 0.26)"
  chip: "rgb(0 0 0 / 0.045)"
  panel: "rgb(255 255 255)"
  lidi-ochre: "rgb(176 122 18)"
  plate: "transparent"
  shadow: "rgb(0 0 0 / 0.16)"
  sepia-paper: "rgb(247 241 228)"
  sepia-ink: "rgb(44 34 22)"
  sepia-muted: "rgb(104 88 68)"
  sepia-rule: "rgb(60 40 10 / 0.12)"
  sepia-rule-strong: "rgb(60 40 10 / 0.3)"
  sepia-chip: "rgb(60 40 10 / 0.06)"
  sepia-panel: "rgb(251 247 238)"
  sepia-lidi-ochre: "rgb(160 106 10)"
  sepia-plate: "rgb(255 255 255)"
  sepia-shadow: "rgb(60 40 10 / 0.2)"
  dark-paper: "rgb(18 18 18)"
  dark-ink: "rgb(232 232 230)"
  dark-muted: "rgb(168 168 165)"
  dark-rule: "rgb(255 255 255 / 0.12)"
  dark-rule-strong: "rgb(255 255 255 / 0.28)"
  dark-chip: "rgb(255 255 255 / 0.07)"
  dark-panel: "rgb(30 30 30)"
  dark-lidi-ochre: "rgb(222 172 70)"
  dark-plate: "rgb(255 255 255)"
  dark-shadow: "rgb(0 0 0 / 0.5)"
  logo-ground-fallback: "rgb(24 24 24)"
  seg-on: "rgb(255 255 255)"
  sepia-seg-on: "rgb(255 253 248)"
  dark-seg-on: "rgb(64 64 62)"
  thumb: "rgb(255 255 255)"
  dark-thumb: "rgb(246 246 244)"
typography:
  headline:
    fontFamily: '"Sapu Geist", Geist, -apple-system, BlinkMacSystemFont, "Segoe UI Variable Text", "Segoe UI", Roboto, sans-serif'
    fontSize: "clamp(1.6em, 1.1em + 2.3vw, 2.3em)"
    fontWeight: 700
    lineHeight: 1.08
    letterSpacing: "-0.028em"
  deck:
    fontFamily: '"Sapu Geist", Geist, -apple-system, BlinkMacSystemFont, "Segoe UI Variable Text", "Segoe UI", Roboto, sans-serif'
    fontSize: "1.1em"
    fontWeight: 400
    lineHeight: 1.42
    letterSpacing: "-0.008em"
  title:
    fontFamily: '"Sapu Geist", Geist, -apple-system, BlinkMacSystemFont, "Segoe UI Variable Text", "Segoe UI", Roboto, sans-serif'
    fontSize: "1.28em"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.016em"
  body:
    fontFamily: '"Sapu Geist", Geist, -apple-system, BlinkMacSystemFont, "Segoe UI Variable Text", "Segoe UI", Roboto, sans-serif'
    fontSize: "19px × 0.95"
    fontWeight: 400
    lineHeight: 1.6
  body-dark:
    fontFamily: '"Sapu Geist", Geist, -apple-system, BlinkMacSystemFont, "Segoe UI Variable Text", "Segoe UI", Roboto, sans-serif'
    fontSize: "19px × 0.95"
    fontWeight: 370
    lineHeight: 1.6
    letterSpacing: "0.006em"
  body-serif:
    fontFamily: '"Sapu Merriweather", Merriweather, Charter, Georgia, serif'
    fontSize: "19px × 0.92"
    fontWeight: 400
    lineHeight: 1.68
  body-legible:
    fontFamily: '"Sapu Fira Sans", "Fira Sans", Verdana, "Segoe UI", sans-serif'
    fontSize: "19px"
    fontWeight: 400
    lineHeight: 1.7
    letterSpacing: "0.005em"
  meta:
    fontFamily: '"Sapu Geist", Geist, -apple-system, BlinkMacSystemFont, "Segoe UI Variable Text", "Segoe UI", Roboto, sans-serif'
    fontSize: "0.74em"
    fontWeight: 400
    lineHeight: 1.5
    fontFeature: '"tnum"'
  caption:
    fontFamily: '"Sapu Geist", Geist, -apple-system, BlinkMacSystemFont, "Segoe UI Variable Text", "Segoe UI", Roboto, sans-serif'
    fontSize: "0.72em"
    fontWeight: 400
    lineHeight: 1.45
  control:
    fontFamily: '"Sapu Geist", Geist, -apple-system, BlinkMacSystemFont, "Segoe UI Variable Text", "Segoe UI", Roboto, sans-serif'
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1
  label:
    fontFamily: '"Sapu Geist", Geist, -apple-system, BlinkMacSystemFont, "Segoe UI Variable Text", "Segoe UI", Roboto, sans-serif'
    fontSize: "12px"
    fontWeight: 600
    lineHeight: 1.3
  outlet-name:
    fontFamily: '"Sapu Geist", Geist, -apple-system, BlinkMacSystemFont, "Segoe UI Variable Text", "Segoe UI", Roboto, sans-serif'
    fontSize: "18px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.025em"
rounded:
  plate: "4px"
  icon: "6px"
  sm: "7px"
  md: "10px"
  lg: "14px"
  sheet: "18px"
  pill: "999px"
spacing:
  hair: "1px"
  sp-1: "4px"
  sp-2: "8px"
  sp-3: "12px"
  sp-4: "16px"
  sp-5: "20px"
  sp-6: "24px"
  sp-8: "32px"
  control-height: "36px"
  touch-target: "44px"
  bar-height: "56px"
  column: "34em"
components:
  masthead-bar:
    backgroundColor: "{colors.paper}"
    height: "{spacing.bar-height}"
    padding: "0 16px"
  logo-plate-dark:
    backgroundColor: "{colors.logo-ground-fallback}"
    rounded: "{rounded.plate}"
    padding: "4px 8px"
  button-pill:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.control}"
    rounded: "{rounded.pill}"
    height: "36px"
    padding: "0 14px"
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    typography: "{typography.control}"
    rounded: "{rounded.pill}"
    height: "36px"
    padding: "0 14px"
  button-pill-hover:
    backgroundColor: "{colors.chip}"
  button-pill-expanded:
    backgroundColor: "{colors.chip}"
  progress-hairline:
    backgroundColor: "{colors.lidi-ochre}"
    height: "2px"
  settings-panel:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    width: "340px"
    padding: "0 16px 16px"
  segmented-control:
    backgroundColor: "{colors.chip}"
    rounded: "{rounded.md}"
    padding: "3px"
  segmented-option:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    rounded: "{rounded.sm}"
    height: "40px"
  segmented-highlight:
    backgroundColor: "{colors.seg-on}"
    rounded: "{rounded.sm}"
  switch:
    backgroundColor: "transparent"
    rounded: "{rounded.pill}"
    width: "36px"
    height: "22px"
  switch-on:
    backgroundColor: "{colors.lidi-ochre}"
  size-slider:
    height: "40px"
    track: "4px"
    thumb: "22px"
  reopen-button:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    typography: "{typography.control}"
    rounded: "{rounded.pill}"
    height: "44px"
    padding: "0 18px 0 14px"
  toast:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.pill}"
    padding: "11px 18px 11px 14px"
---

# Design System: Sapu Berita

## Overview

**Creative North Star: "The Swept Page"**

Sapu Berita sets a swept Indonesian news article in one modernist voice: a strict Swiss-style grotesk (Geist) for headline, text and every label, generous white space, order kept by hairline rules rather than boxes. The reader should feel the clutter is gone and only the story is left, in a calm, contemporary hand, not a generic reader-mode card and not the outlet's cluttered chrome. Hierarchy comes from weight, size and tracking within the one family: tight, bold headlines; even, open text; small grey labels. A serif (Merriweather) and an extra-legible humanist sans (Fira Sans) are reader options, never the identity.

Density is low and vertical: one centered column, one slim bar above it, nothing in the margins. Colour is almost absent. Paper and ink carry the page; a single accent, lidi ochre (the straw colour of a sapu lidi broom), appears only where Sapu itself is acting: the reading-progress hairline, the active setting, the sweep line at the end. Three grounds exist and are first-class: paper white, warm newsprint sepia, and ink-black dark.

The overlay lives inside one Shadow DOM over the original page, so the system is self-contained: Geist ships inside the script (registered from bytes on the page's font set, so no site's font policy can block it), the optional faces download from the release channel only when chosen, and colours are written as `rgb()` only. The Sapu broom mark and lidi ochre are the shared identity with the planned sibling product Sapu Buzzer and must stay recognisably the same across both.

**Key Characteristics:**
- One modernist grotesk (Geist) for everything; hierarchy by weight, size and tracking, not by switching families.
- Hairline rules (1px, low-alpha ink) instead of cards, fills or shadows on the page.
- One accent, lidi ochre, reserved for Sapu marks; never decoration, never text.
- Three grounds (paper, sepia newsprint, ink-black) with per-theme tuned tokens.
- The outlet's own logo, trimmed, sized optically and recoloured only when it would vanish, credits whose journalism this is.
- Bundled Geist, on-demand Merriweather and Fira Sans, `rgb()` colours, one Shadow DOM: the same type on every device.

## Colors

Paper and ink with one straw-coloured mark; every token is re-tuned per ground rather than inverted.

### Primary
- **Lidi Ochre** (`lidi-ochre`; `sepia-lidi-ochre` and `dark-lidi-ochre` per ground): the Sapu mark. Reading-progress hairline, a switch's on track, the text-size slider's fill and passed notches, the editor's selection outline, the broom in the sweep line, in the Sapu button and in the toast, focus rings, link underlines on hover, and (at 32% mixed with transparency) text selection. It is used as `--accent` and, in controls, `--control`. Brighter on dark, deeper on sepia, so it keeps its weight on each ground. It is never a button fill and never outlines a chosen option.

### Neutral
- **Paper** (`paper`, `sepia-paper` warm newsprint, `dark-paper` ink-black): the page ground and the masthead bar ground (the bar is the page, separated only by a hairline).
- **Ink** (`ink`, `sepia-ink`, `dark-ink`): headline, body, section name in the meta row, active controls. Near-black, never pure black; warm brown-black on sepia; off-white on dark.
- **Grey Sans Muted** (`muted` and per-ground variants): deck, byline and date, captions, setting labels, hints, list markers, and the switch's off track (chosen over the rule colour to hold 3:1 against the panel).
- **Hairline** (`rule`): bar bottom border, blockquote and table rules, `hr`, settings group dividers, panel border, segmented-control outline.
- **Strong Hairline** (`rule-strong`): pill button outlines, swatch rings, inactive size dots, the meta-row `·` separator, link underline at rest, scrollbar thumb.
- **Chip** (`chip`): the quiet fill: hover and pressed states, segmented-control tracks, image placeholder ground.
- **Seg-on** (`seg-on` per ground) and **Thumb**: the raised highlight in a segmented control, and the white knob of a switch and the slider (white on every ground, with a soft shadow).
- **Panel** (`panel`, `sepia-panel`, `dark-panel`): the settings popover/sheet ground; one step lifted from the page on sepia and dark.
- **Plate** (`plate`, `sepia-plate`, `dark-plate`): fallback ground behind the outlet logo, used only when its pixels cannot be read. Transparent on paper; white on sepia and dark.
- **Logo Ground Fallback** (`logo-ground-fallback`): used only when a logo was detected on a dark header but its exact colour is unknown. Normally the plate takes the site's own header colour, read live from the page.

### Named Rules
**The Lidi Rule.** Lidi ochre marks only what Sapu is doing or what is switched on: progress, an on switch, the size slider, the selection, the sweep, focus. It never fills a panel or a button, never outlines a chosen option, never colours text, never decorates. If removing it would not lose information about Sapu's state, it should not be there.

**The rgb() Rule.** Every colour is written as `rgb()` (space-separated, `/ alpha` for translucency). No hex anywhere in shipped CSS or markup: the iOS Shortcut build chokes on `#`.

**The Retune Rule.** A new token gets a value for every ground (light, sepia, dark). Grounds are tuned, not inverted.

## Typography

**Display, Body and Label Font:** Geist (Vercel, SIL OFL 1.1), variable 100 to 900, Latin subset, bundled into every build as "Sapu Geist"; falls back to the platform UI sans.
**Reader options (Pengaturan → Jenis huruf):** Serif = Merriweather (400, 700, 400 italic; optical size pinned to 18, subset to Latin, about 43 KB each) as "Sapu Merriweather". Jelas = Fira Sans (400, 700, 400 italic) as "Sapu Fira Sans", Erik Spiekermann's humanist sans in the FF Meta lineage. Both load on demand from the release channel's `fonts/`; until then, and offline, the stacks fall back to Charter/Georgia and Verdana.

**Character:** Swiss-modernist: a strict grotesk with tight, bold headlines (-0.028em) and an even text colour, so the page reads as clear and contemporary rather than literary. Labels are the same face, small and grey, so Sapu's apparatus and the journalism share one voice and differ only in size and tone. Per-face tuning (`--text-k`, `--lead`, `--head-lead`, `--head-track`) keeps text size 3 optically the same in all three faces. On dark grounds body text drops to weight 370 with +0.006em tracking to offset halation.

### Hierarchy
The article column's sizes are in `em` against the reader's text size, five steps (16, 17.5, 19, 21, 23.5px; default 19px), 1.5px smaller on phones under 600px. Chrome sizes are fixed px.
- **Headline** (700, clamp(1.6em, 1.1em + 2.3vw, 2.3em), 1.08, -0.028em, balanced wrap): the article title, the largest thing on the page. Nothing sits above it. In Merriweather 1.16 / -0.008em; in Fira Sans 1.14 / -0.01em.
- **Deck** (400, 1.1em, 1.42, muted, pretty wrap): the standfirst, shown only when it does not repeat the article's opening.
- **Title** (700, 1.28em / 1.12em / 1em for h2 / h3 / h4, 1.25, -0.016em, balanced): subheads inside the article; follow the chosen face.
- **Body** (400, text size × 0.95, 1.6, pretty wrap; Merriweather × 0.92 at 1.68; Fira Sans × 1 at 1.7 with 0.005em tracking): the journalism. Column capped at 34em.
- **Meta** (400, 0.74em, 1.5, tabular numerals): section (ink, 600) · byline · date in the reader's timezone label. Each part stays whole; the row breaks only at the separators.
- **Caption** (400, 0.72em, 1.45, muted): figcaptions and the sweep line. Tables use the sans at 0.78em with tabular numerals.
- **Control** (600, 14px): pill buttons, the reopen button (650, 15px), segmented options (muted, ink and 600 when chosen).
- **Label** (600, 12px, muted, sentence case): settings section titles. Field labels 500 13px in ink; switch labels 14px with a 12px muted hint. Panel heading 650 17px.

### Named Rules
**The One Voice Rule.** Geist sets everything Sapu draws. Hierarchy is made with weight, size, tracking and tone, never by adding a family. Merriweather and Fira Sans exist only as reader choices for the journalism; labels and controls stay Geist in every setting.

**The Bundled Face Rule.** Only Geist ships in the bundle (about 40 KB as base64); every other face loads on demand from the release channel, from bytes (FontFace with an ArrayBuffer), so no news site's CSP font-src applies and nothing loads that the reader didn't choose. Any new face must be OFL, Latin-subset, and on demand.

**The Bold Is B Rule.** Bold is rendered as `<b>`, never `<strong>`: Brave Shields hides every `<strong>` on some news domains, even inside Shadow DOM.

## Layout

One centered column, `min(100% - 32px, 34em)` wide, measured in the reader's text size so line length stays comfortable at every size step. The column opens 2.2em below the bar: headline, deck, meta row, then the hero image at full column width (1.4em above it), then the article body 1.6em lower. Vertical rhythm inside the article is em-based: paragraphs 1.05em apart, subheads 1.7em above and 0.5em below, figures and tables 1.6em, blockquotes 1.7em, `hr` 2em. The sweep line closes the column 2.6em below the last paragraph, with 3.5em of run-out beneath.

The masthead bar is sticky, 56px tall, 16px side padding (respecting safe-area insets), logo left and controls right with 8px between them. Chrome spacing runs on a 4 / 8 / 12 / 16px set.

Chrome spacing, radii, type sizes, control heights and motion are tokens on the root (`--sp-*`, `--r-*`, `--fs-*`, `--h-ctl`, `--h-touch`, `--dur-*`, `--ease*` in `styles.ts`); new chrome uses them rather than raw values.

Single breakpoint at 600px: body text drops 1.5px, and the settings panel turns from a 340px popover anchored under the gear (top 64px, right 12px) into a full-width bottom sheet capped at 86dvh, padded for the home indicator. The feedback panel takes exactly the same place, 380px wide on wide screens. Floating things that belong to Sapu rather than the article (the Sapu button over the original page, the new-site card, the toast) sit at the bottom of the screen, in the thumb's reach and clear of the site's own header.

## Elevation & Depth

The page is flat. Depth on the reading surface comes only from hairlines and the sticky bar's bottom rule. Shadows exist on exactly the things that float above the article: the settings and feedback panels, the new-site card, the toast and the reopen button, plus the small lifts inside controls (the segmented highlight, the switch knob, the slider thumb).

### Shadow Vocabulary
- **Panel float** (`box-shadow: 0 16px 40px -8px var(--shadow), 0 2px 6px var(--shadow)`): the settings and feedback popovers and sheets. The `shadow` token is retuned per ground.
- **Knob** (`box-shadow: 0 1px 3px rgb(0 0 0 / 0.3)`): the white thumb of a switch.
- **Reopen lift** (`box-shadow: 0 6px 20px -4px rgb(0 0 0 / 0.4)`): the floating button over the original page.

### Named Rules
**The Hairline Order Rule.** On the reading surface, structure is drawn with 1px rules, never with cards, fills or shadows. Shadows are for things that float over the page.

## Shapes

Square on the page, softly rounded in the chrome. Article images, the hero, rules and the summary box have no radius. Controls are pills (buttons, chips, switches, the reopen button, the toast) or gently rounded rectangles (segmented control 10px outer / 7px inner); the panels are 14px, their sheet form 18px on the top corners only. The logo plate is 4px, square app-icon logos 6px. Circles are reserved for swatches, size dots, the close button and the switch thumb.

Icons are authored SVG on a 24px grid, 1.6 stroke, round caps and joins, `currentColor`: the broom (Sapu mark), a close cross, and an out-arrow. No icon fonts, no emoji, no character glyphs as icons.

## Components

### Buttons
One system, three weights, all full pills 36px tall:
- **Secondary** (default): 1px strong-hairline outline, transparent ground. The masthead's gear and **Asli**, Masukan, Tidak usah.
- **Primary:** ink fill, paper text. The one action a screen asks for: Selesai, Kirim, Coba atur sendiri.
- **Quiet:** no outline, muted text (Batal).
- **Gear (settings):** the Lucide "settings" icon in a 36px circle pill. When the panel is open its outline turns ink over a chip fill.
- **Hover / Focus / Press:** chip fill on hover, only where a mouse can hover; a 2px lidi-ochre focus ring offset 2px on every focusable element; rows get a chip fill while pressed. Nothing scales on press.
- **Icon button:** 36px circle, muted glyph, chip fill and ink on hover (panel close, back).

### Masthead Bar and Outlet Logo
The outlet's identity, at the top-left of every view. The logo is found automatically from the live page (no per-site lists) and loaded once in CORS mode so its pixels can be read:
- **Trimmed** to its drawn pixels (the padding logos ship with is cropped away).
- **Sized optically**: equal visual weight, not equal height. Height = √(3200 / aspect), clamped 20 to 34px and capped at 210px wide; square app-icon badges are 30px and paired with the outlet name in bold serif.
- **Recoloured per theme only when needed**: if the logo's lighter part has under 3:1 contrast against paper/sepia it renders as ink (`brightness(0)`, 86% opacity); if its darker part has under 3:1 against the dark ground it renders white (`brightness(0) invert(1)`, 92%). Mid-tone logos (Liputan6 orange) and opaque badges (CNN) are never recoloured.
- **Plate fallback** only when the server forbids pixel reads: the whole logo on the site's own dark header colour, or white in dark themes.
A broken logo falls back to the name alone. The whole logo links to the original article.

### Progress Hairline
A 2px lidi-ochre line along the bar's bottom edge, scaled from the left as the reader scrolls. The first of the three Sapu marks.

### Article Header
Headline, deck (only when distinct from the opening), then the meta row in grey sans. No kicker, label or section tag above the headline; the section name lives in the meta row.

### Summary Box (blockquote)
Outlets' own summary boxes are set between a 2px ink rule above and a hairline below, at 0.94em, no fill and no side bar. A leading bold line becomes the box's title in sans 700 at 0.74em, uppercase with 0.04em tracking. This uppercase treatment belongs to the summary box alone.

### Sweep Line
The end-of-article receipt, after a hairline: the broom mark in lidi ochre with "N distractions swept" in ink 600, "N pages merged" in muted, and "Read on the original site" with an out-arrow pushed to the right. Caption-sized sans. Optional in settings; when off, the column just ends.

### Settings Panel
Structure and behaviour: docs/SETTINGS.md.
- **Container:** panel ground, 1px hairline border, 14px radius, panel-float shadow; 340px popover under the gear on wide screens (grows from its top-right corner, 150ms), bottom sheet at 600px and under (rises from the bottom edge on the drawer curve, 340ms in, 240ms out; drag down to close). The title row is sticky.
- **Sections:** Tampilan, Di dalam artikel, Situs ini, Umum, Lainnya; each a 12px muted title, hairlines only between sections.
- **Segmented control:** a chip-filled track, 3px inset, equal columns; one raised highlight (seg-on, 1px rule ring, soft shadow) slides to the chosen option (280ms ease-out). Options are muted, the chosen one ink 600. The Font control previews each face in itself; the Theme control prefixes each option with an 18px swatch of its ground.
- **Text size:** a notched slider (4px track, ochre fill to the thumb, a 2px notch per step, 22px white thumb with a muted ring) between a small and a large "A". It moves freely while dragged and glides to the nearest notch.
- **Switches:** 36x22px pill; off is a muted outline with a muted knob, on is a lidi-ochre track with a white knob that slides 14px (260ms ease-out). The whole row toggles.
- **Nav row** (Atur isi artikel): label, one-line hint, a chevron that nudges right on hover.

### Feedback Panel
Masukan opens in the settings panel's place with the same container (380px on wide screens). The header is a back arrow and the title; back from the first screen reopens Pengaturan. Report chips are secondary pills that fill with ink when chosen; Kirim is a full-width primary button.

### Editor Sheet
The bottom sheet of Atur isi artikel, in a 680px column centred on the screen, every line aligned to it. The two answers are hairline cards; the chosen one gets an ink outline and a check. Field chips are secondary pills, ink-filled when chosen. State is said in words ("Ikut tampil", "Tidak tampil"), not in colour; the green, red and blue boxes stay only on the original page, where they map what is in and out. The view switch (Asli · Bersih) is a segmented control.

### Toast
A short message after an action that leaves no other trace (edits sent): an ink pill at the bottom centre with the broom in ochre, 3.2s, then it fades.

### Reopen Button
While the original page is showing, a 44px ink-black pill floats at the bottom right with the broom mark in ochre and "Sapu" in white, ringed in white so it reads on dark sites too. It sits outside the themed root, so it is ink-black on every ground.

### Motion
- **Tokens:** `--ease` (state changes), `--ease-out` cubic-bezier(0.16, 1, 0.3, 1) (things arriving and settling), `--ease-drawer` cubic-bezier(0.32, 0.72, 0, 1) (sheets). Durations 120 to 340ms; sheets close faster than they open.
- **Controls carry their motion across re-renders:** the panel is rebuilt on every change, so each picker and switch is first drawn where it was, then transitions to its new state.
- **Theme changes** crossfade the whole view through the View Transitions API where available; elsewhere they switch at once.
- **The top bar** (Sembunyikan bar) follows the scroll 1:1 and settles to shown or hidden when the scroll stops (240ms).
- **Reduced motion:** every movement is dropped; colour fades stay.

## Do's and Don'ts

### Do:
- **Do** set everything in Geist (The One Voice Rule); the serif and Jelas are reader choices for the journalism only.
- **Do** keep lidi ochre to Sapu marks: progress, on switches, the size slider, selection, sweep line, focus.
- **Do** write every colour as `rgb()` and give every new token a light, sepia and dark value.
- **Do** draw order with 1px hairlines (`rule`, `rule-strong`) and white space.
- **Do** size article elements in `em` against the reader's text size; keep the column at 34em.
- **Do** use the motion tokens (`--ease`, `--ease-out`, `--ease-drawer`, `--dur-*`), gate hover styles behind `(hover: hover) and (pointer: fine)`, and drop movement under reduced motion.
- **Do** use the chrome tokens (`--sp-*`, `--r-*`, `--fs-*`) for anything Sapu draws.
- **Do** draw icons as authored 24px SVG at 1.6 stroke in `currentColor`, and reuse the broom mark as is; it is shared with Sapu Buzzer.
- **Do** keep each meta-row part (section, byline, date) unbroken; wrap only at the separators.

### Don't:
- **Don't** load web fonts or assets from other hosts; Geist is bundled, the other two faces come from the release channel on demand, everything lives inside the one Shadow DOM.
- **Don't** write hex colours anywhere in shipped code.
- **Don't** emit `<strong>`; bold is `<b>`.
- **Don't** put a kicker, eyebrow or section label above the headline.
- **Don't** use lidi ochre for text, button fills, panel backgrounds, chosen-option outlines or decoration.
- **Don't** scale buttons on press; the user found it fussy.
- **Don't** wrap the article in cards, tinted panels or side-striped callouts; the reader-mode card with blue accents is the anti-reference.
- **Don't** hard-code per-site logos or colours; the logo and its dark ground are detected from the live page.
- **Don't** spread the summary box's uppercase tracked title to other labels; labels are sentence case.
