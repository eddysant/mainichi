(function(){
const $=id=>document.getElementById(id);
const SCREENS=["sc-start","sc-group","sc-teach","sc-recall","sc-build","sc-done"];
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
   k = hiragana, t = katakana, w = kanji word. */
const SCRIPTS=[["k","hiragana",KANA],["t","katakana",KATAKANA],["w","kanji",WORDS]];
const PER_SCRIPT=2;
const charItem=(p,script,set)=>i=>
  ({id:p+i,type:"char",script,set,face:set[i][0],kana:"",romaji:set[i][1],en:"the sound “"+set[i][1]+"”"});
const kanaItem=charItem("k","hiragana",KANA);
const kataItem=charItem("t","katakana",KATAKANA);
const wordItem=i=>({id:"w"+i,type:"word",script:"kanji",face:WORDS[i][0],kana:WORDS[i][1],romaji:WORDS[i][2],en:WORDS[i][3]});
const item=id=>{const n=+id.slice(1);return id[0]==="k"?kanaItem(n):id[0]==="t"?kataItem(n):wordItem(n)};
/* The lowest item of each script not yet introduced, rather than the one at the
   lesson index: that way adding katakana part-way through does not skip ア onwards,
   and a schedule that drifts for any other reason heals itself. */
function newToday(){
  return SCRIPTS.map(([p,,set])=>{
    for(let i=0;i<set.length;i++)if(!P.srs[p+i])return p+i;
    return null;
  }).filter(Boolean);
}

/* ---- progress ---- */
const blank=()=>({v:1,remindAt:null,lesson:0,plays:0,streak:0,best:0,last:null,history:[],srs:{},lastRun:null});
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
function grade(id,ok){
  const s=P.srs[id]||(P.srs[id]={box:0,due:0,seen:0});
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
  if(seen%2===0){
    const opts=shuffle([it.en].concat(pick(WORDS.filter(w=>w[3]!==it.en),3).map(w=>w[3])));
    return{id,q:"What does this mean?",big:it.face,sub:it.kana,opts,answer:it.en,grid:false,ja:false,
      after:it.face+" ("+it.kana+") — "+it.en};
  }
  const opts=shuffle([it.kana].concat(pick(WORDS.filter(w=>w[1]!==it.kana),3).map(w=>w[1])));
  return{id,q:"How is this read?",big:it.face,sub:"",opts,answer:it.kana,grid:true,ja:true,
    after:it.face+" = "+it.kana+" ("+it.romaji+") — "+it.en};
}

/* ---- chrome ---- */
function pip(i,state){const el=$("pip"+i);el.className="pip"+(state?" "+state:"")}
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
  if(P.plays===0) line="Three rounds, about a minute. A hiragana, a katakana and a kanji word to start.";
  else if(newN) line="Three rounds, about a minute. "+newN+" new, "+qn+" to recall.";
  else line="Three rounds, about a minute. "+qn+" to recall — no new characters left.";
  $("startLine").textContent=line;
  $("go").textContent=P.plays===0?"Start day one":"Start today’s puzzle";
}

/* ---- round 1: grouping ---- */
function r1(){
  show("sc-group"); pip(0,"live"); pip(1,""); pip(2,"");
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
  $("gNext").onclick=teach;
}

/* ---- teach new items ---- */
function teach(){
  const ids=run.newIds.filter(id=>!P.srs[id]);
  if(!ids.length)return quiz();
  let i=0;
  (function one(){
    if(i>=ids.length)return quiz();
    const it=item(ids[i]);
    show("sc-teach"); pip(1,"live");
    $("tBadge").textContent="New today · "+it.script
      +(ids.length>1?" ("+(i+1)+" of "+ids.length+")":"");
    $("tBig").textContent=it.face;
    $("tSub").textContent=it.kana; $("tSub").hidden=!it.kana;
    $("tLat").textContent=it.romaji;
    $("tEn").innerHTML="<b>"+esc(it.en)+"</b>";
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
  if(!run.qs.length){pip(1,"done");return r3()}
  nextQ();
}
function nextQ(){
  if(run.qi>=run.qs.length){pip(1,"done");return r3()}
  const q=run.qs[run.qi], box=$("rOpts");
  show("sc-recall"); pip(1,"live");
  $("rEyebrow").textContent="Round two · recall "+(run.qi+1)+" of "+run.qs.length;
  $("rQ").textContent=q.q;
  $("rBig").textContent=q.big; $("rBig").className="big"+(q.roman?" roman":"");
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
  show("sc-build"); pip(2,"live");
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
      pip(2,"done");
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
  $("bDone").onclick=finish;
}

/* ---- finish ---- */
async function finish(){
  const r={date:today(),lesson:run.lesson,score:run.r1+run.r2+run.r3,max:5+run.r2max+3,
           gIdx:run.gIdx,sIdx:run.sIdx,newIds:run.newIds,dueIds:run.dueIds};
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
  show("sc-done"); pip(0,"done"); pip(1,"done"); pip(2,"done");
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
  run={scored,lesson:l,gIdx:l%GROUPS.length,g:GROUPS[l%GROUPS.length],sIdx:l%SENTENCES.length,
       newIds:nw,dueIds:[],
       r1:0,r2:0,r2max:0,r3:0,qs:[],qi:0};
  $("pips").hidden=false;
  r1();
}
function refresh(){
  if(run)return;
  paintStreak();
  if(P.lastRun&&P.lastRun.date===today()){$("pips").hidden=false;renderDone(P.lastRun,true)}
  else{$("pips").hidden=true;renderStart();show("sc-start")}
}
$("go").onclick=()=>startRun(true);
$("again").onclick=()=>startRun(false);

const local=loadLocal(); if(local)P=local;
refresh();
initCloud().then(ok=>{
  $("syncFoot").textContent=ok
    ? "Progress is saved to your Claude account, so it follows you between devices."
    : "Progress is saved in this browser only.";
  refresh();
});
})();
