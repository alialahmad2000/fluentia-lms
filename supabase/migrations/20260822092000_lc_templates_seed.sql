-- ═══════════════════════════════════════════════════════════════════════════
-- THE ARABIC LIBRARY — 24 templates, written by hand, no model at runtime.
--
-- Voice: Saudi-neutral, warm, adult to adult. Our students are working
-- professionals — nothing here talks down to them, and nothing asks them to
-- explain themselves. No guilt, no «وينك», no «ليش ما»، no pressure.
--
-- Banned outright: معهد · دورة · مذهل · مميز · استثنائية · الأفضل · حبيبتي ·
-- كلاس تجريبي. The free session is always «لقاء مبدئي مجاني مع المدرب».
--
-- On body_ar_neutral — the hard one. It is NOT the masculine form with the
-- diacritics filed off. Arabic hides its 2nd-person gender in two places:
--   · diacritics only  (وقفتَ / وقفتِ · لكَ / لكِ)  → identical unvowelled, safe
--   · actual letters   (تحب / تحبين · ابدأ / ابدئي)  → visibly gendered, unsafe
-- So every neutral variant below avoids 2nd-person present-tense verbs,
-- imperatives, and adjectives that agree with the reader, and leans on nominal
-- sentences and the first-person plural («نبدأ»، «نرتب») instead. The result
-- reads as deliberate warmth, not as evasion.
--
-- Every active student today has a gender (A3: 10 female, 4 male), so the
-- neutral variant is the safety net for students who arrive before anyone
-- records one — not a fallback nobody will read.
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO public.lc_message_templates
  (code, situation_en, guidance_en, tone, min_silence_days, max_silence_days,
   body_ar_m, body_ar_f, body_ar_neutral)
VALUES

-- ── quiet 2–3 days ────────────────────────────────────────────────────────
('silent_2d_gentle',
 'Quiet 2–3 days — a light touch that asks for nothing',
 'The first small gap. It says only: your next lesson is held for you. Do not use this after a week of silence — at that point it reads as if nobody was watching.',
 'warm', 2, 5,
 $m${{name}}، مساك الله بالخير 🌿
درسك القادم جاهز في مكانه، ومحفوظ لك متى ما جاك وقت.
وإذا احتجت شيء، أنا هنا.$m$,
 $f${{name}}، مساكِ الله بالخير 🌿
درسكِ القادم جاهز في مكانه، ومحفوظ لكِ متى ما جاكِ وقت.
وإذا احتجتِ شيء، أنا هنا.$f$,
 $n${{name}}، مساء الخير 🌿
الدرس القادم جاهز في مكانه ومحفوظ، متى ما جاء الوقت المناسب.
وإذا فيه أي شيء، أنا هنا.$n$),

('silent_2d_thread',
 'Quiet 2–3 days — they left a section half-finished',
 'Use when the student opened something and stopped partway. It names the loose thread without making it a failure, and offers two easy answers instead of an open question.',
 'curious', 2, 5,
 $m${{name}}، هلا 👋
شفت أن عندك قسم بدأته وما كمّلته. أحياناً الوقت هو السبب، لا أكثر.
نخليه بمكانه، ولا نرتب لك بداية جديدة؟$m$,
 $f${{name}}، هلا 👋
شفت أن عندكِ قسم بدأتيه وما كمّلتيه. أحياناً الوقت هو السبب، لا أكثر.
نخليه بمكانه، ولا نرتب لكِ بداية جديدة؟$f$,
 $n${{name}}، هلا 👋
فيه قسم مبدوء وما اكتمل بعد. أحياناً الوقت هو السبب، لا أكثر.
نخليه بمكانه، أو نرتب بداية جديدة؟$n$),

('silent_2d_time',
 'Quiet 2–3 days — acknowledges a busy working week',
 'For students you know are under work pressure. It removes the idea that two days cost them anything, and puts a number on how little it takes to come back.',
 'encouraging', 2, 5,
 $m${{name}}، أعرف أن الأسبوع يكون مزحوم.
ما ينقص شيء إذا تأخرت يومين — المسار محفوظ من حيث وقفت.
خمس عشرة دقيقة تكفي ترجعك للإيقاع.$m$,
 $f${{name}}، أعرف أن الأسبوع يكون مزحوم.
ما ينقص شيء إذا تأخرتِ يومين — المسار محفوظ من حيث وقفتِ.
خمس عشرة دقيقة تكفي ترجعكِ للإيقاع.$f$,
 $n${{name}}، الأسبوع أحياناً يكون مزحوم، وهذا طبيعي.
يومان تأخير ما ينقصان شيئاً — المسار محفوظ في نفس النقطة.
خمس عشرة دقيقة تكفي للعودة للإيقاع.$n$),

