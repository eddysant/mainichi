/* Turns the example sentences in content.js into tile puzzles for round three, and
   writes tiles.js. Run it after editing content.js, then ./build.sh.

   Japanese is written without spaces, so the tiles have to be recovered by parsing.
   The danger is not failing to parse — it is parsing confidently and wrongly: くるまで
   いきます ("I go by car") also reads as くる|まで|いき ("came-until-go"), and a wrong
   split in a round whose whole job is teaching word order would teach the opposite of
   the truth. So this tool never guesses. A sentence earns a puzzle only when exactly
   one grammatically valid parse exists; everything else is rejected and listed, and
   the rejects are sentences to rewrite rather than bugs to work around.

   Validity is what keeps uniqueness honest. Uniqueness alone still accepted
   そら|は|あお|い|です, because い is the stem of いる — but いです is not Japanese. So each
   generated form carries the shape it is (dictionary form, polite stem, て-form,
   past adjective) and each ending states which shape may precede it. */
const fs=require("fs"), path=require("path");
const ROOT=path.join(__dirname,"..");
const src=fs.readFileSync(path.join(ROOT,"content.js"),"utf8");
eval(src+";global.W=WORDS;global.KW=KATA_WORDS;global.U=USAGE;global.P=PARTICLES");

/* Part of speech, read off the glosses the content set already writes: every verb and
   only a verb is glossed "to ...", and an い-adjective is the one written with its い
   in the kanji face, which 先生 is not. */
const pos=w=>/^to /.test(w[3]) ? "verb" : (/い$/.test(w[0])&&/い$/.test(w[1]) ? "adj" : "noun");

const ROW={"う":"い","く":"き","ぐ":"ぎ","す":"し","つ":"ち","ぬ":"に","ぶ":"び","む":"み","る":"り"};
const TE ={"う":"って","つ":"って","る":"って","く":"いて","ぐ":"いで","す":"して","ぬ":"んで","ぶ":"んで","む":"んで"};
/* A る verb could be either conjugation, and the difference matters: 知る is godan, so
   its polite form is 知ります and a stem of し is not a form of it at all — which is what
   made it collide with する and cost every noun+します compound. Nothing in the word list
   says which class a verb is in, but the word's own example sentence does, because the
   checker guarantees the sentence contains it: 知る's reads しっています, and って is godan.
   Where the sentence settles it, only that class's forms are generated. */
function cls(w){
  const kana=w[1], stem=kana.slice(0,-1), ja=(U[kana===w[1]?w[0]:w[0]]||[])[0]||"";
  if(kana.slice(-1)!=="\u308b") return null;
  const godan=[stem+"\u308a",stem+"\u3063\u3066"].some(f=>ja.indexOf(f)>=0);
  const ichi =[stem+"\u307e",stem+"\u3066"].some(f=>ja.indexOf(f)>=0)
    ||new RegExp(stem+"(\u307e\u3059|\u307e\u3057\u305f|\u307e\u305b\u3093)").test(ja);
  if(godan&&!ichi) return "godan";
  if(ichi&&!godan) return "ichidan";
  return null;
}
function forms(w){
  const kana=w[1], last=kana.slice(-1), stem=kana.slice(0,-1), p=pos(w), out=[];
  const put=(s,shape)=>{ if(s) out.push({s,shape}) };
  put(kana,"dict");
  if(p==="verb"){
    if(ROW[last]) put(stem+ROW[last],"stem");
    if(TE[last])  put(stem+TE[last],"te");
    const c=cls(w);
    if(last==="る"&&c!=="godan"){ put(stem,"stem"); put(stem+"て","te"); }
    if(kana==="くる"){ put("き","stem"); put("きて","te"); }
    if(kana==="する"){ put("し","stem"); put("して","te"); }
  }
  if(p==="adj"){ put(stem+"かった","past"); put(stem+"く","adv"); put(stem+"くて","te"); }
  return out;
}

/* Endings, longest first, each naming the shapes it may follow. です takes a noun or an
   adjective, never a verb stem — that is the rule that rejects いです. */
const ENDS=[
  ["ませんでした",["stem"]],["ましょう",["stem"]],["ませんか",["stem"]],["ません",["stem"]],
  ["ました",["stem"]],["ます",["stem"]],
  ["います",["te"]],["いる",["te"]],["ください",["te"]],
  ["でした",["dict","past"]],["です",["dict","past"]]
].sort((a,b)=>b[0].length-a[0].length);

