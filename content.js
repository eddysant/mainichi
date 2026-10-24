/* Mainichi — content set. Each day introduces one hiragana, one katakana, one katakana
   loanword and one kanji word; round two then drills two of each. */
const KANA = [
  ["あ","a"],["い","i"],["う","u"],["え","e"],["お","o"],
  ["か","ka"],["き","ki"],["く","ku"],["け","ke"],["こ","ko"],
  ["さ","sa"],["し","shi"],["す","su"],["せ","se"],["そ","so"],
  ["た","ta"],["ち","chi"],["つ","tsu"],["て","te"],["と","to"],
  ["な","na"],["に","ni"],["ぬ","nu"],["ね","ne"],["の","no"],
  ["は","ha"],["ひ","hi"],["ふ","fu"],["へ","he"],["ほ","ho"],
  ["ま","ma"],["み","mi"],["む","mu"],["め","me"],["も","mo"],
  ["や","ya"],["ゆ","yu"],["よ","yo"],
  ["ら","ra"],["り","ri"],["る","ru"],["れ","re"],["ろ","ro"],
  ["わ","wa"],["を","wo"],["ん","n"]
];

/* Katakana in the same gojūon order as the hiragana above, so day N teaches the
   hiragana and the katakana for one sound together — あ/ア on the same day. */
const KATAKANA = [
  ["ア","a"],["イ","i"],["ウ","u"],["エ","e"],["オ","o"],
  ["カ","ka"],["キ","ki"],["ク","ku"],["ケ","ke"],["コ","ko"],
  ["サ","sa"],["シ","shi"],["ス","su"],["セ","se"],["ソ","so"],
  ["タ","ta"],["チ","chi"],["ツ","tsu"],["テ","te"],["ト","to"],
  ["ナ","na"],["ニ","ni"],["ヌ","nu"],["ネ","ne"],["ノ","no"],
  ["ハ","ha"],["ヒ","hi"],["フ","fu"],["ヘ","he"],["ホ","ho"],
  ["マ","ma"],["ミ","mi"],["ム","mu"],["メ","me"],["モ","mo"],
  ["ヤ","ya"],["ユ","yu"],["ヨ","yo"],
  ["ラ","ra"],["リ","ri"],["ル","ru"],["レ","re"],["ロ","ro"],
  ["ワ","wa"],["ヲ","wo"],["ン","n"]
];

/* Katakana loanwords — where katakana pays off. Ordered by how often you meet them
   rather than by which characters they use: a loanword is shown with its reading and
   meaning, so it teaches the shapes in context long before all 46 are learned.
   The fourth field is a note, for the ones that are not what an English reader expects. */