-- ── quiet a week ──────────────────────────────────────────────────────────
('silent_7d_open',
 'Quiet a week — asks the open question without blame',
 'The most useful message in the library. It asks the one thing you actually need to know — time, or something in the way — and explicitly removes any reproach. Expect short replies; that is the point.',
 'check_in', 6, 13,
 $m${{name}}، مرّ أسبوع من آخر جلسة، وحبيت أطمن عليك.
ما فيه أي عتب — أبي بس أعرف: الوقت ضيّق، ولا فيه شيء واقف في طريقك؟
ردّك يكفيني.$m$,
 $f${{name}}، مرّ أسبوع من آخر جلسة، وحبيت أطمن عليكِ.
ما فيه أي عتب — أبي بس أعرف: الوقت ضيّق، ولا فيه شيء واقف في طريقكِ؟
ردّكِ يكفيني.$f$,
 $n${{name}}، مرّ أسبوع من آخر جلسة، وحبيت أطمن.
ما فيه أي عتب — السؤال الوحيد: هل الوقت ضيّق، أو فيه شيء واقف في الطريق؟
أي ردّ يكفي.$n$),

('silent_7d_restart',
 'Quiet a week — offers one short section instead of a plan',
 'Use when the student is likely avoiding the size of the task. It explicitly rules out catching up, which is usually the thing keeping them away.',
 'encouraging', 6, 13,
 $m${{name}}، الرجوع بعد أسبوع أسهل مما يبدو.
خلّنا نبدأ بقسم واحد قصير — بدون خطة كبيرة وبدون تعويض.
أختار لك واحد؟$m$,
 $f${{name}}، الرجوع بعد أسبوع أسهل مما يبدو.
خلّينا نبدأ بقسم واحد قصير — بدون خطة كبيرة وبدون تعويض.
أختار لكِ واحد؟$f$,
 $n${{name}}، الرجوع بعد أسبوع أسهل مما يبدو.
نبدأ بقسم واحد قصير — بدون خطة كبيرة وبدون تعويض.
أختار واحداً مناسباً؟$n$),

('silent_7d_trainer',
 'Quiet a week — offers the free intro session with the trainer',
 'Use when self-serve restarts have not worked. This is the only template that offers the free session, so it carries weight — do not spend it early.',
 'warm', 6, 13,
 $m${{name}}، إذا تحس أن البداية صعبة لحالك، نقدر نرتب لك لقاء مبدئي مجاني مع المدرب.
نصف ساعة تكفي نرتب فيها الخطوة القادمة.
تناسبك؟$m$,
 $f${{name}}، إذا تحسّين أن البداية صعبة لحالكِ، نقدر نرتب لكِ لقاء مبدئي مجاني مع المدرب.
نصف ساعة تكفي نرتب فيها الخطوة القادمة.
تناسبكِ؟$f$,
 $n${{name}}، إذا كانت البداية صعبة، نقدر نرتب لقاء مبدئي مجاني مع المدرب.
نصف ساعة تكفي لترتيب الخطوة القادمة.
هل يناسب؟$n$),

-- ── quiet two weeks ───────────────────────────────────────────────────────
('silent_14d_door',
 'Quiet two weeks — leaves the door open and asks nothing',
 'For a long silence where any question would add pressure. It deliberately refuses to ask why. Send this before anything more demanding.',
 'warm', 14, NULL,
 $m${{name}}، مضى أسبوعان، ومكانك محفوظ كما هو.
ما راح أسألك عن السبب — أبي بس تعرف أن الباب مفتوح والمسار ما راح.
متى ما حبيت، نكمل.$m$,
 $f${{name}}، مضى أسبوعان، ومكانكِ محفوظ كما هو.
ما راح أسألكِ عن السبب — أبي بس تعرفين أن الباب مفتوح والمسار ما راح.
متى ما حبيتِ، نكمل.$f$,
 $n${{name}}، مضى أسبوعان، والمكان محفوظ كما هو.
لا سؤال عن السبب — المهم أن الباب مفتوح والمسار ما راح.
متى ما جاء الوقت، نكمل.$n$),

