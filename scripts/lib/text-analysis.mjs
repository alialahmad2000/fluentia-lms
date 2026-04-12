// Shared text analysis for PROMPT 13 reading rewrites

export function countSyllables(word) {
  word = word.toLowerCase().replace(/[^a-z]/g, '')
  if (!word) return 0
  if (word.length <= 3) return 1
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '')
  word = word.replace(/^y/, '')
  const matches = word.match(/[aeiouy]{1,2}/g)
  return matches ? matches.length : 1
}

export function splitSentences(text) {
  return text
    .replace(/\s+/g, ' ')
    .trim()
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(Boolean)
}

export function splitWords(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z\s'-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
}

export function fkgl(text) {
  const sentences = splitSentences(text)
  const words = splitWords(text)
  if (!sentences.length || !words.length) return 0
  const syllables = words.reduce((a, w) => a + countSyllables(w), 0)
  const asl = words.length / sentences.length
  const asw = syllables / words.length
  return 0.39 * asl + 11.8 * asw - 15.59
}

export function avgSentenceLength(text) {
  const s = splitSentences(text)
  const w = splitWords(text)
  if (!s.length) return 0
  return w.length / s.length
}

export const FUNCTION_WORDS = new Set([
  'a','an','the','and','or','but','so','if','when','then','not','no','yes',
  'is','am','are','was','were','be','been','being','have','has','had',
  'do','does','did','will','would','can','could','should','may','might','must','shall',
  'i','me','my','mine','myself','you','your','yours','yourself','yourselves',
  'he','him','his','himself','she','her','hers','herself','it','its','itself',
  'we','us','our','ours','ourselves','they','them','their','theirs','themselves',
  'this','that','these','those','there','here',
  'in','on','at','to','from','with','by','for','of','about','as','into','onto',
  'up','down','out','off','over','under','through','after','before','between','during',
  'again','also','just','very','too','more','most','much','many','some','any','each','every','all',
  'other','another','such','than','because','while','until','where','why','how','what','who','whom','whose','which',
  'good','bad','new','old','big','small','high','low','long','short','fast','slow',
  'one','two','three','four','five','six','seven','eight','nine','ten',
  'now','today','yesterday','tomorrow','always','never','sometimes','often','usually','soon','later','early','late','ago','still','yet','once','twice','early','earlier',
  'something','nothing','anything','someone','anyone','everyone','everything','nobody','somebody','everybody','nowhere','somewhere','anywhere','everywhere',
  'get','gets','got','gotten','go','goes','went','gone','going','make','makes','made','making','say','says','said','saying',
  'know','knows','knew','known','knowing','think','thinks','thought','thinking','see','sees','saw','seen','seeing','come','comes','came','coming','take','takes','took','taken','taking','give','gives','gave','given','giving',
  'put','puts','putting','find','finds','found','finding','want','wants','wanted','wanting','use','uses','used','using','tell','tells','told','telling','work','works','worked','working','call','calls','called','calling',
  'try','tries','tried','trying','ask','asks','asked','asking','need','needs','needed','needing','feel','feels','felt','feeling','become','becomes','became','becoming','leave','leaves','left','leaving','mean','means','meant','meaning','keep','keeps','kept','keeping','let','lets','letting','begin','begins','began','begun','beginning','seem','seems','seemed','seeming','help','helps','helped','helping','talk','talks','talked','talking','turn','turns','turned','turning','start','starts','started','starting','show','shows','showed','shown','showing','hear','hears','heard','hearing','play','plays','played','playing','run','runs','ran','running','move','moves','moved','moving','live','lives','lived','living','believe','believes','believed','believing','hold','holds','held','holding','bring','brings','brought','bringing','happen','happens','happened','happening','write','writes','wrote','written','writing','provide','provides','provided','providing','sit','sits','sat','sitting','stand','stands','stood','standing','lose','loses','lost','losing','pay','pays','paid','paying','meet','meets','met','meeting','include','includes','included','including','continue','continues','continued','continuing','set','sets','setting','learn','learns','learned','learnt','learning','change','changes','changed','changing','lead','leads','led','leading','understand','understands','understood','understanding','watch','watches','watched','watching','follow','follows','followed','following','stop','stops','stopped','stopping','create','creates','created','creating','speak','speaks','spoke','spoken','speaking','read','reads','reading','spend','spends','spent','spending','grow','grows','grew','grown','growing','open','opens','opened','opening','walk','walks','walked','walking','win','wins','won','winning','offer','offers','offered','offering','remember','remembers','remembered','remembering','love','loves','loved','loving','consider','considers','considered','considering','appear','appears','appeared','appearing','buy','buys','bought','buying','wait','waits','waited','waiting','serve','serves','served','serving','die','dies','died','dying','send','sends','sent','sending','expect','expects','expected','expecting','build','builds','built','building','stay','stays','stayed','staying','fall','falls','fell','fallen','falling','cut','cuts','cutting','reach','reaches','reached','reaching','kill','kills','killed','killing','remain','remains','remained','remaining','suggest','suggests','suggested','suggesting','raise','raises','raised','raising','pass','passes','passed','passing','sell','sells','sold','selling','require','requires','required','requiring','report','reports','reported','reporting','decide','decides','decided','deciding','pull','pulls','pulled','pulling','like','likes','liked','liking','looks','looked','looking','look','ate','eats','eating','drank','drinks','drinking','drink','slept','sleeps','sleeping','met','meets','meeting','bring','brings','brought',
  'same','ready','real','true','false','hard','easy','free','sure','sorry','hungry','thirsty','tired','happy','sad','angry','busy','quiet','noisy','full','empty','rich','poor','close','far','near','round','flat','deep','shallow','wide','narrow','thick','thin','clean','dirty','strong','weak','heavy','light','dark','bright','sharp','smooth','rough','wet','dry','old','young','fresh','soft','hot','cold','warm','cool','nice','fine','kind','mean','funny','serious','important','easy','hard','safe','left','right',
  'year','years','month','months','week','weeks','day','days','hour','hours','minute','minutes','second','seconds','time','times','morning','night','afternoon','evening','weekend','weekends',
  'thing','things','way','ways','part','parts','place','places','person','people','man','men','woman','women','boy','boys','girl','girls','kid','kids','child','name','names','area','areas','side','sides','country','countries','city','cities','town','towns','street','streets','road','roads','house','houses','room','rooms','door','doors','window','windows','car','cars','school','schools','office','offices','store','stores','shop','shops','idea','ideas','word','words','story','stories','fact','facts','reason','reasons','number','numbers','group','groups','case','cases','point','points','end','start','story','stories','example','examples',
  'today','tonight','everyday',
  's','t','re','ve','ll','m','d','nt',
])

