# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A static collection of one-off Korean-language HTML pages for "사유록" (Sayurok), a small gathering/club — event invitations, photo-review ("후기") recap pages, and gallery/exhibition pages. There is no app, no framework, no build step, and no package manager (no `package.json`). Each `.html` file is deployed as-is via GitHub Pages.

- Live URL pattern: `https://fish-minkyu.github.io/4ulog/<파일명>.html` (see `README.md`).
- "Build": none. "Deploy": `git push` to `main`.
- "Run": open the file directly in a browser (`open <file>.html`), or just edit and refresh — there is no dev server, bundler, linter, or test suite in this repo.

## Two asset layouts — know which one a page uses before editing

Pages follow one of two patterns. Check the page's `<head>` to see which applies before assuming shared files exist.

1. **Self-contained page** (most pages, e.g. `invite.html`, `danpoongInvited.html`, `exhibition.html`, `sample.html`): CSS lives in an inline `<style>` and JS in an inline `<script>` inside the same `.html` file. Nothing external to edit.
2. **Split, page-scoped assets** (e.g. `myeongyundang.html`, and everything under `review/`): CSS/JS are pulled out into sibling files named after the page, plus a same-named image folder:
   - `css/<page>.css`, `js/<page>.js`, `image/<page>/*.webp`, `music/<page>.m4a`
   - e.g. `myeongyundang.html` → `css/myeongnyundang.css` + `js/myeongnyundang.js` + `image/myeongnyundang/`
   - `review/<page>.html` → `review/<page>.css` + `review/<page>.js` (review pages keep their split assets next to the HTML, inside `review/`, rather than in the top-level `css/`/`js/` dirs)

There is **no shared/global CSS or JS** across pages — each page's styling and behavior is self-contained or scoped to its own filename-matched assets, by design (these are disposable, one-off keepsake pages, not a shared design system). `css/gallery.css` currently has no HTML file referencing it — don't assume it's wired up anywhere.

When splitting an inline page into this pattern (as has been done for pages under `review/`), mirror the existing naming: `<page>.css` / `<page>.js` next to (or named after) `<page>.html`, linked via plain relative `<link rel="stylesheet">` / `<script src="...">` tags — no module bundling, no relative `./` imports between JS files.

## Conventions seen across pages (not enforced by tooling — just match the existing style)

- `<html lang="ko">`, and `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">` for safe-area/notch handling on mobile (these pages are built mobile-first, for sharing in KakaoTalk/Instagram).
- Open Graph meta tags (`og:title`, `og:description`, `og:image`, etc.) are used for KakaoTalk/Instagram link-preview cards. `og:image` must be an **absolute** `https://fish-minkyu.github.io/4ulog/...` URL — relative paths won't render in link previews.
- Photo placeholders use an `onerror` fallback so a page works before real photos are dropped in:
  `<img src="images/01.jpg" onerror="this.classList.add('missing')">` paired with `img.missing{display:none}` in CSS, revealing a placeholder box/caption underneath until the real file is added at that path.
- Fonts are pulled per-page from Google Fonts (`<link rel="preconnect">` + stylesheet `<link>`); each page picks its own typeface rather than sharing a site-wide font stack.
- `invite.html` integrates EmailJS (loaded from a CDN `<script src="https://cdn.jsdelivr.net/npm/@emailjs/browser@4/...">`) for an RSVP form. The public key / service ID / template ID are set inline near the top of that page's `<script>` block; if left blank, the form falls back to a `mailto:` link instead of auto-sending.
