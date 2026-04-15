const { Pool } = require('pg');
const pool = new Pool({ host: 'aws-1-eu-central-1.pooler.supabase.com', port: 5432, database: 'postgres', user: 'postgres.nmjexpuycmcxuxljier', password: 'Ali-al-ahmad2000', ssl: { rejectUnauthorized: false } });

async function insertBatch(client, words, unitNumber, batchId) {
  let inserted = 0;
  for (const w of words) {
    try {
      await client.query(
        `INSERT INTO public.vocab_staging_l4 (word, pos, definition_ar, example_en, example_ar, recommended_tier, cefr_level, source_list, recommended_unit, batch_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (word) DO NOTHING`,
        [w[0], w[1], w[2], w[3], w[4], w[5], w[6], w[7], unitNumber, batchId]
      );
      inserted++;
    } catch(e) { console.error(`Error "${w[0]}":`, e.message); }
  }
  return inserted;
}

// U6 - Cryptocurrency (60 words)
const u6 = [
["fintech","noun","التكنولوجيا المالية","Fintech companies are disrupting traditional banking.","شركات التكنولوجيا المالية تُحدث تغييراً جذرياً في الخدمات المصرفية التقليدية.","core","B2","COCA"],
["tokenomics","noun","اقتصاديات الرموز","The tokenomics of this project incentivize long-term holding.","اقتصاديات الرموز لهذا المشروع تُحفّز الاحتفاظ طويل الأمد.","extended","C1","COCA"],
["interoperability","noun","قابلية التشغيل البيني","Interoperability between blockchains is a major challenge.","قابلية التشغيل البيني بين سلاسل الكتل تمثّل تحدّياً كبيراً.","mastery","C1","AWL"],
["custodian","noun","أمين الحفظ","The custodian secures digital assets on behalf of clients.","يقوم أمين الحفظ بتأمين الأصول الرقمية نيابةً عن العملاء.","core","B2","COCA"],
["multisig","noun","التوقيع المتعدد","A multisig wallet requires multiple approvals for transactions.","تتطلّب محفظة التوقيع المتعدد موافقات عديدة للمعاملات.","extended","C1","COCA"],
["deflationary","adjective","انكماشي","Bitcoin is considered a deflationary asset due to its fixed supply.","يُعتبر البيتكوين أصلاً انكماشياً بسبب عرضه المحدود.","core","B2","COCA"],
["inflationary","adjective","تضخمي","Some tokens have an inflationary model with unlimited supply.","بعض الرموز لها نموذج تضخمي بعرض غير محدود.","core","B2","COCA"],
["whitelist","noun","القائمة البيضاء","Only whitelist members can participate in the presale.","يمكن فقط لأعضاء القائمة البيضاء المشاركة في البيع المسبق.","core","B2","COCA"],
["blacklist","noun","القائمة السوداء","Suspicious addresses are added to the blacklist.","تُضاف العناوين المشبوهة إلى القائمة السوداء.","core","B2","COCA"],
["slippage","noun","الانزلاق السعري","High slippage occurs during periods of low liquidity.","يحدث الانزلاق السعري العالي خلال فترات السيولة المنخفضة.","extended","B2","COCA"],
["arbitrageur","noun","المراجح","An arbitrageur profits from price differences across exchanges.","يربح المراجح من فروقات الأسعار بين المنصات.","mastery","C1","COCA"],
["hodl","verb","الاحتفاظ بالعملة","Many investors choose to hodl during market downturns.","يختار كثير من المستثمرين الاحتفاظ بعملاتهم أثناء تراجع السوق.","core","B2","COCA"],
["whale","noun","حوت (مستثمر كبير)","A whale moved ten thousand bitcoins to a new wallet.","نقل حوتٌ عشرة آلاف بيتكوين إلى محفظة جديدة.","core","B2","COCA"],
["altseason","noun","موسم العملات البديلة","During altseason, smaller cryptocurrencies outperform Bitcoin.","خلال موسم العملات البديلة تتفوّق العملات الصغيرة على البيتكوين.","extended","B2","COCA"],
["bullish","adjective","صعودي","The market sentiment turned bullish after the announcement.","تحوّلت معنويات السوق إلى صعودية بعد الإعلان.","core","B2","COCA"],
["bearish","adjective","هبوطي","Traders remain bearish on the short-term outlook.","يظل المتداولون متشائمين بشأن التوقعات قصيرة الأمد.","core","B2","COCA"],
["orderbook","noun","سجل الأوامر","The orderbook shows all pending buy and sell orders.","يعرض سجل الأوامر جميع أوامر الشراء والبيع المعلّقة.","extended","B2","COCA"],
["candlestick","noun","الشمعة اليابانية","Each candlestick represents price movement over a specific period.","تمثّل كل شمعة يابانية حركة السعر خلال فترة محددة.","core","B2","COCA"],
["portfolio rebalancing","noun","إعادة توازن المحفظة","Portfolio rebalancing helps maintain the desired asset allocation.","تساعد إعادة توازن المحفظة في الحفاظ على التوزيع المطلوب للأصول.","extended","C1","AWL"],
["staking reward","noun","مكافأة التخزين","Validators earn staking rewards for securing the network.","يحصل المدقّقون على مكافآت التخزين لتأمين الشبكة.","core","B2","COCA"],
["validator node","noun","عقدة التحقق","Running a validator node requires a minimum stake.","يتطلب تشغيل عقدة التحقق حداً أدنى من الحصة.","extended","C1","COCA"],
["gas limit","noun","حد الغاز","The gas limit determines the maximum computation per block.","يحدد حد الغاز أقصى قدر من الحوسبة لكل كتلة.","extended","B2","COCA"],
["block height","noun","ارتفاع الكتلة","The transaction was confirmed at block height five hundred thousand.","تم تأكيد المعاملة عند ارتفاع الكتلة خمسمائة ألف.","extended","B2","COCA"],
["epoch","noun","حقبة","The network enters a new epoch every six hours.","تدخل الشبكة حقبة جديدة كل ست ساعات.","core","B2","AWL"],
["attestation","noun","تصديق","Validators submit attestations to confirm block validity.","يقدّم المدقّقون تصديقات لتأكيد صلاحية الكتل.","extended","C1","AWL"],
["delegator","noun","مُفوِّض","A delegator assigns their stake to a trusted validator.","يُعيّن المفوِّض حصته لمدقّق موثوق.","extended","B2","COCA"],
["nominator","noun","مُرشِّح","The nominator selects validators to back with their tokens.","يختار المرشِّح المدقّقين لدعمهم برموزه.","extended","C1","COCA"],
["collateral","noun","ضمان","Borrowers must deposit collateral to obtain a loan.","يجب على المقترضين إيداع ضمان للحصول على قرض.","core","B2","COCA"],
["overcollateralized","adjective","مفرط الضمان","The loan is overcollateralized at one hundred fifty percent.","القرض مفرط الضمان بنسبة مائة وخمسين بالمائة.","mastery","C1","COCA"],
["undercollateralized","adjective","ناقص الضمان","Undercollateralized loans carry higher default risk.","تحمل القروض ناقصة الضمان مخاطر تخلّف أعلى.","mastery","C1","COCA"],
["liquidation threshold","noun","عتبة التصفية","If the ratio drops below the liquidation threshold, assets are sold.","إذا انخفضت النسبة دون عتبة التصفية تُباع الأصول.","extended","C1","COCA"],
["impermanent","adjective","غير دائم","Impermanent loss affects liquidity providers in volatile markets.","يؤثّر الخسارة غير الدائمة على مزوّدي السيولة في الأسواق المتقلّبة.","extended","B2","COCA"],
["composability","noun","قابلية التركيب","Composability allows DeFi protocols to build on each other.","تسمح قابلية التركيب لبروتوكولات التمويل اللامركزي بالبناء فوق بعضها.","mastery","C1","COCA"],
["programmable money","noun","النقود القابلة للبرمجة","Smart contracts enable programmable money with automated rules.","تُتيح العقود الذكية النقود القابلة للبرمجة بقواعد آلية.","extended","B2","COCA"],
["trustless","adjective","بلا حاجة للثقة","Blockchain enables trustless transactions between strangers.","تُتيح سلسلة الكتل معاملات بلا حاجة للثقة بين الغرباء.","core","B2","COCA"],
["permissionless","adjective","بلا حاجة لإذن","Anyone can participate in a permissionless network.","يمكن لأي شخص المشاركة في شبكة بلا حاجة لإذن.","core","B2","COCA"],
["censorship-resistant","adjective","مقاوم للرقابة","Decentralized platforms are censorship-resistant by design.","المنصات اللامركزية مقاومة للرقابة بطبيعة تصميمها.","extended","C1","COCA"],
["self-custodial","adjective","ذاتي الحفظ","A self-custodial wallet gives users full control of their keys.","تمنح المحفظة ذاتية الحفظ المستخدمين سيطرة كاملة على مفاتيحهم.","extended","B2","COCA"],
["non-custodial","adjective","غير حفظي","Non-custodial exchanges never hold user funds.","لا تحتفظ المنصات غير الحفظية بأموال المستخدمين أبداً.","extended","B2","COCA"],
["cold storage","noun","التخزين البارد","Large funds should be kept in cold storage for security.","يجب حفظ الأموال الكبيرة في التخزين البارد للأمان.","core","B2","COCA"],
["hot wallet","noun","المحفظة الساخنة","A hot wallet is connected to the internet for quick access.","المحفظة الساخنة متصلة بالإنترنت للوصول السريع.","core","B2","COCA"],
["hardware wallet","noun","المحفظة المادية","A hardware wallet stores private keys on a physical device.","تخزّن المحفظة المادية المفاتيح الخاصة على جهاز فعلي.","core","B2","COCA"],
["seed phrase","noun","عبارة الاسترداد","Never share your seed phrase with anyone.","لا تشارك عبارة الاسترداد مع أي شخص أبداً.","core","B2","COCA"],
["recovery phrase","noun","عبارة الاستعادة","Write down your recovery phrase and store it safely.","اكتب عبارة الاستعادة واحفظها في مكان آمن.","core","B1","COCA"],
["mnemonic","noun","فنّ الاستذكار","The mnemonic generates a unique cryptographic key pair.","يُولّد فنّ الاستذكار زوج مفاتيح تشفير فريداً.","extended","C1","COCA"],
["deterministic","adjective","حتمي","A deterministic wallet generates keys from a single seed.","تُولّد المحفظة الحتمية مفاتيح من بذرة واحدة.","extended","C1","AWL"],
["derivation path","noun","مسار الاشتقاق","The derivation path specifies which key to generate.","يحدد مسار الاشتقاق أي مفتاح سيتم توليده.","mastery","C1","COCA"],
["signing key","noun","مفتاح التوقيع","The signing key authorizes transactions on the network.","يُصرّح مفتاح التوقيع بالمعاملات على الشبكة.","extended","B2","COCA"],
["public ledger","noun","السجل العام","Every transaction is recorded on the public ledger.","تُسجَّل كل معاملة في السجل العام.","core","B2","COCA"],
["immutable record","noun","سجل غير قابل للتغيير","Blockchain creates an immutable record of all transactions.","تُنشئ سلسلة الكتل سجلاً غير قابل للتغيير لجميع المعاملات.","core","B2","AWL"],
["distributed network","noun","شبكة موزّعة","A distributed network has no single point of failure.","لا تملك الشبكة الموزّعة نقطة فشل واحدة.","core","B2","AWL"],
["peer discovery","noun","اكتشاف الأقران","Peer discovery protocols help nodes find each other.","تساعد بروتوكولات اكتشاف الأقران العُقَد على إيجاد بعضها.","extended","C1","COCA"],
["gossip protocol","noun","بروتوكول الإشاعة","The gossip protocol spreads information across all nodes.","ينشر بروتوكول الإشاعة المعلومات عبر جميع العُقَد.","mastery","C1","COCA"],
["mempool priority","noun","أولوية مجمّع المعاملات","Transactions with higher fees get mempool priority.","تحصل المعاملات ذات الرسوم الأعلى على أولوية في مجمّع المعاملات.","extended","C1","COCA"],
["transaction throughput","noun","إنتاجية المعاملات","The upgrade doubled the transaction throughput of the network.","ضاعفت الترقية إنتاجية معاملات الشبكة.","extended","B2","COCA"],
["finality","noun","النهائية","Finality means a transaction cannot be reversed.","النهائية تعني أن المعاملة لا يمكن عكسها.","core","B2","AWL"],
["liveness","noun","الحيوية","Liveness ensures the network continues to process transactions.","تضمن الحيوية استمرار الشبكة في معالجة المعاملات.","extended","C1","COCA"],
["safety guarantee","noun","ضمان السلامة","The consensus mechanism provides a safety guarantee against fraud.","توفّر آلية الإجماع ضمان السلامة ضد الاحتيال.","extended","C1","COCA"],
["economic security","noun","الأمن الاقتصادي","Proof of stake relies on economic security to deter attacks.","يعتمد إثبات الحصة على الأمن الاقتصادي لردع الهجمات.","core","B2","AWL"],
["slashing condition","noun","شرط العقوبة","Validators who misbehave trigger a slashing condition.","يُفعّل المدقّقون المخالفون شرط العقوبة.","mastery","C1","COCA"],
];