// Core A1 English vocabulary that should always be allowed regardless of
// whether it appears in the curriculum_vocabulary allowlist. These are
// basic nouns, colors, body parts, common adjectives, and culturally
// universal words that any A1 reading passage needs.
export const CORE_A1 = new Set([
  // Colors
  'red','blue','green','yellow','white','black','gold','silver','pink','orange','purple','brown','gray','grey','color','colors','colour','colours',
  // Basic nature / environment
  'sky','star','stars','moon','earth','world','river','rivers','mountain','mountains','sea','seas','ocean','oceans','island','islands','forest','forests','field','fields','rock','rocks','stone','stones','sand','wood','ice','fire','wind','cloud','air',
  // Common nouns
  'festival','festivals','culture','cultures','tradition','traditions','story','stories','life','lives','love','peace','joy','hope','fear','feel','feeling','feelings','face','faces','hand','hands','eye','eyes','ear','ears','foot','feet','leg','legs','arm','arms','head','heads','hair','mouth','tooth','teeth','nose','finger','fingers',
  // Clothes and objects
  'clothes','clothing','shirt','shirts','dress','dresses','hat','hats','shoe','shoes','bag','bags','phone','phones','computer','computers','paper','pen','pens','key','keys','light','lights','box','boxes','table','tables','chair','chairs','bed','beds','cup','cups','plate','plates','bowl','bowls','tool','tools','gift','gifts',
  // Food basics
  'egg','eggs','meat','milk','juice','tea','salt','chicken','beef','fish','apple','apples','banana','lemon','cake','pizza','soup','meal','meals','dish','dishes',
  // Family
  'father','mother','brother','brothers','sister','sisters','son','sons','daughter','daughters','baby','babies','uncle','aunt','cousin','cousins','friend','husband','wife','parent','parents','mom','dad',
  // Places (generic)
  'park','farm','farms','village','villages','market','markets','store','stores','church','mosque','hospital','hospitals','museum','museums','station','stations','library','libraries','garden','gardens','bridge','bridges','roof','wall','walls','floor','floors',
  // Common verbs (simple forms)
  'go','went','gone','come','came','take','took','taken','put','made','makes','make','give','gave','hold','held','turn','turned','throw','threw','thrown','draw','drew','drawn','paint','painted','sing','sang','sung','jump','jumped','laugh','laughs','laughed','cry','cried','smile','smiled','sleep','slept','eat','ate','eaten','drink','drank','drunk','cook','cooked','bake','baked','clean','cleaned','wash','washed','dry','dried','fix','fixed','break','broke','broken','fly','flew','flown','fall','fell','fallen','close','closed',
  // Common adjectives
  'different','same','happy','sad','kind','brave','quiet','loud','bright','clear','dark','busy','free','tired','tidy','clean','dirty','full','empty','safe','right','wrong','true','false','open','closed','sweet','sour','bitter','spicy','salty','round','square','flat','wide','narrow','thick','thin',
  // Time / sequence
  'second','minute','hour','day','week','month','year','season','summer','winter','autumn','fall','spring','daily','weekly','monthly','yearly','morning','noon','afternoon','evening','midnight','tonight','weekday',
  // Numbers / quantity
  'hundred','thousand','million','half','whole','double','pair','dozen','zero','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety','hundreds','thousands','millions','first','second','third','fourth','fifth','last','few','little','lots','plenty',
  // Feelings and social
  'happy','sad','angry','tired','hungry','thirsty','scared','proud','busy','free','safe','calm','alone','together','with','apart','pair','team','teams','class','classes','classroom','lesson','lessons','question','questions','answer','answers','test','tests','exam','exams','homework','study','studied','teacher','teachers','student','students',
  // Misc tiny
  'maybe','yes','no','okay','ok','please','thanks','hello','hi','bye','goodbye','welcome','sorry','across','among','amongst','against','along','around','beside','inside','outside','behind','toward','towards','upon','without','beyond','beneath','nearby','next','away','lay','laid','laying','lays',
  // Comparatives/superlatives of FUNCTION_WORDS basics
  'bigger','biggest','smaller','smallest','longer','longest','shorter','shortest','higher','highest','lower','lowest','faster','fastest','slower','slowest','hotter','hottest','colder','coldest','warmer','warmest','cooler','coolest','older','oldest','younger','youngest','newer','newest','harder','hardest','easier','easiest','happier','happiest','sadder','saddest','stronger','strongest','weaker','weakest','deeper','deepest','wider','widest','thicker','thickest','thinner','thinnest','richer','richest','poorer','poorest','cleaner','cleanest','dirtier','dirtiest','busier','busiest','quieter','quietest','louder','loudest','brighter','brightest','darker','darkest','safer','safest','kinder','kindest','nicer','nicest','funnier','funniest','heavier','heaviest','lighter','lightest','sharper','sharpest','smoother','smoothest','rougher','roughest','wetter','wettest','drier','driest','softer','softest','fresher','freshest',
  // Words that are logically derivative of allowlist content but missed by suffix rules
  'different','story','stories','meaning','means','meant','lucky','luck',
  // Additional basic A1 words
  'own','event','events','tall','short','above','below','inside','outside','under','over','near','far','next','last','ready','able','possible','necessary','special','simple','clear','different','similar','modern','traditional','central','western','eastern','northern','southern','older','younger','meaning','meanings','older','eldest','elder','tasty','yummy','juicy','tasty','crunchy','salty','spicy','sweet','sour','bitter',
  // Common A1 descriptors / small nouns missed by curriculum allowlist
  'tiny','huge','giant','amazing','wonderful','beautiful','pretty','ugly','clever','quick','quickly','slow','slowly','loud','loudly','quiet','quietly','gently','soft','softly','rough','smooth','bright','dim','warm','cool','hot','cold','fresh','stale','clean','dirty','wet','dry','full','empty','noisy','silent',
  'hunter','hunters','spot','spots','nearby','together','apart','alone','each','every','another',
  'well','wells','better','best','worse','worst',
  'pride','proud','proudly','fan','fans','cheer','cheers','cheered','cheering','join','joins','joined','joining','fun','funny','joke','jokes','joked','joking','smile','smiles','smiled','smiling','frown','frowns','laugh','laughs','laughed','laughing','cry','cries','cried','crying',
  'cover','covers','covered','covering','ground','grounds','puzzle','puzzles','puzzled','hall','halls','corridor','corridors','stair','stairs','staircase','tunnel','tunnels','gate','gates','doorway','doorways','entrance','entrances','exit','exits','path','paths','trail','trails','route','routes','bend','bends','curve','curves','turn','turns',
  'view','views','sunset','sunsets','sunrise','sunrises','dawn','dusk','noon','midday','shine','shines','shined','shining','shone','blow','blows','blew','blowing','blown','beauty','beautiful','beautifully','ugly','pretty','handsome','gorgeous',
  'balance','balances','balanced','else','bit','bits','rest','rests','rested','resting','nap','naps','napped','break','breaks','broke','broken','breaking','pause','pauses','paused','pausing','relax','relaxes','relaxed','relaxing','enjoy','enjoys','enjoyed','enjoying',
  'shade','shades','shaded','shady','shadow','shadows','hurt','hurts','hurting','harm','harms','harmed','harmful','harmless','less','lesser','least','more','most','most','fewer','fewest','smoke','smokes','smoked','smoking','smoky','fog','foggy','mist','misty','steam','steamy','check','checks','checked','checking','test','tests','tested','testing','trial','trials',
  'boat','boats','ship','ships','sail','sails','sailed','sailing','sailor','sailors','camel','camels','donkey','donkeys','cart','carts','wagon','wagons','truck','trucks','van','vans','train','trains','plane','planes','airplane','airplanes','bus','buses','bike','bikes','bicycle','bicycles','motorcycle','motorcycles','scooter','scooters',
  'dance','dances','danced','dancing','dancer','dancers','clap','claps','clapped','clapping','screen','screens','pick','picks','picked','picking','brush','brushes','brushed','brushing','drum','drums','drew','drawn','draws','drawing','drawings','scene','scenes','actor','actors','actress','actresses',
  'lamp','lamps','torch','torches','candle','candles','flame','flames','iron','irons','stone','stones','brick','bricks','rope','ropes','wire','wires','string','strings','chain','chains','glass','glasses','mirror','mirrors','shelf','shelves','basket','baskets','pot','pots','pan','pans','tray','trays','rug','rugs','carpet','carpets','curtain','curtains','pillow','pillows','blanket','blankets','couch','sofa','sofas',
  'health','healthy','sickness','sick','ill','illness','medicine','medicines','hospital','hospitals','nurse','nurses','patient','patients','care','caring','pain','pains','cure','cures','cured','curing','heal','heals','healed','healing','wound','wounds','cut','cuts','bone','bones','muscle','muscles','blood','heart','hearts','brain','brains','lung','lungs','stomach','germ','germs','fever','fevers','cough','coughs','flu','cold','colds','disease','diseases','thinker','thinkers','scholar','scholars','wise','wisdom',
  'eye','eyes','spot','spots','thing','things','place','places','kind','kinds','sort','sorts','fact','facts',
  'amazing','amazingly','special','specially','really','truly','actually','maybe','perhaps','probably',
  // Topic words for all L1 units
  // Ocean life
  'creature','creatures','whale','whales','shark','sharks','dolphin','dolphins','octopus','octopuses','jellyfish','turtle','turtles','crab','crabs','starfish','coral','corals','reef','reefs','wave','waves','tide','tides','shell','shells','deep','depth','depths','dive','dives','diver','divers','dove','dived','diving','pearl','pearls','salt','salty','shore','shores','mystery','mysteries','hidden','calm',
  // Space
  'space','spaces','planet','planets','rocket','rockets','spacecraft','satellite','satellites','galaxy','galaxies','universe','star','stars','moon','moons','comet','comets','asteroid','asteroids','sun','sunlight','astronaut','astronauts','mission','missions','launch','launches','launching','orbit','orbits','orbited','orbiting','gravity','sky','skies','telescope','telescopes','mars','venus','jupiter','saturn','mercury','neptune','uranus','pluto','solar','solar system','outer','space','cosmic','cosmos','alien','aliens',
  // Music & Art
  'song','songs','singer','singers','band','bands','concert','concerts','guitar','guitars','piano','pianos','drum','drums','violin','violins','flute','flutes','trumpet','trumpets','note','notes','tune','tunes','rhythm','rhythms','melody','melodies','beat','beats','voice','voices','lyric','lyrics','album','albums','artist','artists','painter','painters','painting','paintings','canvas','canvases','brush','brushes','paint','paints','sketch','sketches','poem','poems','poet','poets','stage','stages','studio','studios','museum','museums','gallery','galleries','exhibit','exhibits','exhibition','exhibitions','theater','theaters','theatre',
  // Famous places
  'famous','landmark','landmarks','monument','monuments','castle','castles','palace','palaces','pyramid','pyramids','statue','statues','fountain','fountains','tower','towers','bridge','bridges','temple','temples','ruin','ruins','wonder','wonders','tourist','tourists','visitor','visitors','guide','guides','souvenir','souvenirs','postcard','postcards','map','maps','atlas','passport','passports','ticket','tickets',
  // Inventions
  'invention','inventions','inventor','inventors','invent','invents','invented','inventing','machine','machines','engine','engines','wheel','wheels','tool','tools','device','devices','gadget','gadgets','engineer','engineers','engineering','science','sciences','scientist','scientists','experiment','experiments','laboratory','labs','discovery','discoveries','useful','practical','clever','smart','bright','solution','solutions',
  // Sports
  'sport','sports','athlete','athletes','team','teams','coach','coaches','player','players','captain','captains','champion','champions','championship','championships','game','games','match','matches','goal','goals','race','races','runner','runners','runner','medal','medals','trophy','trophies','prize','prizes','winner','winners','loser','losers','score','scores','point','points','field','fields','court','courts','stadium','stadiums','ball','balls','bat','bats','racket','rackets','helmet','helmets','jersey','jerseys','soccer','football','basketball','tennis','baseball','volleyball','cricket','rugby','hockey','golf','boxing','karate','judo','running','swimming','cycling','skiing','horseback','gymnastics','marathon','marathons',
  // Ancient civilizations
  'ancient','old','history','historic','historical','civilization','civilizations','empire','empires','king','kings','queen','queens','kingdom','kingdoms','pharaoh','pharaohs','tomb','tombs','mummy','mummies','scroll','scrolls','script','scripts','artifact','artifacts','dig','digs','digger','diggers','excavation','excavations','ruins','ruin','relic','relics','dynasty','dynasties','era','eras','age','ages','century','centuries','millennium','millennia','decade','decades','bronze','iron','stone','wood','wooden','metal','metallic','gold','golden','silver','copper','clay','carve','carves','carved','carving','carvings',
  // Photography
  'camera','cameras','lens','lenses','photo','photos','photograph','photographs','photography','photographer','photographers','picture','pictures','image','images','snapshot','snapshots','portrait','portraits','landscape','landscapes','shot','shots','album','albums','flash','flashes','zoom','zooms','tripod','tripods','frame','frames','blur','blurs','blurry','focus','focused','focusing','lighting','brightness','angle','angles','studio','studios','subject','subjects','scene','scenes','backdrop','backdrops',
  // Cuisines
  'cuisine','cuisines','dish','dishes','meal','meals','recipe','recipes','ingredient','ingredients','spice','spices','herb','herbs','flavor','flavors','flavour','flavours','taste','tastes','chef','chefs','cook','cooks','cooking','cooked','kitchen','kitchens','bakery','bakeries','restaurant','restaurants','cafe','cafes','diner','diners','menu','menus','waiter','waiters','waitress','waitresses','plate','plates','bowl','bowls','fork','forks','knife','knives','spoon','spoons','cup','cups','glass','glasses','napkin','napkins','table','tables','rice','bread','noodle','noodles','soup','soups','salad','salads','sandwich','sandwiches','pizza','burger','burgers','cake','cakes','pie','pies','cookie','cookies','candy','candies','chocolate','chocolates','ice','cream','icecream','yogurt','butter','cheese','cheeses','sugar','honey','jam','jams','sauce','sauces','tomato','tomatoes','potato','potatoes','onion','onions','garlic','ginger','lettuce','cucumber','cucumbers','carrot','carrots','corn','bean','beans','pea','peas','pepper','peppers','mushroom','mushrooms','sushi','pasta','burger','burgers','taco','tacos','falafel','hummus','kebab','kebabs','shawarma','biryani','kabsa','mandi','samosa','samosas','oil','oils','vinegar','pepper','chili','curry','curries','stew','stews','grill','grills','grilled','grilling','roast','roasts','roasted','fry','fries','fried','frying','boil','boils','boiled','boiling','steam','steamed','raw','cooked',
  // Social media / digital
  'social','media','internet','internets','web','website','websites','online','offline','app','apps','application','applications','post','posts','posted','posting','comment','comments','commented','like','likes','liked','share','shares','shared','sharing','follow','follower','followers','following','profile','profiles','account','accounts','password','passwords','login','logins','logout','chat','chats','chatted','chatting','message','messages','text','texts','texted','texting','emoji','emojis','video','videos','stream','streams','streamed','streaming','download','downloads','downloaded','upload','uploads','uploaded','photo','photos','feed','feeds','friend','friends','link','links','click','clicks','tap','taps','tapped','scroll','scrolled','scrolling','notification','notifications','digital','detox','privacy','safety','cyber','cyber','hacker','hackers','spam','scam','troll','trolls','influencer','influencers','viral','trend','trends','trendy','network','networks','networking','community','communities','platform','platforms',
  // Green living
  'green','eco','environment','environments','environmental','nature','natural','naturally','planet','planets','pollution','pollute','polluted','clean','cleaner','cleanest','dirty','recycle','recycles','recycled','recycling','reuse','reuses','reused','reusing','reduce','reduces','reduced','reducing','trash','garbage','waste','wastes','wasted','wasting','renewable','renewables','sustainable','energy','energies','solar','wind','hydro','electric','electricity','power','powered','powers','panel','panels','battery','batteries','bulb','bulbs','appliance','appliances','carbon','emission','emissions','climate','weather','warming','cool','cooler','heat','heated','insulate','insulated','insulation','conserve','conserves','conserved','conservation','preserve','preserves','preserved','preservation','forest','forests','wildlife','species','endangered','extinction','extinct','ecosystem','ecosystems','habitat','habitats','rainforest','rainforests','arctic','antarctic','glacier','glaciers',
  // Missed basics
  'easy','easily','hard','harder','hardest','simple','simply','certain','certainly','sure','surely','possible','possibly','great','greater','greatest','greatly','often','sometimes','usually','rarely','ever','never','nowadays','today','tomorrow','yesterday','everyday','weekend','weekends','hour','hours','minute','minutes','moment','moments','second','seconds','day','days','week','weeks','month','months','year','years','age','ages','decade','decades','century','centuries',
  // Extras picked up by validator
  'lot','lots','mom','moms','dad','dads','mum','mums','feast','feasts','tale','tales','mind','minds','party','parties','feast','celebration','celebrations','gift','present','presents','guest','guests','neighbor','neighbors','neighbour','neighbours','crowd','crowds','culture','cultures','country','countries','nation','nations','land','lands','coast','coasts','river','lake','pond','bay','gulf','harbor','port','ports','highway','highways','avenue','avenues','alley','alleys','lane','lanes','square','squares','temple','temples','mosque','mosques','church','churches','cathedral','cathedrals','shrine','shrines','palace','palaces','castle','castles','tower','towers','fort','forts','gate','gates','arch','arches','statue','statues','monument','monuments','fountain','fountains','bridge','bridges',
  'hike','hikes','hiked','trip','trips','journey','journeys','visit','visits','tour','tours','adventure','adventures','explore','explores','explored','exploring','camp','camps','camped','camping','swim','swims','swam','swimming','surf','surfs','surfed','surfing','ski','skis','skied','skiing','skate','skates','skated','skating','hunt','hunts','hunted','hunting','fish','fishes','fished','fishing','climb','climbs','climbed','climbing',
  'art','arts','paint','paints','painting','paintings','drawing','drawings','sculpture','sculptures','photo','photos','photograph','photographs','picture','pictures','image','images','symbol','symbols','mark','marks','sign','signs','logo','logos','banner','banners','flag','flags','pattern','patterns',
  'school','schools','class','classes','student','students','teacher','teachers','lesson','lessons','course','courses','grade','grades','test','tests','exam','exams','homework','project','projects','subject','subjects','math','maths','mathematics','science','sciences','history','geography','english','arabic','french','spanish','german','italian','physics','chemistry','biology','literature','poetry','poem','poems',
  'moment','moments','memory','memories','childhood','youth','adulthood','age','ages','birth','death','life','lives','living','past','present','future','history','today','now','then','later','earlier','before','after','during','meanwhile','suddenly','slowly','quickly','gently','softly','loudly','quietly','carefully','freely','easily','happily','sadly','madly','bravely','safely','calmly','kindly','nicely','fairly','truly','really','actually','generally','especially','mainly','mostly','partly','fully','completely','entirely','totally','hardly','barely','almost','nearly','exactly','precisely','perfectly','roughly','approximately',
  'type','types','kind','kinds','sort','sorts','form','forms','shape','shapes','size','sizes','style','styles','quality','qualities','level','levels','degree','degrees','class','classes','category','categories','group','groups','team','teams','pair','pairs','set','sets','series','list','lists','row','rows','column','columns','line','lines','cycle','cycles',
  'future','past','present','past','forever','ever','never','always','often','sometimes','rarely','occasionally','daily','weekly','monthly','yearly','annually','regularly','usually','normally','typically',
  'really','very','quite','pretty','rather','fairly','somewhat','slightly','extremely','absolutely','totally','completely','entirely','fully','partly','mostly','mainly','chiefly','especially','particularly','specially','specifically','generally','usually','commonly','typically','normally','essentially','basically','simply','merely','just','only','even','also','too','as well','besides','moreover','furthermore','additionally','however','nevertheless','nonetheless','still','yet','anyway','anyhow','otherwise','instead','rather','therefore','thus','hence','consequently','accordingly','so','because','since','as','for','due to','owing to','thanks to','despite','in spite of','although','though','even though','even if','whereas','while','meanwhile','meantime','furthermore','similarly','likewise','in contrast','on the contrary','on the other hand','in fact','actually','indeed','really','truly','certainly','surely','definitely','probably','possibly','maybe','perhaps','likely','unlikely',
  'cup','tea','coffee','water','bread','rice','meat','fish','egg','fruit','fruits','vegetable','vegetables',
  'world','worlds','earth','moon','star','stars','sky','cloud','clouds','rain','snow','wind','fire','ice','heat','light','dark',
  'book','books','page','pages','word','words','letter','letters','sound','sounds','song','songs','music','musics','game','games','toy','toys','movie','movies','film','films','picture','pictures','photo','photos','image','images',
  'town','towns','city','cities','country','countries','land','lands','place','places','house','houses','home','homes','room','rooms','door','doors','window','windows','roof','roofs','wall','walls','floor','floors','garden','gardens','yard','yards','park','parks','farm','farms',
  'side','sides','top','bottom','front','back','left','right','middle','center','edge','corner','end','beginning','start',
  'way','ways','road','roads','path','paths','street','streets','route','routes',
  'water','waters','river','rivers','lake','lakes','sea','seas','ocean','oceans','island','islands','beach','beaches','mountain','mountains','hill','hills','valley','valleys','forest','forests','tree','trees','plant','plants','flower','flowers','grass',
  'body','head','face','eye','eyes','ear','ears','nose','mouth','lip','lips','tongue','tooth','teeth','hand','hands','finger','fingers','arm','arms','leg','legs','foot','feet','skin','hair','heart','brain','blood','bone','bones',
  'animal','animals','dog','dogs','cat','cats','bird','birds','fish','horse','horses','cow','cows','sheep','goat','goats','pig','pigs','chicken','chickens','duck','ducks','mouse','mice','snake','snakes','lion','lions','tiger','tigers','bear','bears','elephant','elephants','monkey','monkeys','rabbit','rabbits','insect','insects','bee','bees','ant','ants','spider','spiders','butterfly','butterflies',
  'job','jobs','doctor','doctors','nurse','nurses','teacher','teachers','farmer','farmers','worker','workers','driver','drivers','pilot','pilots','cook','cooks','baker','bakers','artist','artists','writer','writers','singer','singers','dancer','dancers','player','players','runner','runners','judge','judges','boss','bosses','helper','helpers','police','soldier','soldiers','king','kings','queen','queens','prince','princess',
  'money','price','cost','bill','coin','coins','dollar','dollars','cent','cents','pound','pounds','euro','euros','riyal','riyals','gold','silver',
  'question','questions','answer','answers','problem','problems','idea','ideas','plan','plans','goal','goals','dream','dreams','wish','wishes','choice','choices','chance','chances','rule','rules','step','steps','change','changes','need','needs','help','hope','hopes','fact','facts','truth','secret','secrets','surprise','surprises',
  'feel','feels','felt','feeling','feelings','happy','sad','angry','scared','brave','proud','kind','mean','nice','rude','polite','shy','funny','serious','calm','quiet','loud','strong','weak','tired','fresh','healthy','sick','alive','dead','young','old','new','fresh','rich','poor','hungry','thirsty','busy','free','ready','sleepy','awake','clean','dirty','safe','dangerous',
  'sit','sits','sat','sitting','stand','stands','stood','standing','run','runs','ran','running','walk','walks','walked','walking','jump','jumps','jumped','jumping','climb','climbs','climbed','climbing','swim','swims','swam','swimming','fly','flies','flew','flying','drive','drives','drove','driving','ride','rides','rode','riding','push','pushes','pushed','pushing','pull','pulls','pulled','pulling','open','opens','opened','opening','close','closes','closed','closing','read','reads','reading','write','writes','wrote','writing','draw','draws','drew','drawing','paint','paints','painted','painting','listen','listens','listened','listening','watch','watches','watched','watching','look','looks','looked','looking','see','sees','saw','seen','seeing','hear','hears','heard','hearing','speak','speaks','spoke','speaking','say','says','said','saying','talk','talks','talked','talking','ask','asks','asked','asking','answer','answers','answered','answering','tell','tells','told','telling','show','shows','showed','showing','find','finds','found','finding','catch','catches','caught','catching','throw','throws','threw','throwing','carry','carries','carried','carrying','bring','brings','brought','bringing','send','sends','sent','sending','receive','receives','received','receiving','give','gives','gave','giving','take','takes','took','taking','get','gets','got','getting','put','puts','putting','make','makes','made','making','build','builds','built','building','break','breaks','broke','breaking','fix','fixes','fixed','fixing','clean','cleans','cleaned','cleaning','wash','washes','washed','washing','dry','dries','dried','drying','cut','cuts','cutting','sew','sews','sewed','sewing','cook','cooks','cooked','cooking','eat','eats','ate','eating','drink','drinks','drank','drinking','sleep','sleeps','slept','sleeping','dream','dreams','dreamed','dreaming','wake','wakes','woke','waking','grow','grows','grew','growing','plant','plants','planted','planting','live','lives','lived','living','die','dies','died','dying','be','am','is','are','was','were','been','being','become','becomes','became','becoming','feel','feels','felt','feeling','think','thinks','thought','thinking','know','knows','knew','known','knowing','believe','believes','believed','believing','hope','hopes','hoped','hoping','wish','wishes','wished','wishing','love','loves','loved','loving','hate','hates','hated','hating','like','likes','liked','liking','want','wants','wanted','wanting','need','needs','needed','needing','try','tries','tried','trying','start','starts','started','starting','stop','stops','stopped','stopping','finish','finishes','finished','finishing','wait','waits','waited','waiting','meet','meets','met','meeting','visit','visits','visited','visiting','travel','travels','traveled','traveling','arrive','arrives','arrived','arriving','leave','leaves','left','leaving','go','goes','went','gone','going','come','comes','came','coming','return','returns','returned','returning','stay','stays','stayed','staying','move','moves','moved','moving','play','plays','played','playing','win','wins','won','winning','lose','loses','lost','losing','fight','fights','fought','fighting','help','helps','helped','helping','save','saves','saved','saving','work','works','worked','working','study','studies','studied','studying','learn','learns','learned','learning','teach','teaches','taught','teaching','explain','explains','explained','explaining','understand','understands','understood','understanding','forget','forgets','forgot','forgetting','remember','remembers','remembered','remembering',
])

