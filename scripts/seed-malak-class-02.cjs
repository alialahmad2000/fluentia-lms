#!/usr/bin/env node
/**
 * Seeds ملاك الكندي's SECOND class recap into class_recaps.
 *
 * The live class went through unit 1 grammar but settled on one thing: the
 * difference between ADJECTIVE and ADVERB — which describes what, where each one
 * sits, and when to use which.
 *
 * Ali's explicit note on class 1: the explanations were «دش وحشو» — several ideas
 * crammed into one paragraph. So every `rule` block here carries exactly ONE idea
 * in at most two short sentences, and the examples do the teaching. Six sections,
 * each one teaching point, each with its own easy practice.
 *
 * Every question is MCQ with three options on purpose — full-sentence rewrites get
 * marked wrong over harmless wording. Grading is rule-based on the client
 * (validateAnswer), no AI, so it cannot fail or cost anything.
 *
 * Feminine Arabic (she's a woman); examples lean marketing, since she leads a team.
 *
 * Idempotent (upsert on student_id + class_no). Usage: node seed-malak-class-02.cjs
 */
const fs = require('fs');
const path = require('path');

const REF = 'nmjexpuycmqcxuxljier';
const STUDENT_ID = '28a83f30-9474-4869-8f08-f63dc40c767d'; // ملاك باحشوان الكندي
const REPO = '/Users/dr.ali/projects/fluentia-lms';
const CLASS_NO = 2;
const CLASS_DATE = '2026-07-28';
const TITLE = 'الحصة الثانية — الصفة والظرف';
const SUBTITLE = 'adjective vs adverb · +ly · linking verbs · good & well';

const token = () => fs.readFileSync(path.join(REPO, '.mcp.json'), 'utf8').match(/sbp_[A-Za-z0-9]+/)[0];
async function sql(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json', 'User-Agent': 'curl/8.4.0' },
    body: JSON.stringify({ query }),
  });
  const t = await res.text();
  if (!res.ok) { console.error('HTTP', res.status, t.slice(0, 600)); process.exit(1); }
  try { return JSON.parse(t); } catch { return t; }
}
const q = (s) => (s == null ? 'null' : `'${String(s).replace(/'/g, "''")}'`);

/** MCQ helper — correct MUST be one of opts verbatim (checked below). */
const mcq = (id, question, options, correct_answer, explanation) =>
  ({ id, question, options, correct_answer, accepted_answers: [correct_answer], explanation });

