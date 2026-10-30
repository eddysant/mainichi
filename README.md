# Mainichi 毎日

A daily Japanese micro-puzzle. Five rounds, about ninety seconds, one day at a time.

**Play it: https://eddysant.github.io/mainichi/**

Add it to your home screen and it runs full screen and offline. On iOS you should:
Safari clears site data for ordinary websites after about a week away, installed
home-screen apps are exempt, and the streak is the whole point.

## The day

1. **Find the thread** — five words turn over one at a time; name what they share.
2. **Recall** — today's new items first, then whatever is due for review. Everything is
   asked both ways round, so a kanji word comes up for its meaning and for its reading,
   and the card that teaches it says so. Get one wrong and it opens up to be read
   properly, then comes back before the round ends.
3. **Build the sentence** — tap the words into order. The tiles show only Japanese; the
   English appears when you tap a wrong one, which is where the teaching happens.
4. **Write it from memory** — one word a day, spelled on a two-tap kana keyboard with no
   options to pick from. A wrong kana is refused where you tap it.
5. **Hear it** — the word is spoken by the device's Japanese voice and you pick it from
   words chosen for sounding close. Opens at a 21-day streak, or day 75.

Three extra rounds drop in on their own schedule: a six-second **catch-up** every seventh
day, which asks the things nearest the edge of forgetting rather than the things due
today; a **flashback** every tenth day sweeping the block you have just lived through; and
a **lightning round** you earn by scoring 85% or better three days running. The last two
add to your score but not to the maximum, so they are pure upside.

Each round gets a card explaining it the first time it appears, and the start screen lists
the locked ones with the day they open — the thing you are building towards is visible
from day one. **Everything you've met** is a tap away from the start screen, from the
day's card, and from any answer you got wrong: the whole list, each item opening to its
example sentence and when it comes round next.

## It teaches as fast as it can keep taught

The day takes as much new material as the review queue can carry — four items when you
are on top of it, two when you are behind, none when the backlog is deep, and it tells
you which. The recall round grows a little on the days you have ground to make up.

This is the one thing worth knowing about how it behaves: it would rather teach you one
word a day that stays learned than four a day that quietly rot. Nothing in the schedule
ever goes more than a fortnight past its review date, and a wrong answer no longer sends
an item back to the very beginning — it drops a couple of steps and comes round soon.

## Streaks

Lessons advance by plays, not by dates, so a missed day never skips material. It does
break the streak — unless you have a freeze: one is earned every ten days played and you
can hold three. Frozen days show as 雪 in the seven-day row instead of the 日 seal.

## Privacy

No cookies, no tracking, no analytics. One `localStorage` key holds your progress, and
clearing site data erases it. Exactly one request leaves for a third party — the Google
Fonts stylesheet — and GitHub keeps its own server logs, as any host does.

## Contents

46 hiragana, 46 katakana, 75 loanwords and 415 kanji words, each with its own example
sentence, plus 490 sentence puzzles and 28 grouping puzzles — 582 items in all, which at
the rate it hands them out is a long way further than it sounds.

## Development

```sh
./build.sh && python3 -m http.server 4174 --directory docs
```

Edit `content.js` to change the material, then:

```sh
node tools/make-tiles.js && node tools/check-content.js && ./build.sh
```

`tiles.js`, `index.html` and `docs/` are generated — don't hand-edit them.
[CLAUDE.md](CLAUDE.md) has the architecture and the reasoning behind the parts that look
arbitrary.