('silent_14d_reset',
 'Quiet two weeks — a deliberately small re-entry point',
 'Use after the door-open message, or when the student has replied and wants to return. Its whole job is to stop them starting from the top and giving up again.',
 'encouraging', 14, NULL,
 $m${{name}}، بعد انقطاع أسبوعين، أنسب بداية تكون خفيفة.
نقدر نرجّعك بقسم واحد بسيط بدل ما تبدأ من فوق.
أجهّزه لك؟$m$,
 $f${{name}}، بعد انقطاع أسبوعين، أنسب بداية تكون خفيفة.
نقدر نرجّعكِ بقسم واحد بسيط بدل ما تبدئين من فوق.
أجهّزه لكِ؟$f$,
 $n${{name}}، بعد انقطاع أسبوعين، أنسب بداية تكون خفيفة.
نرجع بقسم واحد بسيط بدل البداية من فوق.
أجهّزه؟$n$),

('silent_14d_check',
 'Quiet two weeks — checks whether the platform is the reason',
 'Send this when a long silence has no obvious cause. Naming the three concrete failures (audio, recording, a page that will not open) gets far better answers than "is everything ok".',
 'check_in', 14, NULL,
 $m${{name}}، مضى وقت من آخر دخول لك.
إذا كان فيه شيء في المنصة ما اشتغل معك — صوت، تسجيل، صفحة ما تفتح — قل لي وأنا أتابعه.
وإذا كان الوقت فقط، فهذا مفهوم.$m$,
 $f${{name}}، مضى وقت من آخر دخول لكِ.
إذا كان فيه شيء في المنصة ما اشتغل معكِ — صوت، تسجيل، صفحة ما تفتح — قولي لي وأنا أتابعه.
وإذا كان الوقت فقط، فهذا مفهوم.$f$,
 $n${{name}}، مضى وقت من آخر دخول.
إذا كان فيه شيء في المنصة ما اشتغل — صوت، تسجيل، صفحة ما تفتح — يكفي إشارة وأنا أتابعه.
وإذا كان الوقت فقط، فهذا مفهوم.$n$),

-- ── stuck on the same unit ────────────────────────────────────────────────
('stuck_unit_split',
 'Opened the same unit repeatedly without finishing — offers to halve it',
 'Use when the radar shows activity but no completion. It moves the blame from the student to the size of the unit, which is usually where it belongs.',
 'encouraging', 0, NULL,
 $m${{name}}، لاحظت أنك فتحت نفس الوحدة أكثر من مرة بدون ما تكملها.
غالباً معناها أن القطعة كبيرة، مو أنك مقصّر.
نقسمها لك على جزئين؟$m$,
 $f${{name}}، لاحظت أنكِ فتحتِ نفس الوحدة أكثر من مرة بدون ما تكمليها.
غالباً معناها أن القطعة كبيرة، مو أنكِ مقصّرة.
نقسمها لكِ على جزئين؟$f$,
 $n${{name}}، نفس الوحدة انفتحت أكثر من مرة بدون اكتمال.
غالباً القطعة كبيرة، وليست المسألة تقصيراً.
نقسمها على جزئين؟$n$),

('stuck_unit_where',
 'Stuck on a unit — asks exactly where it breaks',
 'The diagnostic one. A precise answer lets the trainer prepare five minutes of explanation instead of the student re-running the whole unit. Use it before offering the trainer session.',
 'curious', 0, NULL,
 $m${{name}}، وين بالضبط تتوقف في هذه الوحدة؟
إذا عرفت النقطة، أقدر أرتب لك شرحاً قصيراً لها بدل ما تعيد الوحدة كاملة.$m$,
 $f${{name}}، وين بالضبط تتوقفين في هذه الوحدة؟
إذا عرفت النقطة، أقدر أرتب لكِ شرحاً قصيراً لها بدل ما تعيدين الوحدة كاملة.$f$,
 $n${{name}}، أي نقطة بالضبط توقف التقدّم في هذه الوحدة؟
إذا عرفت النقطة، أقدر أرتب شرحاً قصيراً لها بدل إعادة الوحدة كاملة.$n$),

