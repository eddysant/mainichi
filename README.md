# Mainichi 毎日

A daily Japanese micro-puzzle. Three rounds to start, about ninety seconds:

1. **Find the thread** — five words turn over one at a time; name what they share.
2. **Recall** — eight questions, two from each of four streams: hiragana, katakana,
   katakana loanwords and kanji words. Today's new items first, then whatever spaced
   repetition says is due, then older items of that stream to fill, so the round keeps
   its shape every day. Everything is asked in alternating directions — a character goes
   character→sound then sound→character; a kanji word goes meaning then reading; a
   loanword goes meaning then English→katakana. A word written only in kana IS its own
   reading, so those take the loanword direction too — asking how すぐ is read would be a
   free point.
3. **Build the sentence** — tap the words into order.

**Every seventh day** a fourth round drops in between recall and the sentence: a
**catch-up**, six questions at six seconds each, two answers. It deliberately does not
ask what is due today — round two already does that. It takes the items whose review
falls soonest without being due, which is to say the things nearest the edge of
forgetting: words learned once, got right, and not seen since. It scores like any other
round, and because the clock is the hard part a miss only moves a word back one box
rather than all the way to the start.

Two more rounds are written but stay shut until the habit is there, because they are
harder and would be a reason to quit on day three. They open at a **streak**, with a day
number as the slow road in — whichever comes first. A fourteen-day run is the habit
demonstrated; a day number only measures persistence. The streak checked is the *best*
one, never the current one: a round earned by two weeks of showing up should not slam
shut again on the first day missed.

4. **Write it from memory** (14-day streak, or day 50) — spell a word you know on a two-tap gojūon kana
   keyboard. No options. A wrong kana is refused where you tap it, and a wrong mark on
   the right shape says so; after three slips it shows you the next kana and scores zero.
5. **Hear it** (21-day streak, or day 75) — the word is spoken by the device's Japanese voice and you pick
   it from words chosen for sounding close. No audio to host and it works offline; if
   the device has no Japanese voice the round is skipped and the card says so, rather
   than playing silence.

Each unlock gets a card explaining the mechanic the first time it appears, and the start
screen lists the locked rounds with the day they open — the thing you are building
towards is visible from day one.

There is also a **lightning round**, earned rather than unlocked: score 85% or better
three days running and it appears at the end of the next run. Eight questions, two
options, four seconds each. Its points are added to the score but *not* to the maximum,
so it is pure upside — getting none of them cannot drag the day below what the ordinary
rounds already earned.

Play it: **https://eddysant.github.io/mainichi/** — add it to your home screen and it
runs full screen and offline.

## How the schedule works

Lessons advance by *plays*, not by calendar date, so a missed day never skips material —
it only breaks the streak. Review gaps are 1, 1, 2, 4, 8, 16, 32, 64, 120 plays; a wrong
answer drops the item back to the first gap.

A word can come up three times in one run once all five rounds are open — recall, writing
and listening — so an item is graded only once per run, and a later failure overrides an
earlier pass. Failing to *write* a word you recognised is the truer signal.

The catch-up round is the one exception to a miss resetting an item: it grades softly,
one box back instead of to the start. Six seconds is not long enough for a blank to mean
the word is gone.

Each day introduces the lowest item of each stream not yet seen — one hiragana, one
katakana, one loanword, one kanji word. Taking the lowest unseen item rather than the one
at the lesson index means a stream added part-way through starts at the beginning rather
than skipping to wherever the learner had got to.

Hiragana has no word stream of its own because it already has one: the kanji words are
drilled in both directions, and the reading direction is hiragana.

The content set carries 46 hiragana, 46 katakana, 75 katakana loanwords, 387 words,
25 sentences and 28 grouping puzzles — 387 days of new material before it becomes
review-only.

**Example sentences.** 103 of the words carry one: the words met first, and the ones
whose English gloss misleads on its own. A gloss says what a word points at; only a
sentence says what it does — 好き takes が and not を, and no English equivalent will ever
tell you that. They appear twice: on the card where the word is first met, and again on
the day’s done card, which is read without a clock running.

`tools/check-content.js` validates the whole set: every word's romaji is re-derived from
its kana and compared, readings and meanings must be unique (two words sharing a reading
would make a listening question unanswerable), every reading must be typeable on the
round-four keyboard, every grouping answer must exist as a selectable category, and
every example sentence must contain the word it illustrates — its stem counts, since a
conjugated verb never contains its dictionary form, and 来る and する are named outright
because they change stem completely. Run it after touching `content.js`.

## Streak freezes

One freeze is earned every ten days played, and you can hold three. A missed day spends
one and the streak survives; miss more days than you hold and the streak goes, but the
freezes stay — spending them on a streak that breaks anyway would be taking them for
nothing.

Freezes are settled when the page loads, not on the next play, so the streak you see on
opening the app after a missed day is already the true one. Frozen days show as 雪 in the
seven-day row instead of the 日 seal.

## What it stores, and what leaves the device

No cookies. Nothing is tracked, measured or reported. One `localStorage` key,
`mainichi.v1`, holds the lesson number, the streak, the review schedule and the reminder
time; it is first-party, never read by anything else, and clearing site data erases it.

Exactly one request goes to a third party: the stylesheet from `fonts.googleapis.com`
(and the font files from `fonts.gstatic.com`). That hands Google the visitor's IP
address, which is the only part of this with a GDPR dimension — a German court held in
2022 that embedding Google Fonts without consent breaches the GDPR. For a personal site
with one user it is academic; before sharing it with anyone in the EU, either self-host
the fonts or drop the webfonts for the system stack already in the font list, which on
macOS and iOS means Hiragino and costs nothing.

GitHub serves the site and keeps its own server logs, as any host does. Published as a
Claude artifact, progress also syncs to the Claude account that opens it.

Because there are no cookies and no tracking, no consent banner is required.

## Layout

| path | what it is |
| --- | --- |
| `content.js` | the whole curriculum — hiragana, katakana, loanwords, kanji words, sentences, grouping puzzles |
| `_head.html` | title, styles, markup |
| `_game.js` | game logic, spaced repetition, streak, storage |
| `_standalone-head.html`, `_standalone-foot.html`, `_sw.js` | the PWA wrapper and offline shell |
| `build.sh` | builds both targets |
| `tools/check-content.js` | validates the content set — run after editing `content.js` |
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
