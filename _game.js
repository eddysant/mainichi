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

/* ---- items ---- */
const kanaItem=i=>({id:"k"+i,type:"kana",face:KANA[i][0],kana:"",romaji:KANA[i][1],en:"the sound “"+KANA[i][1]+"”"});
const wordItem=i=>({id:"w"+i,type:"word",face:WORDS[i][0],kana:WORDS[i][1],romaji:WORDS[i][2],en:WORDS[i][3]});
const item=id=>id[0]==="k"?kanaItem(+id.slice(1)):wordItem(+id.slice(1));
function newIdsFor(l){const o=[];if(l<KANA.length)o.push("k"+l);if(l<WORDS.length)o.push("w"+l);return o}

/* ---- progress ---- */
const blank=()=>({v:1,lesson:0,plays:0,streak:0,best:0,last:null,history:[],srs:{},lastRun:null});
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
function dueIds(){return dueIdsAt(P.plays)}
function grade(id,ok){
  const s=P.srs[id]||(P.srs[id]={box:0,due:0,seen:0});
  s.box=ok?Math.min(IV.length-1,s.box+1):0;
  s.seen=(s.seen||0)+1;
  s.due=P.plays+IV[s.box];
}

/* ---- round 2 questions ---- */
function mkQ(id){
  const it=item(id), seen=(P.srs[id]||{}).seen||0;
  if(it.type==="kana"){
    const opts=shuffle([it.romaji].concat(pick(KANA.filter(k=>k[1]!==it.romaji),3).map(k=>k[1])));
    return{id,q:"Which sound is this?",big:it.face,sub:"",opts,answer:it.romaji,grid:true,ja:false,
      after:it.face+" = "+it.romaji};
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
  const d=dueIdsAt((P.plays||0)+1).filter(x=>newIdsFor(P.lesson).indexOf(x)<0).length;
  const newN=newIdsFor(P.lesson).length;
  let line;
  if(P.plays===0) line="Three rounds, about fifty seconds. Two new characters today.";
  else if(d) line="Three rounds, about fifty seconds. "+newN+" new, "+Math.min(d,2)+" up for review.";
  else line="Three rounds, about fifty seconds. "+(newN?newN+" new today.":"Review only today.");
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
    $("tBadge").textContent=ids.length>1?"New today · "+(i+1)+" of "+ids.length:"New today";
    $("tBig").textContent=it.face;
    $("tSub").textContent=it.kana; $("tSub").hidden=!it.kana;
    $("tLat").textContent=it.romaji;
    $("tEn").innerHTML="<b>"+esc(it.en)+"</b>";
    $("tNext").textContent=i<ids.length-1?"Next":"Try it";
    $("tNext").onclick=()=>{i++;one()};
  })();
}

/* ---- round 2: recall ---- */
function quiz(){
  run.qs=shuffle(run.newIds.concat(run.dueIds)).map(mkQ);
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
  $("rBig").textContent=q.big;
  $("rSub").textContent=q.sub||""; $("rSub").hidden=!q.sub;
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

/* ---- round 3: build ---- */
function r3(){
  show("sc-build"); pip(2,"live");
  const s=SENTENCES[run.sIdx], words=s[0], slot=$("bSlot"), tray=$("bTray");
  let tries=0, done=false;
  $("bEn").textContent=s[1];
  $("bNote").className="note"; $("bNote").textContent="Tap the words into order.";
  slot.innerHTML=""; slot.className="slot"; tray.innerHTML="";
  $("bDone").hidden=true; $("bClear").hidden=false;
  let order=shuffle(words);
  if(words.length>1&&order.join("|")===words.join("|"))order=shuffle(words);
  const trayBtns=order.map(t=>{
    const b=document.createElement("button");
    b.className="tile"; b.textContent=t;
    b.onclick=()=>{
      if(done||b.classList.contains("used"))return;
      b.classList.add("used");
      const p=document.createElement("button");
      p.className="tile"; p.textContent=t;
      p.onclick=()=>{if(done)return;p.remove();b.classList.remove("used");slot.className="slot"};
      slot.appendChild(p); check();
    };
    tray.appendChild(b); return b;
  });
  function check(){
    const c=[...slot.children].map(x=>x.textContent);
    if(c.length<words.length)return;
    if(c.join("|")===words.join("|")){
      done=true; slot.className="slot good";
      run.r3=Math.max(1,3-tries);
      $("bNote").className="note good";
      $("bNote").innerHTML="<b>"+esc(words.join(""))+"</b> · "+esc(s[2]);
      $("bDone").hidden=false; $("bClear").hidden=true; pip(2,"done");
    }else{
      tries++;
      slot.className="slot bad shake";
      setTimeout(()=>slot.classList.remove("shake"),320);
      $("bNote").className="note bad";
      $("bNote").textContent="Not that order. Tap a word to take it back.";
    }
  }
  $("bClear").onclick=()=>{
    if(done)return;
    slot.innerHTML=""; slot.className="slot";
    trayBtns.forEach(b=>b.classList.remove("used"));
  };
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
  $("dSent").textContent=s[0].join("");
  $("dSentEn").textContent=s[1];
  $("dSentWhy").innerHTML="<b>"+esc(s[2])+"</b>";
  $("dFoot").textContent="Day "+(P.lesson+1)+" ("+"第"+jaNum(P.lesson+1)+"日"+") unlocks tomorrow.";
}

/* ---- boot ---- */
function startRun(scored){
  if(scored)P.plays=(P.plays||0)+1;
  const l=P.lesson, nw=newIdsFor(l);
  run={scored,lesson:l,gIdx:l%GROUPS.length,g:GROUPS[l%GROUPS.length],sIdx:l%SENTENCES.length,
       newIds:nw,dueIds:dueIds().filter(x=>nw.indexOf(x)<0).slice(0,2),
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