// ─────────────────────────────────────────────────────────────────────────────
const SECTIONS = [
  {
    key: 'core',
    title_ar: 'الفرق في سطر واحد',
    title_en: 'adjective vs adverb — the core',
    blurb_ar: 'الصفة تصف اسمًا. الظرف يصف فعلًا. هذا كل شيء، والباقي تفاصيل.',
    learn: { blocks: [
      {
        type: 'contrast',
        title_ar: 'الاثنان جنبًا إلى جنب',
        title_en: 'Side by side',
        body_ar: 'اسألي نفسك: ما الذي أصفه؟ إن كان شيئًا أو شخصًا فهي صفة، وإن كان فعلًا فهو ظرف.',
        cols: [
          { k: 'adjective', label_ar: 'صفة', note_ar: 'تصف اسمًا: شخصًا أو شيئًا.',
            examples: [
              { ar: 'إنها مصمّمة سريعة.', en: 'She is a quick designer.' },
              { ar: 'كان العرض واضحًا.', en: 'The presentation was clear.' },
            ] },
          { k: 'adverb', label_ar: 'ظرف', note_ar: 'يصف فعلًا: كيف حدث الشيء.',
            examples: [
              { ar: 'صمّمت الإعلان بسرعة.', en: 'She designed the ad quickly.' },
              { ar: 'شرحت الخطة بوضوح.', en: 'She explained the plan clearly.' },
            ] },
        ],
      },
      {
        type: 'rule',
        title_ar: 'أين تقع الصفة',
        title_en: 'Where the adjective sits',
        body_ar: 'قبل الاسم مباشرة، أو بعد أفعال الكينونة مثل is و are و was.',
        examples: [
          { ar: 'حملة ناجحة.', en: 'a successful campaign', hl: 'successful' },
          { ar: 'كانت الحملة ناجحة.', en: 'The campaign was successful.', hl: 'successful' },
        ],
      },
      {
        type: 'rule',
        title_ar: 'أين يقع الظرف',
        title_en: 'Where the adverb sits',
        body_ar: 'بعد الفعل، أو بعد الفعل ومفعوله. لا يأتي بين الفعل ومفعوله.',
        examples: [
          { ar: 'تكلّمت بثقة.', en: 'She spoke confidently.', hl: 'confidently' },
          { ar: 'راجعت التقرير بعناية.', en: 'She reviewed the report carefully.', hl: 'carefully' },
        ],
      },
      {
        type: 'chunks',
        title_ar: 'تراكيب جاهزة',
        title_en: 'Ready-made chunks',
        items: [
          { ar: 'فريق قوي', en: 'a strong team' },
          { ar: 'ينمو بسرعة', en: 'grow quickly' },
          { ar: 'رسالة واضحة', en: 'a clear message' },
          { ar: 'يتواصل بوضوح', en: 'communicate clearly' },
          { ar: 'نتيجة ممتازة', en: 'an excellent result' },
          { ar: 'يؤدّي بشكل ممتاز', en: 'perform excellently' },
        ],
      },
      {
        type: 'mistakes',
        title_ar: 'أخطاء شائعة',
        title_en: 'Common mistakes',
        items: [
          { wrong: 'She works very good.', right: 'She works very well.',
            note_ar: 'works فعل، فيصفه ظرف.' },
          { wrong: 'It was a quickly decision.', right: 'It was a quick decision.',
            note_ar: 'decision اسم، فتصفه صفة.' },
          { wrong: 'He speaks clear.', right: 'He speaks clearly.',
            note_ar: 'speaks فعل، فيصفه ظرف.' },
        ],
      },
    ] },
    questions: [
      mcq('c1', 'She is a ___ writer.', ['careful', 'carefully', 'care'], 'careful', 'writer اسم، فنصفه بصفة.'),
      mcq('c2', 'She writes ___.', ['careful', 'carefully', 'care'], 'carefully', 'writes فعل، فيصفه ظرف.'),
      mcq('c3', 'The team worked ___ on the launch.', ['hard', 'hardly', 'harder'], 'hard', 'ظرف worked هنا هو hard (بجدّ). أمّا hardly فمعناها «بالكاد».'),
      mcq('c4', 'It was a ___ presentation.', ['clear', 'clearly', 'clearing'], 'clear', 'presentation اسم، فنصفه بصفة.'),
      mcq('c5', 'He explained the idea ___.', ['clear', 'clearly', 'clearer'], 'clearly', 'explained فعل، فيصفه ظرف.'),
      mcq('c6', 'We need a ___ answer today.', ['quick', 'quickly', 'quickness'], 'quick', 'answer اسم، فنصفه بصفة.'),
      mcq('c7', 'They replied ___ to the client.', ['quick', 'quickly', 'quickness'], 'quickly', 'replied فعل، فيصفه ظرف.'),
      mcq('c8', 'That is a ___ result for a small budget.', ['great', 'greatly', 'greatness'], 'great', 'result اسم، فنصفه بصفة.'),
      mcq('c9', 'Sales improved ___ last quarter.', ['significant', 'significantly', 'significance'], 'significantly', 'improved فعل، فيصفه ظرف.'),
      mcq('c10', 'She gave a ___ explanation of the data.', ['simple', 'simply', 'simplicity'], 'simple', 'explanation اسم، فنصفه بصفة.'),
    ],
  },

  {
    key: 'make-adverb',
    title_ar: 'كيف نصنع الظرف',
    title_en: 'Making adverbs with -ly',
    blurb_ar: 'أغلب الظروف = الصفة + ly. وهناك ثلاث قواعد إملائية فقط.',
    learn: { blocks: [
      {
        type: 'rule',
        title_ar: 'القاعدة العامة',
        title_en: 'The general rule',
        body_ar: 'أضيفي ly إلى الصفة.',
        examples: [
          { ar: 'هادئ ← بهدوء', en: 'quiet → quietly', hl: 'quietly' },
          { ar: 'مهذّب ← بأدب', en: 'polite → politely', hl: 'politely' },
        ],
      },
      {
        type: 'rule',
        title_ar: 'إذا انتهت الصفة بـ y',
        title_en: 'Ending in -y',
        body_ar: 'تتحوّل الـ y إلى ily.',
        examples: [
          { ar: 'سعيد ← بسعادة', en: 'happy → happily', hl: 'happily' },
          { ar: 'سهل ← بسهولة', en: 'easy → easily', hl: 'easily' },
        ],
      },
      {
        type: 'rule',
        title_ar: 'إذا انتهت بـ le أو بـ ic',
        title_en: 'Ending in -le or -ic',
        body_ar: 'الـ le تصبح ly، والـ ic تصبح ically.',
        examples: [
          { ar: 'بسيط ← ببساطة', en: 'simple → simply', hl: 'simply' },
          { ar: 'أساسي ← أساسًا', en: 'basic → basically', hl: 'basically' },
        ],
      },
      {
        type: 'chunks',
        title_ar: 'ظروف تستعملينها كل يوم',
        title_en: 'Everyday adverbs',
        items: [
          { ar: 'بوضوح', en: 'clearly' },
          { ar: 'بسرعة', en: 'quickly' },
          { ar: 'بعناية', en: 'carefully' },
          { ar: 'بسهولة', en: 'easily' },
          { ar: 'بثقة', en: 'confidently' },
          { ar: 'باحتراف', en: 'professionally' },
        ],
      },
      {
        type: 'mistakes',
        title_ar: 'أخطاء شائعة',
        title_en: 'Common mistakes',
        items: [
          { wrong: 'She finished the task easyly.', right: 'She finished the task easily.',
            note_ar: 'easy تنتهي بـ y، فتصبح easily لا easyly.' },
          { wrong: 'He explained it simplely.', right: 'He explained it simply.',
            note_ar: 'simple تنتهي بـ le، فتصبح simply.' },
          { wrong: 'The plan is basicly ready.', right: 'The plan is basically ready.',
            note_ar: 'basic تنتهي بـ ic، فتصبح basically.' },
        ],
      },
    ] },
    questions: [
      mcq('m1', 'quiet → she closed the laptop ___.', ['quietly', 'quietily', 'quiet'], 'quietly', 'صفة + ly مباشرة.'),
      mcq('m2', 'happy → the client smiled ___.', ['happily', 'happyly', 'happy'], 'happily', 'الـ y تتحوّل إلى ily.'),
      mcq('m3', 'easy → we solved it ___.', ['easily', 'easyly', 'easy'], 'easily', 'الـ y تتحوّل إلى ily.'),
      mcq('m4', 'simple → she put it ___.', ['simply', 'simplely', 'simple'], 'simply', 'الـ le تصبح ly.'),
      mcq('m5', 'basic → the report is ___ done.', ['basically', 'basicly', 'basicaly'], 'basically', 'الـ ic تصبح ically.'),
      mcq('m6', 'polite → he answered ___.', ['politely', 'politly', 'polite'], 'politely', 'صفة + ly مباشرة.'),
      mcq('m7', 'careful → she checked the numbers ___.', ['carefully', 'carefuly', 'careful'], 'carefully', 'careful + ly بلامين.'),
      mcq('m8', 'automatic → the email is sent ___.', ['automatically', 'automaticly', 'automatical'], 'automatically', 'الـ ic تصبح ically.'),
    ],
  },

  {
    key: 'linking-verbs',
    title_ar: 'بعد أفعال الحالة نستعمل الصفة',
    title_en: 'After linking verbs, use the adjective',
    blurb_ar: 'أهم نقطة في الحصة: بعد be و seem و look و sound و feel نضع صفة، لا ظرفًا.',
    learn: { blocks: [
      {
        type: 'rule',
        title_ar: 'القاعدة',
        title_en: 'The rule',
        body_ar: 'أفعال الحالة لا تصف حدثًا، بل تصل الاسم بصفته. فما بعدها صفة.',
        examples: [
          { ar: 'تبدو الخطة قوية.', en: 'The plan looks strong.', hl: 'strong' },
          { ar: 'تبدو الفكرة ممتازة.', en: 'The idea sounds excellent.', hl: 'excellent' },
          { ar: 'أشعر بالثقة تجاه الإطلاق.', en: 'I feel confident about the launch.', hl: 'confident' },
        ],
      },
      {
        type: 'rule',
        title_ar: 'أفعال الحالة التي ستقابلينها',
        title_en: 'The linking verbs you will meet',
        body_ar: 'be و seem و look و sound و feel و taste و smell و become.',
        examples: [
          { ar: 'صار السوق مزدحمًا.', en: 'The market became crowded.', hl: 'crowded' },
          { ar: 'يبدو العميل راضيًا.', en: 'The client seems satisfied.', hl: 'satisfied' },
        ],
      },
      {
        type: 'contrast',
        title_ar: 'الفعل نفسه قد يكون حالة أو حدثًا',
        title_en: 'Same verb, two jobs',
        body_ar: 'إن كان الفعل يصف حالة فبعده صفة، وإن كان يصف حدثًا فبعده ظرف.',
        cols: [
          { k: 'look = يبدو', label_ar: 'حالة ← صفة', note_ar: 'لا يوجد فعل حقيقي هنا، بل وصف.',
            examples: [{ ar: 'تبدو متعبة.', en: 'She looks tired.' }] },
          { k: 'look at = ينظر', label_ar: 'حدث ← ظرف', note_ar: 'هنا فعل حقيقي، فنصفه بظرف.',
            examples: [{ ar: 'نظرت إليّ بغضب.', en: 'She looked at me angrily.' }] },
        ],
      },
      {
        type: 'mistakes',
        title_ar: 'أخطاء شائعة',
        title_en: 'Common mistakes',
        items: [
          { wrong: 'The plan looks strongly.', right: 'The plan looks strong.',
            note_ar: 'looks هنا «يبدو»، وهو فعل حالة، فبعده صفة.' },
          { wrong: 'I feel badly about the delay.', right: 'I feel bad about the delay.',
            note_ar: 'feel فعل حالة، فبعده صفة.' },
          { wrong: 'That sounds greatly.', right: 'That sounds great.',
            note_ar: 'sounds فعل حالة، فبعده صفة.' },
        ],
      },
    ] },
    questions: [
      mcq('l1', 'The new logo looks ___.', ['professional', 'professionally', 'profession'], 'professional', 'looks هنا «يبدو» — فعل حالة، فبعده صفة.'),
      mcq('l2', 'That idea sounds ___ to me.', ['perfect', 'perfectly', 'perfection'], 'perfect', 'sounds فعل حالة، فبعده صفة.'),
      mcq('l3', 'I feel ___ about the results.', ['good', 'well', 'goodly'], 'good', 'feel فعل حالة، فبعده صفة.'),
      mcq('l4', 'The client seems ___ with the draft.', ['happy', 'happily', 'happiness'], 'happy', 'seems فعل حالة، فبعده صفة.'),
      mcq('l5', 'She looked at the chart ___.', ['careful', 'carefully', 'care'], 'carefully', 'هنا looked at «نظرت» — فعل حقيقي، فيصفه ظرف.'),
      mcq('l6', 'The coffee tastes ___.', ['strong', 'strongly', 'strength'], 'strong', 'tastes فعل حالة، فبعده صفة.'),
      mcq('l7', 'The office became ___ after the launch.', ['quiet', 'quietly', 'quietness'], 'quiet', 'became فعل حالة، فبعده صفة.'),
      mcq('l8', 'He answered the question ___.', ['confident', 'confidently', 'confidence'], 'confidently', 'answered فعل حقيقي، فيصفه ظرف.'),
      mcq('l9', 'Your presentation was ___.', ['excellent', 'excellently', 'excellence'], 'excellent', 'بعد was نضع صفة.'),
      mcq('l10', 'She presented the numbers ___.', ['excellent', 'excellently', 'excellence'], 'excellently', 'presented فعل حقيقي، فيصفه ظرف.'),
    ],
  },

  {
    key: 'good-well',
    title_ar: 'good و well',
    title_en: 'good vs well',
    blurb_ar: 'good صفة دائمًا، و well ظرفها. ولها استعمال ثانٍ يخصّ الصحة.',
    learn: { blocks: [
      {
        type: 'rule',
        title_ar: 'good صفة، well ظرف',
        title_en: 'good is the adjective, well is the adverb',
        body_ar: 'good تصف اسمًا، و well تصف فعلًا.',
        examples: [
          { ar: 'إنها مديرة جيدة.', en: 'She is a good manager.', hl: 'good' },
          { ar: 'تدير الفريق جيدًا.', en: 'She manages the team well.', hl: 'well' },
        ],
      },
      {
        type: 'rule',
        title_ar: 'well لها معنى ثانٍ: بصحة جيدة',
        title_en: 'well = in good health',
        body_ar: 'في هذا المعنى فقط تكون well صفة، وتأتي بعد أفعال الكينونة.',
        examples: [
          { ar: 'لست بخير اليوم.', en: 'I do not feel well today.', hl: 'well' },
          { ar: 'هي بخير الآن.', en: 'She is well now.', hl: 'well' },
        ],
      },
      {
        type: 'mistakes',
        title_ar: 'أخطاء شائعة',
        title_en: 'Common mistakes',
        items: [
          { wrong: 'The campaign performed good.', right: 'The campaign performed well.',
            note_ar: 'performed فعل، فيصفه well.' },
          { wrong: 'She is a well designer.', right: 'She is a good designer.',
            note_ar: 'designer اسم، فتصفه good.' },
          { wrong: 'I speak English good.', right: 'I speak English well.',
            note_ar: 'speak فعل، فيصفه well.' },
        ],
      },
    ] },
    questions: [
      mcq('g1', 'She writes ___ under pressure.', ['good', 'well', 'goodly'], 'well', 'writes فعل، فيصفه well.'),
      mcq('g2', 'It was a ___ campaign.', ['good', 'well', 'wellly'], 'good', 'campaign اسم، فتصفه good.'),
      mcq('g3', 'The ads performed ___ this month.', ['good', 'well', 'goodly'], 'well', 'performed فعل، فيصفه well.'),
      mcq('g4', 'He has a ___ reason for the delay.', ['good', 'well', 'goodly'], 'good', 'reason اسم، فتصفه good.'),
      mcq('g5', 'I am not feeling ___ today.', ['good', 'well', 'goodly'], 'well', 'هنا well بمعنى «بصحة جيدة».'),
      mcq('g6', 'Our team works ___ together.', ['good', 'well', 'goodly'], 'well', 'works فعل، فيصفه well.'),
      mcq('g7', 'That is ___ news for the client.', ['good', 'well', 'goodly'], 'good', 'news اسم، فتصفه good.'),
      mcq('g8', 'She knows the market ___.', ['good', 'well', 'goodly'], 'well', 'knows فعل، فيصفه well.'),
    ],
  },

  {
    key: 'no-ly',
    title_ar: 'ظروف بلا ly، وفخّان مشهوران',
    title_en: 'Adverbs without -ly, and two traps',
    blurb_ar: 'بعض الظروف تأتي بنفس شكل الصفة. واثنتان منها تغيّران المعنى لو أضفتِ ly.',
    learn: { blocks: [
      {
        type: 'rule',
        title_ar: 'نفس الشكل، صفة وظرفًا',
        title_en: 'Same form for both',
        body_ar: 'fast و hard و late و early و high تأتي صفة وظرفًا بلا تغيير.',
        examples: [
          { ar: 'سيارة سريعة / يقود بسرعة.', en: 'a fast car / he drives fast', hl: 'fast' },
          { ar: 'اجتماع متأخر / وصلت متأخرة.', en: 'a late meeting / she arrived late', hl: 'late' },
        ],
      },
      {
        type: 'contrast',
        title_ar: 'الفخّان',
        title_en: 'The two traps',
        body_ar: 'إضافة ly هنا لا تصنع ظرفًا، بل كلمة أخرى تمامًا.',
        cols: [
          { k: 'hard / hardly', label_ar: 'بجدّ / بالكاد', note_ar: 'hardly معناها «بالكاد»، وهي شبه نفي.',
            examples: [
              { ar: 'عملت بجدّ.', en: 'She worked hard.' },
              { ar: 'بالكاد عملت.', en: 'She hardly worked.' },
            ] },
          { k: 'late / lately', label_ar: 'متأخرًا / مؤخرًا', note_ar: 'lately معناها «في الفترة الأخيرة».',
            examples: [
              { ar: 'وصلت متأخرة.', en: 'She arrived late.' },
              { ar: 'كانت مشغولة مؤخرًا.', en: 'She has been busy lately.' },
            ] },
        ],
      },
      {
        type: 'mistakes',
        title_ar: 'أخطاء شائعة',
        title_en: 'Common mistakes',
        items: [
          { wrong: 'The team worked hardly on the pitch.', right: 'The team worked hard on the pitch.',
            note_ar: 'hardly تعني «بالكاد» فتقلب المعنى تمامًا.' },
          { wrong: 'She drives very fastly.', right: 'She drives very fast.',
            note_ar: 'fast ظرف بنفس شكل الصفة، ولا نضيف لها ly.' },
          { wrong: 'I have not seen him late.', right: 'I have not seen him lately.',
            note_ar: 'المقصود «مؤخرًا»، وهي lately.' },
        ],
      },
    ] },
    questions: [
      mcq('n1', 'She always drives ___.', ['fast', 'fastly', 'faster'], 'fast', 'fast ظرف بنفس شكل الصفة.'),
      mcq('n2', 'The team worked ___ to meet the deadline.', ['hard', 'hardly', 'harder'], 'hard', 'المقصود «بجدّ»، وهي hard.'),
      mcq('n3', 'I ___ have time for lunch these days.', ['hard', 'hardly', 'harder'], 'hardly', 'المقصود «بالكاد»، وهي hardly.'),
      mcq('n4', 'He arrived ___ to the meeting.', ['late', 'lately', 'later'], 'late', 'المقصود «متأخرًا»، وهي late.'),
      mcq('n5', 'Have you seen the new report ___?', ['late', 'lately', 'latest'], 'lately', 'المقصود «مؤخرًا»، وهي lately.'),
      mcq('n6', 'The plane flew very ___.', ['high', 'highly', 'higher'], 'high', 'المقصود الارتفاع الحقيقي، وهي high.'),
      mcq('n7', 'She came in ___ to prepare the room.', ['early', 'earlily', 'earlyly'], 'early', 'early ظرف بنفس شكل الصفة.'),
      mcq('n8', 'The budget was ___ approved by the board.', ['final', 'finally', 'finalize'], 'finally', 'approved فعل، فيصفه ظرف.'),
    ],
  },

  {
    key: 'placement',
    title_ar: 'أين نضع الظرف في الجملة',
    title_en: 'Where the adverb goes',
    blurb_ar: 'قاعدتان تكفيان: لا تفصلي الفعل عن مفعوله، وظروف التكرار لها مكان ثابت.',
    learn: { blocks: [
      {
        type: 'rule',
        title_ar: 'لا تفصلي الفعل عن مفعوله',
        title_en: 'Never split the verb and its object',
        body_ar: 'ضعي ظرف الكيفية بعد المفعول، لا بينه وبين الفعل.',
        examples: [
          { ar: 'راجعت التقرير بعناية.', en: 'She reviewed the report carefully.', hl: 'carefully' },
          { ar: 'قدّمت الخطة بثقة.', en: 'She presented the plan confidently.', hl: 'confidently' },
        ],
      },
      {
        type: 'rule',
        title_ar: 'ظروف التكرار قبل الفعل الأساسي',
        title_en: 'Frequency adverbs go before the main verb',
        body_ar: 'مثل always و usually و often و never. لكنها تأتي بعد فعل الكينونة.',
        examples: [
          { ar: 'دائمًا تردّ بسرعة.', en: 'She always replies quickly.', hl: 'always' },
          { ar: 'هي دائمًا في الموعد.', en: 'She is always on time.', hl: 'always' },
        ],
      },
      {
        type: 'mistakes',
        title_ar: 'أخطاء شائعة',
        title_en: 'Common mistakes',
        items: [
          { wrong: 'She reviewed carefully the report.', right: 'She reviewed the report carefully.',
            note_ar: 'لا نفصل بين الفعل ومفعوله.' },
          { wrong: 'She replies always quickly.', right: 'She always replies quickly.',
            note_ar: 'ظرف التكرار يسبق الفعل الأساسي.' },
          { wrong: 'He is never late always.', right: 'He is never late.',
            note_ar: 'ظرف تكرار واحد يكفي، وبعد is مباشرة.' },
        ],
      },
    ] },
    questions: [
      mcq('p1', 'Which is correct?',
        ['She reviewed the report carefully.', 'She reviewed carefully the report.', 'She carefully reviewed carefully the report.'],
        'She reviewed the report carefully.', 'ظرف الكيفية بعد المفعول، لا بين الفعل ومفعوله.'),
      mcq('p2', 'Which is correct?',
        ['She always replies quickly.', 'She replies always quickly.', 'Always she replies quickly.'],
        'She always replies quickly.', 'ظرف التكرار قبل الفعل الأساسي.'),
      mcq('p3', 'Which is correct?',
        ['He is always on time.', 'He always is on time.', 'He is on time always.'],
        'He is always on time.', 'بعد فعل الكينونة is يأتي ظرف التكرار.'),
      mcq('p4', 'Which is correct?',
        ['They finished the project quickly.', 'They finished quickly the project.', 'They quickly finished quickly the project.'],
        'They finished the project quickly.', 'الظرف بعد المفعول.'),
      mcq('p5', 'Which is correct?',
        ['We never miss a deadline.', 'We miss never a deadline.', 'Never we miss a deadline.'],
        'We never miss a deadline.', 'ظرف التكرار قبل الفعل الأساسي.'),
      mcq('p6', 'Which is correct?',
        ['She usually sends the report on Monday.', 'She sends usually the report on Monday.', 'Usually she sends usually the report.'],
        'She usually sends the report on Monday.', 'ظرف التكرار قبل الفعل الأساسي.'),
      mcq('p7', 'Which is correct?',
        ['He explained the strategy clearly.', 'He explained clearly the strategy.', 'He clearly explained clearly the strategy.'],
        'He explained the strategy clearly.', 'الظرف بعد المفعول.'),
      mcq('p8', 'Which is correct?',
        ['The client is often busy.', 'The client often is busy.', 'Often the client is often busy.'],
        'The client is often busy.', 'بعد فعل الكينونة is يأتي ظرف التكرار.'),
    ],
  },
];