// U7 - Crowd Psychology (50 words)
const u7 = [
["groupthink","noun","التفكير الجماعي","Groupthink led the committee to ignore critical warnings.","أدّى التفكير الجماعي بالّلجنة إلى تجاهل التحذيرات الحرجة.","core","B2","COCA"],
["deindividuation","noun","فقدان الفردية","Deindividuation in crowds can lead to antisocial behavior.","يمكن أن يؤدي فقدان الفردية في الحشود إلى سلوك معادٍ للمجتمع.","mastery","C1","COCA"],
["social loafing","noun","التكاسل الاجتماعي","Social loafing increases when individual contributions are not tracked.","يزداد التكاسل الاجتماعي عندما لا تُتابَع المساهمات الفردية.","extended","B2","COCA"],
["diffusion of responsibility","noun","تشتّت المسؤولية","Diffusion of responsibility explains why large groups often fail to act.","يفسّر تشتّت المسؤولية سبب فشل المجموعات الكبيرة في التصرّف غالباً.","extended","C1","AWL"],
["bystander effect","noun","تأثير المتفرج","The bystander effect prevented anyone from calling for help.","منع تأثير المتفرج أي شخص من طلب المساعدة.","core","B2","COCA"],
["pluralistic ignorance","noun","الجهل التعددي","Pluralistic ignorance causes people to conform to norms they privately reject.","يدفع الجهل التعددي الناس للامتثال لمعايير يرفضونها داخلياً.","mastery","C1","COCA"],
["normative influence","noun","التأثير المعياري","Normative influence drives people to behave like their peers.","يدفع التأثير المعياري الناس للتصرّف مثل أقرانهم.","extended","B2","AWL"],
["informational influence","noun","التأثير المعلوماتي","Informational influence occurs when people look to others for guidance.","يحدث التأثير المعلوماتي عندما يتطلّع الناس للآخرين بحثاً عن التوجيه.","extended","B2","AWL"],
["obedience","noun","الطاعة","Milgram's experiment revealed shocking levels of obedience to authority.","كشفت تجربة ميلغرام عن مستويات صادمة من الطاعة للسلطة.","core","B2","COCA"],
["authority figure","noun","شخصية ذات سلطة","People tend to comply with requests from an authority figure.","يميل الناس للامتثال لطلبات شخصية ذات سلطة.","core","B1","COCA"],
["charismatic leader","noun","قائد كاريزمي","A charismatic leader can mobilize masses through emotional appeal.","يستطيع القائد الكاريزمي تعبئة الجماهير عبر الجاذبية العاطفية.","core","B2","COCA"],
["cult of personality","noun","عبادة الشخصية","The regime cultivated a cult of personality around the dictator.","رعى النظام عبادة الشخصية حول الدكتاتور.","extended","C1","COCA"],
["bandwagon effect","noun","تأثير العربة","The bandwagon effect caused a surge in late adopters.","سبّب تأثير العربة موجة من المتبنّين المتأخرين.","core","B2","COCA"],
["spiral of silence","noun","لولب الصمت","The spiral of silence suppresses minority opinions in public.","يقمع لولب الصمت آراء الأقلية في العلن.","extended","C1","COCA"],
["overton window","noun","نافذة أوفرتون","The debate shifted the overton window on immigration policy.","غيّر النقاش نافذة أوفرتون بشأن سياسة الهجرة.","mastery","C1","COCA"],
["moral disengagement","noun","الانفكاك الأخلاقي","Moral disengagement allows people to justify harmful actions.","يسمح الانفكاك الأخلاقي للناس بتبرير الأفعال الضارة.","extended","C1","AWL"],
["dehumanization","noun","التجريد من الإنسانية","Dehumanization is a precursor to systematic violence.","التجريد من الإنسانية مقدّمة للعنف المنهجي.","extended","C1","COCA"],
["othering","noun","التغيير (تصنيف الآخر)","Othering creates an artificial division between social groups.","يخلق التغيير انقساماً مصطنعاً بين المجموعات الاجتماعية.","extended","C1","COCA"],
["scapegoating","noun","كبش الفداء","Scapegoating minorities intensifies during economic crises.","يشتد استخدام كبش الفداء ضد الأقليات خلال الأزمات الاقتصادية.","core","B2","COCA"],
["tribalism","noun","القبلية","Political tribalism makes compromise nearly impossible.","تجعل القبلية السياسية التسوية شبه مستحيلة.","core","B2","COCA"],
["ingroup bias","noun","تحيّز المجموعة الداخلية","Ingroup bias leads people to favor members of their own group.","يدفع تحيّز المجموعة الداخلية الناس لتفضيل أعضاء مجموعتهم.","extended","B2","COCA"],
["outgroup hostility","noun","عداء المجموعة الخارجية","Outgroup hostility increases during times of resource scarcity.","يزداد عداء المجموعة الخارجية في أوقات شُح الموارد.","extended","C1","COCA"],
["cognitive dissonance","noun","التنافر المعرفي","Cognitive dissonance arises when beliefs conflict with actions.","ينشأ التنافر المعرفي عندما تتعارض المعتقدات مع الأفعال.","core","B2","COCA"],
["self-justification","noun","التبرير الذاتي","Self-justification prevents people from admitting mistakes.","يمنع التبرير الذاتي الناس من الاعتراف بالأخطاء.","extended","B2","COCA"],
["rationalization","noun","التبرير العقلاني","Rationalization helps reduce the discomfort of poor decisions.","يساعد التبرير العقلاني في تقليل الانزعاج من القرارات السيئة.","core","B2","AWL"],
["denial","noun","الإنكار","Denial is a common defense mechanism against unpleasant truths.","الإنكار آلية دفاع شائعة ضد الحقائق المزعجة.","core","B1","COCA"],
["projection","noun","الإسقاط","Projection involves attributing one's own flaws to others.","يتضمّن الإسقاط نسب عيوب المرء إلى الآخرين.","core","B2","AWL"],
["displacement","noun","الإزاحة","Displacement redirects emotions from the source to a safer target.","تُعيد الإزاحة توجيه المشاعر من المصدر إلى هدف أكثر أماناً.","extended","B2","COCA"],
["sublimation","noun","التسامي","Sublimation channels negative impulses into productive activities.","يُحوّل التسامي الدوافع السلبية إلى أنشطة إنتاجية.","extended","C1","COCA"],
["reaction formation","noun","التكوين العكسي","Reaction formation disguises true feelings with opposite behavior.","يُخفي التكوين العكسي المشاعر الحقيقية بسلوك معاكس.","mastery","C1","COCA"],
["social proof","noun","الدليل الاجتماعي","Social proof drives consumers to follow popular choices.","يدفع الدليل الاجتماعي المستهلكين لاتّباع الخيارات الشائعة.","core","B2","COCA"],
["anchoring","noun","التثبيت","Anchoring causes people to rely too heavily on initial information.","يدفع التثبيت الناس للاعتماد بشكل مفرط على المعلومات الأولية.","core","B2","COCA"],
["framing effect","noun","تأثير التأطير","The framing effect changes decisions based on how options are presented.","يُغيّر تأثير التأطير القرارات بناءً على كيفية عرض الخيارات.","core","B2","COCA"],
["availability heuristic","noun","استدلال التوافر","The availability heuristic makes recent events seem more probable.","يجعل استدلال التوافر الأحداث الأخيرة تبدو أكثر احتمالاً.","extended","C1","COCA"],
["representativeness","noun","التمثيلية","Representativeness leads people to judge probability by similarity.","تدفع التمثيلية الناس للحكم على الاحتمالية من خلال التشابه.","extended","C1","AWL"],
["sunk cost fallacy","noun","مغالطة التكلفة الغارقة","The sunk cost fallacy keeps investors holding losing positions.","تُبقي مغالطة التكلفة الغارقة المستثمرين متمسّكين بمراكز خاسرة.","extended","B2","COCA"],
["loss aversion","noun","النفور من الخسارة","Loss aversion means people feel losses more strongly than gains.","يعني النفور من الخسارة أن الناس يشعرون بالخسائر أقوى من المكاسب.","core","B2","COCA"],
["status quo bias","noun","تحيّز الوضع الراهن","Status quo bias makes people resist beneficial changes.","يجعل تحيّز الوضع الراهن الناس يقاومون التغييرات المفيدة.","extended","B2","COCA"],
["dunning-kruger","noun","تأثير دانينغ-كروغر","The dunning-kruger effect causes unskilled people to overestimate their abilities.","يجعل تأثير دانينغ-كروغر غير المهرة يبالغون في تقدير قدراتهم.","extended","B2","COCA"],
["impostor syndrome","noun","متلازمة المحتال","Impostor syndrome is common among high-achieving professionals.","متلازمة المحتال شائعة بين المهنيين ذوي الإنجازات العالية.","core","B2","COCA"],
["learned helplessness","noun","العجز المكتسب","Learned helplessness develops after repeated uncontrollable failures.","يتطوّر العجز المكتسب بعد إخفاقات متكررة لا يمكن السيطرة عليها.","extended","C1","COCA"],
["self-fulfilling prophecy","noun","النبوءة المحقِّقة لذاتها","A self-fulfilling prophecy occurs when expectations shape reality.","تحدث النبوءة المحقِّقة لذاتها عندما تُشكّل التوقعات الواقع.","core","B2","COCA"],
["pygmalion effect","noun","تأثير بيجماليون","The pygmalion effect shows that higher expectations improve performance.","يُظهر تأثير بيجماليون أن التوقعات الأعلى تُحسّن الأداء.","extended","C1","COCA"],
["halo effect","noun","تأثير الهالة","The halo effect causes one positive trait to color overall judgment.","يجعل تأثير الهالة سمة إيجابية واحدة تؤثّر في الحكم الكلي.","core","B2","COCA"],
["horn effect","noun","تأثير القرون","The horn effect causes one negative trait to bias perception.","يجعل تأثير القرون سمة سلبية واحدة تُشوّه الإدراك.","extended","B2","COCA"],
["priming","noun","التهيئة","Priming subtly influences behavior through prior exposure to stimuli.","تؤثّر التهيئة بشكل خفي على السلوك من خلال التعرّض المسبق للمحفّزات.","extended","C1","COCA"],
["nudge theory","noun","نظرية الدفع","Nudge theory uses subtle cues to guide better decisions.","تستخدم نظرية الدفع إشارات خفية لتوجيه قرارات أفضل.","extended","B2","AWL"],
["choice architecture","noun","هندسة الاختيار","Choice architecture designs environments that influence decision-making.","تصمّم هندسة الاختيار بيئات تؤثّر في صنع القرار.","extended","C1","AWL"],
["libertarian paternalism","noun","الأبوية التحررية","Libertarian paternalism preserves freedom while encouraging better choices.","تحافظ الأبوية التحررية على الحرية مع تشجيع خيارات أفضل.","mastery","C1","COCA"],
["behavioral economics","noun","الاقتصاد السلوكي","Behavioral economics combines psychology with economic theory.","يجمع الاقتصاد السلوكي بين علم النفس والنظرية الاقتصادية.","core","B2","AWL"],
];

