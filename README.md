# Mainichi 毎日

A daily Japanese micro-puzzle. Three rounds to start, about ninety seconds:

1. **Find the thread** — five words turn over one at a time; name what they share.
2. **Recall** — eight questions, two from each of four streams: hiragana, katakana,
   katakana loanwords and kanji words. Today's new items first, then whatever spaced
   repetition says is due, then older items of that stream to fill, so the round keeps
   its shape every day. Everything is asked in alternating directions — a character goes
   character→sound then sound→character; a kanji word goes meaning then reading; a
   loanword goes meaning then English→katakana.
3. **Build the sentence** — tap the words into order.

Two more rounds are written but stay shut until the habit is there, because they are
harder and would be a reason to quit on day three:

4. **Write it from memory** (day 50) — spell a word you know on a two-tap gojūon kana
   keyboard. No options. A wrong kana is refused where you tap it, and a wrong mark on
   the right shape says so; after three slips it shows you the next kana and scores zero.
5. **Hear it** (day 75) — the word is spoken by the device's Japanese voice and you pick
   it from words chosen for sounding close. No audio to host and it works offline; if
   the device has no Japanese voice the round is skipped and the card says so, rather
   than playing silence.

Each unlock gets a card explaining the mechanic the first time it appears, and the start
screen lists the locked rounds with the day they open — the thing you are building
towards is visible from day one.

Play it: **https://eddysant.github.io/mainichi/** — add it to your home screen and it
runs full screen and offline.

## How the schedule works

Lessons advance by *plays*, not by calendar date, so a missed day never skips material —
it only breaks the streak. Review gaps are 1, 1, 2, 4, 8, 16, 32, 64, 120 plays; a wrong
answer drops the item back to the first gap.

A word can come up three times in one run once all five rounds are open — recall, writing
and listening — so an item is graded only once per run, and a later failure overrides an
earlier pass. Failing to *write* a word you recognised is the truer signal.

Each day introduces the lowest item of each stream not yet seen — one hiragana, one
katakana, one loanword, one kanji word. Taking the lowest unseen item rather than the one
at the lesson index means a stream added part-way through starts at the beginning rather
than skipping to wherever the learner had got to.

Hiragana has no word stream of its own because it already has one: the kanji words are
drilled in both directions, and the reading direction is hiragana.

The content set carries 46 hiragana, 46 katakana, 52 katakana loanwords, 81 N5 kanji
words, 25 sentences and 24 grouping puzzles — 81 days of new material before it becomes
review-only.

## Layout

| path | what it is |
| --- | --- |
| `content.js` | the whole curriculum — hiragana, katakana, loanwords, kanji words, sentences, grouping puzzles |
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