const KATA_WORDS = [
  ["コーヒー","koohii","coffee","The ー is a long vowel: koo-hii, four beats."],
  ["テレビ","terebi","television","Clipped from テレビジョン. Japanese shortens long loans."],
  ["パン","pan","bread","From Portuguese pão, not English — the oldest layer of loanwords."],
  ["ビール","biiru","beer","From Dutch bier."],
  ["カメラ","kamera","camera",""],
  ["バス","basu","bus",""],
  ["タクシー","takushii","taxi",""],
  ["ホテル","hoteru","hotel",""],
  ["レストラン","resutoran","restaurant",""],
  ["ケーキ","keeki","cake",""],
  ["ジュース","juusu","juice","Covers any soft drink, not just juice."],
  ["ミルク","miruku","milk",""],
  ["チーズ","chiizu","cheese",""],
  ["サラダ","sarada","salad",""],
  ["カレー","karee","curry",""],
  ["ラーメン","raamen","ramen",""],
  ["パソコン","pasokon","computer","パーソナルコンピューター squeezed to four beats."],
  ["スマホ","sumaho","smartphone","スマートフォン, clipped the same way."],
  ["メール","meeru","email",""],
  ["ニュース","nyuusu","news",""],
  ["スポーツ","supootsu","sport",""],
  ["サッカー","sakkaa","football","The small ッ doubles the next sound: sak-kaa."],
  ["テニス","tenisu","tennis",""],
  ["ゲーム","geemu","game",""],
  ["ギター","gitaa","guitar",""],
  ["ピアノ","piano","piano","From Italian."],
  ["ドア","doa","door",""],
  ["ベッド","beddo","bed",""],
  ["テーブル","teeburu","table",""],
  ["シャツ","shatsu","shirt",""],
  ["ズボン","zubon","trousers","From French jupon."],
  ["コート","kooto","coat",""],
  ["ネクタイ","nekutai","tie","From “necktie”."],
  ["ベルト","beruto","belt",""],
  ["ペン","pen","pen",""],
  ["ノート","nooto","notebook","A notebook, never a written note."],
  ["カード","kaado","card",""],
  ["チケット","chiketto","ticket",""],
  ["プレゼント","purezento","present, gift",""],
  ["トイレ","toire","toilet","Clipped from トイレット."],
  ["スーパー","suupaa","supermarket",""],
  ["デパート","depaato","department store",""],
  ["コンビニ","konbini","convenience store","コンビニエンスストア, clipped."],
  ["アパート","apaato","flat, apartment",""],
  ["エレベーター","erebeetaa","lift, elevator",""],
  ["クラス","kurasu","class",""],
  ["ページ","peeji","page",""],
  ["スキー","sukii","skiing",""],
  ["ゴルフ","gorufu","golf",""],
  ["バスケット","basuketto","basketball",""],
  ["アメリカ","amerika","America","Country names are katakana too."],
  ["イギリス","igirisu","Britain","From Portuguese inglês, not “English”."]
];

const WORDS = [
  ["水","みず","mizu","water"],
  ["猫","ねこ","neko","cat"],
  ["犬","いぬ","inu","dog"],
  ["本","ほん","hon","book"],
  ["山","やま","yama","mountain"],
  ["川","かわ","kawa","river"],
  ["人","ひと","hito","person"],
  ["空","そら","sora","sky"],
  ["海","うみ","umi","sea"],
  ["雨","あめ","ame","rain"],
  ["雪","ゆき","yuki","snow"],
  ["風","かぜ","kaze","wind"],
  ["花","はな","hana","flower"],
  ["魚","さかな","sakana","fish"],
  ["鳥","とり","tori","bird"],
  ["馬","うま","uma","horse"],
  ["木","き","ki","tree"],
  ["月","つき","tsuki","moon"],
  ["車","くるま","kuruma","car"],
  ["家","いえ","ie","house"],
  ["駅","えき","eki","station"],
  ["町","まち","machi","town"],
  ["店","みせ","mise","shop"],
  ["道","みち","michi","road"],
  ["学校","がっこう","gakkou","school"],
  ["大学","だいがく","daigaku","university"],
  ["先生","せんせい","sensei","teacher"],
  ["学生","がくせい","gakusei","student"],
  ["友達","ともだち","tomodachi","friend"],
  ["名前","なまえ","namae","name"],
  ["母","はは","haha","mother"],
  ["父","ちち","chichi","father"],
  ["姉","あね","ane","older sister"],
  ["兄","あに","ani","older brother"],
  ["妹","いもうと","imouto","younger sister"],
  ["弟","おとうと","otouto","younger brother"],
  ["手","て","te","hand"],
  ["足","あし","ashi","leg, foot"],
  ["目","め","me","eye"],
  ["耳","みみ","mimi","ear"],
  ["口","くち","kuchi","mouth"],
  ["頭","あたま","atama","head"],
  ["白","しろ","shiro","white"],
  ["黒","くろ","kuro","black"],
  ["赤","あか","aka","red"],
  ["青","あお","ao","blue"],
  ["今","いま","ima","now"],
  ["今日","きょう","kyou","today"],
  ["明日","あした","ashita","tomorrow"],
  ["昨日","きのう","kinou","yesterday"],
  ["毎日","まいにち","mainichi","every day"],
  ["時間","じかん","jikan","time"],
  ["何","なに","nani","what"],
  ["誰","だれ","dare","who"],
  ["ご飯","ごはん","gohan","rice, a meal"],
  ["肉","にく","niku","meat"],
  ["野菜","やさい","yasai","vegetable"],
  ["お茶","おちゃ","ocha","tea"],
  ["電車","でんしゃ","densha","train"],
  ["食べる","たべる","taberu","to eat"],
  ["飲む","のむ","nomu","to drink"],
  ["行く","いく","iku","to go"],
  ["来る","くる","kuru","to come"],
  ["見る","みる","miru","to see, to watch"],
  ["読む","よむ","yomu","to read"],
  ["書く","かく","kaku","to write"],
  ["聞く","きく","kiku","to listen, to ask"],
  ["話す","はなす","hanasu","to speak"],
  ["買う","かう","kau","to buy"],
  ["大きい","おおきい","ookii","big"],
  ["小さい","ちいさい","chiisai","small"],
  ["高い","たかい","takai","tall, expensive"],
  ["安い","やすい","yasui","cheap"],
  ["新しい","あたらしい","atarashii","new"],
  ["古い","ふるい","furui","old"],
  ["長い","ながい","nagai","long"],
  ["早い","はやい","hayai","early"],
  ["春","はる","haru","spring"],
  ["夏","なつ","natsu","summer"],
  ["秋","あき","aki","autumn"],
  ["冬","ふゆ","fuyu","winter"]
];

