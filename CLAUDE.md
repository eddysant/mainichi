# Mainichi — notes for agents

A daily Japanese micro-puzzle, built as vanilla JS in an IIFE with no dependencies and
no backend. `README.md` is the human-facing description; this file is the brief: how to
work on it, and the reasoning behind the parts that look arbitrary.

## Working on it

```sh
node tools/make-tiles.js && node tools/check-content.js && ./build.sh
```

Run that after touching `content.js`, and commit the generated files with the source.
`tiles.js`, `index.html` and everything in `docs/` are generated — never hand-edit them.

| path | what it is |
| --- | --- |
| `content.js` | the whole curriculum — hiragana, katakana, loanwords, kanji words, sentences, grouping puzzles. The one file to edit to change material. |
| `_game.js` | game logic, spaced repetition, streak, storage |
| `_head.html` | title, styles, markup |
| `tiles.js` | **generated** — round-three tile puzzles |
| `_legacy-ids.js` | **frozen** — the old positional curriculum order, for migrating `v:1` saves; never regenerate, never reorder |
| `tools/make-tiles.js` | generates `tiles.js` from the example sentences |
| `tools/check-content.js` | validates the content set *and* the generated tiles |
| `_standalone-head.html`, `_standalone-foot.html`, `_sw.js` | the PWA wrapper and offline shell |
| `build.sh` | builds both targets: single-file `index.html` for the Claude artifact, `docs/` for GitHub Pages |
| `.claude/launch.json` | dev-server config, serving `docs/` on port 4175; its path is relative, so run from the project root |

Two live targets: **https://eddysant.github.io/mainichi/** and the private Claude
artifact **https://claude.ai/artifact/FwKif2pUHtcNjvyPJiaiWb**. Both need republishing.

The content set carries 46 hiragana, 46 katakana, 75 katakana loanwords, 415 words,
25 hand-written sentences, 490 generated sentence puzzles and 28 grouping puzzles —
415 days of new material before it becomes review-only.

## Item ids, and why the curriculum can be edited

An item's id is the item itself: `w水`, `kあ`, `vコーヒー`. It used to be the position in
the array — `w0`, `w200` — and that quietly made the whole curriculum append-only.
Inserting 降る beside the other verbs shifted every id after it, so every saved review
schedule from that point on pointed at a different word: something mastered would come
back as new, and something never seen would be treated as scheduled. Appending instead
kept saves intact but put a word needed by day 20's example sentence at day 390.

So faces are the identity. They are unique within each stream and `check-content.js`
enforces it, because a repeated face would be two items sharing one schedule. Where an
item sits in the curriculum is still needed — the flashback means "the last ten days" —
but that is *ordering*, looked up when wanted, and it is no longer identity.

`_legacy-ids.js` holds the curriculum order as it stood under the old scheme. It is the
only record of what `w200` meant, so it is frozen. A save still marked `v:1` is remapped
through it once, on load, and rewritten as `v:2`. Every load also drops ids that name
nothing in the current content set, so removing a word can no longer leave a schedule
pointing at something that is not there.

**Where a new word goes.** Not at the end, and not next to a relative: a word is
inserted immediately before the earliest existing word whose sentence uses it, so it is
always taught before it is shown. Anchoring by topic instead put 浴びる on day 2 and
調べる on day 6, ahead of 猫 and 本.

## How the schedule works

Lessons advance by *plays*, not by calendar date, so a missed day never skips material —
it only breaks the streak. Review gaps are 1, 1, 2, 4, 8, 16, 32, 64, 120 plays; a wrong
answer drops the item back to the first gap. Schedule entries are `{box, due, seen}` —
the field is `box`, never `b`.

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

## Example sentences

Every word carries one — all 415 words and all 75 loanwords, 490 in total, with no two
sharing a sentence. A gloss says what a word points at; only a sentence says what it
does — 好き takes が and not を, a hat is かぶる but trousers are はく, medicine is drunk,
and no English equivalent will ever tell you that. 49 of them carry a note saying so, the
ones where the English alone would mislead. Characters have none, because a character is
not used in a sentence, it is spelled with.

