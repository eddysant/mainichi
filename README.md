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
3. **Build the sentence** — tap the words into order. The first 25 days use the
   hand-written sentences in order, because they are a grammar syllabus: は before を
   before へ, each one introducing the next piece. After that the round draws on 389
   puzzles generated from the example sentences, so it only ever asks you to build a
   sentence out of a word you have already met — and met on an earlier day, not this
   morning, which makes the round consolidation rather than a preview. Played puzzles
   are remembered, so none comes round again until all of them have.

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

**Every tenth day there is a flashback**, at the end of the run: ten questions across
all four streams, drawn from the last ten days’ new material rather than from the review
schedule. It sweeps the block you have just lived through whether it was due or not. No
clock — the catch-up and the lightning round are both speed, and a third fast round
would say the only thing that matters is answering quickly. Each answer shows the word
in a sentence. Its points are added to the score but *not* to the maximum, so a tenth
day can only ever be worth more than an ordinary one.

Every seventieth day both review rounds fall due at once. The flashback covers the same
ground and is the larger of the two, so the catch-up stands down rather than stacking.

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
25 hand-written sentences, 389 generated sentence puzzles and 28 grouping puzzles —
387 days of new material before it becomes review-only.

**Example sentences.** Every word carries one — all 387 words and all 75 loanwords, 462
in total, with no two sharing a sentence. A gloss says what a word points at; only a
sentence says what it does — 好き takes が and not を, a hat is かぶる but trousers are はく,
medicine is drunk, and no English equivalent will ever tell you that. 49 of them carry
a note saying so, the ones where the English alone would mislead. They appear twice: on the card where the word is first met, and again
on the day’s done card, which is read without a clock running. Characters have none,
because a character is not used in a sentence, it is spelled with.

Coverage is complete and the checker now holds it there: a word added without a sentence
fails the check, because it would be taught as a bare gloss.

## Where the sentence puzzles come from

`tools/make-tiles.js` turns the example sentences into round-three puzzles and writes
`tiles.js`. Japanese is written without spaces, so the tiles have to be recovered by
parsing, and the danger is not failing to parse — it is parsing confidently and wrongly.
くるまでいきます ("I go by car") also reads as くる・まで・いき ("came-until-go"), and a
wrong split in the one round whose whole job is word order would teach the opposite of
the truth.

So the tool never guesses. A sentence earns a puzzle only when exactly **one**
grammatically valid parse exists; ambiguity is a rejection. Uniqueness alone is not
enough, because it still accepted そら・は・あお・い・です — い is the stem of いる, and
いです is not Japanese. So every generated form carries the shape it is (dictionary form,
polite stem, て-form, past adjective) and every ending states which shapes may precede
it: ます takes a stem, ください and います take a て-form, です takes a noun or an
adjective and never a verb stem. Two particles may not sit side by side, since をの is a
parse and not a sentence.

**The ending cannot be settled before the parse.** ねこがいます is ねこ・が・い + ます,
while こまっています is こまって + います: the same characters split two ways, and only a
successful parse of what comes before can say which. Taking the longest ending first got
it wrong in both directions — it ate the て that a verb's own て-form supplies, and it
would have taken います off ねこがいます and left a dangling particle. So every possible
ending is tried and they all feed one uniqueness test.

**Fewest tiles decides between valid parses**, because a whole word beats the same
characters in pieces: はなします is はなし・ます, not はな・し・ます. That tie-break is only
safe once the shape rules are in place — it is what made くる・まで・いき win on an
earlier attempt, when nothing yet refused a dictionary-form verb mid-sentence. A tie is
still a rejection.

**Conjugation class comes from the word's own example sentence.** A る verb could be
either class, and the difference matters: 知る is godan, so its polite form is 知ります
and a stem of し is not a form of it at all — which is what made it collide with する and
cost every noun+します compound. Nothing in the word list says which class a verb is in,
but its sentence does, since the checker guarantees the sentence contains it: 知る's
reads しっています, and って is godan.

Two compounds are licensed by name: a noun in front of する is one verb (勉強 + します),
and a て-form hands straight on to another verb (かさを もって いきます) — the one place a
verb may stand mid-sentence, and the round labels it as the て form and says so when you
tap the wrong tile into that slot. An adjective in front of its noun and a time or adverb word opening the
sentence are the two things allowed to stand without a particle, and they are named in
a list rather than inferred — relaxing the rule instead cost 60 puzzles and four times
the ambiguity.

Part of speech comes free from the glosses: every verb and only a verb is glossed
"to ...", and an い-adjective is the one written with its い in the kanji face, which
先生 is not.

389 of the 462 sentences earn a puzzle. The 73 rejects are listed by
`node tools/make-tiles.js -v`, and they are a to-do list rather than a bug: nearly all
of them now need a word the curriculum does not teach — そらはあおいです needs 青い and
the set has only 青; others need 降る, つける, かぶる, 取る — so the fix is to the
vocabulary, not to the parser. Three are two sentences joined by だから, でも or それから,
which would need a tile for the full stop between them.

`tools/check-content.js` re-tests all of it against the committed `tiles.js` rather
than trusting the tool that wrote it: the tiles must rejoin to the exact sentence they
came from, every role must be one the round can describe in words, and no puzzle may
open with a particle or put two in a row — which is what a bad parse looks like.

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
| `tiles.js` | **generated** — round-three tile puzzles; run `tools/make-tiles.js` after editing `content.js` |
| `content.js` | the whole curriculum — hiragana, katakana, loanwords, kanji words, sentences, grouping puzzles |
| `_head.html` | title, styles, markup |
| `_game.js` | game logic, spaced repetition, streak, storage |
| `_standalone-head.html`, `_standalone-foot.html`, `_sw.js` | the PWA wrapper and offline shell |
| `build.sh` | builds both targets |
| `tools/make-tiles.js` | generates `tiles.js` from the example sentences |
| `.claude/launch.json` | dev-server config, so the editor can serve `docs/` on port 4175 |
| `tools/check-content.js` | validates the content set and the generated tiles — run after editing `content.js` |
| `index.html` | single-file build for publishing as a Claude artifact |
| `docs/` | the standalone site GitHub Pages serves |

Edit the sources, run `node tools/make-tiles.js && node tools/check-content.js && ./build.sh`,
commit. Everything in `tiles.js`, `index.html` and `docs/` is generated.

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

`.claude/launch.json` does the same on port 4175 for editors that read it. Its path is
relative, so run it from the project root.