// ── validation ───────────────────────────────────────────────────────────────
// Mirrors the traps that bit earlier worksheets: an answer that is not among the
// options, a duplicate id, and — the subtle one — validateAnswer splits on hyphens,
// so two options that differ only by a hyphen/space both grade as correct.
const norm = (s) => String(s).toLowerCase().replace(/[-\s]+/g, ' ').trim();
(function validate() {
  const ids = new Set();
  let total = 0;
  for (const s of SECTIONS) {
    for (const qq of s.questions) {
      total++;
      if (ids.has(qq.id)) throw new Error(`duplicate question id ${qq.id}`);
      ids.add(qq.id);
      if (!qq.options.includes(qq.correct_answer))
        throw new Error(`[${qq.id}] correct_answer "${qq.correct_answer}" is not one of the options`);
      const collapsed = qq.options.map(norm);
      if (new Set(collapsed).size !== collapsed.length)
        throw new Error(`[${qq.id}] two options collapse to the same string under validateAnswer`);
      if (!qq.explanation) throw new Error(`[${qq.id}] missing explanation`);
      if (!/___|Which is correct|→/.test(qq.question))
        throw new Error(`[${qq.id}] question has no blank`);
    }
  }
  console.log(`✅ ${SECTIONS.length} sections · ${total} questions validated`);
})();

