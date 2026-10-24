(function(){
const $=id=>document.getElementById(id);
const SCREENS=["sc-start","sc-group","sc-teach","sc-recall","sc-build",
  "sc-unlock","sc-write","sc-listen","sc-done"];
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
const PER_SCRIPT=2;
const charItem=(p,script,set)=>i=>
  ({id:p+i,type:"char",script,set,face:set[i][0],kana:"",romaji:set[i][1],en:"the sound “"+set[i][1]+"”"});
const kanaItem=charItem("k","hiragana",KANA);
const kataItem=charItem("t","katakana",KATAKANA);
const wordItem=i=>({id:"w"+i,type:"kanjiword",script:"kanji",set:WORDS,
  face:WORDS[i][0],kana:WORDS[i][1],romaji:WORDS[i][2],en:WORDS[i][3],note:""});
const loanItem=i=>({id:"v"+i,type:"loanword",script:"katakana word",set:KATA_WORDS,
  face:KATA_WORDS[i][0],kana:"",romaji:KATA_WORDS[i][1],en:KATA_WORDS[i][2],note:KATA_WORDS[i][3]||""});
const item=id=>{const n=+id.slice(1);
  return id[0]==="k"?kanaItem(n):id[0]==="t"?kataItem(n):id[0]==="v"?loanItem(n):wordItem(n)};
/* The lowest item of each script not yet introduced, rather than the one at the
   lesson index: that way adding katakana part-way through does not skip ア onwards,
   and a schedule that drifts for any other reason heals itself. */
function newToday(){
  return SCRIPTS.map(([p,,set])=>{
    for(let i=0;i<set.length;i++)if(!P.srs[p+i])return p+i;
    return null;
  }).filter(Boolean);
}

/* ---- the run's rounds ----
   Rounds four and five exist from the start but stay shut until the habit is there.
   Both fill a real gap: everything in rounds one to three is four-option recognition,
   so a day can be passed without ever retrieving anything cold or hearing a word said.
   `day` is the day number they appear on, counting from one. */
const ROUNDS=[
  {key:"group", day:1,  ja:"一", name:"Find the thread",
   blurb:"Five words appear one at a time — say what they share."},
  {key:"recall",day:1,  ja:"二", name:"Recall",
   blurb:"Two each of hiragana, katakana, katakana words and kanji — today’s new ones and what’s due."},
  {key:"build", day:1,  ja:"三", name:"Build a sentence",
   blurb:"Tap the words into order."},
  {key:"write", day:50, ja:"四", name:"Write it from memory",
   blurb:"Spell a word you know on a kana keyboard — no options to choose from.",
   why:"Fifty days of picking the right answer out of four is recognition. This asks you to produce the word with nothing to recognise.",
   how:["Tap a consonant row, then a vowel — the gojuon grid, two taps per kana.",
        "゙ and ゚ add the marks; 小 shrinks the last kana to っ or ゃ.",
        "A wrong kana is refused where you tap it, so you never fill in a whole wrong word."]},
  {key:"listen",day:75, ja:"五", name:"Hear it",
   blurb:"Pick the word you heard, from words that sound alike.",
   why:"Everything so far has been silent. The hardest part of Japanese on the day you need it is catching a word said at speed.",
   how:["Tap to hear it, as many times as you like.",
        "The wrong answers are chosen for sounding close to the right one.",
        "Needs a Japanese voice on the device; the round is skipped if there is none."]}
];
const roundsFor=day=>ROUNDS.filter(r=>day>=r.day);
const roundBy=k=>ROUNDS.filter(r=>r.key===k)[0];

/* ---- progress ---- */
const blank=()=>({v:1,remindAt:null,lesson:0,plays:0,streak:0,best:0,last:null,history:[],srs:{},
  lastRun:null,metRounds:[]});
let P=blank(), run=null, docRef=null;
const LS="mainichi.v1";
function loadLocal(){try{const r=localStorage.getItem(LS);if(r)return Object.assign(blank(),JSON.parse(r))}catch(e){}return null}
function saveLocal(){try{localStorage.setItem(LS,JSON.stringify(P))}catch(e){}}
async function initCloud(){
  try{
    const u=await window.claude?.use?.("user"); if(!u)return false;
    const db=await window.claude?.use?.("db"); if(!db)return false;
    const id=await u.id(); if(!id)return false;
    docRef=db.doc("data/users/"+id+"/progress");
    const s=await docRef.get();
    if(s.exists){const d=s.data();if(d&&typeof d.plays==="number"&&d.plays>=(P.plays||0))P=Object.assign(blank(),d)}
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
   truer signal. */
function grade(id,ok){
  const s=P.srs[id]||(P.srs[id]={box:0,due:0,seen:0});
  if(run){
    run.graded=run.graded||{};
    const prev=run.graded[id];
    if(prev){
      if(ok||prev==="bad")return;
      run.graded[id]="bad";
      s.box=0; s.due=P.plays+IV[0];
      return;
    }
    run.graded[id]=ok?"ok":"bad";
  }
  s.box=ok?Math.min(IV.length-1,s.box+1):0;
  s.seen=(s.seen||0)+1;
  s.due=P.plays+IV[s.box];
}

/* ---- round 2 questions ---- */
function mkQ(id){
  const it=item(id), seen=(P.srs[id]||{}).seen||0;
  if(it.type==="char"){
    const others=it.set.filter(c=>c[1]!==it.romaji);
    if(seen%2===0){
      const opts=shuffle([it.romaji].concat(pick(others,3).map(c=>c[1])));
      return{id,q:"Which sound is this?",big:it.face,sub:it.script,subRoman:true,opts,answer:it.romaji,
        grid:true,ja:false,after:it.face+" = "+it.romaji};
    }
    /* The other direction. Recognising a character and producing it are different
       skills, and only this way round catches the pairs that look alike — ツ/シ, ソ/ン. */
    const opts=shuffle([it.face].concat(pick(others,3).map(c=>c[0])));
    return{id,q:"Which "+it.script+" is this sound?",big:it.romaji,roman:true,sub:"",opts,answer:it.face,
      grid:true,ja:true,after:it.romaji+" = "+it.face};
  }
  /* Both word streams ask the meaning on even exposures. They differ on the odd one:
     a kanji word hides its reading, so that is worth asking, but a katakana word IS
     its reading — asking it would be free. Going English → katakana instead makes you
     recall the shape of the word rather than just recognise it. */
  if(seen%2===0){
    const mean=it.type==="loanword"?w=>w[2]:w=>w[3];
    const opts=shuffle([it.en].concat(pick(it.set.filter(w=>mean(w)!==it.en),3).map(mean)));
    return{id,q:"What does this mean?",big:it.face,sub:it.kana,opts,answer:it.en,grid:false,ja:false,
      after:it.face+(it.kana?" ("+it.kana+")":"")+" — "+it.en+(it.note?" · "+it.note:"")};
  }
  if(it.type==="loanword"){
    const opts=shuffle([it.face].concat(pick(it.set.filter(w=>w[0]!==it.face),3).map(w=>w[0])));
    return{id,q:"Which word is this?",big:it.en,gloss:true,sub:"katakana",subRoman:true,opts,answer:it.face,
      grid:true,ja:true,after:it.en+" = "+it.face+" ("+it.romaji+")"};
  }
  const opts=shuffle([it.kana].concat(pick(WORDS.filter(w=>w[1]!==it.kana),3).map(w=>w[1])));
  return{id,q:"How is this read?",big:it.face,sub:"",opts,answer:it.kana,grid:true,ja:true,
    after:it.face+" = "+it.kana+" ("+it.romaji+") — "+it.en};
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
function paintStreak(){
  $("streakN").textContent=P.streak||0;
  const h=new Set(P.history||[]), box=$("stamps");
  box.innerHTML="";
  for(let i=6;i>=0;i--){
    const d=dstr(new Date(Date.now()-i*DAY)), s=document.createElement("div");
    s.className="stamp"+(h.has(d)?" on":"")+(i===0?" today":"");
    s.textContent="日"; s.title=d;
    box.appendChild(s);
  }
}
function renderStart(){
  const n=P.lesson+1;
  $("dayN").textContent=n;
  $("dayJa").textContent="第"+jaNum(n)+"日";
  const nw=newToday(), newN=nw.length;
  const qn=quizIdsFor(nw,(P.plays||0)+1).length;
  let line;
  const nr=roundsFor(n).length;
  const head=["","One round","Two rounds","Three rounds","Four rounds","Five rounds"][nr]
    +", "+["","half a minute","a minute","a minute and a half","two minutes","two and a half minutes"][nr]+". ";
  if(P.plays===0) line=head+"A hiragana, a katakana, a loanword and a kanji word to start.";
  else if(newN) line=head+newN+" new, "+qn+" to recall.";
  else line=head+qn+" to recall — no new characters left.";
  $("startLine").textContent=line;
  const ul=$("plan"); ul.innerHTML="";
  ROUNDS.forEach(r=>{
    const open=n>=r.day, li=document.createElement("li");
    li.className=open?"":"locked";
    li.innerHTML='<span class="k">'+r.ja+'</span><span><b>'+esc(r.name)+'.</b> '
      +(open?esc(r.blurb):"Unlocks on day "+r.day+".")+'</span>';
    ul.appendChild(li);
  });
  $("go").textContent=P.plays===0?"Start day one":"Start today’s puzzle";
}

/* ---- stepping through the run ----
   Each round ends by calling nextStep(); a round appearing for the first time gets an
   explainer card before it rather than dropping the player into a mechanic they have
   never seen. */
const STEP={group:()=>r1(),recall:()=>teach(),build:()=>r3(),write:()=>r4(),listen:()=>r5()};
function nextStep(){
  run.step++;
  const key=run.plan[run.step];
  if(!key)return finish();
  if((P.metRounds||[]).indexOf(key)<0)return unlockCard(key);
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
  let i=0;
  (function one(){
    if(i>=ids.length)return quiz();
    const it=item(ids[i]);
    show("sc-teach"); pip(run.step,"live");
    $("tBadge").textContent="New today · "+it.script
      +(ids.length>1?" ("+(i+1)+" of "+ids.length+")":"");
    $("tBig").textContent=it.face;
    $("tSub").textContent=it.kana; $("tSub").hidden=!it.kana;
    $("tLat").textContent=it.romaji;
    $("tEn").innerHTML="<b>"+esc(it.en)+"</b>"+(it.note?" · "+esc(it.note):"");
    $("tNext").textContent=i<ids.length-1?"Next":"Try it";
    $("tNext").onclick=()=>{i++;one()};
  })();
}

/* ---- round 2: recall ---- */
/* Two of each script, every day. New material first, then whatever is due, then
   older items of that script to fill — so the round keeps its shape even on a day
   when nothing of a given script happens to come up for review. */
function quizIdsFor(nw,plays){
  const due=dueIdsAt(plays), out=[];
  SCRIPTS.forEach(([p])=>{
    const take=[], add=id=>{if(id[0]===p&&take.indexOf(id)<0&&take.length<PER_SCRIPT)take.push(id)};
    nw.forEach(add);
    due.forEach(add);
    if(take.length<PER_SCRIPT)shuffle(Object.keys(P.srs).filter(id=>id[0]===p)).forEach(add);
    out.push.apply(out,take);
  });
  return out;
}
function quiz(){
  const ids=quizIdsFor(run.newIds,P.plays);
  run.dueIds=ids.filter(id=>run.newIds.indexOf(id)<0);
  run.qs=shuffle(ids).map(mkQ);
  run.r2max=run.qs.length; run.qi=0;
  if(!run.qs.length){pip(run.step,"done");return nextStep()}
  nextQ();
}
function nextQ(){
  if(run.qi>=run.qs.length){pip(run.step,"done");return nextStep()}
  const q=run.qs[run.qi], box=$("rOpts");
  show("sc-recall"); pip(run.step,"live");
  $("rEyebrow").textContent="Round two · recall "+(run.qi+1)+" of "+run.qs.length;
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
      if(ok)run.r2++;
      if(run.scored)grade(q.id,ok);
      $("rNote").className="note "+(ok?"good":"bad");
      $("rNote").textContent=q.after;
      setTimeout(()=>{run.qi++;nextQ()},ok?750:1900);
    };
    box.appendChild(b);
  });
}

/* ---- round 3: build ----
   The old version hid the word meanings AND the word order, so the only strategy
   left was permuting until it turned green. Now every tile carries its meaning,
   every slot states the job it wants, and a wrong tap is refused on the spot with
   the reason — which is where the grammar actually gets taught. */
function r3(){
  show("sc-build"); pip(run.step,"live");
  const s=SENTENCES[run.sIdx], T=s.tiles, slots=$("bSlots"), tray=$("bTray");
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
    if(t[1]){const g=document.createElement("span"); g.className="g"; g.textContent=t[1]; b.appendChild(g)}
    b.onclick=()=>place(b,i);
    tray.appendChild(b);
    return b;
  });
  const tileFor=i=>tiles.find(b=>Number(b.dataset.idx)===i);
  const markNext=()=>slotEls.forEach((d,i)=>d.classList.toggle("next",i===at&&!done));
  const says=r=>ROLE_SAY[r]||r;

  function place(btn,i){
    if(done||btn.classList.contains("used"))return;
    if(i!==at){
      slips++;
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
const WRITE_N=2;

function writeIds(){
  const known=Object.keys(P.srs).filter(id=>id[0]==="w");
  const due=dueIdsAt(P.plays).filter(id=>id[0]==="w");
  const out=[];
  const add=id=>{if(out.indexOf(id)<0&&out.length<WRITE_N)out.push(id)};
  due.forEach(add);
  shuffle(known).forEach(add);
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

  const cells=$("wCells");
  function paint(){
    cells.innerHTML="";
    for(let i=0;i<want.length;i++){
      const d=document.createElement("div");
      d.className="wc"+(i<typed.length?" on":"");
      d.textContent=typed[i]||"";
      cells.appendChild(d);
    }
  }
  function refuse(ch){
    slips++;
    const d=cells.children[typed.length];
    if(d){d.classList.add("bad");setTimeout(()=>d.classList.remove("bad"),340)}
    $("wNote").className="note bad";
    /* Say what is wrong about THIS kana rather than just "no": a learner who typed か
       for が has the right shape and the wrong voicing, and should be told that. */
    const want1=want[typed.length];
    const base=c=>{for(const k in DAKU)if(DAKU[k]===c)return k;for(const k in HANDAKU)if(HANDAKU[k]===c)return k;
      for(const k in SMALL)if(SMALL[k]===c)return k;return c};
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
    if(ch!==want[typed.length])return refuse(ch);
    typed+=ch; paint();
    if(typed.length<want.length){
      $("wNote").className="note";
      $("wNote").textContent=typed.length+" of "+want.length+".";
      return;
    }
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
    if(done||!typed.length)return;
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
      if(done||!typed.length)return;
      const last=typed[typed.length-1];
      const map=kind==="daku"?DAKU:kind==="handaku"?HANDAKU:SMALL;
      const to=map[last];
      if(!to){
        $("wNote").className="note bad";
        $("wNote").textContent=last+" does not take that mark.";
        return;
      }
      /* Check before replacing. Running this through put() would strip the kana first
         and leave the word short when the mark turns out to be wrong. */
      const at=typed.length-1;
      if(to!==want[at]){
        const d=cells.children[at];
        if(d){d.classList.add("bad");setTimeout(()=>d.classList.remove("bad"),340)}
        slips++;
        $("wNote").className="note bad";
        $("wNote").textContent=want[at]+" takes no mark there.";
        return;
      }
      typed=typed.slice(0,at)+to; paint();
      $("wNote").className="note";
      $("wNote").textContent=typed.length+" of "+want.length+".";
      if(typed.length===want.length){
        /* the mark completed the word */
        typed=typed.slice(0,-1);
        put(to);
      }
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
function soundalikes(kana,n){
  const score=w=>{
    const b=w[1]; let sc=0;
    if(b.length===kana.length)sc+=3;
    else if(Math.abs(b.length-kana.length)===1)sc+=1;
    if(b[0]===kana[0])sc+=2;
    if(b[b.length-1]===kana[kana.length-1])sc+=2;
    for(const c of new Set(kana))if(b.indexOf(c)>=0)sc+=1;
    return sc;
  };
  const near=WORDS.filter(w=>w[1]!==kana).sort((a,b)=>score(b)-score(a)).slice(0,n*2);
  return pick(near,n);
}
function listenIds(){
  const known=Object.keys(P.srs).filter(id=>id[0]==="w");
  return pick(known,Math.min(LISTEN_N,known.length));
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

/* ---- finish ---- */
async function finish(){
  const r={date:today(),lesson:run.lesson,
           score:run.r1+run.r2+run.r3+(run.r4||0)+(run.r5||0),
           max:5+run.r2max+3+(run.r4max||0)+(run.r5max||0),
           gIdx:run.gIdx,sIdx:run.sIdx,newIds:run.newIds,dueIds:run.dueIds,
           wIds:run.wIds||[],lIds:run.lIds||[],noVoice:!!run.noVoice};
  const scored=run.scored;
  if(scored){
    if(P.last===yesterday())P.streak=(P.streak||0)+1;
    else if(P.last!==r.date)P.streak=1;
    P.last=r.date;
    P.best=Math.max(P.best||0,P.streak);
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
  $("dScore").textContent=r.score;
  $("dOf").textContent="/ "+r.max;
  $("dGrade").textContent=pct===1?"· clean sweep":pct>=.85?"· strong":pct>=.6?"· solid":"· it’ll stick tomorrow";
  $("dStreak").innerHTML=scored
    ? "<b>"+P.streak+(P.streak===1?" day":" days")+" in a row.</b> Best so far: "+P.best+"."
    : "Streak and review schedule left untouched.";
  const g=GROUPS[r.gIdx];
  $("dGroupH").textContent="The thread — "+g.answer;
  rowsInto($("dGroupRows"),g.clues.map(c=>[c[0],esc(c[2])+" <i>"+esc(c[1])+"</i>"]));
  rowsInto($("dNewRows"),(r.newIds||[]).map(id=>{
    const it=item(id);
    return [it.face,esc(it.en)+" <i>"+esc(it.kana?it.kana+" · "+it.romaji:it.romaji)+"</i>"];
  }));
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
  const s=SENTENCES[r.sIdx];
  $("dSent").textContent=s.tiles.map(t=>t[0]).join("");
  $("dSentEn").textContent=s.en;
  $("dSentWhy").innerHTML="<b>"+esc(s.pattern)+"</b> — "+esc(s.note);
  setupReminder();
  $("dFoot").textContent="Day "+(P.lesson+1)+" ("+"第"+jaNum(P.lesson+1)+"日"+") unlocks tomorrow.";
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
  run={scored,lesson:l,gIdx:l%GROUPS.length,g:GROUPS[l%GROUPS.length],sIdx:l%SENTENCES.length,
       newIds:nw,dueIds:[],plan,step:-1,
       r1:0,r2:0,r2max:0,r3:0,r4:0,r4max:0,r5:0,r5max:0,qs:[],qi:0};
  buildPips(plan.length);
  $("pips").hidden=false;
  nextStep();
}
function refresh(){
  if(run)return;
  paintStreak();
  if(P.lastRun&&P.lastRun.date===today()){
    buildPips(roundsFor((P.lastRun.lesson||0)+1).length);
    $("pips").hidden=false; renderDone(P.lastRun,true);
  }
  else{$("pips").hidden=true;renderStart();show("sc-start")}
}
$("go").onclick=()=>startRun(true);
$("again").onclick=()=>startRun(false);

try{if("speechSynthesis" in window){speechSynthesis.getVoices();
  speechSynthesis.onvoiceschanged=()=>speechSynthesis.getVoices()}}catch(e){}

const local=loadLocal(); if(local)P=local;
refresh();
initCloud().then(ok=>{
  $("syncFoot").textContent=ok
    ? "Progress is saved to your Claude account, so it follows you between devices."
    : "Progress is saved in this browser only.";
  refresh();
});
})();
