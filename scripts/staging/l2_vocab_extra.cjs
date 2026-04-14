const {Client} = require('pg');

// Extra words for weak units to reach 1,300 total
// Unit 12 needs +25, Unit 10 needs +18, Unit 7 needs +15, Unit 11 needs +12, Unit 8 needs +10, Unit 5 needs +8, Unit 6 needs +6, Unit 9 needs +6
const EXTRA = [
// === Unit 12: Remarkable Journeys (+25) ===
{w:"voyage",c:"A2",s:"CEFR-J",p:"noun",ar:"رحلة بحرية",een:"The voyage across the ocean took weeks.",ear:"استغرقت الرحلة البحرية عبر المحيط أسابيع.",def:"a long journey by sea or space",t:"core",u:12},
{w:"departure",c:"A2",s:"CEFR-J",p:"noun",ar:"مغادرة",een:"The departure time is eight in the morning.",ear:"وقت المغادرة الثامنة صباحاً.",def:"the act of leaving a place",t:"core",u:12},
{w:"arrival",c:"A2",s:"CEFR-J",p:"noun",ar:"وصول",een:"Our arrival was delayed by two hours.",ear:"تأخر وصولنا ساعتين.",def:"the act of reaching a place",t:"core",u:12},
{w:"compass",c:"A2",s:"NGSL",p:"noun",ar:"بوصلة",een:"The compass helped them find north.",ear:"ساعدتهم البوصلة في إيجاد الشمال.",def:"a tool that shows direction",t:"core",u:12},
{w:"backpack",c:"A1",s:"CEFR-J",p:"noun",ar:"حقيبة ظهر",een:"She carried a heavy backpack.",ear:"حملت حقيبة ظهر ثقيلة.",def:"a bag you carry on your back",t:"core",u:12},
{w:"border",c:"A2",s:"CEFR-J",p:"noun",ar:"حدود",een:"We crossed the border at night.",ear:"عبرنا الحدود ليلاً.",def:"the line between two countries",t:"core",u:12},
{w:"refugee",c:"B1",s:"NGSL",p:"noun",ar:"لاجئ",een:"The refugee traveled for many days.",ear:"سافر اللاجئ لأيام كثيرة.",def:"a person forced to leave their country",t:"extended",u:12},
{w:"wander",c:"A2",s:"CEFR-J",p:"verb",ar:"يتجول",een:"They wandered through the old streets.",ear:"تجولوا في الشوارع القديمة.",def:"to walk around without a clear direction",t:"extended",u:12},
{w:"navigate",c:"A2",s:"CEFR-J",p:"verb",ar:"يُبحر",een:"He navigated the boat through the storm.",ear:"أبحر بالقارب خلال العاصفة.",def:"to find your way from one place to another",t:"extended",u:12},
{w:"companion",c:"B1",s:"CEFR-J",p:"noun",ar:"رفيق",een:"She traveled with a good companion.",ear:"سافرت مع رفيق جيد.",def:"a person who travels or spends time with you",t:"extended",u:12},
{w:"horizon",c:"A2",s:"CEFR-J",p:"noun",ar:"أفق",een:"The sun disappeared below the horizon.",ear:"اختفت الشمس تحت الأفق.",def:"the line where the sky meets the land",t:"extended",u:12},
{w:"obstacle",c:"B1",s:"CEFR-J",p:"noun",ar:"عقبة",een:"They faced many obstacles on the road.",ear:"واجهوا عقبات كثيرة في الطريق.",def:"something that blocks your way",t:"extended",u:12},
{w:"destination",c:"A2",s:"CEFR-J",p:"noun",ar:"وجهة",een:"We finally reached our destination.",ear:"وصلنا أخيراً إلى وجهتنا.",def:"the place you are going to",t:"core",u:12},
{w:"expedition",c:"B1",s:"NGSL",p:"noun",ar:"بعثة استكشافية",een:"The expedition lasted six months.",ear:"استمرت البعثة الاستكشافية ستة أشهر.",def:"a long organized journey for a purpose",t:"mastery",u:12},
{w:"nomad",c:"B1",s:"NGSL",p:"noun",ar:"بدوي",een:"The nomad moved with his animals.",ear:"تنقل البدوي مع حيواناته.",def:"a person who moves from place to place",t:"mastery",u:12},
{w:"endure",c:"B1",s:"NGSL",p:"verb",ar:"يتحمل",een:"They endured the heat of the desert.",ear:"تحملوا حرارة الصحراء.",def:"to suffer through something difficult",t:"mastery",u:12},
{w:"pioneer",c:"B1",s:"NGSL",p:"noun",ar:"رائد",een:"She was a pioneer in science.",ear:"كانت رائدة في العلوم.",def:"a person who is first to do something new",t:"mastery",u:12},
{w:"wilderness",c:"B1",s:"NGSL",p:"noun",ar:"برية",een:"They camped in the wilderness.",ear:"خيموا في البرية.",def:"a wild natural area with no people",t:"mastery",u:12},
{w:"passage",c:"A2",s:"CEFR-J",p:"noun",ar:"ممر",een:"The passage between the mountains was narrow.",ear:"كان الممر بين الجبال ضيقاً.",def:"a way through or between places",t:"extended",u:12},
{w:"aboard",c:"A2",s:"CEFR-J",p:"adverb",ar:"على متن",een:"Everyone was aboard the ship.",ear:"كان الجميع على متن السفينة.",def:"on a ship, plane, or train",t:"extended",u:12},
{w:"overseas",c:"A2",s:"CEFR-J",p:"adverb",ar:"في الخارج",een:"He studied overseas for two years.",ear:"درس في الخارج لمدة سنتين.",def:"in or to a country across the sea",t:"core",u:12},
{w:"caravan",c:"A2",s:"NGSL",p:"noun",ar:"قافلة",een:"The caravan crossed the desert slowly.",ear:"عبرت القافلة الصحراء ببطء.",def:"a group traveling together through a desert",t:"extended",u:12},
{w:"souvenir",c:"A2",s:"CEFR-J",p:"noun",ar:"تذكار",een:"She bought a souvenir from the market.",ear:"اشترت تذكاراً من السوق.",def:"something you buy to remember a place",t:"core",u:12},
{w:"itinerary",c:"B1",s:"NGSL",p:"noun",ar:"جدول رحلة",een:"The itinerary includes three cities.",ear:"يتضمن جدول الرحلة ثلاث مدن.",def:"a plan of places to visit on a trip",t:"mastery",u:12},
{w:"trek",c:"B1",s:"NGSL",p:"noun",ar:"رحلة شاقة",een:"The trek through the forest took days.",ear:"استغرقت الرحلة عبر الغابة أياماً.",def:"a long difficult walk",t:"mastery",u:12},

// === Unit 10: Water Crisis (+18) ===
{w:"reservoir",c:"B1",s:"NGSL",p:"noun",ar:"خزان مائي",een:"The reservoir provides water to the city.",ear:"يزود الخزان المائي المدينة بالماء.",def:"a large lake used to store water",t:"extended",u:10},
{w:"well",c:"A1",s:"CEFR-J",p:"noun",ar:"بئر",een:"They dug a well in the village.",ear:"حفروا بئراً في القرية.",def:"a deep hole to get water from the ground",t:"core",u:10},
{w:"pipe",c:"A2",s:"CEFR-J",p:"noun",ar:"أنبوب",een:"Water flows through the pipe.",ear:"يتدفق الماء عبر الأنبوب.",def:"a tube that carries water or gas",t:"core",u:10},
{w:"dam",c:"A2",s:"NGSL",p:"noun",ar:"سد",een:"The dam holds back the river water.",ear:"يحجز السد مياه النهر.",def:"a wall built across a river to hold water",t:"core",u:10},
{w:"purify",c:"B1",s:"NGSL",p:"verb",ar:"ينقي",een:"They purify the water before drinking.",ear:"ينقون الماء قبل الشرب.",def:"to make water clean and safe",t:"extended",u:10},
{w:"irrigate",c:"B1",s:"NGSL",p:"verb",ar:"يروي",een:"Farmers irrigate the fields in summer.",ear:"يروي المزارعون الحقول في الصيف.",def:"to supply water to land for growing crops",t:"mastery",u:10},
{w:"leak",c:"A2",s:"CEFR-J",p:"verb",ar:"يتسرب",een:"The pipe started to leak water.",ear:"بدأ الأنبوب بتسريب الماء.",def:"when liquid comes out through a hole",t:"extended",u:10},
{w:"scarce",c:"B1",s:"NGSL",p:"adjective",ar:"شحيح",een:"Clean water is scarce in that region.",ear:"المياه النظيفة شحيحة في تلك المنطقة.",def:"not enough; hard to find",t:"extended",u:10},
{w:"shortage",c:"A2",s:"CEFR-J",p:"noun",ar:"نقص",een:"There is a water shortage this summer.",ear:"هناك نقص في المياه هذا الصيف.",def:"when there is not enough of something",t:"core",u:10},
{w:"contaminate",c:"B1",s:"NGSL",p:"verb",ar:"يلوث",een:"Factories contaminate the river water.",ear:"تلوث المصانع مياه النهر.",def:"to make something dirty or unsafe",t:"mastery",u:10},
{w:"sewage",c:"B1",s:"NGSL",p:"noun",ar:"مياه صرف",een:"Sewage must be cleaned before release.",ear:"يجب تنظيف مياه الصرف قبل إطلاقها.",def:"dirty water from homes and factories",t:"mastery",u:10},
{w:"faucet",c:"A2",s:"NGSL",p:"noun",ar:"صنبور",een:"Turn off the faucet to save water.",ear:"أغلق الصنبور لتوفير الماء.",def:"a device that controls the flow of water",t:"core",u:10},
{w:"evaporate",c:"B1",s:"NGSL",p:"verb",ar:"يتبخر",een:"Water evaporates quickly in the sun.",ear:"يتبخر الماء بسرعة تحت الشمس.",def:"to change from liquid to gas",t:"mastery",u:10},
{w:"flood",c:"A2",s:"CEFR-J",p:"noun",ar:"فيضان",een:"The flood destroyed many homes.",ear:"دمر الفيضان منازل كثيرة.",def:"a large amount of water covering land",t:"core",u:10},
{w:"tap",c:"A1",s:"CEFR-J",p:"noun",ar:"حنفية",een:"I got water from the tap.",ear:"أخذت ماءً من الحنفية.",def:"a device you turn to get water",t:"core",u:10},
{w:"thirst",c:"A2",s:"CEFR-J",p:"noun",ar:"عطش",een:"He drank water to stop his thirst.",ear:"شرب الماء ليطفئ عطشه.",def:"the feeling of needing water",t:"core",u:10},
{w:"aquifer",c:"B1",s:"NGSL",p:"noun",ar:"طبقة مياه جوفية",een:"The aquifer is deep underground.",ear:"الطبقة المائية الجوفية عميقة تحت الأرض.",def:"underground rock that holds water",t:"mastery",u:10},
{w:"sanitation",c:"B1",s:"NGSL",p:"noun",ar:"صرف صحي",een:"Good sanitation prevents many diseases.",ear:"الصرف الصحي الجيد يمنع أمراضاً كثيرة.",def:"keeping places clean to protect health",t:"mastery",u:10},

// === Unit 7: Digital Detox (+15) ===
{w:"disconnect",c:"A2",s:"CEFR-J",p:"verb",ar:"ينقطع",een:"He disconnected from the internet for a week.",ear:"انقطع عن الإنترنت لمدة أسبوع.",def:"to stop being connected to something",t:"core",u:7},
{w:"mindful",c:"B1",s:"NGSL",p:"adjective",ar:"واعٍ",een:"Be mindful of your screen time.",ear:"كن واعياً لوقت الشاشة.",def:"being careful and aware of what you do",t:"extended",u:7},
{w:"distraction",c:"A2",s:"CEFR-J",p:"noun",ar:"إلهاء",een:"The phone is a big distraction.",ear:"الهاتف إلهاء كبير.",def:"something that takes your attention away",t:"core",u:7},
{w:"wellbeing",c:"B1",s:"NGSL",p:"noun",ar:"رفاهية",een:"Exercise improves your wellbeing.",ear:"التمارين تحسن رفاهيتك.",def:"the state of being healthy and happy",t:"extended",u:7},
{w:"unplug",c:"A2",s:"NGSL",p:"verb",ar:"يفصل",een:"Unplug from technology and go outside.",ear:"افصل عن التكنولوجيا واخرج.",def:"to disconnect from electronic devices",t:"core",u:7},
{w:"overwhelm",c:"B1",s:"NGSL",p:"verb",ar:"يُرهق",een:"Too much information can overwhelm you.",ear:"كثرة المعلومات قد تُرهقك.",def:"to give someone too much to handle",t:"mastery",u:7},
{w:"boundary",c:"B1",s:"CEFR-J",p:"noun",ar:"حد",een:"Set a boundary for phone use.",ear:"ضع حداً لاستخدام الهاتف.",def:"a limit that controls what you do",t:"extended",u:7},
{w:"habit",c:"A2",s:"CEFR-J",p:"noun",ar:"عادة",een:"Checking your phone is a bad habit.",ear:"التحقق من الهاتف عادة سيئة.",def:"something you do regularly without thinking",t:"core",u:7},
{w:"boredom",c:"A2",s:"NGSL",p:"noun",ar:"ملل",een:"Boredom makes people use phones more.",ear:"الملل يجعل الناس يستخدمون الهاتف أكثر.",def:"the feeling of not having anything interesting to do",t:"extended",u:7},
{w:"meditation",c:"B1",s:"NGSL",p:"noun",ar:"تأمل",een:"Meditation helps reduce stress.",ear:"التأمل يساعد في تقليل التوتر.",def:"quiet time to calm your mind",t:"mastery",u:7},
{w:"stimulate",c:"B1",s:"NGSL",p:"verb",ar:"يحفز",een:"Reading stimulates the brain.",ear:"القراءة تحفز الدماغ.",def:"to make something more active",t:"mastery",u:7},
{w:"fatigue",c:"B1",s:"NGSL",p:"noun",ar:"إرهاق",een:"Screen fatigue makes your eyes tired.",ear:"إرهاق الشاشة يُتعب عينيك.",def:"extreme tiredness",t:"mastery",u:7},
{w:"therapy",c:"B1",s:"CEFR-J",p:"noun",ar:"علاج",een:"Nature therapy can improve your mood.",ear:"العلاج بالطبيعة يحسن مزاجك.",def:"treatment to help with a health problem",t:"mastery",u:7},
{w:"moderation",c:"B1",s:"NGSL",p:"noun",ar:"اعتدال",een:"Use technology with moderation.",ear:"استخدم التكنولوجيا باعتدال.",def:"avoiding too much of something",t:"mastery",u:7},
{w:"productive",c:"A2",s:"CEFR-J",p:"adjective",ar:"مُنتج",een:"She is more productive without her phone.",ear:"هي أكثر إنتاجية بدون هاتفها.",def:"able to do a lot of work well",t:"core",u:7},

// === Unit 11: Street Art (+12) ===
{w:"mural",c:"A2",s:"NGSL",p:"noun",ar:"جدارية",een:"The mural covers the whole wall.",ear:"تغطي الجدارية الجدار بالكامل.",def:"a large painting on a wall",t:"core",u:11},
{w:"spray",c:"A2",s:"CEFR-J",p:"verb",ar:"يرش",een:"He sprayed paint on the wall.",ear:"رش الطلاء على الجدار.",def:"to push liquid out in small drops",t:"core",u:11},
{w:"stencil",c:"B1",s:"NGSL",p:"noun",ar:"استنسل",een:"She used a stencil to make the shape.",ear:"استخدمت استنسل لعمل الشكل.",def:"a sheet with cut-out shapes for painting",t:"extended",u:11},
{w:"canvas",c:"A2",s:"CEFR-J",p:"noun",ar:"لوحة قماشية",een:"The artist painted on a large canvas.",ear:"رسم الفنان على لوحة قماشية كبيرة.",def:"a piece of cloth used for painting",t:"core",u:11},
{w:"vibrant",c:"B1",s:"NGSL",p:"adjective",ar:"نابض بالحياة",een:"The street art uses vibrant colors.",ear:"يستخدم فن الشارع ألواناً نابضة بالحياة.",def:"bright, strong, and full of energy",t:"extended",u:11},
{w:"vandalism",c:"B1",s:"NGSL",p:"noun",ar:"تخريب",een:"Some people call graffiti vandalism.",ear:"يعتبر بعض الناس الغرافيتي تخريباً.",def:"damaging public property on purpose",t:"mastery",u:11},
{w:"permission",c:"A2",s:"CEFR-J",p:"noun",ar:"إذن",een:"The artist got permission to paint the wall.",ear:"حصل الفنان على إذن لطلاء الجدار.",def:"being allowed to do something",t:"extended",u:11},
{w:"urban",c:"A2",s:"CEFR-J",p:"adjective",ar:"حضري",een:"Urban areas have many buildings.",ear:"المناطق الحضرية فيها مبانٍ كثيرة.",def:"related to a city",t:"core",u:11},
{w:"illegal",c:"A2",s:"CEFR-J",p:"adjective",ar:"غير قانوني",een:"Painting on walls without permission is illegal.",ear:"الرسم على الجدران بدون إذن غير قانوني.",def:"not allowed by the law",t:"extended",u:11},
{w:"transform",c:"A2",s:"CEFR-J",p:"verb",ar:"يُحوّل",een:"Art can transform an ugly wall.",ear:"يمكن للفن أن يحول جداراً قبيحاً.",def:"to change something completely",t:"core",u:11},
{w:"controversial",c:"B1",s:"NGSL",p:"adjective",ar:"مثير للجدل",een:"Street art is sometimes controversial.",ear:"فن الشارع مثير للجدل أحياناً.",def:"causing disagreement among people",t:"mastery",u:11},
{w:"masterwork",c:"B1",s:"NGSL",p:"noun",ar:"عمل فني بارز",een:"The mural became a masterwork.",ear:"أصبحت الجدارية عملاً فنياً بارزاً.",def:"a very good piece of art",t:"mastery",u:11},

// === Unit 8: Mountain Adventures (+10) ===
{w:"altitude",c:"B1",s:"NGSL",p:"noun",ar:"ارتفاع",een:"The altitude made breathing difficult.",ear:"جعل الارتفاع التنفس صعباً.",def:"height above sea level",t:"extended",u:8},
{w:"summit",c:"B1",s:"NGSL",p:"noun",ar:"قمة",een:"They reached the summit at noon.",ear:"وصلوا إلى القمة عند الظهر.",def:"the top of a mountain",t:"core",u:8},
{w:"cliff",c:"A2",s:"CEFR-J",p:"noun",ar:"جرف",een:"The cliff drops straight into the sea.",ear:"ينحدر الجرف مباشرة إلى البحر.",def:"a steep rock face",t:"core",u:8},
{w:"avalanche",c:"B1",s:"NGSL",p:"noun",ar:"انهيار ثلجي",een:"The avalanche blocked the road.",ear:"سد الانهيار الثلجي الطريق.",def:"a large amount of snow falling down a mountain",t:"mastery",u:8},
{w:"steep",c:"A2",s:"CEFR-J",p:"adjective",ar:"شديد الانحدار",een:"The path was very steep.",ear:"كان المسار شديد الانحدار.",def:"rising or falling at a sharp angle",t:"core",u:8},
{w:"gear",c:"A2",s:"CEFR-J",p:"noun",ar:"معدات",een:"Bring the right gear for climbing.",ear:"أحضر المعدات المناسبة للتسلق.",def:"equipment needed for an activity",t:"core",u:8},
{w:"ridge",c:"B1",s:"NGSL",p:"noun",ar:"حافة جبلية",een:"They walked along the narrow ridge.",ear:"مشوا على طول الحافة الجبلية الضيقة.",def:"a long narrow top of a mountain",t:"extended",u:8},
{w:"wilderness",c:"B1",s:"NGSL",p:"noun",ar:"برية جبلية",een:"The wilderness is home to many animals.",ear:"البرية موطن لحيوانات كثيرة.",def:"a natural area far from cities",t:"extended",u:8},
{w:"terrain",c:"B1",s:"NGSL",p:"noun",ar:"تضاريس",een:"The terrain was rough and rocky.",ear:"كانت التضاريس وعرة وصخرية.",def:"the type of land in an area",t:"mastery",u:8},
{w:"rappel",c:"B1",s:"NGSL",p:"verb",ar:"ينزل بالحبل",een:"They rappelled down the cliff.",ear:"نزلوا بالحبل من الجرف.",def:"to go down a steep surface using a rope",t:"mastery",u:8},

// === Unit 5: Hidden History (+8) ===
{w:"artifact",c:"B1",s:"NGSL",p:"noun",ar:"أثر",een:"The artifact is two thousand years old.",ear:"عمر الأثر ألفا سنة.",def:"an old object made by people",t:"core",u:5},
{w:"manuscript",c:"B1",s:"NGSL",p:"noun",ar:"مخطوطة",een:"The old manuscript was found in a cave.",ear:"عُثر على المخطوطة القديمة في كهف.",def:"a handwritten book or document",t:"extended",u:5},
{w:"vault",c:"B1",s:"NGSL",p:"noun",ar:"قبو",een:"The treasure was hidden in the vault.",ear:"كان الكنز مخبأً في القبو.",def:"a strong room for keeping valuable things",t:"extended",u:5},
{w:"uncover",c:"A2",s:"CEFR-J",p:"verb",ar:"يكشف",een:"They uncovered the truth about the event.",ear:"كشفوا الحقيقة عن الحدث.",def:"to find something that was hidden",t:"core",u:5},
{w:"forbidden",c:"A2",s:"CEFR-J",p:"adjective",ar:"محظور",een:"The room was forbidden to visitors.",ear:"كانت الغرفة محظورة على الزوار.",def:"not allowed; banned",t:"extended",u:5},
{w:"clue",c:"A2",s:"CEFR-J",p:"noun",ar:"دليل",een:"The detective found an important clue.",ear:"وجد المحقق دليلاً مهماً.",def:"a piece of information that helps solve a mystery",t:"core",u:5},
{w:"conspiracy",c:"B1",s:"NGSL",p:"noun",ar:"مؤامرة",een:"The story was about a conspiracy.",ear:"كانت القصة عن مؤامرة.",def:"a secret plan by a group to do something bad",t:"mastery",u:5},
{w:"decode",c:"B1",s:"NGSL",p:"verb",ar:"يفك الشفرة",een:"They decoded the secret message.",ear:"فكوا شفرة الرسالة السرية.",def:"to find the meaning of a coded message",t:"mastery",u:5},

// === Unit 6: Future Cities (+6) ===
{w:"skyscraper",c:"A2",s:"CEFR-J",p:"noun",ar:"ناطحة سحاب",een:"The skyscraper has one hundred floors.",ear:"ناطحة السحاب فيها مئة طابق.",def:"a very tall building in a city",t:"core",u:6},
{w:"pedestrian",c:"A2",s:"CEFR-J",p:"noun",ar:"مشاة",een:"The road is only for pedestrians.",ear:"الطريق للمشاة فقط.",def:"a person walking on the street",t:"extended",u:6},
{w:"infrastructure",c:"B1",s:"NGSL",p:"noun",ar:"بنية تحتية",een:"Good infrastructure helps a city grow.",ear:"البنية التحتية الجيدة تساعد المدينة على النمو.",def:"basic systems like roads and water supply",t:"mastery",u:6},
{w:"drone",c:"A2",s:"NGSL",p:"noun",ar:"طائرة مسيّرة",een:"The drone delivered the package.",ear:"سلّمت الطائرة المسيّرة الطرد.",def:"a small flying machine without a pilot",t:"core",u:6},
{w:"autonomous",c:"B1",s:"NGSL",p:"adjective",ar:"ذاتي القيادة",een:"The autonomous car drives itself.",ear:"السيارة ذاتية القيادة تقود نفسها.",def:"able to work or move by itself",t:"mastery",u:6},
{w:"commute",c:"A2",s:"CEFR-J",p:"verb",ar:"يتنقل",een:"He commutes to work by train.",ear:"يتنقل إلى العمل بالقطار.",def:"to travel regularly between home and work",t:"extended",u:6},

// === Unit 9: Film & Cinema (+6) ===
{w:"subtitle",c:"A2",s:"CEFR-J",p:"noun",ar:"ترجمة مرئية",een:"I read the subtitles in Arabic.",ear:"قرأت الترجمة المرئية بالعربية.",def:"text on screen that translates the spoken words",t:"core",u:9},
{w:"premiere",c:"B1",s:"NGSL",p:"noun",ar:"عرض أول",een:"The movie premiere was exciting.",ear:"كان العرض الأول للفيلم مثيراً.",def:"the first showing of a movie",t:"extended",u:9},
{w:"sequel",c:"B1",s:"NGSL",p:"noun",ar:"جزء ثانٍ",een:"The sequel was better than the first movie.",ear:"كان الجزء الثاني أفضل من الفيلم الأول.",def:"a movie that continues the story of an earlier one",t:"extended",u:9},
{w:"blockbuster",c:"B1",s:"NGSL",p:"noun",ar:"فيلم ضخم",een:"The blockbuster earned millions of dollars.",ear:"حقق الفيلم الضخم ملايين الدولارات.",def:"a very popular and successful movie",t:"mastery",u:9},
{w:"cast",c:"A2",s:"CEFR-J",p:"noun",ar:"طاقم تمثيل",een:"The cast of the movie is famous.",ear:"طاقم تمثيل الفيلم مشهور.",def:"all the actors in a movie or play",t:"core",u:9},
{w:"rehearsal",c:"B1",s:"NGSL",p:"noun",ar:"بروفة",een:"The rehearsal took three hours.",ear:"استغرقت البروفة ثلاث ساعات.",def:"a practice before the real performance",t:"extended",u:9},
];