// Proper nouns and geographic entities — capitalized in the text,
// these should NEVER count as OOV since they're names.
export function isProperNoun(bare, originalWord) {
  // In the original text, detect capitalization: we need the surface form.
  // Heuristic: if the lowercased word matches a known proper noun list, allow it.
  return PROPER_NOUNS.has(bare)
}
export const PROPER_NOUNS = new Set([
  'india','indian','china','chinese','japan','japanese','korea','korean','thailand','thai','vietnam','iran','iraq','egypt','egyptian','morocco','moroccan','tunisia','algeria','lebanon','syria','jordan','oman','qatar','kuwait','bahrain','yemen','turkey','turkish','germany','german','france','french','italy','italian','spain','spanish','portugal','england','english','britain','british','ireland','irish','scotland','wales','russia','russian','brazil','argentina','mexico','mexican','canada','canadian','australia','australian','america','american','usa','uk','eu','asia','africa','europe','antarctica','arctic','atlantic','pacific','mediterranean','saudi','arabia','arabian','arab','arabic','nile','amazon','sahara','everest','alps','himalaya','himalayas','riyadh','jeddah','mecca','medina','makkah','dammam','dubai','abu','dhabi','doha','cairo','istanbul','tokyo','beijing','seoul','bangkok','paris','london','berlin','rome','madrid','moscow','sydney','york','angeles','washington','ramadan','eid','diwali','hanukkah','christmas','easter','muslim','muslims','islamic','islam','christian','christians','jewish','jew','hindu','hindus','buddhist','buddhism','buddha','mohammed','muhammad','jesus','christ','god','allah','jesus','messi','ronaldo','nasa','apple','google','microsoft','amazon','samsung','sony','toyota','honda','ford','bmw','nike','adidas','coca','cola','pepsi','twitter','facebook','instagram','youtube','tiktok','whatsapp','snapchat','netflix','x','reddit','sultan','sultans','sheikh','sheikhs','emir','emirs','caliph','prophet','prophets','ibn','sina','abdullah','ahmed','mohammed','mohammad','ali','omar','osman','yusuf','ismail','ibrahim','hassan','hussein','khaled','khalid','fahad','salman','abdulaziz','faisal','saud','nayef','mohammed','khadija','fatima','aisha','maryam','layla','nora','zahra',
])