Coverage is complete and the checker holds it there: a word added without a sentence
fails the check, because it would be taught as a bare gloss.

## Why the wrong answers are the ones they are

Every round but the writing round shows you the answer somewhere on the screen, so the
wrong answers decide whether a question measures anything. They used to be drawn
uniformly at random, and that quietly made the day guessable: **96% of questions carried
no near-miss at all**, and for kanji words **the right answer was the only option the
learner had ever seen 72% of the time**. So a day could be scored 16/16 by spotting which
word came up on today's card — and because a correct answer advances the review box, each
lucky guess pushed that word from tomorrow out to two plays, then four, then eight. The
score was lying to the schedule, which is the worst thing it could do: it removed from
the rotation exactly the words that had not been learned.

Two rules fix it. Options are drawn from **what the learner has already met**, so being
the only familiar word on screen is no longer a cue. And they are chosen for being
**close to the answer**: kana that look alike (ツ/シ, あ/お) or share a consonant or a
vowel, words from the same grouping category or of the same kind, readings scored by the
same soundalike function the listening round uses.

**Both rules had to be applied three times, because a fix to one round is not a fix to
the others — grep for the other callers.** The rounds that only come round on certain days
had never been played. The listening round drew its options from the whole word set and
scored equal length as a resemblance worth three points, which put every two-mora word in
contention: だれ scored 132 words alike, so the round offered ねこ and いぬ against it, and
56% of a day-75 learner's options were words never met. Sharing no kana with the answer
now scores zero, and the options come from met words first. The catch-up and the
lightning round picked their single wrong answer uniformly at random, so on day seven the
catch-up asked 猫 against "to begin", a word from day 340. With two options an unmet
answer is not a distractor but a pointer at the other one; they now use the same scored,
met-first pool as round two.

Recognition still cannot prove recall, which is why one word a day is spelled out with
nothing on screen to recognise. Writing used to be gated behind a streak, until the gate
turned out to be the mistake: a day of guessing right feels like learning and is not, so
the round that cannot be guessed is the one that should never have waited.

The listening round stays shut until the habit is there, because it needs a device voice
and would be a reason to quit on day three. The streak it checks is the *best* one, never
the current one: a round earned by three weeks of showing up should not slam shut again on
the first day missed.

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
it: ます takes a stem, ください and います take a て-form, です takes a noun or an adjective
and never a verb stem. Two particles may not sit side by side, since をの is a parse and
not a sentence.

**The ending cannot be settled before the parse.** ねこがいます is ねこ・が・い + ます,
while こまっています is こまって + います: the same characters split two ways, and only a
successful parse of what comes before can say which. Taking the longest ending first got
it wrong in both directions. So every possible ending is tried and they all feed one
uniqueness test.

**Fewest tiles decides between valid parses**, because a whole word beats the same
characters in pieces: はなします is はなし・ます, not はな・し・ます. That tie-break is only
safe once the shape rules are in place — it is what made くる・まで・いき win on an earlier
attempt, when nothing yet refused a dictionary-form verb mid-sentence. A tie is still a
rejection.

**Conjugation class comes from the word's own example sentence.** A る verb could be
either class, and the difference matters: 知る is godan, so its polite form is 知ります and
a stem of し is not a form of it at all — which is what made it collide with する and cost
every noun+します compound. Nothing in the word list says which class a verb is in, but
its sentence does, since the checker guarantees the sentence contains it: 知る's reads
しっています, and って is godan.

**Licensing is by name, not by inference.** A noun in front of する is one verb (勉強 +
します), and a て-form hands straight on to another verb (かさを もって いきます) — the one
place a verb may stand mid-sentence. Adjectives before their noun, time words, adverbs,
counters, pre-noun words and connectors are the things allowed to stand without a
particle after them, and each is listed rather than inferred: relaxing the rule instead
cost 60 puzzles and four times the ambiguity.