async function main() {
  const c = new Client({
    host:'aws-1-eu-central-1.pooler.supabase.com',
    port:5432, database:'postgres',
    user:'postgres.nmjexpuycmqcxuxljier',
    password:'Ali-al-ahmad2000',
    ssl:{rejectUnauthorized:false}
  });
  await c.connect();

  // Get existing + staged words
  const ex = await c.query("SELECT DISTINCT LOWER(v.word) AS w FROM curriculum_vocabulary v JOIN curriculum_readings r ON r.id=v.reading_id JOIN curriculum_units u ON u.id=r.unit_id WHERE u.level_id IN ('cd96175e-76d4-48dc-b34f-83f3228a28b8','2755b494-c7ff-4bdc-96ac-7ab735dc038c','d3349438-8c8e-46b6-9ee6-e2e01c23229d')");
  const staged = await c.query('SELECT LOWER(word) AS w FROM vocab_staging_l2');
  const all = new Set([...ex.rows.map(r=>r.w), ...staged.rows.map(r=>r.w)]);

  let added = 0, skipped = 0;
  for (const w of EXTRA) {
    if (all.has(w.w.toLowerCase())) { console.log('SKIP:', w.w); skipped++; continue; }
    try {
      await c.query('INSERT INTO vocab_staging_l2 (word,cefr_level,source_list,pos,meaning_ar,example_en,example_ar,definition_en,recommended_tier,recommended_unit) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT DO NOTHING',
        [w.w,w.c,w.s,w.p,w.ar,w.een,w.ear,w.def,w.t,w.u]);
      added++;
    } catch(e) { console.error('ERR:', w.w, e.message); }
  }
  console.log(`Added: ${added}, Skipped: ${skipped}`);

  const cnt = await c.query('SELECT COUNT(*) AS c FROM vocab_staging_l2');
  console.log('Total staged:', cnt.rows[0].c);
  console.log('Projected L2 final:', 255 + parseInt(cnt.rows[0].c));

  const pu = await c.query('SELECT recommended_unit AS u, COUNT(*) AS c FROM vocab_staging_l2 GROUP BY recommended_unit ORDER BY recommended_unit');
  const existing = [23,24,25,24,23,23,22,23,24,23,25,24];
  let minUnit = 999;
  pu.rows.forEach(r => {
    const total = parseInt(r.c) + existing[r.u-1];
    if (total < minUnit) minUnit = total;
    console.log('Unit '+r.u+': '+r.c+' staged + '+existing[r.u-1]+' existing = '+total);
  });
  console.log('Min per-unit:', minUnit, '(target >=90)');

  await c.end();
}

main().catch(e => { console.error(e); process.exit(1); });
