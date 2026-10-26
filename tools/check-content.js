/* Transliterate kana to the romaji style this content set uses: shi/chi/tsu/fu/ji,
   long vowels spelled out (ou, uu, ei), small tsu doubles the next consonant,
   ya/yu/yo digraphs. Then check every word's stated romaji matches. */
const B={
 "あ":"a","い":"i","う":"u","え":"e","お":"o",
 "か":"ka","き":"ki","く":"ku","け":"ke","こ":"ko",
 "が":"ga","ぎ":"gi","ぐ":"gu","げ":"ge","ご":"go",
 "さ":"sa","し":"shi","す":"su","せ":"se","そ":"so",
 "ざ":"za","じ":"ji","ず":"zu","ぜ":"ze","ぞ":"zo",
 "た":"ta","ち":"chi","つ":"tsu","て":"te","と":"to",
 "だ":"da","ぢ":"ji","づ":"zu","で":"de","ど":"do",
 "な":"na","に":"ni","ぬ":"nu","ね":"ne","の":"no",
 "は":"ha","ひ":"hi","ふ":"fu","へ":"he","ほ":"ho",
 "ば":"ba","び":"bi","ぶ":"bu","べ":"be","ぼ":"bo",
 "ぱ":"pa","ぴ":"pi","ぷ":"pu","ぺ":"pe","ぽ":"po",
 "ま":"ma","み":"mi","む":"mu","め":"me","も":"mo",
 "や":"ya","ゆ":"yu","よ":"yo",
 "ら":"ra","り":"ri","る":"ru","れ":"re","ろ":"ro",
 "わ":"wa","を":"wo","ん":"n"};
const DIG={"ゃ":"ya","ゅ":"yu","ょ":"yo"};
function roma(k){
  let out="";
  for(let i=0;i<k.length;i++){
    const c=k[i], nx=k[i+1];
    if(c==="っ"){ const n=B[nx]||""; out+=(n[0]==="c"?"t":n[0]||""); continue; }
    if(DIG[c]){ continue; }
    let r=B[c];
    if(r===undefined) return null;
    if(nx&&DIG[nx]){
      if(r.endsWith("i")&&r.length>1){
        const stem=r.slice(0,-1);
        r=(stem==="sh"||stem==="ch"||stem==="j")?stem+DIG[nx].slice(1):stem+DIG[nx];
      }
    }
    out+=r;
  }
  return out;
}
const src=require("fs").readFileSync(require("path").join(__dirname,"..","content.js"),"utf8");
eval(src+";global.W=WORDS;global.KW=KATA_WORDS;global.KA=KANA;global.KT=KATAKANA;global.GROUPS=GROUPS;global.CATEGORIES=CATEGORIES;global.USAGE=USAGE");
const bad=[], dupK=new Map(), dupE=new Map();
W.forEach((w,i)=>{
  const r=roma(w[1]);
  if(r===null) bad.push(w[0]+" ("+w[1]+"): unreadable kana");
  else if(r!==w[2]) bad.push(w[0]+" ("+w[1]+"): says \""+w[2]+"\", transliterates to \""+r+"\"");
  if(dupK.has(w[1])) bad.push("duplicate reading "+w[1]+": "+dupK.get(w[1])+" and "+w[0]);
  else dupK.set(w[1],w[0]);
  if(dupE.has(w[3])) bad.push("duplicate meaning \""+w[3]+"\": "+dupE.get(w[3])+" and "+w[0]);
  else dupE.set(w[3],w[0]);
  if(w.length!==4) bad.push(w[0]+": wrong field count");
});
/* katakana set lines up with the hiragana, and the loanwords are really katakana */
if(KA.length!==KT.length) bad.push("kana sets differ in length");
KA.forEach((k,i)=>{ if(KT[i]&&k[1]!==KT[i][1]) bad.push("kana order differs at "+i); });
const kwSeen=new Set();
KW.forEach(w=>{
  if(kwSeen.has(w[0])) bad.push("duplicate loanword "+w[0]); else kwSeen.add(w[0]);
  if(!/^[\u30a0-\u30ff\u30fc]+$/.test(w[0])) bad.push("not katakana: "+w[0]);
});

