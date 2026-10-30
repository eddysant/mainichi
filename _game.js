(function(){
const $=id=>document.getElementById(id);
const SCREENS=["sc-start","sc-group","sc-teach","sc-recall","sc-build",
  "sc-unlock","sc-write","sc-listen","sc-bonus","sc-done","sc-gloss"];
const show=id=>SCREENS.forEach(s=>{$(s).hidden=(s!==id)});
const DAY=864e5;
const dstr=d=>d.toLocaleDateString("en-CA");
const today=()=>dstr(new Date());
const yesterday=()=>dstr(new Date(Date.now()-DAY));
const esc=s=>String(s).replace(/[&<>]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]));
function shuffle(a){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function pick(a,n){return shuffle(a).slice(0,n)}
const KANJI_NUM=["〇","一","二","三","四","五","六","七","八","九"];
function jaNum(n){ if(n<=10&&n>0)return n===10?"十":KANJI_NUM[n];
  if(n<20)return "十"+KANJI_NUM[n-10];
  if(n<100){const t=Math.floor(n/10),r=n%10;return KANJI_NUM[t]+"十"+(r?KANJI_NUM[r]:"")}
  return String(n)}

/* ---- items ----
   Id prefixes are baked into the saved review schedule, so they stay as they were:
   k = hiragana, t = katakana, w = kanji word, v = katakana loanword.
   Hiragana has no word stream of its own because it already has one — the kanji
   words are drilled in both directions, and the reading direction is hiragana. */
const SCRIPTS=[
  ["k","hiragana",KANA],
  ["t","katakana",KATAKANA],
  ["v","katakana word",KATA_WORDS],
  ["w","kanji",WORDS]
];
/* ---- item ids ----
   An id is the item itself — "w水", not "w0". Array positions made the curriculum
   append-only: inserting a word shifted every id after it, so every saved review
   schedule from that point on silently pointed at a different word, and a mastered word
   would come back as new while an unseen one was treated as scheduled. Faces are unique
   within each stream and checked to be, so they serve as identity. Where an item sits in
   the curriculum is still needed — for "the last ten days" — but that is ordering, and
   ordering is not identity. */
const SETOF={k:KANA,t:KATAKANA,v:KATA_WORDS,w:WORDS};
const IDX={}; Object.keys(SETOF).forEach(p=>{ IDX[p]=new Map(SETOF[p].map((x,i)=>[x[0],i])) });
const idOf=(p,i)=>p+SETOF[p][i][0];
const orderOf=id=>{ const m=IDX[id[0]], i=m&&m.get(id.slice(1)); return i===undefined||i===false?-1:i };
const known=id=>orderOf(id)>=0;
const charItem=(p,script,set)=>i=>
  ({id:p+i,type:"char",script,set,face:set[i][0],kana:"",romaji:set[i][1],en:"the sound “"+set[i][1]+"”"});
const kanaItem=charItem("k","hiragana",KANA);
const kataItem=charItem("t","katakana",KATAKANA);
const wordItem=i=>({id:"w"+i,type:"kanjiword",script:"kanji",set:WORDS,
  face:WORDS[i][0],kana:WORDS[i][1],romaji:WORDS[i][2],en:WORDS[i][3],note:""});
const loanItem=i=>({id:"v"+i,type:"loanword",script:"katakana word",set:KATA_WORDS,
  face:KATA_WORDS[i][0],kana:"",romaji:KATA_WORDS[i][1],en:KATA_WORDS[i][2],note:KATA_WORDS[i][3]||""});
const usageFor=it=>(typeof USAGE==="object"&&USAGE[it.face])||null;
const item=id=>{const n=orderOf(id);
  return id[0]==="k"?kanaItem(n):id[0]==="t"?kataItem(n):id[0]==="v"?loanItem(n):wordItem(n)};
/* ---- how much a day can carry ----
   Review gaps are counted in plays, so every item taught lays a standing demand on the
   round. Four a day entering at the first gap need roughly eleven reviews a day between
   them just to climb out of the low boxes, against the four slots left over once the new
   ones have taken theirs. The queue did not fall behind, it diverged: by day 180, 310
   items were due, 8 were asked, and the oldest was 88 plays overdue. The schedule was
   computing dates the round had no capacity to honour, which is the same as having no
   schedule — and an item first seen on one card and next asked three months later cannot
   be answered, only guessed.
   So intake follows the debt rather than the calendar, and the round grows a little when
   there is debt to clear. Taught slower, everything taught stays answerable: nothing now
   goes more than a fortnight past its date. */
const backlogAt=n=>Object.keys(P.srs).filter(id=>known(id)&&P.srs[id].due<=n).length;
const EASE_AT=8, STOP_AT=20, SLOT_MIN=8, SLOT_MAX=12;
const intakeFor=bl=>bl>=STOP_AT?0:bl>=EASE_AT?2:4;
const slotsFor=bl=>Math.min(SLOT_MAX,SLOT_MIN+2*Math.floor(bl/EASE_AT));
/* The lowest item of each script not yet introduced, rather than the one at the
   lesson index: that way adding katakana part-way through does not skip ア onwards,
   and a schedule that drifts for any other reason heals itself. */
function newToday(at){
  const plays=at==null?(P.plays||0):at;
  const avail=SCRIPTS.map(([p,,set])=>{
    for(let i=0;i<set.length;i++){ const id=idOf(p,i); if(!P.srs[id])return id }
    return null;
  });
  const there=avail.filter(Boolean), take=intakeFor(backlogAt(plays));
  if(take>=there.length)return there;
  /* On a reduced day, the streams that have had the least. Taking the first two in
     SCRIPTS order instead would starve katakana words and kanji for as long as the
     debt lasted, and all four are meant to advance. */
  const got=p=>Object.keys(P.srs).filter(id=>id[0]===p).length;
  return SCRIPTS.map(([p],i)=>[p,i]).filter(([,i])=>avail[i])
    .sort((a,b)=>got(a[0])-got(b[0])||a[1]-b[1])
    .slice(0,take).map(([,i])=>avail[i]);
}

/* ---- the run's rounds ----
   Rounds four and five exist from the start but stay shut until the habit is there.
   Both fill a real gap: everything in rounds one to three is four-option recognition,
   so a day can be passed without ever retrieving anything cold or hearing a word said.
   Two ways in, whichever comes first. `streak` is the real test — a 14-day run is the
   habit demonstrated, where a day number only measures persistence — and it is checked
   against the BEST streak, not the current one: a round earned by two weeks of showing
   up should not slam shut again on the first day missed. `day` stays as the slow road
   for someone who plays often but keeps breaking the run. */
const ROUNDS=[
  {key:"group", day:1,  ja:"一", name:"Find the thread",
   blurb:"Five words appear one at a time — say what they share."},
  {key:"recall",day:1,  ja:"二", name:"Recall",
   blurb:"Today’s new ones and whatever is due — longest on the days you are behind."},
  {key:"build", day:1,  ja:"三", name:"Build a sentence",
   blurb:"Tap the words into order."},
  {key:"write", day:1, ja:"四", name:"Write it from memory",
   blurb:"Spell one word you know on a kana keyboard — no options to choose from.",
   why:"Every other round gives you the answer somewhere on the screen. This one asks you to produce the word with nothing to recognise, which is the only way either of us finds out whether you know it.",
   how:["Tap a consonant row, then a vowel — the gojuon grid, two taps per kana.",
        "゙ and ゚ add the marks; 小 shrinks the last kana to っ or ゃ.",
        "A wrong kana is refused where you tap it, so you never fill in a whole wrong word."]},
  {key:"listen",day:75, streak:21, ja:"五", name:"Hear it",
   blurb:"Pick the word you heard, from words that sound alike.",
   why:"Everything so far has been silent. The hardest part of Japanese on the day you need it is catching a word said at speed.",
   how:["Tap to hear it, as many times as you like.",
        "The wrong answers are chosen for sounding close to the right one.",
        "Needs a Japanese voice on the device; the round is skipped if there is none."]}
];
const open=(r,day)=>day>=r.day||(P.best||0)>=r.streak;
const roundsFor=day=>ROUNDS.filter(r=>open(r,day));
/* What a locked row says. Naming both doors, and the distance to the nearer one, is
   the difference between a round that feels withheld and one that feels earned. */
function lockSay(r,day){
  const best=P.best||0, togo=r.streak-best;
  return "Opens at a "+r.streak+"-day streak, or on day "+r.day+"."
    +(best?" Your best is "+best+" — "+togo+(togo===1?" more day.":" more days."):"");
}
const BONUS_ROUND={key:"bonus",ja:"雷",name:"Lightning",
  blurb:"Eight questions, four seconds each, points on top."};
/* Every seventh day, between recall and the sentence. Not day-gated like the rounds
   above: it has nothing to teach, so it can start as soon as there is anything to
   come back to. */
const RECAP_ROUND={key:"recap",ja:"復",name:"Catch up",
  blurb:"Six quick questions on words you met a while ago.",
  why:"Round two asks what the schedule says is due today. Once a week this goes behind that and pulls back the things nearest the edge of forgetting — words you learned, got right, and have not seen since.",
  how:["Six questions, six seconds each, two answers — quick fire, not a thinking round.",
       "They are the items whose review falls soonest, never today’s new ones.",
       "It scores like any other round, and a miss only moves a word back one step rather than all the way to the start."]};
/* Every tenth day, a look back over the ten just gone — the block you have actually
   been living in, asked again in one sitting. No clock: the catch-up and the lightning
   round are both speed, and a third fast round would say the only thing that matters is
   how quickly you answer. Its points are a bonus, added to the score and not to the
   maximum, so the tenth day can only ever be worth more than an ordinary one. */
const FLASH_ROUND={key:"flash",ja:"回",name:"Flashback",
  blurb:"The last ten days, all of it, in one go — for points on top.",
  why:"Spaced repetition decides what you see by a schedule. Once every ten days this ignores the schedule and sweeps the whole block you have just lived through, due or not.",
  how:["Ten questions across all four streams, taken from the last ten days’ new material.",
       "No clock. Each answer shows the word in a sentence.",
       "The points are on top of the day’s score, never part of it."]};
const roundBy=k=>k==="bonus"?BONUS_ROUND:k==="recap"?RECAP_ROUND
  :k==="flash"?FLASH_ROUND:ROUNDS.filter(r=>r.key===k)[0];

/* ---- progress ---- */
const blank=()=>({v:2,remindAt:null,lesson:0,plays:0,streak:0,best:0,last:null,history:[],srs:{},
  lastRun:null,metRounds:[],freezes:0,freezesEarned:0,frozen:[],recent:[],b3:[]});
let P=blank(), run=null, docRef=null;
const LS="mainichi.v1";
/* A save written when ids were array positions is remapped once, through the frozen
   order in _legacy-ids.js — the only record of what "w200" meant. Then, every load,
   ids that name nothing in the current content set are dropped: without that, deleting
   a word from content.js would leave a schedule pointing at a word that is not there. */
function readyState(raw){
  const p=raw||{};
  if((p.v||1)<2 && typeof LEGACY_ORDER!=="undefined"){
    const fix=id=>{
      const m=/^([ktvw])(\d+)$/.exec(String(id));
      if(!m)return id;
      const face=(LEGACY_ORDER[m[1]]||[])[+m[2]];
      return face?m[1]+face:null;
    };
    const srs={};
    Object.keys(p.srs||{}).forEach(k=>{ const n=fix(k); if(n)srs[n]=p.srs[k] });
    p.srs=srs;
    const arr=a=>Array.isArray(a)?a.map(fix).filter(Boolean):a;
    p.b3=arr(p.b3);
    if(p.lastRun){
      ["newIds","dueIds","wIds","lIds","cIds"].forEach(k=>{ p.lastRun[k]=arr(p.lastRun[k]) });
      if(p.lastRun.sRef){ const n=fix(p.lastRun.sRef); p.lastRun.sRef=n||p.lastRun.sRef }
    }
    p.v=2;
  }
  const srs={};
  Object.keys(p.srs||{}).forEach(k=>{ if(known(k))srs[k]=p.srs[k] });
  p.srs=srs;
  if(Array.isArray(p.b3))p.b3=p.b3.filter(id=>known(id));
  return p;
}
function loadLocal(){try{const r=localStorage.getItem(LS);if(r)return Object.assign(blank(),readyState(JSON.parse(r)))}catch(e){}return null}
function saveLocal(){try{localStorage.setItem(LS,JSON.stringify(P))}catch(e){}}
async function initCloud(){
  try{
    const u=await window.claude?.use?.("user"); if(!u)return false;
    const db=await window.claude?.use?.("db"); if(!db)return false;
    const id=await u.id(); if(!id)return false;
    docRef=db.doc("data/users/"+id+"/progress");
    const s=await docRef.get();
    if(s.exists){const d=s.data();if(d&&typeof d.plays==="number"&&d.plays>=(P.plays||0))P=Object.assign(blank(),readyState(d))}
    return true;
  }catch(e){return false}
}
async function save(){saveLocal();if(docRef){try{await docRef.set(JSON.parse(JSON.stringify(P)))}catch(e){}}}

/* ---- spaced repetition: gaps in days, counted in plays ---- */
const IV=[1,1,2,4,8,16,32,64,120];
function dueIdsAt(n){return Object.keys(P.srs).filter(k=>P.srs[k].due<=n).sort((a,b)=>P.srs[a].due-P.srs[b].due)}
/* A word can now come up three times in one run — recall, writing, listening — and
   grading it each time would move its review date three boxes in a day and bump `seen`
   three times, flipping the question direction. One grade per item per run, and a later
   failure overrides an earlier pass: failing to write a word you recognised is the
   truer signal.
   A miss drops the item two boxes; a soft miss — the catch-up round, where the clock is
   the hard part — only one, because six seconds is not enough time for failing to answer
   to mean the word is gone. Neither sends it back to the start. Resetting to box 0 was
   the arithmetic that broke the schedule: reaching the last gap took eight consecutive
   passes, which at any real accuracy never happens, so items churned forever in the
   one-to-four-play boxes and the queue grew without bound. Dropping back a couple of
   boxes re-tests a lapse within days while leaving an item its history. */
function grade(id,ok,soft){
  const s=P.srs[id]||(P.srs[id]={box:0,due:0,seen:0});
  const down=()=>{s.box=Math.max(0,(s.box||0)-(soft?1:2))};
  if(run){
    run.graded=run.graded||{};
    const prev=run.graded[id];
    if(prev){
      if(ok||prev==="bad")return;
      run.graded[id]="bad";
      down(); s.due=P.plays+IV[s.box];
      return;
    }
    run.graded[id]=ok?"ok":"bad";
  }
  if(ok)s.box=Math.min(IV.length-1,s.box+1); else down();
  s.seen=(s.seen||0)+1;
  s.due=P.plays+IV[s.box];
}

/* ---- round 2 questions ---- */
/* ---- distractors that compete ----
   Wrong answers used to be picked uniformly at random, and that quietly made the whole
   round guessable: 96% of questions carried no near-miss, and for kanji words the answer
   was the only option the learner had ever seen 72% of the time. So the score measured
   which word came up on today's card, not whether it was known — and because a correct
   answer advances the review box, a lucky guess pushed the item out of the schedule.

   Two rules fix it. Options are drawn from what the learner has already met, so being
   the only familiar word is no longer a cue; and they are chosen for being close to the
   answer, so telling them apart needs the thing the question is asking about. */
const LOOKALIKE=[["ツ","シ","ソ","ン"],["あ","お","ぬ","め"],["ね","れ","わ","ゎ"],["は","ほ","ま"],
  ["き","さ","ち"],["る","ろ"],["ル","レ"],["ク","ケ","タ"],["コ","ユ","ヨ"],["フ","ワ","ウ"],
  ["チ","テ"],["ス","ヌ","ズ"],["い","り"],["く","へ"],["せ","ぜ"],["カ","力"],["ニ","コ"],
  ["ハ","ヘ"],["マ","ム"],["ア","マ"],["オ","才"],["ヤ","セ"]];
/* the consonant and the vowel of a romaji syllable: ka -> k, a */
const cons=r=>r.replace(/[aiueo]+$/,""), vow=r=>(r.match(/[aiueo]+$/)||[""])[0];
/* Prefer what the learner has met: a word they have never seen is not a distractor,
   it is a hint. Fall back to the rest only when there is not enough to choose from. */
function metFirst(cands,n,score){
  const met=cands.filter(c=>P.srs[c.id]), rest=cands.filter(c=>!P.srs[c.id]);
  const take=list=>{
    const ranked=list.slice().sort((a,b)=>score(b)-score(a));
    const close=ranked.filter(c=>score(c)>0);
    /* top of the field, then a little randomness so the same three never recur */
    return shuffle(close.length>=n?close.slice(0,Math.max(n,Math.min(close.length,n*2))):ranked.slice(0,n*2));
  };
  const out=take(met).slice(0,n);
  if(out.length<n) out.push.apply(out,take(rest).slice(0,n-out.length));
  return out;
}
/* how nearly two kana could be mistaken for each other */
const charScore=(it,set)=>c=>{
  let sc=0;
  if(LOOKALIKE.some(g=>g.indexOf(it.face)>=0&&g.indexOf(c[0])>=0)) sc+=5;
  if(cons(c[1])===cons(it.romaji)) sc+=3;
  if(vow(c[1])===vow(it.romaji)) sc+=2;
  if(c[1].length===it.romaji.length) sc+=1;
  return sc;
};
/* words are close when they belong to the same theme, or are the same kind of word */
const CAT_OF=(()=>{const m=new Map();
  if(typeof GROUPS!=="undefined")GROUPS.forEach(g=>g.clues.forEach(c=>m.set(c[0],g.answer)));
  return m})();
const kindOf=w=>/^to /.test(w[3]||w[2]||"")?"verb":(/い$/.test(w[0])&&/い$/.test(w[1]||"")?"adj":"noun");
const wordScore=it=>w=>{
  let sc=0;
  const a=CAT_OF.get(w[0]), b=CAT_OF.get(it.face);
  if(a&&b&&a===b) sc+=5;
  if(kindOf(w)===kindOf([it.face,it.kana,it.romaji,it.en])) sc+=2;
  if(Math.abs((w[1]||w[0]).length-(it.kana||it.face).length)<=1) sc+=1;
  return sc;
};
/* an id for the item a raw content row stands for, so metFirst can ask whether it is known */
const rowId=(pre,row)=>pre+row[0];

function mkQ(id){
  const it=item(id), seen=(P.srs[id]||{}).seen||0;
  if(it.type==="char"){
    const pre=it.set===KANA?"k":"t";
    const others=it.set.filter(c=>c[1]!==it.romaji).map(c=>({id:rowId(pre,c),row:c}));
    const near=n=>metFirst(others,n,o=>charScore(it,it.set)(o.row)).map(o=>o.row);
    if(seen%2===0){
      const opts=shuffle([it.romaji].concat(near(3).map(c=>c[1])));
      return{id,q:"Which sound is this?",big:it.face,sub:it.script,subRoman:true,opts,answer:it.romaji,
        grid:true,ja:false,after:it.face+" = "+it.romaji};
    }
    /* The other direction. Recognising a character and producing it are different
       skills, and only this way round catches the pairs that look alike — ツ/シ, ソ/ン. */
    const opts=shuffle([it.face].concat(near(3).map(c=>c[0])));
    return{id,q:"Which "+it.script+" is this sound?",big:it.romaji,roman:true,sub:"",opts,answer:it.face,
      grid:true,ja:true,after:it.romaji+" = "+it.face};
  }
  /* Both word streams ask the meaning on even exposures. They differ on the odd one:
     a kanji word hides its reading, so that is worth asking, but a katakana word IS
     its reading — asking it would be free. Going English → katakana instead makes you
     recall the shape of the word rather than just recognise it. */
  const kanaOnly=it.face===it.kana;
  if(seen%2===0){
    const mean=it.type==="loanword"?w=>w[2]:w=>w[3];
    const pre=it.type==="loanword"?"v":"w";
    const cands=it.set.filter(w=>mean(w)!==it.en).map(w=>({id:rowId(pre,w),row:w}));
    const opts=shuffle([it.en].concat(metFirst(cands,3,o=>wordScore(it)(o.row)).map(o=>mean(o.row))));
    /* a loanword carries no separate reading, so there is no bracket to show: the
       old test asked whether the face WAS the reading, which left "コーヒー ()" */
    const read=it.kana&&it.kana!==it.face?" ("+it.kana+")":"";
    return{id,q:"What does this mean?",big:it.face,sub:kanaOnly?"":it.kana,opts,answer:it.en,
      grid:false,ja:false,
      after:it.face+read+" — "+it.en+(it.note?" · "+it.note:"")};
  }
  /* A word written only in kana IS its own reading, so asking how it is read would be a
     free point. Those take the loanword direction instead: English, and you produce the
     word. Distractors keep the same shape — three kanji next to one kana word would
     give the answer away without anyone reading it. */
  if(it.type==="loanword"||kanaOnly){
    const shape=w=>(w[0]===w[1])===kanaOnly;
    const pool=it.type==="loanword"?it.set:it.set.filter(shape);
    const pre=it.type==="loanword"?"v":"w";
    const cands=pool.filter(w=>w[0]!==it.face).map(w=>({id:rowId(pre,w),row:w}));
    const opts=shuffle([it.face].concat(metFirst(cands,3,o=>{
      const w=o.row; let sc=wordScore(it)(w);
      if(w[0][0]===it.face[0]) sc+=3;
      if(w[0].length===it.face.length) sc+=2;
      return sc;
    }).map(o=>o.row[0])));
    return{id,q:"Which word is this?",big:it.en,gloss:true,
      sub:it.type==="loanword"?"katakana":"hiragana",subRoman:true,
      opts,answer:it.face,grid:true,ja:true,after:it.en+" = "+it.face+" ("+it.romaji+")"};
  }
  /* the soundalike scoring already existed, and was only ever used by the listening
     round — a reading question whose wrong answers sound nothing alike is the same
     mistake it was written to prevent */
  const rc=WORDS.filter(w=>w[1]!==it.kana).map(w=>({id:rowId("w",w),row:w}));
  const opts=shuffle([it.kana].concat(metFirst(rc,3,o=>soundScore(it.kana)(o.row)).map(o=>o.row[1])));
  return{id,q:"How is this read?",big:it.face,sub:"",opts,answer:it.kana,grid:true,ja:true,
    after:it.face+" = "+it.kana+" ("+it.romaji+") — "+it.en};
}

/* ---- everything you have met ----
   There was no way to look anything up. Forget a character and the only route back to
   it was waiting for the round to offer it again and guessing in the meantime, which is
   most of what makes the day feel like trial and error rather than study. The list is
   reachable without starting a run, from the done card, and from a miss.
   It shows what is on the schedule — met items only. Showing the whole curriculum would
   turn a reference into a spoiler, and the sentence under a word uses words that have
   not been taught yet. */
function renderGloss(back){
  show("sc-gloss");
  const met=Object.keys(P.srs).filter(known);
  $("glNote").textContent=met.length
    ? met.length+(met.length===1?" item":" items")+" so far. Tap any one to see it again."
    : "Nothing yet — the first four arrive on day one.";
  const host=$("glBody"); host.innerHTML="";
  SCRIPTS.forEach(([p,script])=>{
    const ids=met.filter(id=>id[0]===p).sort((a,b)=>orderOf(a)-orderOf(b));
    if(!ids.length)return;
    const sec=document.createElement("div");
    const h=document.createElement("h3");
    h.textContent=script+" · "+ids.length;
    sec.appendChild(h);
    const rows=document.createElement("div"); rows.className="rows";
    ids.forEach(id=>{
      const it=item(id), s=P.srs[id], ex=usageFor(it);
      const d=document.createElement("div"); d.className="row gl";
      const a=document.createElement("div"); a.className="l"; a.textContent=it.face;
      const b=document.createElement("div"); b.className="r";
      b.innerHTML=esc(it.en)+" <i>"+esc(it.kana&&it.kana!==it.face?it.kana+" · "+it.romaji:it.romaji)+"</i>";
      d.appendChild(a); d.appendChild(b);
      const det=document.createElement("div"); det.className="gl-det"; det.hidden=true;
      const gap=Math.max(0,(s.due||0)-(P.plays||0));
      det.innerHTML=(ex?'<span class="ja">'+esc(ex[0])+"</span>"+esc(ex[1])+"<br>":"")
        +"<i>"+(gap===0?"due now":"due in "+gap+(gap===1?" day":" days"))
        +" · box "+((s.box||0)+1)+" of "+IV.length+"</i>";
      d.onclick=()=>{det.hidden=!det.hidden};
      rows.appendChild(d); rows.appendChild(det);
    });
    sec.appendChild(rows); host.appendChild(sec);
  });
  $("glBack").onclick=back;
}

/* ---- chrome ---- */
function buildPips(n){
  const box=$("pips"); box.innerHTML="";
  for(let i=0;i<n;i++){
    const d=document.createElement("div"); d.className="pip"; d.id="pip"+i;
    d.appendChild(document.createElement("span")); box.appendChild(d);
  }
}
function pip(i,state){const el=$("pip"+i);if(el)el.className="pip"+(state?" "+state:"")}

/* ---- streak freezes ----
   One earned every ten days played, held three at most. A missed day spends one and the
   streak survives. Settled when the page loads rather than on the next play, so the
   streak you see on opening the app after a missed day is already the true one. */
const FREEZE_EVERY=10, FREEZE_MAX=3;
function earnFreezes(){
  const owed=Math.floor((P.plays||0)/FREEZE_EVERY)-(P.freezesEarned||0);
  if(owed<=0)return 0;
  P.freezesEarned=(P.freezesEarned||0)+owed;
  const before=P.freezes||0;
  P.freezes=Math.min(FREEZE_MAX,before+owed);
  return P.freezes-before;   /* what was earned over the cap is forfeited */
}
function daysBetween(a,b){return Math.round((new Date(b+"T00:00")-new Date(a+"T00:00"))/DAY)}
/* What a freeze did is a fact about this page load, not saved state: it must survive
   settleStreak running again when cloud progress arrives, and must not reappear
   tomorrow. */
let freezeNote=null;
function settleStreak(){
  if(!P.last||!P.streak)return;
  const gap=daysBetween(P.last,today());
  if(gap<=1)return;                     /* played today or yesterday: nothing missed */
  const missed=gap-1;
  if(missed>(P.freezes||0)){
    /* More days missed than freezes held. The streak goes; the freezes stay, because
       spending them on a streak that breaks anyway would be taking them for nothing. */
    P.streak=0; P.last=null; save();
    return;
  }
  P.freezes-=missed;
  P.frozen=(P.frozen||[]).concat(
    Array.from({length:missed},(_,i)=>dstr(new Date(Date.now()-(missed-i)*DAY)))).slice(-60);
  P.last=yesterday();
  freezeNote=missed===1?"A day missed — one freeze spent, and the streak stands."
    :missed+" days missed — "+missed+" freezes spent, and the streak stands.";
  save();
}
function paintStreak(){
  $("streakN").textContent=P.streak||0;
  const h=new Set(P.history||[]), f=new Set(P.frozen||[]), box=$("stamps");
  box.innerHTML="";
  for(let i=6;i>=0;i--){
    const d=dstr(new Date(Date.now()-i*DAY)), s=document.createElement("div");
    s.className="stamp"+(h.has(d)?" on":f.has(d)?" froze":"")+(i===0?" today":"");
    s.textContent=f.has(d)&&!h.has(d)?"雪":"日"; s.title=d+(f.has(d)&&!h.has(d)?" — frozen":"");
    box.appendChild(s);
  }
  const fb=$("freezes"), n=P.freezes||0;
  fb.innerHTML="";
  const lbl=document.createElement("span");
  lbl.className="streak-lbl"; lbl.textContent=n===1?"freeze":"freezes";
  fb.appendChild(lbl);
  for(let i=0;i<FREEZE_MAX;i++){
    const s=document.createElement("div");
    s.className="stamp snow"+(i<n?" on":"");
    s.textContent="雪"; s.title=i<n?"a freeze in hand":"empty";
    fb.appendChild(s);
  }
}
function renderStart(){
  const n=P.lesson+1;
  $("dayN").textContent=n;
  $("dayJa").textContent="第"+jaNum(n)+"日";
  const at=(P.plays||0)+1;
  const nw=newToday(at), newN=nw.length;
  const qn=quizIdsFor(nw,at).length;
  const bl=backlogAt(at), left=SCRIPTS.some(([p,,set])=>!P.srs[idOf(p,set.length-1)]);
  let line;
  const nr=roundsFor(n).length+(recapDay(n)||flashDay(n)?1:0);
  const head=["","One round","Two rounds","Three rounds","Four rounds","Five rounds","Six rounds"][nr]
    +", "+["","half a minute","a minute","a minute and a half","two minutes",
           "two and a half minutes","three minutes"][nr]+". ";
  if(P.plays===0) line=head+"A hiragana, a katakana, a loanword and a kanji word to start.";
  else if(newN) line=head+newN+" new, "+qn+" to recall.";
  else if(left) line=head+qn+" to recall. Nothing new today — "+bl
    +" are waiting for review, and new material resumes once that is down.";
  else line=head+qn+" to recall — no new characters left.";
  $("startLine").textContent=line;
  const fn=$("freezeLine");
  if(freezeNote){ fn.hidden=false; fn.className="note good"; fn.textContent=freezeNote; }
  else if((P.plays||0)>0){
    const held=P.freezes||0, togo=FREEZE_EVERY-((P.plays||0)%FREEZE_EVERY);
    fn.hidden=false; fn.className="note";
    fn.textContent=(held?held+(held===1?" freeze in hand":" freezes in hand")+". ":"No freezes in hand. ")
      +(held>=FREEZE_MAX?"That is the most you can hold.":"Another in "+togo+(togo===1?" day.":" days."));
  } else fn.hidden=true;
  const ul=$("plan"); ul.innerHTML="";
  const row=(r,open,instead)=>{
    const li=document.createElement("li");
    li.className=open?"":"locked";
    li.innerHTML='<span class="k">'+r.ja+'</span><span><b>'+esc(r.name)+'.</b> '
      +(open?esc(r.blurb):esc(instead))+'</span>';
    ul.appendChild(li);
  };
  ROUNDS.forEach(r=>{
    row(r,open(r,n),lockSay(r,n));
    /* the catch-up sits where it will actually be played, and shows on the other six
       days too: the rhythm is easier to keep if you can see it coming */
    if(r.key==="recall")
      row(RECAP_ROUND,recapDay(n)&&!flashDay(n),
        /* only on the day it was actually due and gave way — every seventieth */
        recapDay(n)&&flashDay(n)?"Stood down today — the flashback covers the same ground."
          :"Every seventh day — next on day "+(n+RECAP_EVERY-n%RECAP_EVERY)+".");
  });
  row(FLASH_ROUND,flashDay(n),
    "Every tenth day — next on day "+(n+FLASH_EVERY-n%FLASH_EVERY)+".");
  if(bonusEarned()){
    const li=document.createElement("li");
    li.innerHTML='<span class="k">雷</span><span><b>Lightning.</b> '+esc(BONUS_ROUND.blurb)+'</span>';
    ul.appendChild(li);
  }
  $("go").textContent=P.plays===0?"Start day one":"Start today’s puzzle";
}

/* ---- stepping through the run ----
   Each round ends by calling nextStep(); a round appearing for the first time gets an
   explainer card before it rather than dropping the player into a mechanic they have
   never seen. */
const STEP={group:()=>r1(),recall:()=>teach(),build:()=>r3(),write:()=>r4(),listen:()=>r5(),
  recap:()=>rQF("recap"),flash:()=>rFlash(),bonus:()=>rQF("bonus")};
function nextStep(){
  run.step++;
  const key=run.plan[run.step];
  if(!key)return finish();
  if(key!=="bonus"&&(P.metRounds||[]).indexOf(key)<0)return unlockCard(key);
  STEP[key]();
}
function unlockCard(key){
  const r=roundBy(key);
  P.metRounds=(P.metRounds||[]).concat([key]);
  save();
  show("sc-unlock");
  $("uTitle").textContent=r.name;
  $("uWhy").textContent=r.why||r.blurb;
  const ul=$("uHow"); ul.innerHTML="";
  (r.how||[]).forEach((h,i)=>{
    const li=document.createElement("li");
    li.innerHTML='<span class="k">・</span><span>'+esc(h)+'</span>';
    ul.appendChild(li);
  });
  $("uGo").onclick=()=>STEP[key]();
}

/* ---- round 1: grouping ---- */
function r1(){
  show("sc-group"); pip(0,"live");
  const g=run.g, cells=$("gCells"), rom=$("gRomaji"), box=$("gOpts");
  let revealed=1, wrong=0, solved=false;
  cells.innerHTML=""; rom.innerHTML="";
  g.clues.forEach(()=>{
    const d=document.createElement("div"); d.className="cell";
    d.innerHTML='<span class="ja"></span>'; cells.appendChild(d);
    rom.appendChild(document.createElement("span"));
  });
  function paint(){
    [...cells.children].forEach((d,i)=>{
      if(i<revealed&&!d.classList.contains("filled")){
        d.classList.add("filled","reveal");
        d.querySelector(".ja").textContent=g.clues[i][0];
        rom.children[i].textContent=g.clues[i][1];
      }
    });
  }
  paint();
  $("gTitle").textContent="What do these share?";
  $("gNote").className="note";
  $("gNote").textContent="Guess early for more points. A wrong guess turns over the next word.";
  $("gNext").hidden=true;
  box.className="opts"; box.innerHTML="";
  shuffle([g.answer].concat(pick(CATEGORIES.filter(c=>c!==g.answer),3))).forEach(o=>{
    const b=document.createElement("button");
    b.className="opt"; b.textContent=o;
    b.onclick=()=>{
      if(solved)return;
      if(o===g.answer){
        solved=true; revealed=g.clues.length; paint();
        b.classList.add("right");
        [...box.children].forEach(x=>{x.disabled=true;if(x!==b&&!x.classList.contains("wrong"))x.classList.add("dim")});
        g.clues.forEach((c,i)=>{rom.children[i].textContent=c[2]});
        run.r1=Math.max(1,5-wrong);
        $("gNote").className="note good";
        $("gNote").innerHTML="<b>"+esc(g.answer)+"</b> — "+run.r1+" of 5.";
        $("gNext").hidden=false; pip(0,"done");
      }else{
        wrong++; b.classList.add("wrong"); b.disabled=true;
        if(revealed<g.clues.length){revealed++; paint()}
        $("gNote").className="note bad";
        $("gNote").textContent="Not that. Another word turned over.";
      }
    };
    box.appendChild(b);
  });
  $("gNext").onclick=nextStep;
}

/* ---- teach new items ---- */
function teach(){
  const ids=run.newIds.filter(id=>!P.srs[id]);
  if(!ids.length)return quiz();
  /* Being taught is the event that puts an item on the schedule, so the entry is
     written here rather than by the first grading. That way the round that follows can
     leave the schedule alone: see quiz(). */
  run.fresh={};
  ids.forEach(id=>{ P.srs[id]={box:0,due:(P.plays||0)+IV[0],seen:0}; run.fresh[id]=1 });
  let i=0;
  (function one(){
    if(i>=ids.length)return quiz();
    const it=item(ids[i]);
    show("sc-teach"); pip(run.step,"live");
    $("tNext").hidden=false; $("tLook").hidden=true;
    $("tBadge").textContent="New today · "+it.script
      +(ids.length>1?" ("+(i+1)+" of "+ids.length+")":"");
    $("tBig").textContent=it.face;
    $("tSub").textContent=it.kana; $("tSub").hidden=!it.kana;
    $("tLat").textContent=it.romaji;
    $("tEn").innerHTML="<b>"+esc(it.en)+"</b>"+(it.note?" · "+esc(it.note):"");
    /* First contact is the moment an example is worth most: the gloss says what the
       word points at, the sentence says what it does. Only the word streams have them,
       and only where one is written — no placeholder when there is none. */
    const ex=usageFor(it);
    $("tEx").hidden=!ex;
    if(ex)$("tEx").innerHTML='<span class="ja">'+esc(ex[0])+'</span>'+esc(ex[1]);
    /* Both directions, named. The round asks a character for its sound and then its
       sound for the character, and a word for its meaning and then its reading — and
       the second of each used to arrive cold, with nothing having ever shown it that
       way round. 28% of all questions were the first time that direction had been
       asked. Saying so is not a hint: it is the difference between being tested and
       being ambushed. */
    $("tDirs").textContent=it.type==="char"
      ? "Asked both ways: which sound this is, and which "+it.script+" a sound is."
      : it.type==="loanword"||it.face===it.kana
        ? "Asked both ways: what it means, and which word a meaning is."
        : "Asked both ways: what it means, and how it is read.";
    $("tNext").textContent=i<ids.length-1?"Next":"Try it";
    $("tNext").onclick=()=>{i++;one()};
  })();
}

/* ---- a miss, looked at properly ----
   A wrong answer used to show the right one for 1.9 seconds and move on, which is the
   shape of a test and not of a lesson: the item then left the screen until tomorrow at
   the earliest, and there was nowhere to go and nothing to read. The same card the item
   was taught from comes back instead, with the sentence, and it waits to be dismissed. */
function lookAgain(id,next,last){
  const it=item(id);
  show("sc-teach");
  $("tBadge").textContent="Look again · "+it.script;
  $("tBig").textContent=it.face;
  $("tSub").textContent=it.kana; $("tSub").hidden=!it.kana;
  $("tLat").textContent=it.romaji;
  $("tEn").innerHTML="<b>"+esc(it.en)+"</b>"+(it.note?" · "+esc(it.note):"");
  const ex=usageFor(it);
  $("tEx").hidden=!ex;
  if(ex)$("tEx").innerHTML='<span class="ja">'+esc(ex[0])+'</span>'+esc(ex[1]);
  $("tDirs").textContent=last
    ? "It comes back sooner than it would have, and it is in the list below."
    : "It comes round again before the end of today.";
  $("tNext").hidden=false; $("tNext").textContent="Got it";
  $("tNext").onclick=next;
  $("tLook").hidden=false;
  $("tLook").onclick=()=>renderGloss(()=>lookAgain(id,next));
}

/* ---- round 2: recall ----
   New material first, then the most overdue, and the round is as long as the debt
   needs. A flat two per stream kept the day a tidy shape and made the backlog
   undrainable: a stream behind by thirty items could not borrow a slot from a stream
   that was straight, so both stayed where they were. One slot per stream is enough to
   keep the day varied; the rest goes where it is owed. */
function quizIdsFor(nw,plays){
  const slots=slotsFor(backlogAt(plays)), out=nw.slice(0,slots);
  const due=dueIdsAt(plays).filter(id=>known(id)&&out.indexOf(id)<0);
  SCRIPTS.forEach(([p])=>{
    if(out.length>=slots)return;
    const first=due.find(id=>id[0]===p&&out.indexOf(id)<0);
    if(first)out.push(first);
  });
  due.forEach(id=>{ if(out.length<slots&&out.indexOf(id)<0)out.push(id) });
  /* Nothing due and nothing new — early days, or a run after a clean sweep. */
  if(out.length<slots)shuffle(Object.keys(P.srs).filter(known))
    .forEach(id=>{ if(out.length<slots&&out.indexOf(id)<0)out.push(id) });
  return out;
}
function quiz(){
  const ids=quizIdsFor(run.newIds,P.plays);
  run.dueIds=ids.filter(id=>run.newIds.indexOf(id)<0);
  /* A question on an item whose card was ten seconds ago is a check the card was read,
     not a memory of it. It still scores — it is a real question — but it must not move
     the schedule, because a pass here would push the item from tomorrow out to the
     second gap before it had ever been asked cold. */
  run.qs=shuffle(ids).map(id=>{const q=mkQ(id); q.fresh=!!(run.fresh||{})[id]; return q});
  run.r2max=run.qs.length; run.r2n=run.qs.length; run.qi=0;
  run.retry=[]; run.retried=false;
  if(!run.qs.length){pip(run.step,"done");return nextStep()}
  nextQ();
}
/* The flashback asks the same kind of question as round two, so it runs on the same
   screen and the same question maker. What differs is where the point lands, and that
   the answer is followed by the word in a sentence. */
function rFlash(){
  const ids=flashIds(FLASH_N);
  if(!ids.length){pip(run.step,"done");return nextStep()}
  run.mode="flash"; run.qs=ids.map(mkQ); run.qi=0; run.flashN=ids.length;
  run.r2n=ids.length; run.retry=[]; run.retried=false;
  nextQ();
}
function nextQ(){
  const flash=run.mode==="flash";
  if(run.qi>=run.qs.length){
    /* Everything missed comes round once more before the round ends — the one place a
       second look costs nothing and is worth everything. Not scored and not graded
       again: the miss already counted, and this is the practice the miss earned.
       Once only, or a bad day would never end. */
    if(!run.retried&&run.retry.length){
      run.retried=true;
      run.qs=run.qs.concat(run.retry.map(q=>
        Object.assign({},q,{opts:shuffle(q.opts),retry:true})));
      run.retry=[];
    }
    if(run.qi>=run.qs.length){
      pip(run.step,"done");
      if(flash)run.mode=null;
      return nextStep();
    }
  }
  const q=run.qs[run.qi], box=$("rOpts");
  show("sc-recall"); pip(run.step,"live");
  $("rEyebrow").textContent=q.retry
    ? "One more look · "+(run.qi+1-run.r2n)+" of "+(run.qs.length-run.r2n)
    : (flash?"Flashback · ":"Round two · recall ")+(run.qi+1)+" of "+run.r2n;
  $("rQ").textContent=q.q;
  $("rBig").textContent=q.big; $("rBig").className="big"+(q.roman?" roman":"")+(q.gloss?" gloss":"");
  $("rSub").textContent=q.sub||""; $("rSub").hidden=!q.sub;
  $("rSub").className="sub"+(q.subRoman?" roman":"");
  $("rNote").textContent=""; $("rNote").className="note";
  box.className="opts"+(q.grid?" grid2":""); box.innerHTML="";
  let answered=false;
  q.opts.forEach(o=>{
    const b=document.createElement("button");
    b.className="opt"+(q.ja?" ja":""); b.textContent=o;
    b.onclick=()=>{
      if(answered)return; answered=true;
      const ok=(o===q.answer);
      [...box.children].forEach(x=>{
        x.disabled=true;
        if(x.textContent===q.answer)x.classList.add("right");
        else if(x===b)x.classList.add("wrong");
        else x.classList.add("dim");
      });
      if(ok&&!q.retry)flash?run.flashGot++:run.r2++;
      /* No clock here, so a miss is a real one and grades like any other — except on
         the two kinds of question that are not tests of memory: the check that a new
         item's card was read, and the second look at something already marked wrong. */
      if(run.scored&&!q.fresh&&!q.retry)grade(q.id,ok);
      $("rNote").className="note "+(ok?"good":"bad");
      $("rNote").textContent=q.after;
      /* The whole point of a look back is seeing the word do its job again. */
      const ex=flash?usageFor(item(q.id)):null;
      if(ex){
        const d=document.createElement("span");
        d.className="ja"; d.textContent=" "+ex[0];
        $("rNote").appendChild(d);
      }
      if(ok)return setTimeout(()=>{run.qi++;nextQ()},750);
      /* Long enough to see which one was right, then the card, which waits. */
      if(!q.retry)run.retry.push(q);
      (run.missed=run.missed||[]).indexOf(q.id)<0&&run.missed.push(q.id);
      setTimeout(()=>lookAgain(q.id,()=>{run.qi++;nextQ()},!!q.retry),1100);
    };
    box.appendChild(b);
  });
}

/* ---- which sentence round three gets ----
   The 25 hand-written sentences come first, in their own order, because they are a
   grammar syllabus: は before を before へ, each introducing the next piece. After that
   the round draws on tiles.js, generated from the example sentences, so it can only
   offer a sentence built from a word the learner has met — and met on an earlier day,
   not this morning, which makes the round consolidation rather than a preview. Played
   puzzles are remembered, so none comes round again until all of them have. */
const bPool=()=>typeof BUILD!=="undefined"?BUILD:[];
const handRef=i=>"h"+i;
function sentFor(ref){
  const r=String(ref==null?"h0":ref);
  if(r.charAt(0)==="h") return SENTENCES[(+r.slice(1)||0)%SENTENCES.length];
  return bPool().find(b=>b.id===r)||SENTENCES[0];
}
function pickSent(l){
  if(l<SENTENCES.length) return handRef(l);
  /* An item joins the schedule when its card is shown, so "has an entry" no longer
     means "met on an earlier day" — a word taught this morning would now qualify and
     turn the round from consolidation into a preview. The first cold answer is what
     counts, and `seen` is exactly that: the same-run check of a new card does not
     raise it. */
  const done=P.b3||(P.b3=[]), met=b=>(P.srs[b.id]||{}).seen>0;
  let pool=bPool().filter(b=>met(b)&&done.indexOf(b.id)<0);
  /* Everything available has been played: start the cycle again rather than stop. */
  if(!pool.length){ P.b3=[]; pool=bPool().filter(met); }
  return pool.length?pool[0].id:handRef(l%SENTENCES.length);
}

/* ---- round 3: build ----
   The old version hid the word meanings AND the word order, so the only strategy
   left was permuting until it turned green. Now every tile carries its meaning,
   every slot states the job it wants, and a wrong tap is refused on the spot with
   the reason — which is where the grammar actually gets taught. */
function r3(){
  show("sc-build"); pip(run.step,"live");
  const s=run.sent, T=s.tiles, slots=$("bSlots"), tray=$("bTray");
  let at=0, slips=0, done=false;
  $("bEn").textContent=s.en;
  $("bPattern").textContent=s.pattern;
  $("bWhy").className="note"; $("bWhy").textContent=s.note;
  $("bNote").className="note"; $("bNote").textContent="Tap each word into the slot that wants it.";
  $("bDone").hidden=true;
  slots.innerHTML=""; tray.innerHTML="";

  const slotEls=T.map((t,i)=>{
    const d=document.createElement("div"); d.className="sl";
    const l=document.createElement("div"); l.className="lbl"; l.textContent=t[2];
    const box=document.createElement("div"); box.className="box";
    box.onclick=()=>undo(i);
    d.appendChild(l); d.appendChild(box); slots.appendChild(d);
    return d;
  });

  const tiles=shuffle(T.map((t,i)=>i)).map(i=>{
    const t=T[i], b=document.createElement("button");
    b.className="tile"; b.type="button"; b.dataset.idx=i;
    const j=document.createElement("span"); j.textContent=t[0]; b.appendChild(j);
    /* The English stays hidden until a wrong tap. With every tile glossed and every slot
       labelled, the puzzle could be solved by matching "water" to "object" without
       reading any Japanese — so the gloss arrives where the teaching already happens. */
    if(t[1]){const g=document.createElement("span"); g.className="g"; g.textContent=t[1];
      g.hidden=true; b.appendChild(g)}
    b.onclick=()=>place(b,i);
    tray.appendChild(b);
    return b;
  });
  const tileFor=i=>tiles.find(b=>Number(b.dataset.idx)===i);
  const markNext=()=>slotEls.forEach((d,i)=>d.classList.toggle("next",i===at&&!done));
  const says=r=>ROLE_SAY[r]||r;

  const showGlosses=()=>tray.querySelectorAll("span.g").forEach(g=>{g.hidden=false});
  function place(btn,i){
    if(done||btn.classList.contains("used"))return;
    if(i!==at){
      slips++;
      showGlosses();
      btn.classList.add("bad");
      setTimeout(()=>btn.classList.remove("bad"),340);
      const got=T[i], gotP=PARTICLES[got[0]], wantP=PARTICLES[T[at][0]];
      $("bNote").className="note bad";
      /* A particle tapped where a word belongs is the commonest slip, and the
         useful thing to say is that particles follow what they mark. */
      $("bNote").textContent = (gotP && !wantP)
        ? gotP+(got[0]==="か"?"":" It goes after the word it marks, never before.")
        : "This slot takes "+says(T[at][2])+". "+(gotP||got[0]+" is "+says(got[2])+".");
      return;
    }
    btn.classList.add("used");
    slotEls[at].classList.add("filled");
    slotEls[at].querySelector(".box").textContent=T[at][0];
    at++; markNext();
    if(at===T.length){
      done=true;
      run.r3=slips===0?3:slips<=2?2:1;
      /* Spent only once it has actually been played through. */
      if(String(run.sRef).charAt(0)!=="h"&&(P.b3||(P.b3=[])).indexOf(run.sRef)<0) P.b3.push(run.sRef);
      $("bNote").className="note good";
      $("bNote").textContent=slips===0?"First try — 3 of 3."
        :slips<=2?"Two slips or fewer — 2 of 3."
        :"1 of 3. The pattern is the thing to take away.";
      $("bDone").hidden=false;
      pip(run.step,"done");
    }else{
      $("bNote").className="note";
      $("bNote").textContent="Next: "+says(T[at][2])+".";
    }
  }

  function undo(i){
    if(done||i!==at-1)return;
    at--;
    slotEls[at].classList.remove("filled");
    slotEls[at].querySelector(".box").textContent="";
    tileFor(at).classList.remove("used");
    markNext();
    $("bNote").className="note"; $("bNote").textContent="Taken back.";
  }

  markNext();
  $("bDone").onclick=nextStep;
}

/* ---- round 4: write it from memory ----
   The first round that asks for production. No options: you spell the reading out on a
   kana keyboard, and a wrong kana is refused at the tap, so you never fill in a whole
   wrong word and then get told. */
const KROWS=[
  ["あ","あいうえお"],["か","かきくけこ"],["さ","さしすせそ"],["た","たちつてと"],["な","なにぬねの"],
  ["は","はひふへほ"],["ま","まみむめも"],["や","やゆよ"],["ら","らりるれろ"],["わ","わを"],["ん","ん"]
];
const DAKU={"か":"が","き":"ぎ","く":"ぐ","け":"げ","こ":"ご","さ":"ざ","し":"じ","す":"ず","せ":"ぜ","そ":"ぞ",
  "た":"だ","ち":"ぢ","つ":"づ","て":"で","と":"ど","は":"ば","ひ":"び","ふ":"ぶ","へ":"べ","ほ":"ぼ"};
const HANDAKU={"は":"ぱ","ひ":"ぴ","ふ":"ぷ","へ":"ぺ","ほ":"ぽ"};
const SMALL={"あ":"ぁ","い":"ぃ","う":"ぅ","え":"ぇ","お":"ぉ","つ":"っ","や":"ゃ","ゆ":"ゅ","よ":"ょ","わ":"ゎ"};
/* One word a day, spelled out. Recognition cannot prove recall — picking the right
   answer out of four is a different act from producing the word — and this is the only
   round with nothing to eliminate. It used to wait for day 50 on the argument that a
   hard round early would be a reason to quit; the opposite turned out to be true, since
   a day of guessing correctly feels like learning and is not. One item keeps the run
   short enough that it is still a habit and not a session. */
const WRITE_N=1;

function writeIds(){
  /* Spelled from memory with nothing on screen, so an earlier day's word is the one
     worth asking: `seen` counts cold answers, and a card shown this morning has not
     earned one yet. On day one nothing has, and the round exists from day one, so
     today's word stands in rather than the round quietly not happening. */
  const all=Object.keys(P.srs).filter(id=>id[0]==="w");
  const older=all.filter(id=>P.srs[id].seen>0);
  const mine=older.length?older:all;
  const due=dueIdsAt(P.plays).filter(id=>mine.indexOf(id)>=0);
  const out=[];
  const add=id=>{if(out.indexOf(id)<0&&out.length<WRITE_N)out.push(id)};
  due.forEach(add);
  shuffle(mine).forEach(add);
  return out;
}

function r4(){
  run.wIds=writeIds();
  run.wi=0;
  run.r4max=run.wIds.length*2;
  if(!run.wIds.length){pip(run.step,"done");return nextStep()}
  nextWrite();
}

function nextWrite(){
  if(run.wi>=run.wIds.length){pip(run.step,"done");return nextStep()}
  const it=item(run.wIds[run.wi]), want=it.kana;
  show("sc-write"); pip(run.step,"live");
  $("wEyebrow").textContent="Round four · write it "+(run.wi+1)+" of "+run.wIds.length;
  $("wEn").textContent=it.en;
  $("wNext").hidden=true;
  let typed="", slips=0, shown=false, done=false, row=null;
  /* A kana that carries a mark is typed in two taps — す then ゛ for ず — so the base
     has to be allowed to stand while it waits for its mark. It is held here rather than
     appended, because until the mark lands it is not the kana that was asked for, and
     putting it into `typed` would either complete the word wrongly or have to be unpicked.
     Without this, every reading containing が, ず, っ or any other marked kana was
     impossible to spell: the base was refused before the mark could be reached. */
  let pending=null;
  const BASE=c=>{for(const k in DAKU)if(DAKU[k]===c)return k;
    for(const k in HANDAKU)if(HANDAKU[k]===c)return k;
    for(const k in SMALL)if(SMALL[k]===c)return k;return c};

  const cells=$("wCells");
  function paint(){
    cells.innerHTML="";
    for(let i=0;i<want.length;i++){
      const d=document.createElement("div");
      const ch=typed[i]||(i===typed.length&&pending?pending:"");
      d.className="wc"+(i<typed.length?" on":"")+(i===typed.length&&pending?" part":"");
      d.textContent=ch;
      cells.appendChild(d);
    }
  }
  /* The word is finished when it matches, not when it is the right length: a base kana
     still waiting for its mark fills a cell without being the answer. */
  function settled(){ return typed===want }
  function refuse(ch){
    slips++;
    const d=cells.children[typed.length];
    if(d){d.classList.add("bad");setTimeout(()=>d.classList.remove("bad"),340)}
    $("wNote").className="note bad";
    /* Say what is wrong about THIS kana rather than just "no": a learner who typed か
       for が has the right shape and the wrong voicing, and should be told that. */
    const want1=want[typed.length];
    const base=BASE;
    if(base(ch)===base(want1)) $("wNote").textContent="Right shape, wrong mark — "+want1+", not "+ch+".";
    else if(slips>=3){ $("wNote").textContent="Next is "+want1+"."; }
    else $("wNote").textContent="Not "+ch+" there.";
    if(slips>=3)hint();
  }
  function hint(){
    const d=cells.children[typed.length];
    if(d){d.textContent=want[typed.length];d.style.color="var(--ink-faint)"}
    shown=true;
  }
  function put(ch){
    if(done)return;
    const at=typed.length, want1=want[at];
    if(ch!==want1){
      /* the right shape, waiting for its mark */
      if(BASE(want1)===ch&&want1!==ch){
        pending=ch; paint();
        $("wNote").className="note";
        $("wNote").textContent="Now the mark.";
        return;
      }
      return refuse(ch);
    }
    pending=null;
    typed+=ch; paint();
    if(!settled()){
      $("wNote").className="note";
      $("wNote").textContent=typed.length+" of "+want.length+".";
      return;
    }
    finishWord();
  }
  function finishWord(){
    done=true;
    const pts=shown?0:slips===0?2:1;
    run.r4=(run.r4||0)+pts;
    if(run.scored)grade(run.wIds[run.wi],slips===0&&!shown);
    $("wNote").className="note "+(pts===2?"good":"bad");
    $("wNote").textContent=it.face+" = "+want+" ("+it.romaji+") — "+it.en
      +" · "+(pts===2?"clean, 2 of 2":pts===1?"1 of 2":"0 of 2, but you have seen it written now");
    $("wNext").hidden=false;
    $("wNext").textContent=run.wi<run.wIds.length-1?"Next word"
      :run.plan[run.step+1]?"Last round":"See today’s card";
  }
  function del(){
    if(done)return;
    if(pending){ pending=null; paint();
      $("wNote").className="note"; $("wNote").textContent=""; return }
    if(!typed.length)return;
    typed=typed.slice(0,-1); paint();
    $("wNote").className="note"; $("wNote").textContent="";
  }

  /* the keyboard: consonant row, then vowel, then the marks */
  const vows=$("wVows"), mods=$("wMods");
  function drawVows(){
    vows.innerHTML="";
    if(row===null)return;
    for(const c of KROWS[row][1]){
      const b=document.createElement("button");
      b.className="key"; b.type="button"; b.textContent=c;
      b.onclick=()=>put(c);
      vows.appendChild(b);
    }
  }
  const rows=$("wRows"); rows.innerHTML="";
  KROWS.forEach((r,i)=>{
    const b=document.createElement("button");
    b.className="key"; b.type="button"; b.textContent=r[0];
    b.onclick=()=>{
      row=i;
      [...rows.children].forEach((x,j)=>x.classList.toggle("sel",j===i));
      if(r[1].length===1)put(r[0]); else drawVows();
    };
    rows.appendChild(b);
  });
  mods.innerHTML="";
  [["゛","daku"],["゜","handaku"],["小","small"],["⌫","del"]].forEach(([label,kind])=>{
    const b=document.createElement("button");
    b.className="key "+(kind==="daku"||kind==="handaku"?"mark":"mod");
    b.type="button"; b.textContent=label;
    b.setAttribute("aria-label",kind==="daku"?"dakuten":kind==="handaku"?"handakuten"
      :kind==="small"?"small kana":"delete");
    b.onclick=()=>{
      if(kind==="del")return del();
      if(done)return;
      /* The mark belongs to the kana waiting for it. */
      const last=pending;
      if(!last){
        $("wNote").className="note bad";
        $("wNote").textContent="Tap the kana first, then its mark.";
        return;
      }
      const map=kind==="daku"?DAKU:kind==="handaku"?HANDAKU:SMALL;
      const to=map[last];
      const at=typed.length;
      if(!to){
        $("wNote").className="note bad";
        $("wNote").textContent=last+" does not take that mark.";
        return;
      }
      if(to!==want[at]){
        const d=cells.children[at];
        if(d){d.classList.add("bad");setTimeout(()=>d.classList.remove("bad"),340)}
        slips++;
        $("wNote").className="note bad";
        $("wNote").textContent="Right shape, wrong mark \u2014 "+want[at]+", not "+to+".";
        return;
      }
      pending=null;
      typed+=to; paint();
      if(!settled()){
        $("wNote").className="note";
        $("wNote").textContent=typed.length+" of "+want.length+".";
        return;
      }
      finishWord();
    };
    mods.appendChild(b);
  });
  row=null; drawVows(); paint();
  $("wNote").className="note";
  $("wNote").textContent="Spell the reading. "+want.length+" kana.";
  $("wNext").onclick=()=>{run.wi++;nextWrite()};
}

/* ---- round 5: hear it ----
   Browser speech synthesis, so there is no audio to host and it works offline. No
   Japanese voice on the device means no round: skipping is better than a silent one. */
const LISTEN_N=3;
function jaVoice(){
  if(!("speechSynthesis" in window))return null;
  const v=speechSynthesis.getVoices().filter(x=>/^ja/i.test(x.lang||""));
  if(!v.length)return null;
  /* Apple ships nine Japanese voices and seven of them are the novelty set (Grandma,
     Rocko, Flo …), which is not what you want to learn pronunciation from. They all
     carry a parenthesised language in the name; the system voices — Kyoko, Otoya,
     O-Ren — do not, so prefer a name without one. */
  const plain=v.filter(x=>x.name.indexOf("(")<0);
  const dflt=v.filter(x=>x.default);
  return plain[0]||dflt[0]||v[0];
}
function speak(text){
  try{
    speechSynthesis.cancel();
    const u=new SpeechSynthesisUtterance(text);
    const v=jaVoice(); if(v)u.voice=v;
    u.lang="ja-JP"; u.rate=.85;
    speechSynthesis.speak(u);
    return u;
  }catch(e){return null}
}
/* Distractors that sound close: same length, same first or last mora, shared kana.
   A listening round whose wrong answers sound nothing alike is a vocabulary round. */
/* A declaration rather than a const, because the recall round calls it from higher up
   the file: the reading questions use the same scoring as the listening round. */
function soundScore(kana){
  return w=>{
    const b=w[1]; let sc=0;
    const shared=[...new Set(kana)].filter(c=>b.indexOf(c)>=0).length;
    /* Sharing no kana at all is not a resemblance, however the lengths line up. Giving
       equal length three points on its own put every two-mora word in contention: だれ
       scored 132 words alike, and the round offered ねこ and いぬ against it. A word the
       ear has nothing to confuse scores zero, and metFirst passes over it. */
    if(!shared)return 0;
    if(b.length===kana.length)sc+=3;
    else if(Math.abs(b.length-kana.length)===1)sc+=1;
    if(b[0]===kana[0])sc+=2;
    if(b[b.length-1]===kana[kana.length-1])sc+=2;
    return sc+shared;
  };
}
/* Met words first, exactly as the recall round does it: the answer is always a word you
   have met, so an option you have never seen is a tell before the sound is considered. */
function soundalikes(kana,n){
  const cands=WORDS.filter(w=>w[1]!==kana).map(w=>({id:rowId("w",w),row:w}));
  return metFirst(cands,n,o=>soundScore(kana)(o.row)).map(o=>o.row);
}
function listenIds(){
  /* Heard once, with no writing on screen — an earlier day's word, for the same reason
     the write round takes one. */
  const all=Object.keys(P.srs).filter(id=>id[0]==="w");
  const older=all.filter(id=>P.srs[id].seen>0);
  const mine=older.length?older:all;
  return pick(mine,Math.min(LISTEN_N,mine.length));
}
function r5(){
  if(!jaVoice()){
    run.noVoice=true; run.r5max=0;
    pip(run.step,"done");
    return nextStep();
  }
  run.lIds=listenIds(); run.li=0; run.r5max=run.lIds.length;
  if(!run.lIds.length){pip(run.step,"done");return nextStep()}
  nextListen();
}
function nextListen(){
  if(run.li>=run.lIds.length){pip(run.step,"done");return nextStep()}
  const it=item(run.lIds[run.li]);
  show("sc-listen"); pip(run.step,"live");
  $("lEyebrow").textContent="Round five · hear it "+(run.li+1)+" of "+run.lIds.length;
  $("lNote").className="note"; $("lNote").textContent="Tap to hear it. Again as often as you like.";
  const play=$("lPlay");
  play.onclick=()=>{
    play.classList.add("playing");
    const u=speak(it.kana);
    if(u)u.onend=()=>play.classList.remove("playing");
    else setTimeout(()=>play.classList.remove("playing"),900);
  };
  const box=$("lOpts"); box.innerHTML="";
  let answered=false;
  shuffle([it].concat(soundalikes(it.kana,3).map(w=>({face:w[0],kana:w[1],romaji:w[2],en:w[3]}))))
    .forEach(o=>{
      const b=document.createElement("button");
      b.className="opt ja"; b.type="button"; b.textContent=o.kana;
      b.onclick=()=>{
        if(answered)return; answered=true;
        const ok=o.kana===it.kana;
        [...box.children].forEach(x=>{
          x.disabled=true;
          if(x.textContent===it.kana)x.classList.add("right");
          else if(x===b)x.classList.add("wrong");
          else x.classList.add("dim");
        });
        if(ok)run.r5=(run.r5||0)+1;
        if(run.scored)grade(run.lIds[run.li],ok);
        $("lNote").className="note "+(ok?"good":"bad");
        $("lNote").textContent=it.face+" = "+it.kana+" ("+it.romaji+") — "+it.en;
        setTimeout(()=>{run.li++;nextListen()},ok?900:2100);
      };
      box.appendChild(b);
    });
  play.click();
}

/* ---- the bonus round ----
   Earned by three strong days running, not by playing: it is the reward for a streak
   being good rather than merely unbroken. Its points are pure upside — they are added
   to the score but not to the maximum, so a bad lightning round can never drag the day
   below what the normal rounds already earned. */
const BONUS_AT=3, BONUS_BAR=0.85;
const RECAP_EVERY=7;
function bonusEarned(){
  const r=P.recent||[];
  return r.length>=BONUS_AT && r.slice(-BONUS_AT).every(x=>x>=BONUS_BAR);
}
const recapDay=day=>day%RECAP_EVERY===0;
function bonusIds(n){
  const known=Object.keys(P.srs);
  return pick(known,Math.min(n,known.length));
}
/* The catch-up asks about whatever is nearest the edge of forgetting without being due
   today: what round two already drilled is skipped, and the items whose review falls
   soonest come first. Answering one here pushes its review further out, so the round
   buys time rather than just repeating the day. */
function recapIds(n){
  const asked=(run.newIds||[]).concat(run.dueIds||[]);
  return Object.keys(P.srs)
    .filter(id=>asked.indexOf(id)<0&&P.srs[id].due>P.plays)
    .sort((a,b)=>P.srs[a].due-P.srs[b].due)
    .slice(0,n);
}
/* Both quick-fire rounds are the same shape and differ in three things: which items
   they ask about, how long you get, and where the points land. `extra` is the
   difference that matters — bonus points are added to the score but not to the
   maximum, while the catch-up counts like any other round, in both. */
const FLASH_EVERY=10, FLASH_N=10, FLASH_BLOCK=10;
const flashDay=day=>day%FLASH_EVERY===0;
/* The last ten days of new material: per stream, the ten highest indices introduced,
   since each day introduces the lowest one not yet seen. Interleaved across the streams
   rather than taken in order, so the round is the block and not its tail. */
function flashIds(n){
  const take=[];
  SCRIPTS.forEach(([pre])=>{
    const recent=Object.keys(P.srs).filter(id=>id[0]===pre)
      .sort((a,b)=>orderOf(b)-orderOf(a)).slice(0,FLASH_BLOCK);
    take.push(shuffle(recent));
  });
  const out=[];
  for(let r=0;r<FLASH_BLOCK&&out.length<n;r++)
    take.forEach(list=>{ if(list[r]&&out.length<n)out.push(list[r]); });
  return shuffle(out);
}
const QF={
  bonus:{n:8,ms:4000,extra:true,ids:bonusIds,ja:"雷",label:"Bonus round",
    eyebrow:"Bonus round · lightning",lead:"Three strong days running",
    intro:"Eight questions, four seconds each, two answers to choose from. Every one you get is a point on top — missing them all still cannot cost you anything.",
    go:"Start the lightning round"},
  recap:{n:6,ms:6000,extra:false,ids:recapIds,ja:"復",label:"Catch up",
    eyebrow:"Catch up · every seventh day",lead:"Things you met a while ago",
    intro:"Six questions, six seconds each, from what you have not seen for a while. They count towards today’s score like any other round, and a miss only nudges a word back one step rather than all the way to the start.",
    go:"Start the catch-up"}
};
function xq(id){
  /* Two options and four seconds: this is recall at speed, not a thinking round, so
     the question is always the easy direction. The one wrong answer still has to be a
     word you have met and a plausible near-miss: picked at random it was neither, and
     on day seven the catch-up asked 猫 against "to begin" — a word from day 340. With
     two options, an answer you have never seen is not a distractor, it is a pointer at
     the other one. */
  const it=item(id);
  if(it.type==="char"){
    const pre=it.set===KANA?"k":"t";
    const cands=it.set.filter(c=>c[1]!==it.romaji).map(c=>({id:rowId(pre,c),row:c}));
    const other=metFirst(cands,1,o=>charScore(it,it.set)(o.row))[0].row;
    return{big:it.face,ja:false,opts:shuffle([it.romaji,other[1]]),answer:it.romaji,
      after:it.face+" = "+it.romaji};
  }
  const mean=it.type==="loanword"?w=>w[2]:w=>w[3];
  const pre=it.type==="loanword"?"v":"w";
  const cands=it.set.filter(w=>mean(w)!==it.en).map(w=>({id:rowId(pre,w),row:w}));
  const other=metFirst(cands,1,o=>wordScore(it)(o.row))[0].row;
  return{big:it.face,ja:false,opts:shuffle([it.en,mean(other)]),answer:it.en,
    after:it.face+" — "+it.en};
}
function rQF(key){
  const c=QF[key], ids=c.ids(c.n);
  run.qf={key,c,ids,i:0,got:0,hits:[]};
  if(!ids.length){pip(run.step,"done");return nextStep()}
  if(!c.extra)run.r6max=ids.length;
  show("sc-bonus"); pip(run.step,"live");
  /* the magenta border marks a round that is extra; the catch-up is an ordinary one */
  $("sc-bonus").className="card"+(c.extra?" bonus":"");
  $("xEyebrow").textContent=c.eyebrow;
  $("xQ").textContent=c.lead;
  $("xBig").textContent=c.ja;
  $("xNote").className="note";
  $("xNote").textContent=c.intro;
  $("xOpts").innerHTML="";
  $("xBar").className="";
  $("xDone").hidden=true;
  $("xGo").hidden=false;
  $("xGo").textContent=c.go;
  $("xGo").onclick=()=>{$("xGo").hidden=true;nextQF()};
}
let xTimer=null;
function nextQF(){
  clearTimeout(xTimer);
  const f=run.qf, c=f.c;
  if(f.i>=f.ids.length)return endQF();
  const id=f.ids[f.i], q=xq(id);
  show("sc-bonus"); pip(run.step,"live");
  $("xEyebrow").textContent=c.label+" · "+(f.i+1)+" of "+f.ids.length;
  $("xQ").textContent="Quick — what is this?";
  $("xBig").textContent=q.big;
  $("xNote").className="note"; $("xNote").innerHTML="";
  tally();
  const bar=$("xBar");
  /* restart the animation: removing the class alone will not replay it */
  bar.className=""; void bar.offsetWidth;
  bar.style.setProperty("--t",c.ms+"ms");
  bar.className="run";
  const box=$("xOpts"); box.innerHTML="";
  let answered=false;
  const settle=ok=>{
    if(answered)return; answered=true;
    clearTimeout(xTimer);
    bar.className="";
    f.hits.push(ok);
    if(ok)f.got++;
    if(!c.extra&&run.scored)grade(id,ok,true);
    [...box.children].forEach(x=>{x.disabled=true;
      if(x.textContent===q.answer)x.classList.add("right");else x.classList.add("dim")});
    $("xNote").className="note "+(ok?"good":"bad");
    $("xNote").textContent=q.after;
    setTimeout(()=>{f.i++;nextQF()},ok?500:1000);
  };
  q.opts.forEach(o=>{
    const b=document.createElement("button");
    b.className="opt"+(q.ja?" ja":""); b.type="button"; b.textContent=o;
    b.onclick=()=>settle(o===q.answer);
    box.appendChild(b);
  });
  xTimer=setTimeout(()=>settle(false),c.ms);
}
function tally(){
  const n=document.createElement("div");
  n.className="bonus-tally";
  run.qf.hits.forEach(h=>{const i=document.createElement("i");i.className=h?"hit":"miss";n.appendChild(i)});
  $("xNote").innerHTML=""; $("xNote").appendChild(n);
}
function endQF(){
  clearTimeout(xTimer);
  const f=run.qf, c=f.c, n=f.ids.length;
  $("xBar").className="";
  $("xEyebrow").textContent=c.label+" · done";
  $("xQ").textContent=f.got+" of "+n;
  $("xBig").textContent=f.got===n?"全":f.got>=n/2?"好":"次";
  $("xOpts").innerHTML="";
  $("xNote").className="note "+(f.got?"good":"");
  if(c.extra){
    run.bonus=f.got;
    $("xNote").textContent=f.got
      ? "+"+f.got+" on top of today’s score."
      : "Nothing lost — bonus points only ever add.";
  }else{
    run.r6=f.got; run.cIds=f.ids;
    $("xNote").textContent=f.got===n
      ? "All of it still there."
      : "The ones you missed come back sooner.";
  }
  pip(run.step,"done");
  $("xDone").hidden=false;
  $("xDone").textContent=run.plan[run.step+1]?"Carry on":"See today’s card";
  $("xDone").onclick=nextStep;
}

/* ---- finish ---- */
async function finish(){
  const base=run.r1+run.r2+run.r3+(run.r4||0)+(run.r5||0)+(run.r6||0);
  /* Both extras are points on top: the lightning round earned by three strong days,
     and the tenth-day flashback. Neither touches the maximum. */
  const r={date:today(),lesson:run.lesson,
           score:base,bonus:(run.bonus||0)+(run.flashGot||0),
           flashGot:run.flashGot||0,flashN:run.flashN||0,
           max:5+run.r2max+3+(run.r4max||0)+(run.r5max||0)+(run.r6max||0),
           gIdx:run.gIdx,sRef:run.sRef,newIds:run.newIds,dueIds:run.dueIds,
           wIds:run.wIds||[],lIds:run.lIds||[],cIds:run.cIds||[],missed:run.missed||[],
           rounds:run.plan.length,noVoice:!!run.noVoice};
  const scored=run.scored;
  if(scored){
    if(P.last===yesterday())P.streak=(P.streak||0)+1;
    else if(P.last!==r.date)P.streak=1;
    P.last=r.date;
    P.best=Math.max(P.best||0,P.streak);
    P.recent=(P.recent||[]).concat([r.max?r.score/r.max:0]).slice(-6);
    r.bonusNext=bonusEarned();
    r.freezeGot=earnFreezes();
    r.freezeHeld=P.freezes||0;
    r.freezeAtCap=r.freezeGot===0&&(P.freezes||0)>=FREEZE_MAX
      &&(P.plays||0)%FREEZE_EVERY===0;
    P.history=Array.from(new Set((P.history||[]).concat([r.date]))).slice(-60);
    P.lesson=run.lesson+1;
    P.lastRun=r;
    await save();
  }
  run=null;
  paintStreak();
  renderDone(r,scored);
}
function rowsInto(el,pairs){
  el.innerHTML="";
  pairs.forEach(([l,r])=>{
    const d=document.createElement("div"); d.className="row";
    const a=document.createElement("div"); a.className="l"; a.textContent=l;
    const b=document.createElement("div"); b.className="r"; b.innerHTML=r;
    d.appendChild(a); d.appendChild(b); el.appendChild(d);
  });
}
function renderDone(r,scored){
  show("sc-done"); [...$("pips").children].forEach((_,i)=>pip(i,"done"));
  const pct=r.score/r.max;
  $("dEyebrow").textContent=scored?"Done for today":"Practice run · not scored";
  $("dScore").textContent=r.score+(r.bonus?"+"+r.bonus:"");
  $("dOf").textContent="/ "+r.max;
  $("dGrade").textContent=pct===1?"· clean sweep":pct>=.85?"· strong":pct>=.6?"· solid":"· it’ll stick tomorrow";
  let fl="";
  if(scored&&r.freezeGot) fl=" <b>Freeze earned</b> — "+r.freezeHeld
    +(r.freezeHeld===1?" in hand.":" in hand, "+FREEZE_MAX+" is the most you can hold.");
  else if(scored&&r.freezeAtCap) fl=" A freeze was due, but you are holding the maximum of "+FREEZE_MAX+".";
  const fb=r.flashN?" <b>Flashback</b> — "+r.flashGot+" of "+r.flashN
    +" from the last ten days, added on top.":"";
  $("dStreak").innerHTML=scored
    ? "<b>"+P.streak+(P.streak===1?" day":" days")+" in a row.</b> Best so far: "+P.best+"."+fl+fb
    : "Streak and review schedule left untouched."+fb;
  const g=GROUPS[r.gIdx];
  $("dGroupH").textContent="The thread — "+g.answer;
  rowsInto($("dGroupRows"),g.clues.map(c=>[c[0],esc(c[2])+" <i>"+esc(c[1])+"</i>"]));
  rowsInto($("dNewRows"),(r.newIds||[]).map(id=>{
    const it=item(id);
    return [it.face,esc(it.en)+" <i>"+esc(it.kana?it.kana+" · "+it.romaji:it.romaji)+"</i>"];
  }));
  const used=(r.newIds||[]).map(id=>[item(id),usageFor(item(id))]).filter(x=>x[1]);
  $("dUseBlock").hidden=!used.length;
  rowsInto($("dUseRows"),used.map(([it,ex])=>[ex[0],esc(ex[1])]));
  [...$("dUseRows").children].forEach(d=>d.querySelector(".l").classList.add("ja-ex"));
  const practised=(r.newIds||[]).concat(r.dueIds||[]);
  rowsInto($("dDueRows"),practised.map(id=>{
    const it=item(id), s=P.srs[id];
    const gap=s?Math.max(1,s.due-P.plays):1;
    return [it.face,"in "+gap+(gap===1?" day":" days")];
  }));
  const wrote=(r.wIds||[]).concat(r.lIds||[]);
  $("dWroteBlock").hidden=!wrote.length&&!r.noVoice;
  if(r.noVoice){
    rowsInto($("dWroteRows"),[["—","No Japanese voice on this device, so round five was skipped."]]);
  }else{
    rowsInto($("dWroteRows"),wrote.map(id=>{
      const it=item(id);
      return [it.face,esc(it.kana)+" <i>"+esc(it.romaji)+"</i>"];
    }));
  }
  /* The day ended without ever saying what went wrong: the score said 11 of 14 and
     the three were never named. They are the only part of the card worth reading
     twice. */
  const missed=(r.missed||[]).filter(known);
  $("dMissBlock").hidden=!missed.length;
  rowsInto($("dMissRows"),missed.map(id=>{
    const it=item(id);
    return [it.face,esc(it.en)+" <i>"+esc(it.kana&&it.kana!==it.face?it.kana+" · "+it.romaji:it.romaji)+"</i>"];
  }));
  const caught=r.cIds||[];
  $("dCatchBlock").hidden=!caught.length;
  rowsInto($("dCatchRows"),caught.map(id=>{
    const it=item(id);
    return [it.face,esc(it.en)+" <i>"+esc(it.romaji)+"</i>"];
  }));
  /* older saves carry a plain index into the hand-written set */
  const s=sentFor(r.sRef!=null?r.sRef:handRef(r.sIdx||0));
  $("dSent").textContent=s.tiles.map(t=>t[0]).join("");
  $("dSentEn").textContent=s.en;
  $("dSentWhy").innerHTML="<b>"+esc(s.pattern)+"</b> — "+esc(s.note);
  setupReminder();
  $("dFoot").textContent="Day "+(P.lesson+1)+" ("+"第"+jaNum(P.lesson+1)+"日"+") unlocks tomorrow."
    +(flashDay(P.lesson+1)?" A flashback over the last ten days comes with it."
      :recapDay(P.lesson+1)?" A catch-up round comes round with it.":"")
    +(scored&&r.bonusNext?" Three strong days — a lightning round waits.":"");
}


/* ---- daily reminder ----
   There is no server behind this page, so there is nothing to send a push from.
   A repeating calendar alarm is the reliable zero-infrastructure version: it fires
   whether or not the app has been opened, and it survives storage being cleared. */
const HOSTED = "https://eddysant.github.io/mainichi/";
/* Checked when the card is drawn, not at load: window.claude may be injected
   after this script's first run, and guessing wrong would show a dead button. */
const inArtifact = () => typeof (window.claude||{}).use === "function" || !!docRef;
function icsFor(hhmm){
  const pad=n=>String(n).padStart(2,"0");
  const bits=hhmm.split(":"), h=Number(bits[0])||0, m=Number(bits[1])||0;
  const now=new Date(), d=new Date(now.getFullYear(),now.getMonth(),now.getDate(),h,m,0);
  if(d<=now)d.setDate(d.getDate()+1);
  const local=x=>""+x.getFullYear()+pad(x.getMonth()+1)+pad(x.getDate())+"T"+pad(x.getHours())+pad(x.getMinutes())+"00";
  const stamp=new Date().toISOString().replace(/[-:]/g,"").replace(/\.\d+Z$/,"Z");
  return ["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Mainichi//Daily//EN","CALSCALE:GREGORIAN","METHOD:PUBLISH",
    "BEGIN:VEVENT",
    "UID:mainichi-daily-"+pad(h)+pad(m)+"@"+(location.hostname||"local"),
    "DTSTAMP:"+stamp,
    "DTSTART:"+local(d),
    "DURATION:PT5M",
    "RRULE:FREQ=DAILY",
    "SUMMARY:毎日 Mainichi — today’s puzzle",
    "DESCRIPTION:Fifty seconds of Japanese.\\n"+location.href,
    "URL:"+location.href,
    "BEGIN:VALARM","ACTION:DISPLAY","TRIGGER:PT0M",
    "DESCRIPTION:毎日 Mainichi — today’s puzzle",
    "END:VALARM","END:VEVENT","END:VCALENDAR"].join("\r\n");
}
function setupReminder(){
  const card=$("remindCard"), row=card.querySelector(".remind-row"), lead=card.querySelector(".note");
  card.hidden=false;
  /* The artifact viewer only hands over files in a fixed set of formats, and
     .ics is not one — so point at the installed copy rather than show a dead button. */
  if(inArtifact()){
    row.hidden=true; $("remindNote").hidden=true;
    lead.className="note";
    lead.innerHTML='Set the daily alarm in the installed version — <a href="'+HOSTED+
      '" target="_blank" rel="noopener">'+HOSTED.replace(/^https:\/\//,"").replace(/\/$/,"")+
      '</a> — which can hand your calendar the file.';
    return;
  }
  row.hidden=false;
  lead.className="note";
  lead.textContent="A repeating calendar alarm is the one thing that reliably interrupts a day. Set it once.";
  $("remindTime").value=P.remindAt||"08:00";
  if(P.remindAt)$("remindBtn").textContent="Update reminder";
  $("remindBtn").onclick=()=>{
    const t=$("remindTime").value||"08:00";
    P.remindAt=t; save();
    const url=URL.createObjectURL(new Blob([icsFor(t)],{type:"text/calendar;charset=utf-8"}));
    const a=document.createElement("a");
    a.href=url; a.download="mainichi-daily.ics";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),10000);
    $("remindBtn").textContent="Update reminder";
    const n=$("remindNote");
    n.hidden=false; n.className="note good";
    n.textContent="mainichi-daily.ics saved — open it to add a repeating "+t+" alarm. On iPhone, tap it in Downloads, then Add All.";
  };
}