const END_NOTE={
  "ます":"ます closes a polite verb, and the verb always lands at the end.",
  "ました":"ました is the polite past. The verb still lands at the end.",
  "ません":"ません is the polite negative — the ending carries the \u201cnot\u201d.",
  "ませんでした":"ませんでした is the polite past negative.",
  "ましょう":"ましょう suggests doing something together.",
  "ませんか":"ませんか invites — \u201cwon\u2019t you?\u201d",
  "ください":"ください asks for something politely, after the \u3066 form of the verb.",
  "ています":"\u3066います says it is going on right now.",
  "ている":"\u3066いる says it is going on right now.",
  "でした":"でした is the past of です."
};
const PART={"は":"topic marker","を":"object marker","が":"subject marker","に":"to / at",
  "へ":"toward","の":"of","と":"with","で":"by","も":"topic marker","から":"to / at",
  "まで":"to / at","や":"with","か":"question"};
/* Words every sentence needs and the curriculum never teaches as vocabulary. */
const FUNC={"わたし":["I","topic"],"これ":["this","subject"],"それ":["that","subject"],
  "あれ":["that","subject"],"この":["this","pointer"],"その":["that","pointer"],
  "あの":["that","pointer"],"なん":["what","question word"],"なに":["what","question word"],
  "どこ":["where","question word"],"だれ":["who","question word"],"いつ":["when","question word"],
  "なんじ":["what time","question word"],"ひとり":["one person","noun"],
  "ふたり":["two people","noun"],"さんにん":["three people","noun"],"いちど":["once","time"],
  "ちょっと":["a moment","adverb"],"すこし":["a little","adverb"],"とても":["very","adverb"],
  "まいあさ":["every morning","time"],"ここ":["here","place"],"つぎ":["next","noun"]};

const lex=new Map();
const add=(s,e)=>{ e.srf=s; const a=lex.get(s)||[]; a.push(e); lex.set(s,a) };
W.forEach((w,i)=>forms(w).forEach(f=>add(f.s,{kind:"word",id:"w"+i,face:w[0],en:w[3],pos:pos(w),shape:f.shape})));
KW.forEach((w,i)=>add(w[0],{kind:"word",id:"v"+i,face:w[0],en:w[2],pos:"noun",shape:"dict"}));
Object.keys(FUNC).forEach(k=>add(k,{kind:"func",face:k,en:FUNC[k][0],role:FUNC[k][1],shape:"dict",pos:"noun"}));
Object.keys(PART).forEach(p=>add(p,{kind:"part",face:p,role:PART[p],shape:"part"}));

/* Every ending the tail could be, not just the longest. ねこがいます is ねこ・が・い +
   ます, while こまっています is こまって + います — the same four characters, split two
   ways, and only a successful parse of what comes before can tell them apart. Settling
   the ending first got this wrong in both directions: it ate the て that a verb's own
   て-form supplies, and it would have taken います off ねこがいます and left a dangling
   particle. */
function endSplits(s){
  return ENDS.filter(([e])=>s.endsWith(e)&&s.length>e.length)
             .map(([e,shapes])=>[s.slice(0,-e.length),e,shapes]);
}
/* Every parse of the body, then the grammar filter. Mid-sentence a word may only wear
   its dictionary form or an adverb — a bare polite stem or て-form floating in the
   middle of one of these sentences is a mis-parse, not a sentence. */