('stuck_unit_trainer',
 'Stuck on a unit — offers the free intro session to unblock it',
 'For a student stuck on the same point across several attempts. Ten minutes of conversation genuinely does beat a fourth repetition, and this says so without implying they failed.',
 'warm', 0, NULL,
 $m${{name}}، بعض النقاط تنحل في عشر دقائق كلام أسرع من أي إعادة.
إذا تحب، نرتب لك لقاء مبدئي مجاني مع المدرب ونمرّ عليها.$m$,
 $f${{name}}، بعض النقاط تنحل في عشر دقائق كلام أسرع من أي إعادة.
إذا تحبين، نرتب لكِ لقاء مبدئي مجاني مع المدرب ونمرّ عليها.$f$,
 $n${{name}}، بعض النقاط تنحل في عشر دقائق كلام أسرع من أي إعادة.
نقدر نرتب لقاء مبدئي مجاني مع المدرب ونمرّ عليها.$n$),

-- ── first week ────────────────────────────────────────────────────────────
('first_week_welcome',
 'New student, first days — welcome and one clear first step',
 'Send within 48 hours of the account being created. One step, one time estimate, one way to reach a human. Nothing else.',
 'warm', 0, NULL,
 $m$أهلاً {{name}} 🌿
حسابك جاهز، وأول قسم ما ياخذ أكثر من ربع ساعة.
إذا وقفت عند أي شيء، اكتب لي مباشرة.$m$,
 $f$أهلاً {{name}} 🌿
حسابكِ جاهز، وأول قسم ما ياخذ أكثر من ربع ساعة.
إذا وقفتِ عند أي شيء، اكتبي لي مباشرة.$f$,
 $n$أهلاً {{name}} 🌿
الحساب جاهز، وأول قسم ما ياخذ أكثر من ربع ساعة.
وإذا وقف شيء في الطريق، تكفي رسالة مباشرة.$n$),

('first_week_rhythm',
 'New student, first week — sets the daily rhythm expectation',
 'Day three or four. The one number that matters is twenty minutes daily beating two hours weekly. Send before the first gap, not after it.',
 'encouraging', 0, NULL,
 $m${{name}}، الأسبوع الأول هو اللي يبني الإيقاع.
عشرون دقيقة في اليوم أنفع من ساعتين مرة في الأسبوع.
ابدأ بالوحدة اللي قدامك ولا تفكر بالباقي.$m$,
 $f${{name}}، الأسبوع الأول هو اللي يبني الإيقاع.
عشرون دقيقة في اليوم أنفع من ساعتين مرة في الأسبوع.
ابدئي بالوحدة اللي قدامكِ ولا تفكري بالباقي.$f$,
 $n${{name}}، الأسبوع الأول هو اللي يبني الإيقاع.
عشرون دقيقة في اليوم أنفع من ساعتين مرة في الأسبوع.
الوحدة اللي قدام تكفي كبداية، والباقي يجي بعدين.$n$),

('first_week_check',
 'New student, end of first week — asks what was unclear',
 'Day six or seven. New students hit setup problems and assume it is them. This invites the report before they quietly stop.',
 'check_in', 0, NULL,
 $m${{name}}، كيف كانت أول أيامك في المنصة؟
إذا فيه شيء ما كان واضح أو ما اشتغل، قل لي وأنا أتابعه.$m$,
 $f${{name}}، كيف كانت أول أيامكِ في المنصة؟
إذا فيه شيء ما كان واضح أو ما اشتغل، قولي لي وأنا أتابعه.$f$,
 $n${{name}}، كيف كانت الأيام الأولى في المنصة؟
إذا فيه شيء ما كان واضحاً أو ما اشتغل، يكفي إشارة وأنا أتابعه.$n$),

