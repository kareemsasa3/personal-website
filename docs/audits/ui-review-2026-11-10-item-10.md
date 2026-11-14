# UI review 2026-11-10, item 10: terminal under the mobile keyboard

Release record for one item of the owner's 2026-11-10 human UI review. The review's working log is kept locally and is not part of this repository; this file is the public record for item 10 only.

## The note

| # | Route | Viewport | Category | Note (owner's words, lightly trimmed) | Status |
|---|-------|----------|----------|----------------------------------------|--------|
| 10 | /terminal | mobile | bug · interaction | Should act like a full-screen terminal application (e.g. tmux). Currently the bottom half of the terminal is blocked when the keyboard opens. Keyboard open → fit terminal to the remaining visible space; keyboard closed → fill the window. | Merged and production-verified 2026-11-14. Cross-device testing outstanding (see below). |

## Status at a glance

| | State | Basis |
|---|---|---|
| Fix merged | Yes | PR #67, merge commit `52a2359` |
| Deployed to production | Yes | Deploy run 43641443269, image digest below |
| Production serves the fix | Verified | Automated checks of the live site, simulated keyboard only |
| Native keyboard, Android Chrome 157, one phone | Verified | Owner's check on a development build of the merged tree, with recorded measurements |
| Native keyboard on the production build | Not verified | |
| iOS Safari, other Android devices and versions, installed PWA, Firefox, landscape on a device | Not verified | |
| `man` and `top` overlays under the keyboard | Not addressed | Out of scope for item 10 |

## Cause

1. **Layout viewport sizing (read from the code).** The terminal window was `position: fixed` and sized from `100dvh`. Mobile Safari, and Chrome on Android by default, draw the on-screen keyboard over the page without resizing the layout viewport; only `window.visualViewport` shrinks. Nothing in the terminal read it.
2. **Reported height taller than the visible area (measured on a device).** On an Android phone running Chrome 157, drawing edge to edge, on commit `f4fb052`:

   | | Keyboard closed | Keyboard and accessory bar open |
   |---|---|---|
   | `innerHeight` / `clientHeight` / `100dvh` | 864 / 864 / 864 | 864 / 864 / 864 |
   | `visualViewport` height, offsetTop, scale | 864, 0, 1 | 464.41, 0, 1 |
   | `env(safe-area-inset-bottom)` | 37 | 0 |
   | Terminal window (top–bottom) | 242–827 | 0–464 |
   | Input | 683.6–699.6 | 439.2–455.2 |

   The input was inside the reported viewport, and `elementFromPoint` at its centre returned it. A screenshot of the same moment shows the page visible only to about 428 px, with the input row under the keyboard's accessory bar. 464.41 − 428 ≈ 36.5, the 37 px bottom inset to within the image measurement. No ancestor clipped the input and nothing scrolled.

   Why Chrome reports the height this way is not established. The reading the fix rests on: the layout viewport runs under the gesture bar (`viewport-fit=cover`), and the inset is withdrawn when the keyboard replaces the bar while the visual viewport still counts it.

An earlier explanation, a scroll race clearing the transcript's follow flag, was not supported by the device session and was withdrawn.

## Change (PR #67)

Commits `fa1545d`, `f4fb052`, `b80cf4a`; merged as `52a2359` on 2026-11-14 at 21:07 UTC. The merged tree is identical to `b80cf4a`.

- The window is fitted to the visible span read from `visualViewport` while a keyboard covers the layout viewport, less the bottom safe-area inset that is withdrawn while the keyboard is open (`web/src/utils/keyboardViewport.ts`, `Terminal.tsx`).
- On small or coarse-pointer screens the prompt is pinned to the bottom of the transcript, and the transcript does not chain its scrolling to the page.
- On small or coarse-pointer screens the toolbar is one 49 px row of three 48 px icon controls with unchanged accessible names. On phones the window spans the full width and the available height.
- Desktop is unchanged: worded controls and the 800x600 floating window.

## Verified

### Native device (one phone)

Android, Chrome 157, development build of `b80cf4a`, 2026-11-14. Passed by the owner's check: typed text is visible with the keyboard open, the input stays at the latest output, and the transcript scrolls without dismissing the keyboard. Measurements recorded in that session:

| State | Window | Input |
|---|---|---|
| Keyboard open, viewport not panned (`visualViewport` 464.41 at offset 0) | 0–427 | 402.2–418.2 |
| Keyboard open, viewport panned (464.41 at offset 335.59) | 336–763 | 738.4–754.4 |
| Keyboard closed | 186–827 | not applicable |

### Build and deployment

- Build run 43641163144 pushed `ghcr.io/kareemsasa3/personal-website/web@sha256:cb5fb0ec2f8ede09dafdf0771cc3c99fdf56b9294afc41f5dd99d9916bf99e3e` for `52a2359`.
- CI run 43641163215 and Security run 43641163204 passed on the merge commit.
- Deploy run 43641443269, triggered by the build at 21:11 UTC, succeeded and released that digest. Previous image (rollback target): `web@sha256:304b50d37f7647ed408ca0dc00abd9c1328414ed7cb2af412f9495c7b5a1f9c8`.

### Production (automated, 2026-11-14 21:22–21:27 UTC)

All of the following used headless Chromium; where a keyboard is involved it is simulated by overriding `visualViewport`.

- `https://kareemsasa.dev/terminal` returns 200 at `/terminal/` with `cf-cache-status: DYNAMIC`.
- The served bundle `index-Belj1AIQ.js` embeds `52a2359dbc96e4a0e78727ebc121bf26a294021a` and contains the fix; `index-X0w3qMlz.css` contains the compact-toolbar and transcript rules.
- At 443x864: 19 responses, none at 400 or above, no console or page errors; three 48 px icon controls with their accessible names; the prompt is `position: sticky`; no horizontal overflow; `help` runs.
- `web/scripts/terminal-keyboard-browser-test.mjs` passed against production, including the replay of the phone's recorded geometry and the desktop case.
- `/`, `/projects/`, `/case-studies/`, `/writing/`, `/experience/`, `/simulations/`, `/journey/`, `/health`, `/sitemap.xml` and `/robots.txt` return 200.

## Not verified

- The production build with a native keyboard. The native check used a development build of the same tree.
- iOS Safari.
- Other Android devices, Android versions and browsers. The inset correction is derived from one phone.
- An installed PWA, and Firefox.
- Landscape orientation on a real device.
- Maximize, minimize and close with a native keyboard open (covered in simulation only).
- The appearance of other pages after the release; only their status codes were checked.

## Out of scope for item 10

- The `man` and `top` overlays are still sized with `100vh` and are not fitted to the keyboard.
- Review items 8 (input glow) and 9 (control wording) are untouched on desktop; on phones the controls are now icons.

## Evidence

Device measurement records, the device screenshot and the production check outputs are kept locally, outside this repository. The run numbers, commit hashes and image digests above can be checked against the repository's Actions history and PR #67.