function parses(body){
  const memo=new Map();
  (function(){})();
  function go(i){
    if(i===body.length) return [[]];
    if(memo.has(i)) return memo.get(i);
    const out=[];
    for(let j=Math.min(body.length,i+8);j>i;j--){
      const es=lex.get(body.slice(i,j));
      if(!es)continue;
      for(const r of go(j)) for(const e of es){ if(out.length<600) out.push([e].concat(r)) }
    }
    memo.set(i,out); return out;
  }
  return go(0);
}
function valid(toks,endShapes){
  if(!toks.length) return false;
  const last=toks[toks.length-1];
  if(last.kind==="part") return false;
  if(!endShapes.includes(last.shape)) return false;
  if(last.shape==="dict"&&last.kind==="word"&&last.pos==="verb") return false;
  for(let i=0;i<toks.length-1;i++){
    const t=toks[i];
    if(t.kind==="part"){ if(toks[i+1].kind==="part") return false; continue }
    if(t.shape!=="dict"&&t.shape!=="adv"&&t.shape!=="te") return false;
    const nx=toks[i+1];
    /* A て-form hands straight on to another verb: かさを もって いきます. It is the one
       place a verb may stand mid-sentence, and the round labels it as what it is. */
    /* て + いる is the progressive and belongs to the ending, so いる is not one of the
       verbs a て-form may hand on to — otherwise よんでいます reads as よんで・い・ます. */
    if(t.shape==="te"){ if(nx.kind==="word"&&nx.pos==="verb"&&nx.srf!=="い") continue; return false }
    if(t.pos==="verb") return false;
    if(nx.kind==="part") continue;
    /* A noun in front of する is one verb: 勉強 + します is "study". */
    if(nx.kind==="word"&&nx.face==="する"&&t.pos==="noun") continue;
    const licensed=t.pos==="adj"||t.shape==="adv"||BARE.has(t.srf)
      ||t.role==="pointer"||t.role==="adverb"||t.role==="time";
    if(!licensed) return false;
  }
  return true;
}

/* A word normally hands off to a particle, and demanding that is what keeps the parse
   honest. Two things stand without one, so they are named rather than inferred: an
   い-adjective sitting in front of the noun it describes, and a time or adverb word
   opening the sentence. Naming them costs a list; relaxing the rule instead cost 60
   puzzles and four times the ambiguity. */
const TIME=new Set(["いま","きょう","あした","きのう","まいにち","まいあさ","あさ","ひる",
  "よる","こんばん","らいねん","きょねん","ことし","こんしゅう","らいしゅう","せんしゅう",
  "しゅうまつ","あとで"]);
const ADV=new Set(["いちばん","すぐ","もう","まだ","あまり","よく","たくさん","すこし",
  "とても","ちょっと","また","ゆっくり","はやく","いつも","ときどき"]);
const BARE=new Set([...TIME,...ADV]);

/* The role a word plays is told by the particle after it. */
const BY_PART={"は":"topic","が":"subject","を":"object"};
function roleOf(t,next,isPred){
  if(t.kind==="part") return t.role;
  if(t.role) return t.role;
  if(isPred) return t.pos==="adj"?"adjective":"noun";
  if(t.shape==="te") return "te form";
  if(t.shape==="adv"||ADV.has(t.srf)) return "adverb";
  if(t.pos==="adj") return "adjective";
  if(TIME.has(t.srf)&&next&&next.kind!=="part") return "time";
  if(next&&next.kind==="part") return BY_PART[next.face]||"noun";
  return "noun";
}
/* The pattern line names each slot the way the hand-written sentences do, so "X を
   VERB" reads as a shape rather than a row of identical letters. */
const PAT=r=>({topic:"X",subject:"X",object:"X",noun:"B",adjective:"ADJ",verb:"VERB",
  "is / am":"です",place:"X",time:"TIME",person:"X",adverb:"ADV","question word":"",
  pointer:"","te form":"VERB-\u3066"}[r]);