-- ── a strong week ─────────────────────────────────────────────────────────
('strong_week_streak',
 'Strong week — names consistency as the achievement',
 'Send on a genuinely consistent week, not a single big session. Praising consistency reinforces the behaviour that actually builds the language.',
 'celebratory', 0, 2,
 $m${{name}}، أسبوعك كان منتظم، وهذا أصعب جزء في التعلّم.
الانتظام هو اللي يبني اللغة، مو الجلسات الطويلة المتفرقة.
كمّل على نفس الإيقاع.$m$,
 $f${{name}}، أسبوعكِ كان منتظم، وهذا أصعب جزء في التعلّم.
الانتظام هو اللي يبني اللغة، مو الجلسات الطويلة المتفرقة.
كمّلي على نفس الإيقاع.$f$,
 $n${{name}}، الأسبوع كان منتظماً، وهذا أصعب جزء في التعلّم.
الانتظام هو اللي يبني اللغة، لا الجلسات الطويلة المتفرقة.
نكمل على نفس الإيقاع.$n$),

('strong_week_progress',
 'Strong week — points at the numbers, not at flattery',
 'Use when the 30-day chart actually shows a climb. It says the praise is measured rather than social, which lands better with professionals.',
 'celebratory', 0, 2,
 $m${{name}}، تقدّمك هذا الأسبوع واضح في الأرقام، مو مجاملة.
والفرق بين بدايتك واليوم يستحق وقفة.$m$,
 $f${{name}}، تقدّمكِ هذا الأسبوع واضح في الأرقام، مو مجاملة.
والفرق بين بدايتكِ واليوم يستحق وقفة.$f$,
 $n${{name}}، التقدّم هذا الأسبوع واضح في الأرقام، وليس مجاملة.
والفرق بين البداية واليوم يستحق وقفة.$n$),

('strong_week_push',
 'Strong week — proposes a small increase while momentum is there',
 'Only for a student already in rhythm. Asking for more from someone who is struggling is how you lose them; asking while they are winning is how you keep them.',
 'encouraging', 0, 2,
 $m${{name}}، بما أن إيقاعك ماشي، هذا وقت مناسب نرفع الجرعة شوي.
قسم إضافي في الأسبوع يفرق كثير على المدى.
تجرب؟$m$,
 $f${{name}}، بما أن إيقاعكِ ماشي، هذا وقت مناسب نرفع الجرعة شوي.
قسم إضافي في الأسبوع يفرق كثير على المدى.
تجربين؟$f$,
 $n${{name}}، بما أن الإيقاع ماشي، هذا وقت مناسب لرفع الجرعة قليلاً.
قسم إضافي في الأسبوع يفرق كثيراً على المدى.
نجرب؟$n$),

-- ── back after a long gap ─────────────────────────────────────────────────
('back_after_gap_welcome',
 'Returned after a long absence — welcome without a debt',
 'Send the day you notice them back. The whole message exists to say there is nothing to make up. Never pair this with a catch-up plan.',
 'warm', 0, 1,
 $m${{name}}، حياك الله من جديد 🌿
ما راح نعيد شيء ولا نعوّض — نبدأ من حيث وقفت.
وأول قسم اخترته لك قصير عن قصد.$m$,
 $f${{name}}، حياكِ الله من جديد 🌿
ما راح نعيد شيء ولا نعوّض — نبدأ من حيث وقفتِ.
وأول قسم اخترته لكِ قصير عن قصد.$f$,
 $n${{name}}، حياك الله من جديد 🌿
لا إعادة ولا تعويض — نبدأ من نفس النقطة.
وأول قسم مختار قصير عن قصد.$n$),

('back_after_gap_plan',
 'Returned after a long absence — offers a light three-a-week shape',
 'Use once they have completed something after returning. Three short sessions is concrete enough to agree to and small enough to keep.',
 'encouraging', 0, 1,
 $m${{name}}، الرجوع صار، والباقي ترتيب بسيط.
ثلاث جلسات قصيرة في الأسبوع تكفي ترجعك للمستوى اللي كنت فيه.
أرتبها لك؟$m$,
 $f${{name}}، الرجوع صار، والباقي ترتيب بسيط.
ثلاث جلسات قصيرة في الأسبوع تكفي ترجعكِ للمستوى اللي كنتِ فيه.
أرتبها لكِ؟$f$,
 $n${{name}}، الرجوع صار، والباقي ترتيب بسيط.
ثلاث جلسات قصيرة في الأسبوع تكفي للعودة لنفس المستوى.
أرتبها؟$n$),