/* What each particle actually does — used verbatim when a tile is placed wrong,
   so a mistake explains itself instead of just bouncing back. */
const PARTICLES = {
  "は":"は marks the topic — what the sentence is about.",
  "を":"を marks the object — the thing the verb acts on.",
  "が":"が marks the subject, usually new information.",
  "に":"に marks a destination, a time, or the person an action is aimed at.",
  "へ":"へ marks the direction you head in.",
  "の":"の links two nouns: A の B is “B of A”.",
  "と":"と means “with”, or “and” between two nouns.",
  "で":"で marks the means — by train, with a pen.",
  "か":"か at the end turns a statement into a question.",
  "です":"です closes a polite statement."
};

/* How each slot describes itself. Never names the particle it wants — working
   that out is the exercise. */
const ROLE_SAY = {
  "topic":"the topic — what the sentence is about",
  "subject":"the subject",
  "object":"the thing the verb acts on",
  "noun":"a noun",
  "verb":"the verb",
  "verb ending":"the ending that completes the verb",
  "adjective":"a describing word",
  "place":"a place",
  "time":"a time word",
  "person":"a person",
  "pointer":"a word that points at the noun after it",
  "question word":"the question word",
  "topic marker":"the topic marker",
  "object marker":"the object marker",
  "subject marker":"the subject marker",
  "to / at":"a particle meaning “to” or “at”",
  "toward":"a particle meaning “toward”",
  "of":"a particle that links two nouns",
  "with":"a particle meaning “with”",
  "by":"a particle meaning “by” or “with”",
  "question":"the question particle",
  "is / am":"the polite ending"
};

/* One sentence per day, ordered so the grammar builds: を, が, は/です, then
   direction, の, と, で, questions, negative, past. Every tile carries its
   meaning and the job it does, so the only thing being tested is word order. */