const made=[], rejected=[];
Object.keys(U).forEach(k=>{
  const whole=U[k][0].replace(/。$/,"");
  const q=/か$/.test(whole);
  const core=q?whole.slice(0,-1):whole;
  const splits=endSplits(core);
  if(!splits.length){ rejected.push([k,U[k][0],"no polite ending"]); return }
  const bySplit=new Map(); const endOf=new Map();
  splits.forEach(([body,e,shapes])=>{
    parses(body).filter(t=>valid(t,shapes)).filter(t=>t.some(x=>x.face===k)).forEach(t=>{
      const key=t.map(x=>x.srf).join("|")+"+"+e;
      if(!bySplit.has(key)){ bySplit.set(key,[]); endOf.set(key,e) }
      bySplit.get(key).push(t);
    });
  });
  if(!bySplit.size){ rejected.push([k,U[k][0],"no valid parse"]); return }
  /* Fewest tiles wins — a whole word beats the same characters in pieces: はなします is
     はなし・ます, not はな・し・ます. This is safe only because the shape rules already
     refuse a dictionary-form verb mid-sentence, which is what made くる・まで・いき cheap
     enough to win on an earlier attempt. A tie is still a rejection. */
  const least=Math.min(...[...bySplit.values()].map(v=>v[0].length));
  [...bySplit.keys()].forEach(key=>{ if(bySplit.get(key)[0].length>least) bySplit.delete(key) });
  if(bySplit.size>1){ rejected.push([k,U[k][0],"ambiguous: "+[...bySplit.keys()].join("  /  ")]); return }
  /* One split, but possibly several words that would write it that way. The tiles are
     the same either way; the gloss printed on them is not, so a genuine clash of
     meanings is a rejection rather than a coin toss. */
  const key0=[...bySplit.keys()][0], end=endOf.get(key0);
  const cands=bySplit.get(key0);
  const glosses=new Set(cands.map(t=>t.map(x=>x.en||"").join("|")));
  if(glosses.size>1){ rejected.push([k,U[k][0],"two readings: "+[...glosses].join("  /  ")]); return }
  const toks=cands[0];

  /* ます and its family are inflection and ride on the verb, the way the hand-written
     sentences already do; です is a separable copula and stays its own tile. */
  const tiles=[];
  const id=(toks.find(t=>t.kind==="word"&&t.face===k)||{}).id||null;
  const surf=toks.map(t=>t.srf);
  toks.forEach((t,i)=>{
    const isPred=i===toks.length-1;
    const verbish=isPred&&end!=="です"&&end!=="でした";
    const r=verbish?"verb":roleOf(t,toks[i+1],isPred);
    /* "to hold, to carry" is a dictionary gloss; on a tile it reads as "hold, carry". */
    const gloss=t.kind==="part"?"":(t.en||"").replace(/^to /,"").replace(/, to /g,", ");
    tiles.push([verbish?surf[i]+end:surf[i], gloss, r]);
  });
  if(end==="です"||end==="でした") tiles.push([end,"","is / am"]);
  if(q) tiles.push(["か","","question"]);
  if(tiles.map(t=>t[0]).join("")!==whole){ rejected.push([k,U[k][0],"tiles do not rejoin"]); return }

  /* A single tile is not a puzzle — there is no order to get right. */
  if(tiles.length<2){ rejected.push([k,U[k][0],"only one tile, nothing to order"]); return }

  /* The note is the sentence's own teaching note where it has one, otherwise the
     particle it turns on, otherwise what its ending does. */
  const [enRaw,noteRaw]=U[k][1].split(" — ");
  const partIn=tiles.map(t=>t[0]).find(s=>P[s]);
  const note=noteRaw||P[partIn]||END_NOTE[end]||P["です"];
  const pattern=tiles.map(t=>PART[t[0]]?t[0]:(t[2]==="pointer"||t[2]==="question word"?t[0]:PAT(t[2])||t[0]))
    .filter(Boolean).join(" ");
  made.push({id,en:enRaw.trim(),pattern,note,tiles});
});

const out=['/* Round-three tile puzzles, generated by tools/make-tiles.js from the example',
' sentences in content.js. Do not edit by hand — edit the sentence and regenerate.',
' Each entry names the word it teaches, so the round only offers sentences built from',
' words the learner has actually met. */',
'const BUILD = ['].concat(made.map(b=>
'  { id:'+JSON.stringify(b.id)+', en:'+JSON.stringify(b.en)+', pattern:'+JSON.stringify(b.pattern)+',\n'+
'    note:'+JSON.stringify(b.note)+',\n'+
'    tiles:'+JSON.stringify(b.tiles)+' },')).concat(['];','']).join("\n");
fs.writeFileSync(path.join(ROOT,"tiles.js"),out);

console.log(made.length+" puzzles written to tiles.js, "+rejected.length+" sentences rejected");
if(process.argv[2]==="-v") rejected.forEach(r=>console.log("  - "+r[0]+"  "+r[1]+"  "+r[2]));
else { const by={}; rejected.forEach(r=>{const t=r[2].split(":")[0];by[t]=(by[t]||0)+1});
  Object.entries(by).sort((a,b)=>b[1]-a[1]).forEach(([t,n])=>console.log("  "+n+"  "+t));
  console.log("  (-v lists them)"); }