// U8 - Forensic Science (70 words)
const u8 = [
["blood spatter","noun","رذاذ الدم","Blood spatter analysis reveals the dynamics of an attack.","يكشف تحليل رذاذ الدم ديناميكيات الهجوم.","extended","C1","COCA"],
["gunshot residue","noun","بقايا إطلاق النار","Gunshot residue on his hands linked him to the shooting.","ربطته بقايا إطلاق النار على يديه بحادثة إطلاق النار.","extended","C1","COCA"],
["tool mark","noun","أثر الأداة","The tool mark on the door frame matched the suspect's crowbar.","تطابق أثر الأداة على إطار الباب مع عتلة المشتبه به.","core","B2","COCA"],
["impression evidence","noun","دليل الانطباعات","Impression evidence includes footprints, tire tracks, and bite marks.","يشمل دليل الانطباعات آثار الأقدام ومسارات الإطارات وعلامات العض.","extended","B2","COCA"],
["questioned document","noun","مستند مشكوك فيه","The forensic team examined the questioned document for forgery.","فحص الفريق الجنائي المستند المشكوك فيه بحثاً عن التزوير.","extended","C1","COCA"],
["handwriting analysis","noun","تحليل الخطوط","Handwriting analysis confirmed the signature was forged.","أكّد تحليل الخطوط أن التوقيع مزوّر.","core","B2","COCA"],
["ink analysis","noun","تحليل الحبر","Ink analysis determined the document was written recently.","حدّد تحليل الحبر أن المستند كُتب مؤخراً.","extended","B2","COCA"],
["paper analysis","noun","تحليل الورق","Paper analysis revealed the document's age and origin.","كشف تحليل الورق عن عمر المستند ومنشأه.","extended","B2","COCA"],
["fiber analysis","noun","تحليل الألياف","Fiber analysis linked the suspect's clothing to the crime scene.","ربط تحليل الألياف ملابس المشتبه به بمسرح الجريمة.","extended","B2","COCA"],
["hair analysis","noun","تحليل الشعر","Hair analysis can reveal drug use over several months.","يمكن لتحليل الشعر كشف تعاطي المخدرات على مدى عدة أشهر.","core","B2","COCA"],
["soil analysis","noun","تحليل التربة","Soil analysis on the shoes placed the suspect at the burial site.","وضع تحليل التربة على الأحذية المشتبه به في موقع الدفن.","extended","B2","COCA"],
["glass fragment","noun","شظية زجاجية","A glass fragment from the broken window was found on the suspect.","عُثر على شظية زجاجية من النافذة المكسورة على المشتبه به.","core","B2","COCA"],
["paint chip","noun","رقاقة طلاء","The paint chip matched the color of the suspect's vehicle.","تطابقت رقاقة الطلاء مع لون مركبة المشتبه به.","core","B2","COCA"],
["accelerant","noun","مادة مسرّعة للاشتعال","Forensic chemists detected accelerant residues at the fire scene.","اكتشف الكيميائيون الجنائيون بقايا مادة مسرّعة في موقع الحريق.","extended","C1","COCA"],
["arson investigation","noun","تحقيق الحرق العمد","The arson investigation revealed the fire was deliberately set.","كشف تحقيق الحرق العمد أن الحريق أُشعل عمداً.","core","B2","COCA"],
["bomb disposal","noun","إبطال القنابل","The bomb disposal unit safely neutralized the device.","أبطلت وحدة إبطال القنابل الجهاز بأمان.","core","B2","COCA"],
["explosive residue","noun","بقايا متفجرات","Explosive residue was detected on the package wrapping.","كُشفت بقايا متفجرات على غلاف الطرد.","extended","C1","COCA"],
["cyber forensics","noun","الطب الشرعي الرقمي","Cyber forensics recovered deleted files from the hard drive.","استعاد الطب الشرعي الرقمي ملفات محذوفة من القرص الصلب.","extended","B2","COCA"],
["email tracing","noun","تتبّع البريد الإلكتروني","Email tracing revealed the threat originated from overseas.","كشف تتبّع البريد الإلكتروني أن التهديد صدر من الخارج.","core","B2","COCA"],
["metadata analysis","noun","تحليل البيانات الوصفية","Metadata analysis showed the photo was taken at the crime scene.","أظهر تحليل البيانات الوصفية أن الصورة التُقطت في مسرح الجريمة.","extended","B2","AWL"],
["blockchain forensics","noun","الطب الشرعي لسلسلة الكتل","Blockchain forensics traced the ransom payment to an exchange.","تتبّع الطب الشرعي لسلسلة الكتل دفعة الفدية إلى منصة تداول.","mastery","C1","COCA"],
["voice analysis","noun","تحليل الصوت","Voice analysis identified the caller from the recorded threat.","حدّد تحليل الصوت المتصل من التهديد المسجّل.","core","B2","COCA"],
["facial recognition","noun","التعرّف على الوجه","Facial recognition matched the suspect to security camera footage.","طابق التعرّف على الوجه المشتبه به مع لقطات كاميرا المراقبة.","core","B2","COCA"],
["gait analysis","noun","تحليل المشية","Gait analysis identified the suspect from surveillance video.","حدّد تحليل المشية المشتبه به من فيديو المراقبة.","extended","C1","COCA"],
["bite mark","noun","علامة عضّة","The bite mark on the victim matched the suspect's dental records.","تطابقت علامة العضّة على الضحية مع سجلات أسنان المشتبه به.","core","B2","COCA"],
["wound pattern","noun","نمط الجرح","The wound pattern suggested a serrated blade was used.","أشار نمط الجرح إلى استخدام شفرة مسنّنة.","extended","B2","COCA"],
["ligature mark","noun","علامة رباط","Ligature marks on the wrists indicated the victim was restrained.","أشارت علامات الرباط على المعصمين إلى تقييد الضحية.","extended","C1","COCA"],
["defense wound","noun","جرح دفاعي","Defense wounds on the hands showed the victim resisted the attacker.","أظهرت الجروح الدفاعية على اليدين مقاومة الضحية للمهاجم.","core","B2","COCA"],
["hesitation mark","noun","علامة تردّد","Hesitation marks near the wound suggested self-infliction.","أشارت علامات التردّد قرب الجرح إلى إيذاء النفس.","extended","C1","COCA"],
["exit wound","noun","جرح خروج","The exit wound was larger than the entry wound.","كان جرح الخروج أكبر من جرح الدخول.","core","B2","COCA"],
["entry wound","noun","جرح دخول","The entry wound showed signs of close-range firing.","أظهر جرح الدخول علامات إطلاق النار من مسافة قريبة.","core","B2","COCA"],
["stippling","noun","التنقيط","Stippling around the wound indicates intermediate firing range.","يشير التنقيط حول الجرح إلى مسافة إطلاق متوسطة.","extended","C1","COCA"],
["wadding","noun","الحشوة","Wadding from the shotgun shell was embedded in the wound.","كانت حشوة خرطوشة البندقية مغروسة في الجرح.","extended","C1","COCA"],
["cartridge case","noun","غلاف الخرطوشة","The cartridge case was found three meters from the victim.","عُثر على غلاف الخرطوشة على بعد ثلاثة أمتار من الضحية.","core","B2","COCA"],
["shell casing","noun","غلاف الطلقة","Police collected twelve shell casings from the scene.","جمعت الشرطة اثني عشر غلاف طلقة من الموقع.","core","B2","COCA"],
["rifling","noun","الحزوز","Rifling marks on the bullet matched the suspect's firearm.","تطابقت علامات الحزوز على الرصاصة مع سلاح المشتبه به.","extended","C1","COCA"],
["caliber","noun","العيار","The caliber of the bullet was determined to be nine millimeters.","تم تحديد عيار الرصاصة بتسعة ملليمترات.","core","B2","COCA"],
["muzzle velocity","noun","سرعة الفوهة","The muzzle velocity affects the bullet's penetration depth.","تؤثّر سرعة الفوهة على عمق اختراق الرصاصة.","extended","C1","COCA"],
["trajectory analysis","noun","تحليل المسار","Trajectory analysis reconstructed the shooter's position.","أعاد تحليل المسار بناء موقع مُطلق النار.","extended","B2","AWL"],
["bloodhound","noun","كلب الدم","The bloodhound tracked the fugitive through dense forest.","تتبّع كلب الدم الهارب عبر غابة كثيفة.","core","B1","COCA"],
["cadaver dog","noun","كلب الجثث","A cadaver dog located remains buried beneath the foundation.","حدّد كلب الجثث رفاتاً مدفونة تحت الأساس.","extended","B2","COCA"],
["ground-penetrating radar","noun","رادار اختراق الأرض","Ground-penetrating radar detected anomalies beneath the soil.","اكتشف رادار اختراق الأرض تشوّهات تحت التربة.","mastery","C1","COCA"],
["aerial surveillance","noun","المراقبة الجوية","Aerial surveillance provided a broad view of the search area.","وفّرت المراقبة الجوية نظرة شاملة لمنطقة البحث.","core","B2","COCA"],
["thermal imaging","noun","التصوير الحراري","Thermal imaging detected body heat in the collapsed building.","اكتشف التصوير الحراري حرارة الجسم في المبنى المنهار.","core","B2","COCA"],
["ultraviolet light","noun","الأشعة فوق البنفسجية","Ultraviolet light revealed hidden bloodstains on the carpet.","كشفت الأشعة فوق البنفسجية بقع دم مخفية على السجادة.","core","B2","COCA"],
["alternative light source","noun","مصدر إضاءة بديل","An alternative light source detected trace evidence invisible to the eye.","اكتشف مصدر الإضاءة البديل أدلة أثرية غير مرئية للعين.","extended","B2","COCA"],
["presumptive test","noun","اختبار افتراضي","A presumptive test indicated the presence of blood.","أشار الاختبار الافتراضي إلى وجود دم.","extended","C1","COCA"],
["confirmatory test","noun","اختبار تأكيدي","A confirmatory test verified the substance was human blood.","أكّد الاختبار التأكيدي أن المادة كانت دماً بشرياً.","extended","C1","COCA"],
["reference sample","noun","عيّنة مرجعية","A reference sample was taken from the victim for comparison.","أُخذت عيّنة مرجعية من الضحية للمقارنة.","core","B2","AWL"],
["questioned sample","noun","عيّنة مشكوك فيها","The questioned sample from the scene awaited DNA analysis.","انتظرت العيّنة المشكوك فيها من الموقع تحليل الحمض النووي.","extended","B2","COCA"],
["elimination sample","noun","عيّنة استبعادية","Elimination samples were collected from all household members.","جُمعت عيّنات استبعادية من جميع أفراد الأسرة.","extended","B2","COCA"],
["known standard","noun","معيار معروف","The known standard helped calibrate the laboratory instruments.","ساعد المعيار المعروف في معايرة أجهزة المختبر.","extended","B2","COCA"],
["proficiency test","noun","اختبار كفاءة","Analysts must pass a proficiency test annually.","يجب على المحلّلين اجتياز اختبار كفاءة سنوياً.","core","B2","AWL"],
["accreditation","noun","الاعتماد","Laboratory accreditation ensures compliance with quality standards.","يضمن اعتماد المختبر الامتثال لمعايير الجودة.","core","B2","AWL"],
["peer review","noun","مراجعة الأقران","Peer review of forensic reports minimizes analytical errors.","تقلّل مراجعة الأقران لتقارير الطب الشرعي الأخطاء التحليلية.","core","B2","AWL"],
["expert testimony","noun","شهادة خبير","The expert testimony influenced the jury's verdict.","أثّرت شهادة الخبير على حكم هيئة المحلّفين.","core","B2","COCA"],
["daubert standard","noun","معيار دوبرت","The daubert standard governs the admissibility of expert testimony.","يحكم معيار دوبرت قبول شهادة الخبير.","mastery","C1","COCA"],
["frye standard","noun","معيار فراي","Under the frye standard, methods must be generally accepted.","بموجب معيار فراي يجب أن تكون الأساليب مقبولة عموماً.","mastery","C1","COCA"],
["chain of evidence","noun","سلسلة الأدلة","A broken chain of evidence can render proof inadmissible.","يمكن لسلسلة أدلة مكسورة أن تجعل الإثبات غير مقبول.","core","B2","COCA"],
["evidence locker","noun","خزانة الأدلة","All seized items are stored in the evidence locker.","تُخزّن جميع المضبوطات في خزانة الأدلة.","core","B1","COCA"],
["property room","noun","غرفة المحجوزات","The property room holds thousands of items from active cases.","تحتوي غرفة المحجوزات على آلاف العناصر من القضايا النشطة.","core","B2","COCA"],
["cold case unit","noun","وحدة القضايا الباردة","The cold case unit reopened the investigation after new evidence emerged.","أعادت وحدة القضايا الباردة فتح التحقيق بعد ظهور أدلة جديدة.","core","B2","COCA"],
["task force","noun","فريق عمل خاص","A task force was assembled to investigate the serial crimes.","شُكّل فريق عمل خاص للتحقيق في الجرائم المتسلسلة.","core","B2","COCA"],
["informant","noun","مُخبر","The informant provided crucial intelligence about the drug ring.","قدّم المُخبر معلومات استخبارية حاسمة عن شبكة المخدرات.","core","B2","COCA"],
["undercover","adjective","سري / متخفّي","An undercover officer infiltrated the criminal organization.","تسلّل ضابط سري إلى المنظمة الإجرامية.","core","B2","COCA"],
["surveillance operation","noun","عملية مراقبة","The surveillance operation lasted three months before the arrest.","استمرت عملية المراقبة ثلاثة أشهر قبل الاعتقال.","extended","B2","COCA"],
["wiretap warrant","noun","أمر تنصّت","The judge issued a wiretap warrant for the suspect's phone.","أصدر القاضي أمر تنصّت على هاتف المشتبه به.","extended","C1","COCA"],
["search warrant","noun","أمر تفتيش","Police obtained a search warrant before entering the premises.","حصلت الشرطة على أمر تفتيش قبل دخول المبنى.","core","B2","COCA"],
["arrest warrant","noun","أمر اعتقال","An arrest warrant was issued for the primary suspect.","صدر أمر اعتقال بحق المشتبه به الرئيسي.","core","B2","COCA"],
["extradition","noun","تسليم المجرمين","The government requested extradition of the fugitive from abroad.","طلبت الحكومة تسليم الهارب من الخارج.","extended","C1","AWL"],
];