const SENTENCES = [
  { en:"I drink water.", pattern:"X を VERB",
    note:"を marks the thing the verb acts on. The verb always lands at the end.",
    tiles:[["みず","water","object"],["を","","object marker"],["のみます","drink","verb"]] },

  { en:"There is a cat.", pattern:"X が います",
    note:"が marks the subject. います is for living things; あります is for objects.",
    tiles:[["ねこ","cat","subject"],["が","","subject marker"],["います","there is","verb"]] },

  { en:"I am a student.", pattern:"A は B です",
    note:"は marks the topic — what the sentence is about. です closes a polite statement.",
    tiles:[["わたし","I","topic"],["は","","topic marker"],["がくせい","student","noun"],["です","am","is / am"]] },

  { en:"This is a book.", pattern:"これ は B です",
    note:"これ means “this thing”, standing on its own. この attaches to a noun instead.",
    tiles:[["これ","this","topic"],["は","","topic marker"],["ほん","book","noun"],["です","is","is / am"]] },

  { en:"The mountain is big.", pattern:"X が ADJ です",
    note:"An い-adjective sits straight before です. Nothing links them.",
    tiles:[["やま","mountain","subject"],["が","","subject marker"],["おおきい","big","adjective"],["です","is","is / am"]] },

  { en:"I read a book.", pattern:"X を VERB",
    note:"The same frame as みず を のみます. Only the noun and the verb changed.",
    tiles:[["ほん","book","object"],["を","","object marker"],["よみます","read","verb"]] },

  { en:"That person is a teacher.", pattern:"あの N は B です",
    note:"あの means “that, over there”. It attaches to the noun it points at.",
    tiles:[["あの","that","pointer"],["ひと","person","noun"],["は","","topic marker"],["せんせい","teacher","noun"],["です","is","is / am"]] },

  { en:"I’m going to the sea.", pattern:"X へ VERB",
    note:"へ marks the direction you head in.",
    tiles:[["うみ","the sea","place"],["へ","","toward"],["いきます","go","verb"]] },

  { en:"I go to school.", pattern:"X に VERB",
    note:"に marks the destination you arrive at. Here it is interchangeable with へ.",
    tiles:[["がっこう","school","place"],["に","","to / at"],["いきます","go","verb"]] },

  { en:"It’s raining.", pattern:"X が VERB-て います",
    note:"-て います describes an action in progress: falling, and still falling.",
    tiles:[["あめ","rain","subject"],["が","","subject marker"],["ふって","falling","verb"],["います","is","verb ending"]] },

  { en:"It’s my dog.", pattern:"A の B です",
    note:"の links two nouns: A の B is “B of A”. わたし の いぬ is “dog of me”.",
    tiles:[["わたし","I / me","noun"],["の","","of"],["いぬ","dog","noun"],["です","it is","is / am"]] },

  { en:"I talk with a friend.", pattern:"X と VERB",
    note:"と means “with”. Between two nouns it means “and” instead.",
    tiles:[["ともだち","friend","person"],["と","","with"],["はなします","talk","verb"]] },

  { en:"I’ll go by train.", pattern:"X で VERB",
    note:"で marks the means — by train, with a pen, in Japanese.",
    tiles:[["でんしゃ","train","noun"],["で","","by"],["いきます","go","verb"]] },

  { en:"What is your name?", pattern:"X は なん です か",
    note:"か at the end makes it a question. The question word sits where the answer would go.",
    tiles:[["なまえ","name","topic"],["は","","topic marker"],["なん","what","question word"],["です","is","is / am"],["か","","question"]] },

  { en:"Where is the station?", pattern:"X は どこ です か",
    note:"Same shape as the last one. どこ takes the place the answer would occupy.",
    tiles:[["えき","station","topic"],["は","","topic marker"],["どこ","where","question word"],["です","is","is / am"],["か","","question"]] },

  { en:"I don’t eat meat.", pattern:"X を VERB-ません",
    note:"-ません is the polite negative: たべます becomes たべません.",
    tiles:[["にく","meat","object"],["を","","object marker"],["たべません","don’t eat","verb"]] },

  { en:"I ate a meal.", pattern:"X を VERB-ました",
    note:"-ました is the polite past: たべます becomes たべました.",
    tiles:[["ごはん","a meal","object"],["を","","object marker"],["たべました","ate","verb"]] },

  { en:"I watched a film yesterday.", pattern:"TIME X を VERB-ました",
    note:"Time words come first, before the thing being acted on.",
    tiles:[["きのう","yesterday","time"],["えいが","film","object"],["を","","object marker"],["みました","watched","verb"]] },

  { en:"This book is expensive.", pattern:"この N は ADJ です",
    note:"この attaches to a noun; これ stands alone. Compare これ は ほん です.",
    tiles:[["この","this","pointer"],["ほん","book","topic"],["は","","topic marker"],["たかい","expensive","adjective"],["です","is","is / am"]] },

  { en:"That shop is new.", pattern:"あの N は ADJ です",
    note:"The same frame as この ほん は たかい です, pointing further away.",
    tiles:[["あの","that","pointer"],["みせ","shop","topic"],["は","","topic marker"],["あたらしい","new","adjective"],["です","is","is / am"]] },

  { en:"I study Japanese every day.", pattern:"TIME X を VERB",
    note:"まいにち sits at the front, exactly where きのう did.",
    tiles:[["まいにち","every day","time"],["にほんご","Japanese","object"],["を","","object marker"],["べんきょうします","study","verb"]] },

  { en:"I’ll ask the teacher.", pattern:"PERSON に VERB",
    note:"に also marks the person an action is aimed at, not only a place.",
    tiles:[["せんせい","teacher","person"],["に","","to / at"],["ききます","ask","verb"]] },

  { en:"I bought tea.", pattern:"X を VERB-ました",
    note:"The same past frame as ごはん を たべました.",
    tiles:[["おちゃ","tea","object"],["を","","object marker"],["かいました","bought","verb"]] },

  { en:"I like tea.", pattern:"X が すき です",
    note:"What you like takes が, not を — すき is a describing word, not a verb.",
    tiles:[["おちゃ","tea","subject"],["が","","subject marker"],["すき","liked","adjective"],["です","is","is / am"]] },

  { en:"What time is it now?", pattern:"TIME なんじ です か",
    note:"なんじ literally asks “what hour”.",
    tiles:[["いま","now","time"],["なんじ","what time","question word"],["です","is","is / am"],["か","","question"]] }
];