(async () => {
  const content = { sections: SECTIONS };
  const existing = await sql(`select id from class_recaps where student_id=${q(STUDENT_ID)} and class_no=${CLASS_NO};`);
  if (Array.isArray(existing) && existing.length) {
    await sql(`update class_recaps set
        title=${q(TITLE)}, subtitle=${q(SUBTITLE)}, class_date=${q(CLASS_DATE)},
        content=${q(JSON.stringify(content))}
      where id='${existing[0].id}';`);
    console.log('♻️  updated recap', existing[0].id);
  } else {
    const r = await sql(`insert into class_recaps (student_id, class_no, class_date, title, subtitle, content)
      values (${q(STUDENT_ID)}, ${CLASS_NO}, ${q(CLASS_DATE)}, ${q(TITLE)}, ${q(SUBTITLE)},
        ${q(JSON.stringify(content))}) returning id;`);
    console.log('✅ inserted recap', r[0].id);
  }

  await sql(`update students set uses_class_notes = true where id = ${q(STUDENT_ID)};`);

  const check = await sql(`select class_no, title,
      jsonb_array_length(content->'sections') sections,
      (select sum(jsonb_array_length(s->'questions')) from jsonb_array_elements(content->'sections') s) questions
    from class_recaps where student_id=${q(STUDENT_ID)} order by class_no;`);
  console.log(JSON.stringify(check, null, 2));
})().catch((e) => { console.error('💥', e.message); process.exit(1); });