// Main execution
async function main() {
  const client = await pool.connect();
  try {
    console.log('=== Batch 18 Gap Fill (batch_id=27) ===\n');
    const batchId = 27;

    const r6 = await insertBatch(client, u6, 6, batchId);
    console.log(`U6 (Cryptocurrency): inserted ${r6}/${u6.length}`);

    const r7 = await insertBatch(client, u7, 7, batchId);
    console.log(`U7 (Crowd Psychology): inserted ${r7}/${u7.length}`);

    const r8 = await insertBatch(client, u8, 8, batchId);
    console.log(`U8 (Forensic Science): inserted ${r8}/${u8.length}`);

    // U9-U12 loaded from separate arrays below
    const r9 = await insertBatch(client, u9, 9, batchId);
    console.log(`U9 (Archaeology): inserted ${r9}/${u9.length}`);

    const r10 = await insertBatch(client, u10, 10, batchId);
    console.log(`U10 (Longevity): inserted ${r10}/${u10.length}`);

    const r11 = await insertBatch(client, u11, 11, batchId);
    console.log(`U11 (Sustainable Architecture): inserted ${r11}/${u11.length}`);

    const r12 = await insertBatch(client, u12, 12, batchId);
    console.log(`U12 (Exoplanets): inserted ${r12}/${u12.length}`);

    const total = r6+r7+r8+r9+r10+r11+r12;
    console.log(`\nTotal inserted: ${total}/${u6.length+u7.length+u8.length+u9.length+u10.length+u11.length+u12.length}`);

    // Query final counts
    console.log('\n=== Final per-unit counts ===');
    const res = await client.query(`SELECT recommended_unit, COUNT(*) as cnt FROM public.vocab_staging_l4 WHERE recommended_unit BETWEEN 6 AND 12 GROUP BY recommended_unit ORDER BY recommended_unit`);
    let grandTotal = 0;
    for (const row of res.rows) {
      console.log(`  U${row.recommended_unit}: ${row.cnt}`);
      grandTotal += parseInt(row.cnt);
    }
    console.log(`  Grand total (U6-U12): ${grandTotal}`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
