// Pro Desk — «القراءة» reading library. Authored English passages from the real
// IT/infrastructure field, calmed to Sara's level, so she builds professional
// reading + vocabulary the way she would on a good engineering blog.
// 100% CREDITLESS: every word is authored here — no runtime AI.
// ENGLISH-PRIMARY: the passage is English; Arabic appears only as small glosses.
//
// Each item: { id, order, title, title_ar, level, minutes, topic, intro,
//   paragraphs[], key_terms[{term,ipa,ar,def_en}], questions[{q,options,why}],
//   takeaway }
//   level: 'B1' (shorter, plainer sentences) | 'B2' (a bit richer).
//   Ordered easy → hard.

export const DESK_READING = [
  {
    id: 'r-oncall-handoff',
    order: 1,
    title: 'The On-Call Handoff',
    title_ar: 'تسليم المناوبة',
    level: 'B1',
    minutes: 3,
    topic: 'Incident response',
    intro: 'What a good handoff note actually contains — and why it saves the next engineer an hour.',
    paragraphs: [
      'When your on-call shift ends, someone else takes over. The moment you pass the work to them is called the handoff. A good handoff note is short, but it saves the next engineer real time. Without it, they start from zero and repeat everything you already tried.',
      'A strong note answers three simple questions. What is broken right now? What did you already try? What should the next person watch? You do not need to list every command you ran. You need to describe the current state of the system, the actions you took, and the open risks that are still there.',
      'For example, imagine a server keeps running out of memory. Your note might say: ‘The payment service is slow. I restarted it at 2 a.m. and it is stable for now. Watch the memory graph — if it climbs above 80 percent again, restart it and page the database team.’ In three sentences, the next engineer knows the problem, your fix, and the warning sign.',
      'Write the note during the incident, not after it closes. If you wait, you will forget small details that matter. Keep it in a shared place, like the ticket or the team channel, so anyone on the shift can read it. A clear handoff turns a stressful night into a calm one for the person who follows you.',
    ],
    key_terms: [
      { term: 'handoff', ipa: 'ˈhænd.ɒf', ar: 'تسليم المناوبة', def_en: 'passing responsibility from one shift to the next' },
      { term: 'on-call', ipa: 'ˌɒnˈkɔːl', ar: 'المناوبة (تحت الطلب)', def_en: 'being available to respond to problems during a set period' },
      { term: 'shift', ipa: 'ʃɪft', ar: 'الوردية / فترة المناوبة', def_en: 'the block of time one person is responsible for' },
      { term: 'incident', ipa: 'ˈɪn.sɪ.dənt', ar: 'حادثة / عُطل', def_en: 'an unplanned event that disrupts a service' },
      { term: 'page', ipa: 'peɪdʒ', ar: 'يستدعي (عبر النداء)', def_en: 'to alert an engineer urgently to respond' },
      { term: 'stable', ipa: 'ˈsteɪ.bəl', ar: 'مستقر', def_en: 'working normally and not likely to fail right now' },
    ],
    questions: [
      {
        q: 'According to the passage, a good handoff note should…',
        options: [
          { en: 'list every command the engineer ran', correct: false },
          { en: 'summarize what is broken, what was tried, and what to watch', correct: true },
          { en: 'be written only after the incident closes', correct: false },
        ],
        why: 'The passage says the note captures the current state, the actions taken, and the open risks.',
      },
      {
        q: 'In the memory example, what is the warning sign the next engineer should watch?',
        options: [
          { en: 'the payment team paging you', correct: false },
          { en: 'the memory climbing above 80 percent again', correct: true },
          { en: 'the server restarting itself', correct: false },
        ],
        why: 'The note says to restart and page the database team if memory climbs above 80 percent.',
      },
      {
        q: 'When does the passage say you should write the note?',
        options: [
          { en: 'during the incident, while the details are fresh', correct: true },
          { en: 'after the incident closes, when you have time', correct: false },
          { en: 'only if the next engineer asks for it', correct: false },
        ],
        why: 'It warns that if you wait, you will forget small details that matter.',
      },
    ],
    takeaway: 'A handoff is a summary of state, not a transcript.',
  },

  {
    id: 'r-reading-an-alert',
    order: 2,
    title: 'Reading a Monitoring Alert',
    title_ar: 'قراءة تنبيه المراقبة',
    level: 'B1',
    minutes: 3,
    topic: 'Monitoring',
    intro: 'An alert at 3 a.m. is telling you a story — learn to read the whole thing before you touch anything.',
    paragraphs: [
      'At 3 a.m. your phone buzzes. A monitoring alert has fired. Before you touch anything, read the alert carefully. It is trying to tell you a story, and panic makes you miss the first line.',
      'Most alerts have three parts. The first is the name of the check that failed — for example, ‘API error rate high.’ The second is the value that crossed the line, called the threshold: maybe errors jumped from 1 percent to 12 percent. The third is the time it started. Together these tell you what is wrong, how bad it is, and how long it has been happening.',
      'A good alert also points you to a dashboard. The dashboard shows graphs over time, so you can see if the problem is growing or already fading. If the error rate is climbing, act fast. If it spiked once and returned to normal, you may only need to note it and watch.',
      'Not every alert means the sky is falling. Some are noisy — they fire for small, harmless changes. Part of your job is to learn which alerts are real signals and which are noise. When an alert is noisy, do not ignore it forever; instead, tell the team so the threshold can be tuned. A quiet, trusted alert system is worth more than one that cries wolf every hour.',
    ],
    key_terms: [
      { term: 'alert', ipa: 'əˈlɜːt', ar: 'تنبيه', def_en: 'an automatic message warning that something crossed a limit' },
      { term: 'threshold', ipa: 'ˈθreʃ.həʊld', ar: 'العتبة / الحد', def_en: 'the value that, once crossed, triggers the alert' },
      { term: 'dashboard', ipa: 'ˈdæʃ.bɔːd', ar: 'لوحة المعلومات', def_en: 'a screen of graphs showing the system’s health over time' },
      { term: 'error rate', ipa: 'ˈer.ə reɪt', ar: 'معدّل الأخطاء', def_en: 'the share of requests that fail, usually as a percentage' },
      { term: 'spike', ipa: 'spaɪk', ar: 'ارتفاع مفاجئ', def_en: 'a sudden, sharp rise in a value' },
      { term: 'noise', ipa: 'nɔɪz', ar: 'ضجيج (تنبيهات مزعجة غير مهمة)', def_en: 'alerts that fire for unimportant changes and hide real signals' },
    ],
    questions: [
      {
        q: 'What are the three parts of most alerts described in the passage?',
        options: [
          { en: 'the check that failed, the value that crossed the threshold, and the time it started', correct: true },
          { en: 'the engineer’s name, the server, and the fix', correct: false },
          { en: 'the color, the sound, and the phone number', correct: false },
        ],
        why: 'The passage lists the failed check, the value that crossed the threshold, and the start time.',
      },
      {
        q: 'If an error rate spiked once and then returned to normal, the passage suggests you should…',
        options: [
          { en: 'immediately restart every server', correct: false },
          { en: 'note it and keep watching, rather than take urgent action', correct: true },
          { en: 'delete the alert so it never fires again', correct: false },
        ],
        why: 'It says a single spike that returned to normal may only need noting and watching.',
      },
      {
        q: 'A ‘noisy’ alert is one that…',
        options: [
          { en: 'plays a loud sound', correct: false },
          { en: 'only fires during the day', correct: false },
          { en: 'fires for small, harmless changes', correct: true },
        ],
        why: 'The passage defines noisy alerts as ones that fire for small, harmless changes.',
      },
    ],
    takeaway: 'Read the whole alert before you act — it already tells you what, how bad, and since when.',
  },

  {
    id: 'r-offshore-timezones',
    order: 3,
    title: 'Working Across Time Zones',
    title_ar: 'العمل عبر المناطق الزمنية',
    level: 'B1',
    minutes: 4,
    topic: 'Team collaboration',
    intro: 'When your teammates are asleep as you start your day, a clear written message beats a fast reply you have to wait for.',
    paragraphs: [
      'Many engineering teams are spread across the world. You might sit in Riyadh while your teammates work in Bangalore or Dublin. This is often called working with an offshore team. It has real benefits, but it also needs care, because you are rarely online at the same time.',
      'The biggest challenge is the time zone gap. When your day starts, theirs may be ending. If you ask a question at 5 p.m. your time, you might not get an answer until the next morning. Each missed reply can cost a full day, so the goal is to reduce the number of slow back-and-forth messages.',
      'The tool that helps most is asynchronous communication, often shortened to ‘async.’ Instead of waiting for a live chat, you write a complete message: the context, the question, what you already tried, and what you need. A good async message can be answered in one reply, even while you sleep. A vague one starts another day of waiting.',
      'There is usually a small overlap — an hour or two when both sides are awake. Protect that time. Use it for the things that truly need a conversation, like a tricky design decision, and leave simple updates for async. Also write things down. When work lives in a shared document or ticket, the offshore team can read it any time, and nobody has to wait for you to wake up.',
    ],
    key_terms: [
      { term: 'offshore', ipa: 'ˌɒfˈʃɔː', ar: 'فريق في موقع بعيد', def_en: 'a team working from another country, often in a distant time zone' },
      { term: 'time zone', ipa: 'ˈtaɪm zəʊn', ar: 'المنطقة الزمنية', def_en: 'a region’s local clock time, which differs from other places' },
      { term: 'asynchronous', ipa: 'eɪˈsɪŋ.krə.nəs', ar: 'غير متزامن', def_en: 'communication where a reply comes later, not in real time' },
      { term: 'overlap', ipa: 'ˈəʊ.və.læp', ar: 'التداخل (فترة تلاقي الأوقات)', def_en: 'the short window when both sides are awake and online' },
      { term: 'context', ipa: 'ˈkɒn.tekst', ar: 'السياق', def_en: 'the background information that makes a question answerable' },
      { term: 'ticket', ipa: 'ˈtɪk.ɪt', ar: 'تذكرة (طلب / مهمة)', def_en: 'a tracked item that records a task or request for the team' },
    ],
    questions: [
      {
        q: 'What does the passage say is the main challenge of an offshore team?',
        options: [
          { en: 'the time zone gap means replies can be slow', correct: true },
          { en: 'the other team writes in a different programming language', correct: false },
          { en: 'offshore engineers are less skilled', correct: false },
        ],
        why: 'It says the biggest challenge is the time zone gap, where a missed reply can cost a full day.',
      },
      {
        q: 'A good asynchronous message, according to the passage, includes…',
        options: [
          { en: 'a request to join a live call immediately', correct: false },
          { en: 'only a quick ‘hi, are you there?’', correct: false },
          { en: 'the context, the question, what you tried, and what you need', correct: true },
        ],
        why: 'The passage says a complete async message gives context, the question, what was tried, and what is needed.',
      },
      {
        q: 'The passage suggests the short daily overlap should be used for…',
        options: [
          { en: 'simple status updates', correct: false },
          { en: 'discussions that truly need a live conversation', correct: true },
          { en: 'writing long async messages', correct: false },
        ],
        why: 'It says to protect the overlap for things that truly need a conversation and leave updates for async.',
      },
    ],
    takeaway: 'Across time zones, a clear written message beats a fast reply you have to wait a day for.',
  },

  {
    id: 'r-cloud-basics',
    order: 4,
    title: 'Cloud Basics in Plain Words',
    title_ar: 'أساسيات الحوسبة السحابية',
    level: 'B1',
    minutes: 4,
    topic: 'Cloud fundamentals',
    intro: 'Running “in the cloud” comes down to three building blocks you can grow or shrink on demand.',
    paragraphs: [
      'When people say a company runs ‘in the cloud,’ they mean it rents computers from a large provider instead of buying its own. You do not see the machines, but they are real, sitting in huge buildings called data centers. You pay for what you use, and you can ask for more or less at any time.',
      'Cloud services usually come down to three basic building blocks. The first is compute: the processing power that actually runs your program. The second is storage: the space where your files and data live, even when the program is switched off. The third is networking: the connections that let all these parts talk to each other and to your users.',
      'A simple example ties them together. A photo app needs compute to resize each picture, storage to keep the pictures safely, and networking to send them to the phone in someone’s hand. Remove any one of the three and the app stops working.',
      'The big advantage is flexibility. If your app suddenly becomes popular, you can add more compute in minutes instead of ordering a new server and waiting weeks. When traffic drops, you scale back down and stop paying for what you no longer need. This ability to grow and shrink on demand is the main reason so many teams moved to the cloud.',
    ],
    key_terms: [
      { term: 'cloud', ipa: 'klaʊd', ar: 'السحابة (الحوسبة السحابية)', def_en: 'renting computing resources from a provider over the internet' },
      { term: 'provider', ipa: 'prəˈvaɪ.dər', ar: 'مزوّد الخدمة', def_en: 'the company that owns the machines and rents them out' },
      { term: 'data center', ipa: 'ˈdeɪ.tə ˌsen.tər', ar: 'مركز البيانات', def_en: 'a large building full of the computers that run cloud services' },
      { term: 'compute', ipa: 'kəmˈpjuːt', ar: 'قدرة المعالجة', def_en: 'the processing power that runs a program' },
      { term: 'storage', ipa: 'ˈstɔː.rɪdʒ', ar: 'التخزين', def_en: 'the space where files and data are kept' },
      { term: 'networking', ipa: 'ˈnet.wɜː.kɪŋ', ar: 'الشبكات', def_en: 'the connections that let systems and users talk to each other' },
      { term: 'scale', ipa: 'skeɪl', ar: 'يوسّع / يقلّص (التحجيم)', def_en: 'to increase or decrease resources as demand changes' },
    ],
    questions: [
      {
        q: 'What are the three basic building blocks of cloud services in the passage?',
        options: [
          { en: 'phones, apps, and websites', correct: false },
          { en: 'compute, storage, and networking', correct: true },
          { en: 'buildings, cables, and staff', correct: false },
        ],
        why: 'The passage names compute, storage, and networking as the three building blocks.',
      },
      {
        q: 'In the photo app example, what is storage used for?',
        options: [
          { en: 'resizing each picture', correct: false },
          { en: 'sending pictures to the phone', correct: false },
          { en: 'keeping the pictures safely', correct: true },
        ],
        why: 'It says the app needs storage to keep the pictures safely.',
      },
      {
        q: 'According to the passage, the main advantage of the cloud is that…',
        options: [
          { en: 'you can grow or shrink your resources on demand', correct: true },
          { en: 'the machines are not real', correct: false },
          { en: 'it is always completely free', correct: false },
        ],
        why: 'It says the ability to grow and shrink on demand is the main reason teams moved to the cloud.',
      },
    ],
    takeaway: 'The cloud is renting compute, storage, and networking that you can grow or shrink on demand.',
  },

  {
    id: 'r-deploy-rollback',
    order: 5,
    title: 'Deploy and Rollback',
    title_ar: 'النشر والتراجع',
    level: 'B2',
    minutes: 5,
    topic: 'Release engineering',
    intro: 'A runbook takes the fear out of shipping — and the smartest teams decide how to undo a release before they make it.',
    paragraphs: [
      'Shipping new code to production is called a deployment, and it is one of the more nerve-racking parts of an engineer’s week. A runbook exists to take the fear out of it: a written, step-by-step guide that anyone on the team can follow, even at midnight, even under pressure. The value of a runbook is that it replaces memory and improvisation with a checklist that has already been thought through in calm conditions.',
      'A solid deployment runbook does more than list the steps to push code out. It also defines how you will know whether the release is healthy. This usually means watching a few key metrics — error rate, latency, traffic — for a short window right after the deploy. If those numbers stay steady, you continue. If they turn ugly, you move to the second half of the runbook.',
      'That second half is the rollback: the plan to return the system to its previous, known-good state. A rollback is not an admission of failure; it is the responsible move when a release misbehaves. The golden rule is to decide your rollback trigger in advance — for instance, ‘if the error rate doubles for five minutes, roll back’ — so you are not debating it while users are affected.',
      'Teams that deploy well tend to deploy often, in small pieces. A small change is easier to reason about, and if something breaks, the rollback is quick and the blast radius is narrow. A giant, once-a-month release, by contrast, bundles dozens of changes together, so when it fails you cannot easily tell which change caused the damage.',
    ],
    key_terms: [
      { term: 'deployment', ipa: 'dɪˈplɔɪ.mənt', ar: 'النشر (إطلاق الكود)', def_en: 'the act of releasing new code to a running system' },
      { term: 'production', ipa: 'prəˈdʌk.ʃən', ar: 'بيئة الإنتاج', def_en: 'the live environment that real users actually use' },
      { term: 'runbook', ipa: 'ˈrʌn.bʊk', ar: 'دليل الإجراءات', def_en: 'a written step-by-step guide for performing an operation' },
      { term: 'rollback', ipa: 'ˈrəʊl.bæk', ar: 'التراجع (لإصدار سابق)', def_en: 'returning the system to its previous, known-good state' },
      { term: 'metric', ipa: 'ˈmet.rɪk', ar: 'مقياس', def_en: 'a measured number used to judge system health' },
      { term: 'trigger', ipa: 'ˈtrɪɡ.ər', ar: 'مُحفّز (شرط التفعيل)', def_en: 'the condition that, once met, tells you to take an action' },
      { term: 'blast radius', ipa: 'ˈblɑːst ˈreɪ.di.əs', ar: 'نطاق التأثير', def_en: 'how much of the system a failure can affect' },
    ],
    questions: [
      {
        q: 'What does the passage say is the main purpose of a runbook?',
        options: [
          { en: 'to replace memory and improvisation with a tested step-by-step guide', correct: true },
          { en: 'to make deployments impossible to roll back', correct: false },
          { en: 'to record which engineer broke the release', correct: false },
        ],
        why: 'It says a runbook’s value is replacing memory and improvisation with a checklist thought through in calm conditions.',
      },
      {
        q: 'How does the passage describe a rollback?',
        options: [
          { en: 'a sign that the engineer failed', correct: false },
          { en: 'the responsible move when a release misbehaves', correct: true },
          { en: 'something you should never plan in advance', correct: false },
        ],
        why: 'It states a rollback is not an admission of failure but the responsible move when a release misbehaves.',
      },
      {
        q: 'Why does the passage recommend small, frequent deployments?',
        options: [
          { en: 'they take longer, which is safer', correct: false },
          { en: 'they remove the need for any monitoring', correct: false },
          { en: 'if something breaks, the cause is easier to find and the blast radius is narrow', correct: true },
        ],
        why: 'It says a small change is easier to reason about and its rollback is quick with a narrow blast radius.',
      },
    ],
    takeaway: 'Decide your rollback trigger before you deploy, and ship small so failures stay small.',
  },

  {
    id: 'r-latency-throughput',
    order: 6,
    title: 'Latency, Throughput, and Bottlenecks',
    title_ar: 'زمن الاستجابة والإنتاجية ونقاط الاختناق',
    level: 'B2',
    minutes: 5,
    topic: 'Performance',
    intro: 'Two words engineers mix up constantly — and why you should measure before you optimize.',
    paragraphs: [
      'Two words come up constantly when engineers discuss performance, and they are easy to confuse. Latency is how long a single request takes — the delay between asking for something and receiving it. Throughput is how many requests the system can handle in a given time. A checkout counter makes the difference concrete: latency is how long one customer waits, while throughput is how many customers the shop serves per hour.',
      'The two are related but not the same, and improving one does not automatically improve the other. You can have low latency for a single user yet poor throughput once thousands arrive at once. This is why testing with one person on your laptop tells you almost nothing about how the system behaves under real load.',
      'When a system slows down, the cause is usually a bottleneck: the one component that cannot keep up while everything else waits on it. It might be a database that is slow to answer, a network link that is too narrow, or a queue that keeps filling faster than it drains. Like the neck of a bottle, this single narrow point limits the flow of the whole system, no matter how fast the other parts are.',
      'The practical lesson is to measure before you optimize. Engineers often guess wrong about where the bottleneck lives and spend days speeding up a part that was never the problem. Good performance work starts with data — you profile the system to find the real constraint — and only then fix it. Optimizing the wrong thing feels productive but changes nothing the user can feel.',
    ],
    key_terms: [
      { term: 'latency', ipa: 'ˈleɪ.tən.si', ar: 'زمن الاستجابة', def_en: 'the delay for a single request to complete' },
      { term: 'throughput', ipa: 'ˈθruː.pʊt', ar: 'الإنتاجية (معدّل المعالجة)', def_en: 'how many requests a system handles in a given time' },
      { term: 'load', ipa: 'ləʊd', ar: 'الحِمل (الضغط)', def_en: 'the amount of work or traffic the system is handling' },
      { term: 'bottleneck', ipa: 'ˈbɒt.əl.nek', ar: 'نقطة الاختناق', def_en: 'the one slow component that limits the whole system' },
      { term: 'queue', ipa: 'kjuː', ar: 'الطابور (قائمة الانتظار)', def_en: 'a line where work waits its turn to be processed' },
      { term: 'profile', ipa: 'ˈprəʊ.faɪl', ar: 'تحليل الأداء', def_en: 'to measure a system to find where its time is spent' },
      { term: 'optimize', ipa: 'ˈɒp.tɪ.maɪz', ar: 'يُحسّن الأداء', def_en: 'to make a part of the system faster or more efficient' },
    ],
    questions: [
      {
        q: 'In the shop example, throughput is…',
        options: [
          { en: 'how long one customer waits', correct: false },
          { en: 'how many customers the shop serves per hour', correct: true },
          { en: 'the number of counters', correct: false },
        ],
        why: 'The passage maps throughput to how many customers the shop serves per hour, and latency to one customer’s wait.',
      },
      {
        q: 'Why does testing with one user on your laptop tell you little about real performance?',
        options: [
          { en: 'low latency for one user does not prove good throughput under real load', correct: true },
          { en: 'laptops cannot run the software', correct: false },
          { en: 'one user always finds every bug', correct: false },
        ],
        why: 'It says you can have low latency for one user yet poor throughput once thousands arrive at once.',
      },
      {
        q: 'What does the passage say engineers should do before optimizing?',
        options: [
          { en: 'immediately rewrite the database', correct: false },
          { en: 'add more users to the test', correct: false },
          { en: 'measure and profile to find the real bottleneck', correct: true },
        ],
        why: 'It warns that engineers guess wrong, so good work profiles the system to find the real constraint first.',
      },
    ],
    takeaway: 'Latency is the wait for one request; throughput is how many you serve — measure to find the real bottleneck before optimizing.',
  },

  {
    id: 'r-blameless-postmortem',
    order: 7,
    title: 'The Blameless Postmortem',
    title_ar: 'مراجعة الحادثة دون لوم',
    level: 'B2',
    minutes: 5,
    topic: 'Incident response',
    intro: 'After an outage, the goal is not to find who to punish — it is to make the same failure impossible.',
    paragraphs: [
      'After a serious outage, mature engineering teams hold a postmortem: a meeting and a written document that examine what happened and why. The word sounds grim, borrowed from medicine, but the goal is entirely forward-looking. The team is not there to punish anyone; it is there to understand the system well enough that the same failure cannot quietly happen again.',
      'The key idea is that the postmortem is blameless. This does not mean nobody made a mistake — usually someone ran a command or approved a change that triggered the outage. It means the discussion treats that action as a symptom, not the root cause. If a single wrong click can take down production, the deeper problem is a system that allowed one click to do so much damage, without a guardrail or a warning to stop it.',
      'A blameless culture has a practical payoff: people tell the truth. When engineers are afraid of being blamed, they hide details, and the team learns nothing. When they know they are safe, they explain exactly what they saw and did, and those honest details are where the real lessons live. Fear produces silence; safety produces information.',
      'A good postmortem ends with concrete action items, each with an owner and a date — add a confirmation step here, improve an alert there, write the missing runbook. The document is then shared widely, because a lesson kept in one team’s head helps no one. Over months, these small fixes compound, and the whole system grows quietly more reliable.',
    ],
    key_terms: [
      { term: 'postmortem', ipa: 'ˌpəʊstˈmɔː.təm', ar: 'مراجعة ما بعد الحادثة', def_en: 'a review of an incident to learn why it happened' },
      { term: 'outage', ipa: 'ˈaʊ.tɪdʒ', ar: 'انقطاع الخدمة', def_en: 'a period when a service is unavailable to users' },
      { term: 'blameless', ipa: 'ˈbleɪm.ləs', ar: 'دون إلقاء لوم', def_en: 'focused on fixing the system, not punishing a person' },
      { term: 'root cause', ipa: 'ˈruːt kɔːz', ar: 'السبب الجذري', def_en: 'the deeper reason a failure was possible, not just the trigger' },
      { term: 'guardrail', ipa: 'ˈɡɑːd.reɪl', ar: 'حاجز وقائي', def_en: 'a safety check that stops a dangerous action' },
      { term: 'action item', ipa: 'ˈæk.ʃən ˈaɪ.təm', ar: 'بند إجرائي (مهمة للتنفيذ)', def_en: 'a concrete task with an owner and a due date' },
      { term: 'reliable', ipa: 'rɪˈlaɪ.ə.bəl', ar: 'موثوق', def_en: 'able to work correctly and consistently over time' },
    ],
    questions: [
      {
        q: 'What is the main goal of a blameless postmortem, according to the passage?',
        options: [
          { en: 'to decide who should be punished', correct: false },
          { en: 'to understand the system so the same failure cannot happen again', correct: true },
          { en: 'to prove the outage was nobody’s fault at all', correct: false },
        ],
        why: 'It says the team meets to understand the system well enough that the failure cannot quietly happen again.',
      },
      {
        q: 'Why does a blameless culture lead to better learning?',
        options: [
          { en: 'it means mistakes never happen', correct: false },
          { en: 'it removes the need for action items', correct: false },
          { en: 'people feel safe and share honest details instead of hiding them', correct: true },
        ],
        why: 'The passage says fear produces silence while safety produces the honest details where real lessons live.',
      },
      {
        q: 'A good postmortem ends with…',
        options: [
          { en: 'concrete action items, each with an owner and a date', correct: true },
          { en: 'a list of engineers to blame', correct: false },
          { en: 'a promise never to deploy again', correct: false },
        ],
        why: 'It says the document ends with concrete action items, each with an owner and a date.',
      },
    ],
    takeaway: 'Blame hides the truth; a blameless postmortem fixes the system, not the person.',
  },

  {
    id: 'r-security-hygiene',
    order: 8,
    title: 'Basic Security Hygiene',
    title_ar: 'النظافة الأمنية الأساسية',
    level: 'B2',
    minutes: 5,
    topic: 'Security',
    intro: 'Most breaches are not clever — they are boring gaps that daily habits quietly close.',
    paragraphs: [
      'Most security breaches do not come from brilliant, movie-style hacking. They come from small, boring gaps — a reused password, a secret left in the wrong place, an account that still has access it should have lost months ago. The daily habits that close these gaps are called security hygiene, and, like brushing your teeth, their value is in doing them consistently rather than perfectly once.',
      'Start with access. The guiding principle is least privilege: every person and every service should have only the permissions they actually need, and nothing more. When someone changes teams or leaves, their old access should be removed promptly. Access that outlives its purpose is a quiet risk, because a forgotten account is exactly the kind of door an attacker hopes to find unlocked.',
      'Next, protect your secrets — the passwords, API keys, and tokens that unlock systems. A secret belongs in a dedicated secrets manager, never hard-coded in the source code and never pasted into a chat message. Code gets shared, copied, and stored in many places, so a key written directly into it should be treated as already exposed.',
      'Finally, turn on multi-factor authentication, usually shortened to MFA, everywhere it is offered. A password alone can be guessed, phished, or leaked; MFA adds a second proof — a code from your phone, for example — so a stolen password is no longer enough by itself. None of these habits is clever, and that is the point. Security is mostly a discipline of doing the ordinary, unglamorous things every single day.',
    ],
    key_terms: [
      { term: 'breach', ipa: 'briːtʃ', ar: 'اختراق أمني', def_en: 'an event where an attacker gains access they should not have' },
      { term: 'security hygiene', ipa: 'sɪˈkjʊə.rə.ti ˈhaɪ.dʒiːn', ar: 'النظافة الأمنية', def_en: 'the routine daily habits that keep systems safe' },
      { term: 'least privilege', ipa: 'liːst ˈprɪv.əl.ɪdʒ', ar: 'أقل صلاحية ممكنة', def_en: 'giving only the access that is truly needed, nothing more' },
      { term: 'permissions', ipa: 'pəˈmɪʃ.ənz', ar: 'الصلاحيات', def_en: 'the specific actions an account is allowed to perform' },
      { term: 'secret', ipa: 'ˈsiː.krət', ar: 'سرّ (مفتاح / كلمة مرور)', def_en: 'a password, key, or token that unlocks a system' },
      { term: 'secrets manager', ipa: 'ˈsiː.krəts ˈmæn.ɪ.dʒər', ar: 'مدير الأسرار', def_en: 'a secure tool built to store and hand out secrets safely' },
      { term: 'MFA', ipa: 'ˌem.efˈeɪ', ar: 'المصادقة متعددة العوامل', def_en: 'requiring a second proof of identity beyond the password' },
    ],
    questions: [
      {
        q: 'According to the passage, most security breaches come from…',
        options: [
          { en: 'brilliant, movie-style hacking', correct: false },
          { en: 'small, boring gaps like reused passwords and stale access', correct: true },
          { en: 'turning on MFA', correct: false },
        ],
        why: 'It opens by saying breaches come from small, boring gaps, not brilliant hacking.',
      },
      {
        q: 'The principle of least privilege means…',
        options: [
          { en: 'everyone gets full admin access for speed', correct: false },
          { en: 'each person or service has only the permissions it actually needs', correct: true },
          { en: 'passwords should be as short as possible', correct: false },
        ],
        why: 'The passage defines least privilege as having only the permissions you actually need and nothing more.',
      },
      {
        q: 'Why should a secret never be written directly into source code?',
        options: [
          { en: 'code cannot store text', correct: false },
          { en: 'secrets managers are not allowed', correct: false },
          { en: 'code is shared and copied widely, so the key should be treated as already exposed', correct: true },
        ],
        why: 'It says code gets shared, copied, and stored in many places, so a key written into it is treated as exposed.',
      },
      {
        q: 'How does MFA protect an account?',
        options: [
          { en: 'it adds a second proof, so a stolen password alone is not enough', correct: true },
          { en: 'it makes the password longer', correct: false },
          { en: 'it removes the need for passwords entirely', correct: false },
        ],
        why: 'The passage says MFA adds a second proof so a stolen password is no longer enough by itself.',
      },
    ],
    takeaway: 'Security is mostly quiet discipline: least privilege, protected secrets, and MFA everywhere.',
  },
]

export const TOTAL_READING = DESK_READING.length
export function getReading(id) { return DESK_READING.find((r) => r.id === id) || null }
