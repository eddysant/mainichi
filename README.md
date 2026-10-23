# Mainichi 毎日

A daily Japanese micro-puzzle. One run is three rounds and about fifty seconds:

1. **Find the thread** — five words turn over one at a time; name what they share.
2. **Recall** — two new characters, plus whatever spaced repetition says is due.
3. **Build the sentence** — tap the words into order.

Play it: **https://eddysant.github.io/mainichi/** — add it to your home screen and it
runs full screen and offline.

## How the schedule works

Lessons advance by *plays*, not by calendar date, so a missed day never skips material —
it only breaks the streak. Review gaps are 1, 1, 2, 4, 8, 16, 32, 64, 120 plays; a wrong
answer drops the item back to the first gap.

The content set carries 46 hiragana, 81 N5 words, 25 sentences and 20 grouping puzzles —
81 days of new material before it becomes review-only.

## Layout

| path | what it is |
| --- | --- |
| `content.js` | the whole curriculum — kana, words, sentences, grouping puzzles |
| `_head.html` | title, styles, markup |
| `_game.js` | game logic, spaced repetition, streak, storage |
| `_standalone-head.html`, `_standalone-foot.html`, `_sw.js` | the PWA wrapper and offline shell |
| `build.sh` | builds both targets |
| `index.html` | single-file build for publishing as a Claude artifact |
| `docs/` | the standalone site GitHub Pages serves |

Edit the sources, run `./build.sh`, commit. Everything in `index.html` and `docs/` is generated.

## Storage

On GitHub Pages progress is kept in `localStorage`. Published as a Claude artifact it
also syncs to your Claude account, so it follows you between devices.

**On iOS, add it to your home screen.** Safari clears site data for ordinary websites
after about a week of not visiting; installed home-screen apps are exempt, and the
streak is the whole point.

## Local development

```sh
./build.sh && python3 -m http.server 4174 --directory docs
```