/* ---- boot ---- */
function startRun(scored){
  if(scored)P.plays=(P.plays||0)+1;
  const l=P.lesson, nw=newToday();
  const plan=roundsFor(l+1).map(r=>r.key);
  /* straight after recall, where it reads as a continuation of it rather than a
     fourth thing to get through */
  /* On the seventieth day and every seventieth after, both review rounds fall due. The
     flashback is the larger and covers the same ground, so it stands in for the catch-up
     rather than stacking on top of it. */
  if(recapDay(l+1)&&!flashDay(l+1))plan.splice(plan.indexOf("recall")+1,0,"recap");
  if(flashDay(l+1))plan.push("flash");
  if(scored&&bonusEarned())plan.push("bonus");
  const sRef=pickSent(l);
  run={scored,lesson:l,gIdx:l%GROUPS.length,g:GROUPS[l%GROUPS.length],sRef,sent:sentFor(sRef),
       newIds:nw,dueIds:[],plan,step:-1,
       r1:0,r2:0,r2max:0,r3:0,r4:0,r4max:0,r5:0,r5max:0,r6:0,r6max:0,cIds:[],missed:[],
       bonus:0,flashGot:0,flashN:0,mode:null,qs:[],qi:0};
  buildPips(plan.length);
  $("pips").hidden=false;
  nextStep();
}
function refresh(){
  if(run)return;
  paintStreak();
  if(P.lastRun&&P.lastRun.date===today()){
    buildPips(P.lastRun.rounds||roundsFor((P.lastRun.lesson||0)+1).length);
    $("pips").hidden=false; renderDone(P.lastRun,true);
  }
  else{$("pips").hidden=true;renderStart();show("sc-start")}
}
$("go").onclick=()=>startRun(true);
$("again").onclick=()=>startRun(false);
$("glOpen").onclick=()=>renderGloss(()=>{renderStart();show("sc-start")});
$("glOpen2").onclick=()=>renderGloss(()=>refresh());

try{if("speechSynthesis" in window){speechSynthesis.getVoices();
  speechSynthesis.onvoiceschanged=()=>speechSynthesis.getVoices()}}catch(e){}

const local=loadLocal(); if(local)P=local;
settleStreak();
refresh();
initCloud().then(ok=>{
  settleStreak();
  $("syncFoot").textContent=ok
    ? "Progress is saved to your Claude account, so it follows you between devices."
    : "Progress is saved in this browser only.";
  refresh();
});
})();