const CATEGORIES = [
  "Numbers 1–5","Animals","Colours","Days of the week","Particles",
  "Family members","Food","Parts of the body","Words about time","Verbs of movement",
  "Weather","Places in town","Size and price","Drinks","The five vowels",
  "Katakana loanwords","Question words","Seasons","Counting things","Nature words",
  "Polite verb endings","Parts of a house","School subjects","Clothing",
  "Sports","Things with a screen","Things on a desk"
];

/* Five clues, revealed one at a time. Guess what they share. */
const GROUPS = [
  { answer:"Clothing", clues:[["シャツ","shatsu","shirt"],["ズボン","zubon","trousers"],["コート","kooto","coat"],["ネクタイ","nekutai","tie"],["ベルト","beruto","belt"]] },
  { answer:"Sports", clues:[["サッカー","sakkaa","football"],["テニス","tenisu","tennis"],["ゴルフ","gorufu","golf"],["スキー","sukii","skiing"],["バスケット","basuketto","basketball"]] },
  { answer:"Things with a screen", clues:[["テレビ","terebi","television"],["パソコン","pasokon","computer"],["スマホ","sumaho","smartphone"],["ゲーム","geemu","game"],["カメラ","kamera","camera"]] },
  { answer:"Things on a desk", clues:[["ペン","pen","pen"],["ノート","nooto","notebook"],["カード","kaado","card"],["メール","meeru","email"],["ページ","peeji","page"]] },
  { answer:"Numbers 1–5", clues:[["いち","ichi","one"],["に","ni","two"],["さん","san","three"],["し","shi","four"],["ご","go","five"]] },
  { answer:"Animals", clues:[["ねこ","neko","cat"],["いぬ","inu","dog"],["とり","tori","bird"],["さかな","sakana","fish"],["うま","uma","horse"]] },
  { answer:"Colours", clues:[["あか","aka","red"],["あお","ao","blue"],["しろ","shiro","white"],["くろ","kuro","black"],["きいろ","kiiro","yellow"]] },
  { answer:"Days of the week", clues:[["にちようび","nichiyoubi","Sunday"],["げつようび","getsuyoubi","Monday"],["かようび","kayoubi","Tuesday"],["すいようび","suiyoubi","Wednesday"],["もくようび","mokuyoubi","Thursday"]] },
  { answer:"Particles", clues:[["は","wa","topic marker"],["を","o","object marker"],["に","ni","to, at"],["が","ga","subject marker"],["で","de","by means of"]] },
  { answer:"Family members", clues:[["はは","haha","mother"],["ちち","chichi","father"],["あね","ane","older sister"],["あに","ani","older brother"],["いもうと","imouto","younger sister"]] },
  { answer:"Food", clues:[["ごはん","gohan","rice, a meal"],["パン","pan","bread"],["にく","niku","meat"],["さかな","sakana","fish"],["やさい","yasai","vegetables"]] },
  { answer:"Parts of the body", clues:[["あたま","atama","head"],["て","te","hand"],["あし","ashi","leg"],["め","me","eye"],["みみ","mimi","ear"]] },
  { answer:"Words about time", clues:[["いま","ima","now"],["あした","ashita","tomorrow"],["きのう","kinou","yesterday"],["きょう","kyou","today"],["まいにち","mainichi","every day"]] },
  { answer:"Verbs of movement", clues:[["いきます","ikimasu","go"],["きます","kimasu","come"],["かえります","kaerimasu","return home"],["あるきます","arukimasu","walk"],["はしります","hashirimasu","run"]] },
  { answer:"Weather", clues:[["あめ","ame","rain"],["ゆき","yuki","snow"],["かぜ","kaze","wind"],["くもり","kumori","cloudy"],["はれ","hare","clear skies"]] },
  { answer:"Places in town", clues:[["えき","eki","station"],["がっこう","gakkou","school"],["びょういん","byouin","hospital"],["ぎんこう","ginkou","bank"],["としょかん","toshokan","library"]] },
  { answer:"Size and price", clues:[["おおきい","ookii","big"],["ちいさい","chiisai","small"],["たかい","takai","expensive"],["やすい","yasui","cheap"],["ながい","nagai","long"]] },
  { answer:"Drinks", clues:[["みず","mizu","water"],["おちゃ","ocha","tea"],["コーヒー","koohii","coffee"],["ぎゅうにゅう","gyuunyuu","milk"],["ビール","biiru","beer"]] },
  { answer:"The five vowels", clues:[["あ","a","a"],["い","i","i"],["う","u","u"],["え","e","e"],["お","o","o"]] },
  { answer:"Katakana loanwords", clues:[["テレビ","terebi","television"],["パン","pan","bread"],["コーヒー","koohii","coffee"],["タクシー","takushii","taxi"],["カメラ","kamera","camera"]] },
  { answer:"Question words", clues:[["なに","nani","what"],["だれ","dare","who"],["どこ","doko","where"],["いつ","itsu","when"],["いくら","ikura","how much"]] },
  { answer:"Seasons", clues:[["はる","haru","spring"],["なつ","natsu","summer"],["あき","aki","autumn"],["ふゆ","fuyu","winter"],["つゆ","tsuyu","the rainy season"]] },
  { answer:"Counting things", clues:[["ひとつ","hitotsu","one thing"],["ふたつ","futatsu","two things"],["みっつ","mittsu","three things"],["よっつ","yottsu","four things"],["いつつ","itsutsu","five things"]] },
  { answer:"Nature words", clues:[["やま","yama","mountain"],["かわ","kawa","river"],["うみ","umi","sea"],["そら","sora","sky"],["もり","mori","forest"]] }
];