Part of speech comes free from the glosses: every verb and only a verb is glossed
"to ...", and an い-adjective is the one written with its い after a kanji, which 先生 is
not. That last rule needed one correction: a word written in kana alone that happens to
end in い is not an い-adjective, so におい was being called one, and きれい — a な-adjective
— along with it. Calling a noun an adjective both mislabels the tile and licenses it to
stand in front of a noun, which is how a mis-split gets through. The two genuine
kana-only adjectives, やさしい and おいしい, are named in a list; a な-adjective is labelled
by the な that follows it.

**ください and the progressive います are separate tiles**, not inflection riding on the
verb, because the て form before them is the whole lesson. Merging them left こまっています
as a single tile with no order to get right. ください may also follow a noun or a particle,
since はんぶんください and あついコーヒーをください are whole requests with no verb in them.

**When coverage jumps, audit before believing it.** 100% coverage is also what a weakened
rule looks like. The audit of the last pass found a wrong puzzle that had been shipping
since long before it: はじめてにほんへいきます was tiled as はじめて|に|ほん|へ|いきます,
cutting 日本 in half and glossing ほん as "book". It survived because はじめて was not in
the adverb list, so the correct four-tile parse was invalid and the five-tile mis-split
was the only one left standing. An unlicensed word does not merely lose a sentence; it can
hand the prize to a mis-parse. The checker now enforces that no run of tiles may spell a
word the curriculum teaches, with the one genuine coincidence named by hand (つくえのうえ
にほんがあります is "a book on the desk", where に + ほん really is the right split).

Rejects have unrelated causes — classify them before fixing. The last 37 were five
separate things: six words the sentences used and the curriculum never taught; a dozen
adverbs and time words the parser would not let stand bare; six function-word entries
duplicating real curriculum words, so every sentence using one parsed twice over with two
different glosses and was thrown out as *two readings*; counters and pre-noun words; and
three sentences joined by だから, でも or それから, which now earn a puzzle with a tile for
the full stop between the clauses.

## Validation by re-derivation

`tools/check-content.js` re-tests the committed `tiles.js` rather than trusting the tool
that wrote it: the tiles must rejoin to the exact sentence they came from, every role must
be one the round can describe in words, no puzzle may open with a particle or put two in a
row, and no run of tiles may spell a curriculum word.

It validates the content set the same way: every word's romaji is re-derived from its kana
and compared, readings and meanings must be unique (two words sharing a reading would make
a listening question unanswerable), every reading must be typeable on the round-four
keyboard, every grouping answer must exist as a selectable category, and every example
sentence must contain the word it illustrates — its stem counts, since a conjugated verb
never contains its dictionary form, and 来る and する are named outright because they
change stem completely.

## Verification

The rounds that only come round on certain days are the ones that carry bugs, so drive
them in the browser rather than reasoning about them: seed `localStorage` for the day you
want, unregister the service worker, clear caches, drive the DOM with JS, and hard-reload
with `?v=Date.now()` to defeat caching. Clear the seed afterwards. A seeded save that
behaves oddly is usually the seed — check the field names against `_game.js` before
believing you have found a defect.

## No backend

There is none, deliberately, and that is why the reminder is a downloadable calendar file
rather than a push notification. Real web push would need a server to hold subscriptions
and a key pair; it has been offered and not accepted. Do not add it unprompted.

Exactly one request goes to a third party: the Google Fonts stylesheet. A German court
held in 2022 that embedding it without consent breaches the GDPR. For a personal site with
one user it is academic; self-hosting the fonts or dropping them for the system stack
already in the font list has been offered and not accepted.

## Offered and not accepted — do not build unprompted

- scaling the writing round with the streak, plus an English→Japanese recall direction
- explicit teach cards for conjugations (negatives, past, て-form)
- real web push via a Cloudflare Worker
- self-hosting or dropping Google Fonts