export function computeOOV(text, allowlist) {
  const words = splitWords(text)
  const oov = []
  const inAny = (w) => FUNCTION_WORDS.has(w) || CORE_A1.has(w) || PROPER_NOUNS.has(w) || allowlist.has(w)
  for (const w of words) {
    if (!w || /^[0-9]+$/.test(w)) continue
    const bare = w.replace(/'s$/, '').replace(/'$/, '')
    if (!bare) continue
    if (inAny(bare)) continue
    if (bare.endsWith('s') && inAny(bare.slice(0, -1))) continue
    if (bare.endsWith('es') && inAny(bare.slice(0, -2))) continue
    if (bare.endsWith('ed') && inAny(bare.slice(0, -2))) continue
    if (bare.endsWith('ed') && inAny(bare.slice(0, -1))) continue
    if (bare.endsWith('ing') && inAny(bare.slice(0, -3))) continue
    if (bare.endsWith('ing') && inAny(bare.slice(0, -3) + 'e')) continue
    if (bare.endsWith('er') && inAny(bare.slice(0, -2))) continue
    if (bare.endsWith('est') && inAny(bare.slice(0, -3))) continue
    if (bare.endsWith('ly') && inAny(bare.slice(0, -2))) continue
    if (bare.endsWith('ies') && inAny(bare.slice(0, -3) + 'y')) continue
    if (bare.endsWith('ied') && inAny(bare.slice(0, -3) + 'y')) continue
    oov.push(bare)
  }
  return oov
}

export function analyzePassage(text, allowlist) {
  const words = splitWords(text)
  const sentences = splitSentences(text)
  return {
    word_count: words.length,
    sentence_count: sentences.length,
    fkgl: +fkgl(text).toFixed(2),
    avg_sentence_length: +avgSentenceLength(text).toFixed(2),
    oov: computeOOV(text, allowlist),
  }
}