/* every grouping answer must be offerable, and every katakana clue teachable */
const cats=new Set(CATEGORIES);
GROUPS.forEach(g=>{
  if(!cats.has(g.answer)) bad.push("group answer not in CATEGORIES: "+g.answer);
  if(g.clues.length!==5) bad.push("not 5 clues: "+g.answer);
  g.clues.forEach(c=>{
    if(/^[\u30a0-\u30ff\u30fc]+$/.test(c[0])&&!kwSeen.has(c[0]))
      bad.push("group word not in KATA_WORDS: "+c[0]+" ("+g.answer+")");
  });
});

/* every reading must be typeable on the round-four keyboard */
const ROWS="あいうえお かきくけこ さしすせそ たちつてと なにぬねの はひふへほ まみむめも やゆよ らりるれろ わを ん".replace(/ /g,"");
const MARKED="がぎぐげござじずぜぞだぢづでどばびぶべぼぱぴぷぺぽぁぃぅぇぉっゃゅょゎ";
const reach=new Set((ROWS+MARKED).split(""));
W.forEach(w=>{ for(const c of w[1]) if(!reach.has(c)) bad.push(w[0]+" ("+w[1]+") needs "+c+", which the keyboard cannot make"); });

/* Example sentences: the key must be a real word, and the sentence must actually
   contain it. A conjugated verb will not contain its dictionary form — たべる appears as
   たべます — so the stem counts too, which is loose enough to pass a real inflection and
   still catch a sentence pasted against the wrong word. Duplicate keys are counted in
   the source, because the object literal would silently swallow them. */
const byFace=new Map(W.map(w=>[w[0],w[1]]).concat(KW.map(w=>[w[0],w[0]])));
Object.keys(USAGE||{}).forEach(k=>{
  const reading=byFace.get(k);
  if(!reading){ bad.push("usage key is not a word: "+k); return; }
  const [ja,en]=USAGE[k];
  const kana=reading, stem=kana.length>1?kana.slice(0,-1):kana;
  /* the two irregular verbs change their stem outright: くる → きます, する → します */
  const IRREG={"来る":["き","こ"],"する":["し"]};
  const forms=[kana,stem].concat(IRREG[k]||[]);
  if(!forms.some(f=>ja.indexOf(f)>=0))
    bad.push("usage for "+k+" does not contain "+kana+": "+ja);
  if(!/\u3002$/.test(ja)) bad.push("usage for "+k+" does not end in \u3002");
  if(!en||!en.trim()) bad.push("usage for "+k+" has no English");
});
/* Coverage is complete, so hold it there: a word added without a sentence is a word
   that will be taught as a bare gloss. And no two words may share a sentence — that is
   always a copy-paste slip, never a choice. */
W.concat(KW).forEach(w=>{ if(!USAGE[w[0]]) bad.push("no example sentence: "+w[0]); });
const dupJa=new Map();
Object.keys(USAGE||{}).forEach(k=>{
  const ja=USAGE[k][0];
  if(dupJa.has(ja)) bad.push("two words share a sentence: "+dupJa.get(ja)+" and "+k+" — "+ja);
  else dupJa.set(ja,k);
});
const keyRe=/^\s*"([^"]+)":\s*\[/gm;
const usageBlock=src.slice(src.indexOf("const USAGE"),src.indexOf("const PARTICLES"));
const seenKey=new Set(); let m;
while((m=keyRe.exec(usageBlock))) {
  if(seenKey.has(m[1])) bad.push("duplicate usage key: "+m[1]); else seenKey.add(m[1]);
}

if(bad.length){ console.log("PROBLEMS ("+bad.length+"):"); [...new Set(bad)].forEach(b=>console.log("  - "+b)); process.exit(1); }
console.log("content OK");
console.log("  "+W.length+" words \u2014 romaji re-derived from kana and matching, readings and meanings unique, all typeable");
console.log("  "+KA.length+" hiragana / "+KT.length+" katakana, aligned; "+KW.length+" loanwords, all katakana");
console.log("  "+GROUPS.length+" grouping puzzles, every answer a real category");
console.log("  "+Object.keys(USAGE||{}).length+" example sentences \u2014 one per word, none shared, each containing its word");