('back_after_gap_nopressure',
 'Returned after a long absence — pure reassurance, no ask',
 'For someone who came back quietly and might leave again if pushed. It contains no question and no next step on purpose.',
 'warm', 0, 1,
 $m${{name}}، سعدت برجوعك.
خذ راحتك في البداية — ما فيه جدول يلاحقك ولا شيء فاتك بشكل نهائي.$m$,
 $f${{name}}، سعدت برجوعكِ.
خذي راحتكِ في البداية — ما فيه جدول يلاحقكِ ولا شيء فاتكِ بشكل نهائي.$f$,
 $n${{name}}، سعدت بالرجوع.
والبداية على راحة — ما فيه جدول يلاحق ولا شيء فات بشكل نهائي.$n$),

-- ── is the platform the problem? ──────────────────────────────────────────
('issue_check_direct',
 'Asks directly whether something in the platform is blocking them',
 'Your single most valuable message. Send it to anyone silent with an open ticket, or silent with no explanation. Naming audio, recording and a page that will not open is what turns "everything is fine" into a real bug report.',
 'check_in', 0, NULL,
 $m${{name}}، سؤال مباشر: فيه شيء في المنصة ما يشتغل معك؟
الصوت، التسجيل، أو صفحة ما تفتح — أي واحد منها.
إذا فيه، أنا أتابعه مع الفريق التقني اليوم.$m$,
 $f${{name}}، سؤال مباشر: فيه شيء في المنصة ما يشتغل معكِ؟
الصوت، التسجيل، أو صفحة ما تفتح — أي واحد منها.
إذا فيه، أنا أتابعه مع الفريق التقني اليوم.$f$,
 $n${{name}}، سؤال مباشر: فيه شيء في المنصة ما يشتغل؟
الصوت، التسجيل، أو صفحة ما تفتح — أي واحد منها.
إذا فيه، أتابعه مع الفريق التقني اليوم.$n$),

('issue_check_device',
 'Narrows a suspected platform problem down to a device',
 'The follow-up once they say something is broken. Phone-versus-computer eliminates half the possibilities before the technical team even reads the report.',
 'curious', 0, NULL,
 $m${{name}}، تدخل من الجوال ولا من الكمبيوتر؟
بعض المشاكل تظهر على جهاز دون الثاني، ومعرفة هذا تختصر علينا نصف الطريق.$m$,
 $f${{name}}، تدخلين من الجوال ولا من الكمبيوتر؟
بعض المشاكل تظهر على جهاز دون الثاني، ومعرفة هذا تختصر علينا نصف الطريق.$f$,
 $n${{name}}، الدخول يتم من الجوال أو من الكمبيوتر؟
بعض المشاكل تظهر على جهاز دون الثاني، ومعرفة هذا تختصر نصف الطريق.$n$),

('issue_check_followup',
 'Follows up on a bug the student already reported',
 'Use when the radar shows an open bug report. Closing the loop is the difference between a student who trusts the platform and one who quietly stops reporting anything.',
 'check_in', 0, NULL,
 $m${{name}}، بخصوص المشكلة اللي بلّغت عنها — هل صارت تشتغل معك الحين؟
إذا لا زالت، قل لي وأنا أرفعها من جديد.$m$,
 $f${{name}}، بخصوص المشكلة اللي بلّغتِ عنها — هل صارت تشتغل معكِ الحين؟
إذا لا زالت، قولي لي وأنا أرفعها من جديد.$f$,
 $n${{name}}، بخصوص المشكلة اللي وصلنا بلاغ عنها — هل صارت تشتغل الحين؟
إذا لا زالت، يكفي إشارة وأنا أرفعها من جديد.$n$)

ON CONFLICT (code) DO UPDATE SET
  situation_en     = EXCLUDED.situation_en,
  guidance_en      = EXCLUDED.guidance_en,
  tone             = EXCLUDED.tone,
  min_silence_days = EXCLUDED.min_silence_days,
  max_silence_days = EXCLUDED.max_silence_days,
  body_ar_m        = EXCLUDED.body_ar_m,
  body_ar_f        = EXCLUDED.body_ar_f,
  body_ar_neutral  = EXCLUDED.body_ar_neutral;
