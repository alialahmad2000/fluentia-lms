const { Pool } = require('pg');
const pool = new Pool({
  host: 'aws-1-eu-central-1.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.nmjexpuycmqcxuxljier',
  password: 'Ali-al-ahmad2000',
  ssl: { rejectUnauthorized: false }
});

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

// ============================================================
// UNIT 8 — Forensic Science (80 words)
// ============================================================
const unit8 = [
  ["luminol","noun","كاشف كيميائي يتوهج عند ملامسة الدم","The forensic team sprayed luminol across the floor to detect hidden bloodstains.","رشّ فريق الطب الشرعي اللومينول على الأرضية للكشف عن بقع الدم المخفية.","core","B2","COCA"],
  ["chromatography","noun","تقنية فصل مكونات المخاليط الكيميائية","Gas chromatography revealed traces of accelerant at the arson scene.","كشف التحليل بالكروماتوغرافيا الغازية عن آثار مادة مُسرِّعة في موقع الحريق المتعمد.","mastery","C1","AWL"],
  ["spectrometry","noun","قياس الأطياف لتحديد تركيب المواد","Mass spectrometry identified the unknown substance as fentanyl.","حدّد قياس الطيف الكتلي المادة المجهولة على أنها فنتانيل.","mastery","C1","COCA"],
  ["electrophoresis","noun","تقنية فصل الجزيئات بالتيار الكهربائي","Gel electrophoresis separated the DNA fragments by size for comparison.","فصل الرحلان الكهربائي الهلامي شظايا الحمض النووي حسب الحجم للمقارنة.","mastery","C1","AWL"],
  ["reagent","noun","كاشف كيميائي يُستخدم في التحليل","The technician added a reagent to test for the presence of lead.","أضاف الفني كاشفاً كيميائياً لاختبار وجود الرصاص.","extended","B2","COCA"],
  ["centrifuge","noun","جهاز طرد مركزي لفصل المكونات","Blood samples were placed in the centrifuge to separate plasma from cells.","وُضعت عينات الدم في جهاز الطرد المركزي لفصل البلازما عن الخلايا.","extended","B2","COCA"],
  ["pipette","noun","ماصّة زجاجية لنقل كميات دقيقة من السوائل","She used a micropipette to transfer exactly 50 microlitres of the sample.","استخدمت الماصة الدقيقة لنقل 50 ميكرولتراً بالضبط من العينة.","core","B2","NAWL"],
  ["microscopy","noun","علم الفحص المجهري","Forensic microscopy revealed synthetic fibres embedded in the victim's clothing.","كشف الفحص المجهري الجنائي عن ألياف صناعية مغروسة في ملابس الضحية.","extended","B2","COCA"],
  ["entomology","noun","علم الحشرات","Forensic entomology uses insect life cycles to estimate time of death.","يستخدم علم الحشرات الجنائي دورات حياة الحشرات لتقدير وقت الوفاة.","mastery","C1","AWL"],
  ["palynology","noun","علم حبوب اللقاح والأبواغ","Palynology linked the suspect's shoes to pollen found only in the marshland.","ربط علم حبوب اللقاح حذاء المشتبه به بحبوب لقاح موجودة فقط في المستنقعات.","mastery","C1","COCA"],
  ["odontology","noun","طب الأسنان الشرعي","Forensic odontology matched the bite mark to the suspect's dental records.","طابق طب الأسنان الشرعي أثر العضة مع سجلات أسنان المشتبه به.","mastery","C1","AWL"],
  ["anthropometry","noun","علم قياسات الجسم البشري","Police used anthropometry to estimate the intruder's height from surveillance footage.","استخدمت الشرطة القياسات الجسمية لتقدير طول الدخيل من لقطات المراقبة.","extended","C1","AWL"],
  ["osteology","noun","علم العظام","Forensic osteology determined the skeleton belonged to a female aged 30–40.","حدّد علم العظام الجنائي أن الهيكل العظمي يعود لأنثى عمرها 30-40 عاماً.","mastery","C1","COCA"],
  ["taphonomy","noun","علم دراسة تحلل الكائنات بعد الموت","Taphonomy explained why the remains were so well preserved in the peat bog.","فسّر علم التافونومي سبب حفظ الرفات بشكل جيد في مستنقع الخث.","mastery","C1","COCA"],
  ["lividity","noun","ازرقاق الجلد بعد الوفاة بسبب ترسب الدم","The pattern of lividity suggested the body had been moved after death.","أشار نمط الزُّرقة إلى أن الجثة نُقلت بعد الوفاة.","extended","B2","COCA"],
  ["rigor mortis","noun","تيبّس الجثة بعد الموت","Rigor mortis had fully set in, indicating death occurred at least 12 hours ago.","اكتمل تيبّس الموت، مما يشير إلى أن الوفاة حدثت قبل 12 ساعة على الأقل.","core","B2","COCA"],
  ["decomposition","noun","التحلل البيولوجي للأنسجة بعد الموت","Advanced decomposition made visual identification of the victim impossible.","جعل التحلل المتقدم التعرف البصري على الضحية مستحيلاً.","core","B2","COCA"],
  ["exsanguination","noun","النزف حتى الموت","The cause of death was exsanguination from a severed femoral artery.","كان سبب الوفاة النزف حتى الموت من شريان فخذي مقطوع.","mastery","C1","COCA"],
  ["asphyxiation","noun","الاختناق وتوقف التنفس","The autopsy confirmed asphyxiation caused by obstruction of the airway.","أكد التشريح أن الاختناق ناتج عن انسداد مجرى الهواء.","extended","B2","COCA"],
  ["strangulation","noun","الخنق بالضغط على العنق","Petechial haemorrhages in the eyes indicated death by strangulation.","أشارت النزوف النقطية في العينين إلى الوفاة خنقاً.","core","B2","COCA"],
  ["blunt force","noun","قوة كليلة ناتجة عن اصطدام بجسم غير حاد","The skull fracture was consistent with blunt force trauma from a heavy object.","كان كسر الجمجمة متوافقاً مع رضّة بقوة كليلة من جسم ثقيل.","core","B2","COCA"],
  ["laceration","noun","تمزق في الأنسجة ناتج عن إصابة","Deep lacerations on the forearm suggested a defensive wound pattern.","أشارت التمزقات العميقة على الساعد إلى نمط جروح دفاعية.","extended","B2","COCA"],
  ["contusion","noun","كدمة ناتجة عن إصابة دون تمزق الجلد","Multiple contusions on the torso indicated repeated blows.","أشارت الكدمات المتعددة على الجذع إلى ضربات متكررة.","core","B2","COCA"],
  ["abrasion","noun","سحجة أو خدش سطحي في الجلد","Road abrasions on the palms showed the victim had been dragged.","أظهرت السحجات على راحتي اليدين أن الضحية سُحبت على الطريق.","core","B2","COCA"],
  ["incision","noun","شق جراحي أو قطع بأداة حادة","The clean incision indicated a sharp, single-edged blade was used.","أشار الشق النظيف إلى استخدام شفرة حادة ذات حافة واحدة.","core","B2","COCA"],
  ["stippling","noun","تنقيط ناتج عن حبيبات البارود حول جرح طلق ناري","Stippling around the wound indicated the gun was fired at close range.","أشار التنقيط حول الجرح إلى أن المسدس أُطلق من مسافة قريبة.","extended","C1","COCA"],
  ["wadding","noun","حشوة داخل خرطوشة الذخيرة","Wadding recovered from the wound confirmed a shotgun was the weapon used.","أكدت الحشوة المستخرجة من الجرح أن بندقية خرطوش هي السلاح المستخدم.","extended","B2","NAWL"],
  ["cartridge case","noun","ظرف الخرطوشة الفارغ بعد إطلاق النار","Investigators found three spent cartridge cases near the entrance.","عثر المحققون على ثلاثة أظرف خراطيش فارغة قرب المدخل.","core","B2","COCA"],
  ["rifling","noun","حزوز حلزونية داخل سبطانة السلاح","The rifling pattern on the bullet matched the suspect's registered firearm.","تطابق نمط الحزوز على الرصاصة مع السلاح المسجل باسم المشتبه به.","extended","C1","COCA"],
  ["caliber","noun","قُطر تجويف سبطانة السلاح الناري","The medical examiner recovered a .38 caliber bullet from the wound track.","استخرج الطبيب الشرعي رصاصة عيار 38. من مسار الجرح.","core","B2","COCA"],
  ["muzzle velocity","noun","سرعة المقذوف لحظة خروجه من فوهة السلاح","The high muzzle velocity of the rifle round caused devastating tissue damage.","تسبّبت سرعة الفوهة العالية لطلقة البندقية في دمار هائل للأنسجة.","extended","C1","COCA"],
  ["trajectory","noun","المسار الذي يتبعه المقذوف أثناء الطيران","Laser rods were used to reconstruct the bullet's trajectory through the room.","استُخدمت قضبان ليزرية لإعادة بناء مسار الرصاصة عبر الغرفة.","core","B2","COCA"],
  ["cadaver dog","noun","كلب مدرب على اكتشاف الرفات البشرية","The cadaver dog alerted near the riverbank, leading to the discovery of remains.","نبّه كلب الرفات قرب ضفة النهر، مما أدى إلى اكتشاف بقايا بشرية.","extended","B2","COCA"],
  ["ground-penetrating radar","noun","رادار اختراق الأرض للكشف عن مدفونات","Ground-penetrating radar detected an anomaly two metres below the basement floor.","كشف رادار اختراق الأرض عن شذوذ على عمق مترين تحت أرضية القبو.","mastery","C1","COCA"],
  ["thermal imaging","noun","تصوير حراري يكشف الأجسام بحرارتها","Police used thermal imaging to locate the fugitive hiding in dense woodland.","استخدمت الشرطة التصوير الحراري لتحديد موقع الهارب المختبئ في غابة كثيفة.","core","B2","COCA"],
  ["ultraviolet light","noun","ضوء فوق بنفسجي يُستخدم لكشف الآثار","Ultraviolet light revealed latent stains invisible to the naked eye.","كشف الضوء فوق البنفسجي عن بقع كامنة غير مرئية بالعين المجردة.","core","B2","COCA"],
  ["presumptive test","noun","اختبار أولي للكشف المبدئي عن مادة","A presumptive test for blood gave a positive result on the carpet fibres.","أعطى الاختبار الأولي للدم نتيجة إيجابية على ألياف السجادة.","extended","B2","AWL"],
  ["confirmatory test","noun","اختبار تأكيدي يثبت نتيجة الاختبار الأولي","A confirmatory test using GCMS verified the substance was methamphetamine.","أكد الاختبار التأكيدي باستخدام GCMS أن المادة هي الميثامفيتامين.","extended","B2","AWL"],
  ["reference sample","noun","عينة مرجعية للمقارنة في التحليل الجنائي","Buccal swabs were collected as reference samples from all family members.","جُمعت مسحات شدقية كعينات مرجعية من جميع أفراد الأسرة.","core","B2","AWL"],
  ["elimination sample","noun","عينة استبعاد لتمييز آثار غير المشتبه بهم","Officers provided elimination samples so their DNA could be excluded from the evidence.","قدّم الضباط عينات استبعاد لاستبعاد حمضهم النووي من الأدلة.","extended","B2","AWL"],
  ["proficiency test","noun","اختبار كفاءة للتحقق من مهارات المختبر","Every analyst must pass an annual proficiency test to maintain certification.","يجب على كل محلل اجتياز اختبار كفاءة سنوي للحفاظ على الشهادة.","core","B2","AWL"],
  ["accreditation","noun","اعتماد رسمي يُمنح للمختبرات المؤهلة","The crime lab lost its accreditation after failing three consecutive audits.","فقد مختبر الجريمة اعتماده بعد إخفاقه في ثلاث عمليات تدقيق متتالية.","core","B2","AWL"],
  ["daubert standard","noun","معيار قانوني أمريكي لقبول الأدلة العلمية","Under the Daubert standard, the judge evaluates whether expert testimony is scientifically valid.","بموجب معيار دوبرت، يقيّم القاضي ما إذا كانت شهادة الخبير صحيحة علمياً.","mastery","C1","COCA"],
  ["chain of evidence","noun","سلسلة حفظ الأدلة وتوثيق تسلسل حيازتها","A broken chain of evidence led the court to exclude the murder weapon.","أدى انقطاع سلسلة حفظ الأدلة إلى استبعاد المحكمة لسلاح الجريمة.","core","B2","COCA"],
  ["evidence locker","noun","خزنة حفظ الأدلة في مركز الشرطة","All seized items were tagged and stored in the evidence locker.","تم تسجيل جميع المضبوطات وتخزينها في خزنة الأدلة.","core","B2","COCA"],
  ["cold case unit","noun","وحدة متخصصة في إعادة فتح القضايا القديمة","The cold case unit reopened the 1998 murder after new DNA evidence surfaced.","أعادت وحدة القضايا الباردة فتح جريمة قتل 1998 بعد ظهور أدلة حمض نووي جديدة.","extended","B2","COCA"],
  ["task force","noun","فريق عمل مشترك لمكافحة جريمة معينة","A multi-agency task force was formed to investigate the serial kidnappings.","شُكّل فريق عمل متعدد الوكالات للتحقيق في عمليات الاختطاف المتسلسلة.","core","B2","COCA"],
  ["informant","noun","مُخبر يقدم معلومات سرية للشرطة","The informant provided a tip that led to the seizure of 50 kilos of cocaine.","قدّم المخبر معلومة أدت إلى مصادرة 50 كيلوغراماً من الكوكايين.","core","B2","COCA"],
  ["undercover operation","noun","عملية سرية ينتحل فيها الضابط هوية مزيفة","An undercover operation exposed a network of counterfeit document suppliers.","كشفت عملية سرية شبكة لتوريد الوثائق المزورة.","core","B2","COCA"],
  ["surveillance","noun","مراقبة منهجية لشخص أو مكان","Round-the-clock surveillance captured the suspect meeting his accomplice.","رصدت المراقبة على مدار الساعة لقاء المشتبه به بشريكه.","core","B2","COCA"],
  ["wiretap","noun","تنصت على المكالمات الهاتفية بإذن قضائي","The wiretap recorded a conversation in which the deal was arranged.","سجّل التنصت محادثة رُتّبت فيها الصفقة.","extended","B2","COCA"],
  ["search warrant","noun","أمر تفتيش صادر عن قاضٍ","Detectives obtained a search warrant for the suspect's apartment and vehicle.","حصل المحققون على أمر تفتيش لشقة المشتبه به ومركبته.","core","B2","COCA"],
  ["arrest warrant","noun","أمر قبض صادر عن قاضٍ","An arrest warrant was issued after the grand jury returned an indictment.","صدر أمر قبض بعد إصدار هيئة المحلفين الكبرى لائحة اتهام.","core","B2","COCA"],
  ["extradition","noun","تسليم مطلوب من دولة إلى أخرى","The extradition treaty required the country to surrender the fugitive.","اشترطت معاهدة التسليم أن تسلّم الدولة الفارّ.","extended","B2","AWL"],
  ["indictment","noun","لائحة اتهام رسمية صادرة عن هيئة محلفين كبرى","The indictment charged the CEO with 14 counts of fraud and embezzlement.","وجّهت لائحة الاتهام 14 تهمة احتيال واختلاس إلى الرئيس التنفيذي.","core","B2","COCA"],
  ["arraignment","noun","جلسة مثول المتهم لسماع التهم والإجابة عليها","At the arraignment, the defendant pleaded not guilty to all charges.","في جلسة المثول، أنكر المتهم جميع التهم الموجهة إليه.","extended","C1","COCA"],
  ["bail hearing","noun","جلسة النظر في طلب الإفراج بكفالة","The judge denied bail at the hearing, citing flight risk.","رفض القاضي الكفالة في الجلسة بسبب خطر الهروب.","core","B2","COCA"],
  ["preliminary hearing","noun","جلسة أولية لتقييم كفاية الأدلة لإحالة القضية","At the preliminary hearing, the judge found probable cause to proceed to trial.","في الجلسة الأولية، وجد القاضي سبباً محتملاً لإحالة القضية للمحاكمة.","extended","B2","COCA"],
  ["grand jury","noun","هيئة محلفين كبرى تنظر في توجيه الاتهامات","The grand jury heard testimony from 15 witnesses over three weeks.","استمعت هيئة المحلفين الكبرى لشهادات 15 شاهداً على مدار ثلاثة أسابيع.","core","B2","COCA"],
  ["plea bargain","noun","صفقة إقرار بالذنب مقابل تخفيف العقوبة","The defendant accepted a plea bargain to avoid a potential life sentence.","قبل المتهم صفقة الإقرار بالذنب لتجنب حكم محتمل بالسجن مدى الحياة.","core","B2","COCA"],
  ["sentencing hearing","noun","جلسة النطق بالحكم","At the sentencing hearing, the judge imposed 15 years without parole.","في جلسة النطق بالحكم، فرض القاضي 15 سنة بدون إفراج مشروط.","core","B2","COCA"],
  ["probation officer","noun","ضابط مراقبة يتابع المحكومين بعقوبات مشروطة","The probation officer conducted weekly visits to verify compliance with court orders.","أجرى ضابط المراقبة زيارات أسبوعية للتحقق من الامتثال لأوامر المحكمة.","core","B2","COCA"],
  ["parole board","noun","هيئة الإفراج المشروط","The parole board denied early release after reviewing the inmate's disciplinary record.","رفضت هيئة الإفراج المشروط الإفراج المبكر بعد مراجعة سجل السجين التأديبي.","core","B2","COCA"],
  ["restitution","noun","تعويض مالي يُدفع للضحية بأمر المحكمة","The court ordered full restitution of $2.3 million to the fraud victims.","أمرت المحكمة بتعويض كامل قدره 2.3 مليون دولار لضحايا الاحتيال.","extended","B2","AWL"],
  ["electronic monitoring","noun","مراقبة إلكترونية لتتبع موقع المحكوم عليه","Electronic monitoring ensured the offender did not leave the designated area.","ضمنت المراقبة الإلكترونية عدم مغادرة الجاني المنطقة المحددة.","extended","B2","COCA"],
  ["ankle bracelet","noun","سوار كاحل إلكتروني لتتبع المحكوم عليه","The court ordered him to wear an ankle bracelet for the duration of house arrest.","أمرته المحكمة بارتداء سوار كاحل طوال فترة الإقامة الجبرية.","core","B1","COCA"],
  ["halfway house","noun","دار إعادة تأهيل للمحكومين قبل اندماجهم بالمجتمع","After two years in prison, she was transferred to a halfway house.","بعد عامين في السجن، نُقلت إلى دار إعادة التأهيل.","extended","B2","COCA"],
  ["juvenile court","noun","محكمة الأحداث المتخصصة بقضايا القاصرين","The case was transferred to juvenile court because the suspect was only 15.","أُحيلت القضية لمحكمة الأحداث لأن المشتبه به كان بعمر 15 عاماً فقط.","core","B2","COCA"],
  ["magistrate","noun","قاضٍ في محكمة الصلح أو محكمة أدنى درجة","The magistrate set bail at $50,000 and scheduled a preliminary hearing.","حدّد قاضي الصلح الكفالة بمبلغ 50,000 دولار وحدد موعد جلسة أولية.","core","B2","COCA"],
  ["barrister","noun","محامٍ يترافع أمام المحاكم العليا في النظام البريطاني","The barrister delivered a compelling closing argument to the jury.","قدّم المحامي مرافعة ختامية مقنعة أمام هيئة المحلفين.","extended","B2","COCA"],
  ["solicitor","noun","محامٍ يقدم استشارات قانونية ويُعدّ القضايا","The family hired a solicitor to handle the property dispute.","استأجرت العائلة محامياً للتعامل مع النزاع العقاري.","core","B2","COCA"],
  ["public defender","noun","محامي دفاع عام تعيّنه المحكمة للمتهم الفقير","The public defender argued that her client's confession was obtained under duress.","جادل محامي الدفاع العام بأن اعتراف موكلها انتُزع تحت الإكراه.","core","B2","COCA"],
  ["forensic pathologist","noun","طبيب شرعي متخصص بتحديد أسباب الوفاة","The forensic pathologist concluded that drowning was the primary cause of death.","خلص الطبيب الشرعي إلى أن الغرق كان السبب الرئيسي للوفاة.","extended","B2","COCA"],
  ["toxicology report","noun","تقرير السموم الذي يبيّن المواد في الجسم","The toxicology report revealed lethal levels of cyanide in the victim's blood.","كشف تقرير السموم عن مستويات قاتلة من السيانيد في دم الضحية.","core","B2","COCA"],
  ["ballistics","noun","علم المقذوفات ودراسة سلوك الذخيرة","Ballistics analysis matched the bullet to a weapon seized during a previous raid.","طابق تحليل المقذوفات الرصاصة بسلاح صُودر في مداهمة سابقة.","extended","B2","COCA"],
  ["latent print","noun","بصمة كامنة غير مرئية بالعين المجردة","A latent print lifted from the window frame matched the suspect in AFIS.","تطابقت بصمة كامنة رُفعت من إطار النافذة مع المشتبه به في نظام AFIS.","extended","B2","COCA"],
  ["crime scene reconstruction","noun","إعادة بناء مسرح الجريمة لفهم تسلسل الأحداث","Crime scene reconstruction suggested the shooting occurred from the doorway.","أشارت إعادة بناء مسرح الجريمة إلى أن إطلاق النار حدث من المدخل.","extended","B2","COCA"],
  ["postmortem interval","noun","الفترة الزمنية بين الوفاة واكتشاف الجثة","Insect activity helped narrow the postmortem interval to 48–72 hours.","ساعد نشاط الحشرات في تضييق فترة ما بعد الوفاة إلى 48-72 ساعة.","mastery","C1","COCA"],
  ["blood spatter","noun","نمط تناثر الدم في مسرح الجريمة","The blood spatter pattern indicated the victim was standing when struck.","أشار نمط تناثر الدم إلى أن الضحية كان واقفاً عند الضرب.","core","B2","COCA"],
];

// ============================================================
// UNIT 9 — Archaeological Mysteries (80 words)
// ============================================================
const unit9 = [
  ["radiocarbon","noun","تأريخ بالكربون المشع لتحديد عمر المواد العضوية","Radiocarbon dating placed the wooden beam at approximately 3,200 years old.","حدّد التأريخ بالكربون المشع عمر العارضة الخشبية بنحو 3200 عام.","core","B2","COCA"],
  ["dendrochronology","noun","علم تأريخ حلقات الأشجار","Dendrochronology provided an exact construction date for the Viking longhouse.","وفّر علم تأريخ حلقات الأشجار تاريخ بناء دقيق لمنزل الفايكنغ الطويل.","mastery","C1","AWL"],
  ["thermoluminescence","noun","تقنية تأريخ بالوميض الحراري للفخار المحروق","Thermoluminescence dating confirmed the pottery was fired around 1500 BCE.","أكد التأريخ بالوميض الحراري أن الفخار أُحرق حوالي 1500 قبل الميلاد.","mastery","C1","AWL"],
  ["stratigraphy","noun","علم طبقات الأرض وتسلسلها الزمني","Stratigraphy revealed seven distinct occupation layers at the excavation site.","كشف علم الطبقات عن سبع طبقات سكنية متميزة في موقع التنقيب.","extended","B2","AWL"],
  ["seriation","noun","تقنية ترتيب القطع الأثرية زمنياً حسب أنماطها","Seriation of pottery styles established a relative chronology for the region.","أنشأ التسلسل النمطي لأنماط الفخار تسلسلاً زمنياً نسبياً للمنطقة.","mastery","C1","AWL"],
  ["provenance","noun","المصدر الأصلي وتاريخ ملكية القطعة الأثرية","The provenance of the marble statue was traced to a quarry in Paros.","تتبّعوا مصدر التمثال الرخامي إلى محجر في باروس.","core","B2","AWL"],
  ["provenience","noun","الموقع الدقيق لاكتشاف القطعة الأثرية في الحفرية","Each artefact's provenience was recorded with GPS coordinates and depth measurements.","سُجّل موقع كل قطعة أثرية بإحداثيات GPS وقياسات العمق.","extended","C1","AWL"],
  ["diagenesis","noun","تغيرات كيميائية وفيزيائية تطرأ على المواد المدفونة","Diagenesis altered the chemical composition of the bone, complicating isotope analysis.","غيّرت التحولات التشخيصية التركيب الكيميائي للعظام مما عقّد تحليل النظائر.","mastery","C1","COCA"],
  ["patination","noun","تكوّن طبقة سطحية على القطع الأثرية بمرور الزمن","The even patination on the bronze suggested it had not been recently cleaned.","أشارت الطبقة السطحية المتساوية على البرونز إلى عدم تنظيفه حديثاً.","extended","C1","COCA"],
  ["debitage","noun","نفايات صوانية ناتجة عن صناعة الأدوات الحجرية","A dense scatter of debitage indicated an intensive tool-making workshop.","أشار التناثر الكثيف للنفايات الصوانية إلى ورشة مكثفة لصناعة الأدوات.","mastery","C1","COCA"],
  ["lithic","adjective","متعلق بالأدوات والمواد الحجرية","Lithic analysis classified the flakes as products of Levallois reduction.","صنّف التحليل الحجري الشظايا كمنتجات تقنية لوفالوا.","extended","C1","AWL"],
  ["flint knapping","noun","تقنية صناعة الأدوات بتشذيب حجر الصوان","Experimental flint knapping replicated the exact blade type found at the site.","أعاد التشذيب التجريبي للصوان إنتاج نوع الشفرة نفسه الموجود في الموقع.","extended","B2","COCA"],
  ["temper","noun","مادة مضافة للطين لمنع تشقق الفخار","The potter added crusite as temper to prevent cracking during firing.","أضاف الفخّار مادة مقوّية للطين لمنع التشقق أثناء الحرق.","extended","B2","NAWL"],
  ["burnish","verb","صقل سطح الفخار لإعطائه لمعاناً","The artisan would burnish the vessel with a smooth pebble before firing.","كان الحرفي يصقل الإناء بحصاة ملساء قبل الحرق.","extended","B2","NAWL"],
  ["kiln","noun","فرن خاص لحرق الفخار أو الآجر","Remains of a Roman kiln were discovered beneath the modern car park.","اكتُشفت بقايا فرن روماني تحت موقف السيارات الحديث.","core","B2","COCA"],
  ["tell","noun","تل أثري مكوّن من طبقات مستوطنات متعاقبة","The tell rose 20 metres above the plain, containing 5,000 years of habitation.","ارتفع التل الأثري 20 متراً فوق السهل متضمناً 5000 سنة من الاستيطان.","core","B2","COCA"],
  ["acropolis","noun","قلعة مرتفعة في مدينة يونانية قديمة","The acropolis commanded a view of the harbour and surrounding farmland.","أطلّت القلعة المرتفعة على الميناء والأراضي الزراعية المحيطة.","core","B2","COCA"],
  ["necropolis","noun","مقبرة واسعة في مدينة قديمة","Excavation of the necropolis uncovered 300 tombs spanning five centuries.","كشف التنقيب في المقبرة عن 300 قبر تمتد عبر خمسة قرون.","extended","B2","COCA"],
  ["catacomb","noun","سراديب تحت الأرض استُخدمت لدفن الموتى","The catacomb network beneath the city held an estimated 40,000 burials.","احتوت شبكة السراديب تحت المدينة على ما يُقدّر بـ 40,000 دفنة.","core","B2","COCA"],
  ["ossuary","noun","صندوق أو حجرة لحفظ عظام الموتى","The limestone ossuary bore an Aramaic inscription identifying the deceased.","حمل صندوق العظام الحجر الجيري نقشاً آرامياً يُعرّف المتوفى.","extended","C1","COCA"],
  ["dolmen","noun","هيكل حجري ضخم من ألواح صخرية لدفن الموتى","The dolmen's capstone weighed over 40 tonnes and required hundreds of workers.","وزنت صخرة غطاء الدولمن أكثر من 40 طناً وتطلبت مئات العمال.","extended","B2","COCA"],
  ["menhir","noun","حجر منتصب كبير أقيم في عصور ما قبل التاريخ","The menhir stood five metres tall and was aligned with the winter solstice.","ارتفع الحجر المنتصب خمسة أمتار وكان محاذياً للانقلاب الشتوي.","extended","C1","COCA"],
  ["cromlech","noun","دائرة حجرية ضخمة من عصور ما قبل التاريخ","The cromlech consisted of 30 standing stones arranged in a perfect circle.","تألف الكروملخ من 30 حجراً منتصباً مرتبة في دائرة مثالية.","mastery","C1","COCA"],
  ["cairn","noun","كومة حجارة أُقيمت كمعلم أو فوق قبر","A burial cairn on the hilltop contained cremated remains and bronze jewellery.","احتوى ركام حجري للدفن على قمة التل على رفات محروقة ومجوهرات برونزية.","core","B2","COCA"],
  ["tumulus","noun","تلة ترابية اصطناعية تغطي قبراً قديماً","The tumulus was 30 metres in diameter and yielded a gold-hilted sword.","بلغ قطر التلة الجنائزية 30 متراً وعُثر فيها على سيف بمقبض ذهبي.","extended","C1","COCA"],
  ["mastaba","noun","مقبرة مصرية قديمة مسطحة السقف من الطوب اللَّبِن","The mastaba's false door was carved with offering scenes for the afterlife.","نُقشت البوابة الوهمية للمصطبة بمشاهد قرابين للحياة الآخرة.","extended","B2","COCA"],
  ["ziggurat","noun","معبد بابلي مدرّج على شكل هرم","The ziggurat at Ur originally rose in three tiers above the city.","ارتفع زقورة أور في الأصل بثلاث طبقات فوق المدينة.","core","B2","COCA"],
  ["stele","noun","لوح حجري منقوش يحمل نصاً أو صورة تذكارية","The victory stele depicted the king trampling his enemies underfoot.","صوّرت مسلّة النصر الملك يدوس أعداءه تحت قدميه.","extended","B2","COCA"],
  ["ostracon","noun","شقفة فخارية كُتب عليها بالحبر","An ostracon found in the rubble contained a tax receipt from the third dynasty.","احتوت شقفة فخارية عُثر عليها في الأنقاض على إيصال ضريبي من الأسرة الثالثة.","mastery","C1","COCA"],
  ["cuneiform","noun","كتابة مسمارية قديمة على ألواح الطين","The cuneiform tablet recorded a barley transaction between two Sumerian merchants.","سجّل اللوح المسماري صفقة شعير بين تاجرين سومريين.","core","B2","COCA"],
  ["demotic","adjective","خط مصري قديم مبسط من الهيراطيقية","The demotic text on the Rosetta Stone provided a key to deciphering hieroglyphs.","وفّر النص الديموطيقي على حجر رشيد مفتاحاً لفك رموز الهيروغليفية.","extended","C1","COCA"],
  ["cartonnage","noun","طبقات كتان وجص مستخدمة في أغلفة المومياوات","The cartonnage mask was painted with vivid blues and golds.","رُسم قناع الكرتوناج بألوان زرقاء وذهبية زاهية.","mastery","C1","COCA"],
  ["ushabti","noun","تمثال جنائزي صغير يُوضع في القبور المصرية","The tomb contained 365 ushabti figures, one for each day of the year.","احتوى القبر على 365 تمثال أوشابتي، واحد لكل يوم من أيام السنة.","extended","C1","COCA"],
  ["canopic","adjective","متعلق بأوعية حفظ أعضاء المومياء","The four canopic jars held the lungs, liver, stomach, and intestines.","احتوت الأواني الكانوبية الأربعة على الرئتين والكبد والمعدة والأمعاء.","extended","B2","COCA"],
  ["scarab","noun","خنفساء مقدسة أو تميمة على شكلها في مصر القديمة","A large scarab amulet was found placed over the mummy's heart.","عُثر على تميمة جعران كبيرة موضوعة فوق قلب المومياء.","core","B2","COCA"],
  ["pectoral","noun","حلية صدرية كبيرة ترتدى على الصدر","The gold pectoral featured a winged sun disc flanked by cobras.","تميّزت الحلية الصدرية الذهبية بقرص شمس مجنّح تحيط به أفاعٍ.","extended","B2","COCA"],
  ["diadem","noun","تاج أو عصابة رأس ملكية مزخرفة","The queen's diadem was set with lapis lazuli and carnelian stones.","رُصّع تاج الملكة بأحجار اللازورد والعقيق الأحمر.","extended","B2","COCA"],
  ["torque","noun","طوق عنق معدني ملتوي من العصر البرونزي","The Celtic torque was twisted from a single gold bar weighing 800 grams.","لُوي الطوق الكلتي من قضيب ذهبي واحد وزنه 800 غرام.","extended","B2","COCA"],
  ["fibula","noun","مشبك معدني قديم يُستخدم لتثبيت الملابس","The bronze fibula pinned the woollen cloak at the right shoulder.","ثبّت المشبك البرونزي العباءة الصوفية عند الكتف الأيمن.","extended","B2","COCA"],
  ["amphora","noun","جرة فخارية كبيرة ذات مقبضين لنقل السوائل","Over 200 amphorae were recovered from the shipwreck, most still sealed.","استُخرجت أكثر من 200 جرة أمفورا من حطام السفينة وأغلبها لا يزال مختوماً.","core","B2","COCA"],
  ["krater","noun","وعاء يوناني كبير لمزج النبيذ بالماء","The red-figure krater depicted scenes from the Trojan War.","صوّر إناء الكراتر ذو الأشكال الحمراء مشاهد من حرب طروادة.","extended","C1","COCA"],
  ["lekythos","noun","إناء يوناني ضيق العنق لحفظ الزيت","White-ground lekythoi were placed in Athenian graves as funerary offerings.","وُضعت أواني الليكيثوس ذات الخلفية البيضاء في مقابر أثينا كقرابين جنائزية.","mastery","C1","COCA"],
  ["rhyton","noun","كأس طقسي على شكل رأس حيوان للشرب","The silver rhyton was shaped like a bull's head with gilded horns.","كان الكأس الطقسي الفضي على شكل رأس ثور بقرون مذهبة.","mastery","C1","COCA"],
  ["stylus","noun","أداة مدببة للكتابة على الطين أو الشمع","The scribe pressed a reed stylus into the wet clay to form cuneiform signs.","ضغط الكاتب بقلم قصب مدبب في الطين الرطب لتشكيل علامات مسمارية.","core","B2","COCA"],
  ["astrolabe","noun","أداة فلكية قديمة لقياس ارتفاع النجوم","The brass astrolabe enabled navigators to determine latitude at sea.","مكّن الإسطرلاب النحاسي الملاحين من تحديد خط العرض في البحر.","extended","B2","COCA"],
  ["quipu","noun","نظام عقد خيطية استخدمه الإنكا لحفظ السجلات","The quipu encoded census data using coloured strings and knots.","سجّل الكيبو بيانات التعداد باستخدام خيوط ملونة وعُقد.","mastery","C1","COCA"],
  ["obsidian","noun","زجاج بركاني أسود استُخدم في صناعة الأدوات الحادة","Obsidian blades from Anatolia were traded across the ancient Mediterranean.","تُوجّرت شفرات السبج من الأناضول عبر البحر المتوسط القديم.","core","B2","COCA"],
  ["chert","noun","حجر صلب دقيق الحبيبات استُخدم في صناعة الأدوات","Local chert outcrops provided the raw material for stone tool production.","وفّرت نتوءات الشرت المحلية المادة الخام لإنتاج الأدوات الحجرية.","extended","B2","COCA"],
  ["carnelian","noun","حجر كريم أحمر برتقالي نصف شفاف","Carnelian beads were strung into elaborate necklaces found in Indus Valley tombs.","نُظمت خرزات العقيق الأحمر في قلائد متقنة عُثر عليها في مقابر وادي الإندوس.","extended","B2","COCA"],
  ["lapis lazuli","noun","حجر كريم أزرق عميق كان يُستورد من أفغانستان","Lapis lazuli inlays decorated the funeral mask of the Sumerian queen.","زيّنت تطعيمات اللازورد قناع الجنازة للملكة السومرية.","core","B2","COCA"],
  ["arrowhead","noun","رأس سهم حجري أو معدني","Hundreds of obsidian arrowheads littered the battlefield, evidence of a fierce clash.","تناثرت مئات رؤوس السهام السبجية في ساحة المعركة دليلاً على صدام عنيف.","core","B1","COCA"],
  ["hand axe","noun","فأس يدوية حجرية ذات وجهين من العصر الحجري","The Acheulean hand axe showed remarkable symmetry for a tool 500,000 years old.","أظهرت الفأس اليدوية الأشولية تناظراً ملحوظاً لأداة عمرها 500,000 عام.","core","B2","COCA"],
  ["scraper","noun","مكشطة حجرية لمعالجة الجلود واللحوم","End scrapers were the most common tool type in the Magdalenian assemblage.","كانت المكاشط الطرفية أكثر أنواع الأدوات شيوعاً في المجموعة المجدلانية.","core","B2","COCA"],
  ["burin","noun","أداة حجرية مدببة للنقش والحفر","Burins were used to engrave decorative patterns on antler and bone.","استُخدمت الأزاميل لنقش أنماط زخرفية على قرون الغزلان والعظام.","extended","C1","COCA"],
  ["awl","noun","مخرز مدبب لثقب الجلود والأقمشة","Bone awls found at the site were used for piercing animal hides.","استُخدمت المخارز العظمية الموجودة في الموقع لثقب جلود الحيوانات.","extended","B2","COCA"],
  ["quern","noun","رحى يدوية لطحن الحبوب","The saddle quern was worn smooth from decades of grinding grain.","تآكلت الرحى اليدوية واصبحت ملساء من عقود طحن الحبوب.","extended","C1","COCA"],
  ["spindle whorl","noun","ثقالة مغزل دائرية لغزل الألياف","Decorated spindle whorls suggested textile production was a household activity.","أشارت ثقالات المغزل المزخرفة إلى أن إنتاج المنسوجات كان نشاطاً منزلياً.","extended","B2","COCA"],
  ["loom weight","noun","ثقل نول يُستخدم لشد خيوط النسيج","Rows of loom weights found in situ revealed the position of an ancient loom.","كشفت صفوف أثقال النول الموجودة في مكانها عن موقع نول قديم.","extended","B2","COCA"],
  ["crucible","noun","بوتقة لصهر المعادن في درجات حرارة عالية","Slag residue inside the crucible confirmed copper smelting at the site.","أكدت بقايا الخبث داخل البوتقة صهر النحاس في الموقع.","core","B2","COCA"],
  ["tuyere","noun","أنبوب نفخ الهواء في فرن صهر المعادن","Fragments of ceramic tuyeres indicated the presence of a metalworking furnace.","أشارت شظايا أنابيب النفخ الخزفية إلى وجود فرن لتشكيل المعادن.","mastery","C1","COCA"],
  ["hammerstone","noun","حجر طرق يُستخدم لتشكيل الأدوات الحجرية","The battered hammerstone bore impact marks from repeated percussive flaking.","حمل حجر الطرق المهترئ آثار صدمات من التقشير الطرقي المتكرر.","extended","B2","COCA"],
  ["grinding stone","noun","حجر طحن يُستخدم لسحق الحبوب والبذور","A large grinding stone stained with red ochre was found near the hearth.","عُثر على حجر طحن كبير ملطخ بالمُغرة الحمراء قرب الموقد.","core","B1","COCA"],
  ["sarcophagus","noun","تابوت حجري منحوت لدفن الموتى","The granite sarcophagus weighed three tonnes and bore hieroglyphic inscriptions.","وزن التابوت الغرانيتي ثلاثة أطنان وحمل نقوشاً هيروغليفية.","core","B2","COCA"],
  ["petroglyph","noun","نقش صخري محفور على سطح الحجر","The canyon walls displayed petroglyphs of bighorn sheep and human figures.","عرضت جدران الوادي نقوشاً صخرية لأغنام جبلية وأشكال بشرية.","extended","B2","COCA"],
  ["pictograph","noun","رسم تصويري مرسوم على سطح صخري","Faded pictographs in red and yellow ochre adorned the cave ceiling.","زيّنت رسوم تصويرية باهتة بالمُغرة الحمراء والصفراء سقف الكهف.","extended","B2","COCA"],
  ["midden","noun","كومة نفايات قديمة تحتوي بقايا طعام وأدوات","Shell middens along the coast yielded fish bones and broken pottery.","أنتجت أكوام القمامة الصدفية على الساحل عظام أسماك وفخاراً مكسوراً.","extended","C1","COCA"],
  ["excavation trench","noun","خندق حفر منظّم في موقع أثري","A five-metre excavation trench exposed the foundation walls of the temple.","كشف خندق حفر بعمق خمسة أمتار عن جدران أساسات المعبد.","core","B2","COCA"],
  ["cultural layer","noun","طبقة أرضية تحتوي آثار نشاط بشري","The cultural layer at 1.5 metres depth contained charcoal and pottery sherds.","احتوت الطبقة الثقافية على عمق 1.5 متر على فحم وشظايا فخارية.","core","B2","AWL"],
  ["in situ","adverb","في الموقع الأصلي دون تحريك","The mosaic was documented in situ before being carefully removed for conservation.","وُثّقت الفسيفساء في موقعها الأصلي قبل إزالتها بعناية للترميم.","core","B2","AWL"],
  ["ceramic sherd","noun","شقفة فخارية مكسورة من إناء قديم","Over 2,000 ceramic sherds were catalogued and sorted by ware type.","صُنّفت أكثر من 2000 شقفة فخارية ورُتّبت حسب نوع المصنوع.","core","B2","COCA"],
  ["stratum","noun","طبقة أرضية واحدة في تسلسل طبقي أثري","The earliest stratum contained Neolithic tools and seeds of domesticated wheat.","احتوت أقدم طبقة على أدوات نيوليثية وبذور قمح مستأنس.","extended","B2","AWL"],
  ["mortuary practice","noun","طقوس وعادات الدفن عند الشعوب القديمة","Mortuary practices at the site included both cremation and inhumation.","شملت طقوس الدفن في الموقع كلاً من الحرق والدفن.","extended","B2","COCA"],
  ["votive offering","noun","قربان نذري يُقدّم في معبد أو مكان مقدس","Bronze votive offerings filled the temple pit, left by generations of worshippers.","ملأت القرابين النذرية البرونزية حفرة المعبد تركها أجيال من المتعبدين.","extended","B2","COCA"],
];

// ============================================================
// UNIT 10 — Longevity Science (100 words)
// ============================================================
const unit10 = [
  ["healthspan","noun","فترة الحياة الخالية من الأمراض المزمنة","The goal of longevity research is to extend healthspan, not just lifespan.","هدف أبحاث طول العمر تمديد فترة الصحة وليس مجرد العمر.","core","B2","COCA"],
  ["morbidity","noun","معدل الإصابة بالأمراض في مجموعة سكانية","Compression of morbidity means delaying disease onset to the final years of life.","ضغط المراضة يعني تأخير ظهور المرض إلى السنوات الأخيرة من العمر.","core","B2","AWL"],
  ["comorbidity","noun","وجود مرضين أو أكثر في المريض نفسه","Diabetes and hypertension are common comorbidities in the elderly population.","يُعدّ السكري وارتفاع ضغط الدم من الأمراض المصاحبة الشائعة لدى كبار السن.","core","B2","COCA"],
  ["frailty","noun","هشاشة جسدية مرتبطة بالتقدم في العمر","Frailty assessment scores predict hospitalisation risk in patients over 75.","تتنبأ درجات تقييم الهشاشة بمخاطر الاستشفاء لدى المرضى فوق 75 عاماً.","core","B2","COCA"],
  ["sarcopenia","noun","فقدان الكتلة العضلية المرتبط بالشيخوخة","Resistance training is the most effective intervention for sarcopenia.","تدريبات المقاومة هي أكثر التدخلات فعالية لعلاج ضمور العضلات الشيخوخي.","extended","C1","COCA"],
  ["osteoporosis","noun","هشاشة العظام وانخفاض كثافتها","Weight-bearing exercise and calcium intake help prevent osteoporosis.","تساعد التمارين الحاملة للوزن وتناول الكالسيوم في الوقاية من هشاشة العظام.","core","B2","COCA"],
  ["atherosclerosis","noun","تصلب الشرايين بسبب تراكم الدهون","Atherosclerosis narrows the arteries and increases the risk of heart attack.","يُضيّق تصلب الشرايين الأوعية الدموية ويزيد خطر النوبة القلبية.","extended","B2","COCA"],
  ["thrombosis","noun","تشكّل جلطة دموية داخل الوعاء الدموي","Deep vein thrombosis can be fatal if a clot travels to the lungs.","يمكن أن يكون تجلط الأوردة العميقة قاتلاً إذا انتقلت الجلطة إلى الرئتين.","core","B2","COCA"],
  ["embolism","noun","انسداد وعاء دموي بجسم غريب كجلطة منتقلة","A pulmonary embolism occurs when a blood clot blocks an artery in the lung.","يحدث الانصمام الرئوي عندما تسد جلطة دموية شرياناً في الرئة.","extended","B2","COCA"],
  ["aneurysm","noun","انتفاخ غير طبيعي في جدار الشريان","An aortic aneurysm can rupture without warning, causing fatal internal bleeding.","يمكن أن ينفجر تمدد الأبهر دون إنذار مسبباً نزيفاً داخلياً قاتلاً.","extended","B2","COCA"],
  ["arrhythmia","noun","اضطراب في نظم ضربات القلب","Atrial fibrillation is the most common cardiac arrhythmia in older adults.","الرجفان الأذيني هو أكثر اضطرابات نظم القلب شيوعاً لدى كبار السن.","core","B2","COCA"],
  ["fibrillation","noun","ارتجاف سريع وغير منتظم في عضلة القلب","Ventricular fibrillation requires immediate defibrillation to restore normal rhythm.","يتطلب الرجفان البطيني إزالة رجفان فورية لاستعادة النظم الطبيعي.","extended","C1","COCA"],
  ["glycation","noun","ارتباط السكر بالبروتينات مسبباً تلفاً خلوياً","Advanced glycation end-products accumulate in tissues and accelerate aging.","تتراكم نواتج الغلكزة المتقدمة في الأنسجة وتسرّع الشيخوخة.","mastery","C1","COCA"],
  ["methylation","noun","إضافة مجموعة ميثيل لتنظيم التعبير الجيني","DNA methylation patterns serve as an epigenetic clock to estimate biological age.","تعمل أنماط المثيلة كساعة فوق جينية لتقدير العمر البيولوجي.","extended","C1","AWL"],
  ["acetylation","noun","إضافة مجموعة أسيتيل للتحكم في نشاط البروتينات","Histone acetylation opens chromatin structure and activates gene transcription.","تفتح الأستلة الهيستونية بنية الكروماتين وتنشّط النسخ الجيني.","mastery","C1","AWL"],
  ["phosphorylation","noun","إضافة مجموعة فوسفات لتفعيل أو تعطيل البروتين","Protein phosphorylation regulates virtually every cellular signalling pathway.","تنظّم الفسفرة البروتينية تقريباً كل مسار إشارات خلوي.","mastery","C1","AWL"],
  ["proteasome","noun","مركّب بروتيني يفكك البروتينات التالفة في الخلية","Proteasome activity declines with age, leading to accumulation of damaged proteins.","يتراجع نشاط البروتياسوم مع التقدم بالعمر مما يؤدي لتراكم البروتينات التالفة.","mastery","C1","COCA"],
  ["lysosome","noun","عضيّة خلوية تهضم المواد المتهالكة","Lysosome dysfunction contributes to neurodegenerative diseases like Alzheimer's.","يساهم خلل الجسيمات الحالّة في أمراض التنكس العصبي كالزهايمر.","extended","B2","COCA"],
  ["peroxisome","noun","عضيّة خلوية تكسر الأحماض الدهنية والسموم","Peroxisomes break down very long chain fatty acids and neutralise reactive oxygen.","تكسر البيروكسيسومات الأحماض الدهنية طويلة السلسلة وتعادل الأكسجين التفاعلي.","mastery","C1","COCA"],
  ["chromatin","noun","مادة وراثية مكونة من حمض نووي وبروتينات هيستونية","Chromatin remodelling plays a crucial role in cellular aging and gene regulation.","تلعب إعادة تشكيل الكروماتين دوراً حاسماً في شيخوخة الخلايا وتنظيم الجينات.","extended","C1","AWL"],
  ["histone","noun","بروتين يلتف حوله الحمض النووي في النواة","Histone modifications determine which genes are active in a given cell type.","تحدد تعديلات الهيستون أي الجينات نشطة في نوع خلية معين.","extended","C1","AWL"],
  ["telomerase","noun","إنزيم يعيد بناء نهايات الصبغيات المتآكلة","Telomerase activation in stem cells helps maintain tissue regeneration capacity.","يساعد تنشيط التيلوميراز في الخلايا الجذعية في الحفاظ على قدرة تجديد الأنسجة.","extended","C1","COCA"],
  ["sirtuin","noun","عائلة بروتينات تنظّم الشيخوخة والأيض الخلوي","Sirtuins regulate DNA repair, inflammation, and metabolic homeostasis.","تنظّم السيرتوينات إصلاح الحمض النووي والالتهاب والتوازن الأيضي.","mastery","C1","COCA"],
  ["resveratrol","noun","مركّب نباتي مضاد للأكسدة موجود في العنب الأحمر","Resveratrol activates sirtuins and mimics the effects of caloric restriction.","ينشّط الريسفيراترول السيرتوينات ويحاكي تأثيرات تقييد السعرات الحرارية.","extended","B2","COCA"],
  ["spermidine","noun","مركّب طبيعي يحفّز الالتهام الذاتي للخلايا","Spermidine supplementation enhanced autophagy and extended lifespan in animal models.","عزّزت مكملات السبيرميدين الالتهام الذاتي وأطالت العمر في النماذج الحيوانية.","mastery","C1","COCA"],
  ["fisetin","noun","فلافونويد نباتي له خصائص حالّة للشيخوخة","Fisetin cleared senescent cells and reduced inflammation in aged mice.","أزال الفيسيتين الخلايا الهرمة وقلّل الالتهاب في الفئران المسنة.","mastery","C1","COCA"],
  ["quercetin","noun","فلافونويد مضاد للأكسدة موجود في البصل والتفاح","Quercetin combined with dasatinib showed senolytic activity in human trials.","أظهر الكيرسيتين مع الداساتينيب نشاطاً حالاً للشيخوخة في التجارب البشرية.","extended","B2","COCA"],
  ["senolytic","adjective","عامل يقضي على الخلايا الهرمة المتراكمة","Senolytic drugs selectively eliminate senescent cells that drive chronic inflammation.","تقضي الأدوية الحالّة للشيخوخة انتقائياً على الخلايا الهرمة المسببة للالتهاب المزمن.","extended","C1","COCA"],
  ["senomorphic","adjective","عامل يثبط إفرازات الخلايا الهرمة دون قتلها","Senomorphic agents suppress the harmful secretions of senescent cells without killing them.","تثبط العوامل المعدّلة للشيخوخة إفرازات الخلايا الهرمة الضارة دون قتلها.","mastery","C1","COCA"],
  ["inflammasome","noun","مركّب بروتيني يطلق استجابة التهابية داخل الخلية","NLRP3 inflammasome activation drives age-related sterile inflammation.","يقود تنشيط التهابوم NLRP3 الالتهاب العقيم المرتبط بالعمر.","mastery","C1","COCA"],
  ["cytokine","noun","جزيء إشارات ينظّم الاستجابة المناعية","Elevated cytokine levels in the elderly contribute to chronic low-grade inflammation.","تساهم مستويات السيتوكينات المرتفعة لدى كبار السن في الالتهاب المنخفض الدرجة المزمن.","core","B2","COCA"],
  ["immunosenescence","noun","تدهور الجهاز المناعي المرتبط بالشيخوخة","Immunosenescence increases susceptibility to infections and reduces vaccine efficacy.","يزيد شيخوخة المناعة القابلية للعدوى ويقلل فعالية اللقاحات.","mastery","C1","COCA"],
  ["thymic involution","noun","ضمور الغدة الزعترية مع التقدم في العمر","Thymic involution reduces the production of new T cells after puberty.","يقلل ضمور الغدة الزعترية إنتاج خلايا تائية جديدة بعد البلوغ.","mastery","C1","COCA"],
  ["naive T cell","noun","خلية تائية لم تتعرض لمستضد بعد","The pool of naive T cells shrinks dramatically in people over 70.","يتقلص مخزون الخلايا التائية البكر بشكل كبير عند الأشخاص فوق 70 عاماً.","extended","C1","COCA"],
  ["natural killer cell","noun","خلية مناعية تقتل الخلايا المصابة والسرطانية","Natural killer cell activity declines with age, weakening tumour surveillance.","يتراجع نشاط خلايا القتل الطبيعية مع العمر مما يُضعف مراقبة الأورام.","extended","B2","COCA"],
  ["macrophage","noun","خلية بلعمية كبيرة تلتهم الأجسام الغريبة","Aged macrophages exhibit reduced phagocytic capacity and impaired wound healing.","تُظهر الخلايا البلعمية المسنّة قدرة بلعمية منخفضة وتعافياً معطّلاً للجروح.","core","B2","COCA"],
  ["dendritic cell","noun","خلية تغصنية تقدّم المستضدات للخلايا المناعية","Dendritic cells become less efficient at antigen presentation in older adults.","تصبح الخلايا التغصنية أقل كفاءة في تقديم المستضدات عند كبار السن.","extended","C1","COCA"],
  ["interferon","noun","بروتين يفرزه الجسم استجابة للعدوى الفيروسية","Type I interferon responses are delayed in elderly patients with viral infections.","تتأخر استجابات الإنترفيرون من النوع الأول لدى المرضى المسنين المصابين بعدوى فيروسية.","extended","B2","COCA"],
  ["interleukin","noun","سيتوكين ينظّم التواصل بين خلايا الجهاز المناعي","Interleukin-6 is a key biomarker of chronic inflammation in the elderly.","الإنترلوكين-6 مؤشر حيوي رئيسي للالتهاب المزمن عند كبار السن.","extended","C1","COCA"],
  ["somatotropin","noun","هرمون النمو الذي تفرزه الغدة النخامية","Somatotropin secretion decreases by roughly 14% per decade after age 30.","يتناقص إفراز السوماتوتروبين بنحو 14% لكل عقد بعد سن الثلاثين.","mastery","C1","COCA"],
  ["cortisol","noun","هرمون التوتر الذي تفرزه الغدة الكظرية","Chronically elevated cortisol accelerates bone loss and impairs immune function.","يسرّع الكورتيزول المرتفع بشكل مزمن فقدان العظام ويضعف المناعة.","core","B2","COCA"],
  ["circadian","adjective","متعلق بالإيقاع البيولوجي على مدار 24 ساعة","Disrupted circadian rhythms are linked to accelerated aging and metabolic disease.","ترتبط اضطرابات الإيقاع اليومي بتسارع الشيخوخة والأمراض الأيضية.","core","B2","COCA"],
  ["pineal gland","noun","الغدة الصنوبرية المفرزة للميلاتونين","The pineal gland produces less melatonin with age, disrupting sleep patterns.","تنتج الغدة الصنوبرية كمية أقل من الميلاتونين مع العمر مما يخل بأنماط النوم.","extended","B2","COCA"],
  ["hypothalamus","noun","منطقة دماغية تتحكم بالحرارة والجوع والهرمونات","The hypothalamus acts as the master regulator of hormonal and metabolic balance.","يعمل الوطاء كمنظم رئيسي للتوازن الهرموني والأيضي.","core","B2","COCA"],
  ["adrenal","adjective","متعلق بالغدة الكظرية فوق الكلية","Adrenal fatigue from chronic stress depletes the body's cortisol reserves.","يستنزف إرهاق الغدة الكظرية من التوتر المزمن احتياطيات الكورتيزول.","core","B2","COCA"],
  ["glucagon","noun","هرمون يرفع مستوى السكر في الدم","Glucagon signals the liver to release stored glucose during fasting periods.","يُعطي الغلوكاغون إشارة للكبد لإطلاق الغلوكوز المخزن أثناء الصيام.","extended","B2","COCA"],
  ["leptin","noun","هرمون الشبع الذي تفرزه الخلايا الدهنية","Leptin resistance develops in obesity, blunting the brain's satiety signals.","تتطور مقاومة اللبتين في السمنة مما يُضعف إشارات الشبع في الدماغ.","extended","B2","COCA"],
  ["ghrelin","noun","هرمون الجوع الذي تفرزه المعدة","Ghrelin levels spike before meals, triggering the sensation of hunger.","ترتفع مستويات الغريلين قبل الوجبات مما يثير الإحساس بالجوع.","extended","B2","COCA"],
  ["adiponectin","noun","هرمون تفرزه الدهون يحسّن حساسية الأنسولين","High adiponectin levels are associated with reduced cardiovascular risk.","ترتبط مستويات الأديبونكتين المرتفعة بانخفاض مخاطر القلب والأوعية الدموية.","mastery","C1","COCA"],
  ["endorphin","noun","مسكّن ألم طبيعي يفرزه الدماغ","Exercise triggers endorphin release, producing the well-known runner's high.","يحفّز التمرين إفراز الإندورفين منتجاً نشوة العدّاء المعروفة.","core","B1","COCA"],
  ["osteoblast","noun","خلية بانية للعظم تصنع النسيج العظمي الجديد","Osteoblast activity declines with age, reducing the rate of new bone formation.","يتراجع نشاط الخلايا البانية للعظم مع العمر مما يقلل معدل تكوين العظام الجديدة.","extended","C1","COCA"],
  ["osteoclast","noun","خلية هادمة للعظم تفكك النسيج العظمي القديم","Excessive osteoclast activity leads to bone loss and increased fracture risk.","يؤدي فرط نشاط الخلايا الهادمة للعظم إلى فقدان العظام وزيادة خطر الكسور.","extended","C1","COCA"],
  ["chondrocyte","noun","خلية غضروفية تحافظ على مصفوفة الغضروف","Chondrocyte senescence contributes to cartilage degradation in osteoarthritis.","تساهم شيخوخة الخلايا الغضروفية في تدهور الغضروف في التهاب المفاصل.","mastery","C1","COCA"],
  ["parabiosis","noun","ربط جسدين لمشاركة الدورة الدموية تجريبياً","Parabiosis experiments showed young blood can rejuvenate aged tissues.","أظهرت تجارب المشاركة الدموية أن الدم الشاب يمكنه تجديد الأنسجة المسنة.","mastery","C1","COCA"],
  ["plasma exchange","noun","استبدال بلازما الدم بمحلول نقي","Therapeutic plasma exchange is being tested to remove pro-aging factors from blood.","يُختبر استبدال البلازما العلاجي لإزالة عوامل الشيخوخة من الدم.","extended","B2","COCA"],
  ["rapamycin","noun","مثبط مناعي يُدرس لخصائصه المضادة للشيخوخة","Low-dose rapamycin extended lifespan in mice by inhibiting mTOR signalling.","أطال الراباميسين بجرعات منخفضة عمر الفئران عبر تثبيط إشارات mTOR.","mastery","C1","COCA"],
  ["metformin","noun","دواء سكري يُدرس لتأثيراته على طول العمر","The TAME trial is testing whether metformin can delay age-related diseases in humans.","تختبر تجربة TAME ما إذا كان الميتفورمين يمكنه تأخير الأمراض المرتبطة بالعمر.","core","B2","COCA"],
  ["NAD precursor","noun","سلائف كيميائية تعزز مستويات NAD+ في الخلايا","NAD precursors restore cellular energy metabolism that declines with aging.","تستعيد سلائف NAD أيض الطاقة الخلوي الذي يتراجع مع الشيخوخة.","extended","C1","COCA"],
  ["nicotinamide riboside","noun","شكل من فيتامين B3 يرفع مستويات NAD+","Nicotinamide riboside supplementation increased NAD+ levels by 60% in a clinical trial.","رفعت مكملات نيكوتيناميد ريبوسيد مستويات NAD+ بنسبة 60% في تجربة سريرية.","mastery","C1","COCA"],
  ["nicotinamide mononucleotide","noun","جزيء وسيط في تصنيع NAD+ داخل الخلايا","Nicotinamide mononucleotide improved insulin sensitivity in postmenopausal women.","حسّن أحادي نوكليوتيد النيكوتيناميد حساسية الأنسولين عند النساء بعد سن اليأس.","mastery","C1","COCA"],
  ["pterostilbene","noun","مركّب نباتي شبيه بالريسفيراترول أعلى توافراً حيوياً","Pterostilbene showed superior bioavailability compared to resveratrol in human studies.","أظهر البتيروستيلبين توافراً حيوياً أعلى مقارنة بالريسفيراترول في الدراسات البشرية.","mastery","C1","COCA"],
  ["curcumin","noun","مركّب نشط في الكركم ذو خصائص مضادة للالتهاب","Curcumin reduces NF-κB activation and lowers systemic inflammation markers.","يقلل الكركمين تنشيط NF-κB ويخفض مؤشرات الالتهاب الجهازي.","core","B2","COCA"],
  ["sulforaphane","noun","مركّب في البروكلي ينشّط مسارات إزالة السموم","Sulforaphane activates the Nrf2 pathway, boosting the body's antioxidant defences.","ينشّط السلفورافان مسار Nrf2 معززاً دفاعات الجسم المضادة للأكسدة.","extended","C1","COCA"],
  ["berberine","noun","مركّب نباتي ينظّم سكر الدم والدهون","Berberine activates AMPK and improves glucose metabolism similarly to metformin.","ينشّط البربرين إنزيم AMPK ويحسّن أيض الغلوكوز بشكل مشابه للميتفورمين.","extended","B2","COCA"],
  ["ashwagandha","noun","عشبة هندية تقليدية تقلل التوتر وتحسن المناعة","Ashwagandha root extract reduced cortisol levels by 30% in a controlled trial.","خفّض مستخلص جذر الأشواغندا مستويات الكورتيزول بنسبة 30% في تجربة مضبوطة.","core","B1","COCA"],
  ["rhodiola","noun","عشبة تكيّفية تعزز مقاومة الإجهاد البدني والنفسي","Rhodiola rosea improved cognitive performance under fatigue in clinical studies.","حسّنت الروديولا الوردية الأداء المعرفي تحت الإرهاق في الدراسات السريرية.","extended","B2","COCA"],
  ["astragalus","noun","عشبة صينية تقليدية تدعم المناعة والحيوية","Astragalus extract activated telomerase in human immune cells in vitro.","نشّط مستخلص القتاد إنزيم التيلوميراز في الخلايا المناعية البشرية مخبرياً.","extended","B2","COCA"],
  ["coenzyme Q10","noun","مرافق إنزيمي ضروري لإنتاج الطاقة في الخلايا","Coenzyme Q10 levels in heart tissue decline by 50% between ages 20 and 80.","تنخفض مستويات الإنزيم المرافق Q10 في أنسجة القلب بنسبة 50% بين عمر 20 و80.","core","B2","COCA"],
  ["alpha-lipoic acid","noun","مضاد أكسدة قابل للذوبان في الماء والدهون معاً","Alpha-lipoic acid regenerates other antioxidants like vitamins C and E.","يجدد حمض ألفا ليبويك مضادات الأكسدة الأخرى كفيتامين C وE.","extended","B2","COCA"],
  ["carnosine","noun","ثنائي ببتيد يحمي من الغلكزة وتلف البروتينات","Carnosine inhibits the formation of advanced glycation end-products in tissues.","يثبط الكارنوسين تكوّن نواتج الغلكزة المتقدمة في الأنسجة.","extended","C1","COCA"],
  ["taurine","noun","حمض أميني يدعم القلب والدماغ والعضلات","Taurine deficiency accelerated aging in mice, while supplementation reversed the effects.","سرّع نقص التورين الشيخوخة في الفئران بينما عكست المكملات التأثيرات.","core","B2","COCA"],
  ["glycine","noun","أبسط حمض أميني يدعم النوم وتكوين الكولاجين","Glycine supplementation improved sleep quality and reduced daytime fatigue.","حسّنت مكملات الغلايسين جودة النوم وقللت الإرهاق النهاري.","core","B1","COCA"],
  ["collagen peptide","noun","ببتيدات كولاجين محلّلة لدعم الجلد والمفاصل","Daily collagen peptide intake improved skin elasticity and hydration after 8 weeks.","حسّن تناول ببتيدات الكولاجين يومياً مرونة الجلد ورطوبته بعد 8 أسابيع.","core","B2","COCA"],
  ["hyaluronic acid","noun","حمض الهيالورونيك يحتفظ بالرطوبة في الجلد والمفاصل","Hyaluronic acid injections reduced knee pain and improved joint mobility.","قللت حقن حمض الهيالورونيك آلام الركبة وحسّنت حركة المفصل.","core","B2","COCA"],
  ["glucosamine","noun","مكمّل يدعم صحة الغضاريف والمفاصل","Glucosamine supplementation slowed cartilage degradation in patients with osteoarthritis.","أبطأت مكملات الغلوكوزامين تدهور الغضروف لدى مرضى التهاب المفاصل.","core","B2","COCA"],
  ["chondroitin","noun","مركّب في الغضاريف يحسّن مرونة المفاصل","Chondroitin sulfate reduced joint swelling and stiffness in a six-month trial.","قلّل كبريتات الكوندروتين تورّم المفاصل وتيبسها في تجربة استمرت ستة أشهر.","core","B2","COCA"],
  ["autophagy","noun","آلية خلوية لتفكيك المكونات التالفة وإعادة تدويرها","Intermittent fasting triggers autophagy, clearing damaged organelles from cells.","يحفّز الصيام المتقطع الالتهام الذاتي مزيلاً العضيات التالفة من الخلايا.","extended","C1","COCA"],
  ["caloric restriction","noun","تقليل السعرات الحرارية لإبطاء الشيخوخة","Caloric restriction of 20% extended lifespan by 15% in primate studies.","أطال تقييد السعرات الحرارية بنسبة 20% العمر بنسبة 15% في دراسات الرئيسيات.","core","B2","COCA"],
  ["oxidative stress","noun","اختلال التوازن بين الجذور الحرة ومضادات الأكسدة","Oxidative stress damages DNA, proteins, and lipids, accelerating cellular aging.","يتلف الإجهاد التأكسدي الحمض النووي والبروتينات والدهون مما يسرّع شيخوخة الخلايا.","core","B2","COCA"],
  ["mitochondrial dysfunction","noun","خلل في وظائف الميتوكوندريا المنتجة للطاقة","Mitochondrial dysfunction is a hallmark of aging and neurodegenerative disease.","يُعد خلل الميتوكوندريا سمة مميزة للشيخوخة وأمراض التنكس العصبي.","extended","C1","COCA"],
  ["cellular senescence","noun","توقف الخلايا عن الانقسام مع بقائها نشطة أيضياً","Cellular senescence accumulates with age and drives tissue inflammation.","يتراكم الشيخوخة الخلوية مع العمر ويحفّز التهاب الأنسجة.","extended","C1","AWL"],
  ["epigenetic clock","noun","مقياس جزيئي يقدّر العمر البيولوجي من أنماط المثيلة","The Horvath epigenetic clock estimates biological age from DNA methylation patterns.","تقدّر ساعة هورفاث فوق الجينية العمر البيولوجي من أنماط مثيلة الحمض النووي.","mastery","C1","AWL"],
  ["biological age","noun","عمر بيولوجي يعكس حالة الجسم الفعلية","Her biological age was estimated at 45, despite being chronologically 58.","قُدّر عمرها البيولوجي بـ 45 عاماً رغم أنها في 58 من عمرها الزمني.","core","B2","COCA"],
  ["stem cell exhaustion","noun","استنزاف الخلايا الجذعية مع التقدم بالعمر","Stem cell exhaustion reduces tissue repair capacity in the elderly.","يقلل استنزاف الخلايا الجذعية قدرة إصلاح الأنسجة عند كبار السن.","extended","C1","COCA"],
  ["telomere attrition","noun","تآكل نهايات الصبغيات مع كل انقسام خلوي","Telomere attrition is considered one of the nine hallmarks of aging.","يُعتبر تآكل التيلوميرات أحد المعالم التسعة للشيخوخة.","extended","C1","AWL"],
  ["proteostasis","noun","توازن تصنيع وتفكيك البروتينات داخل الخلية","Loss of proteostasis leads to toxic protein aggregates in neurodegenerative diseases.","يؤدي فقدان توازن البروتينات إلى تجمعات بروتينية سامة في أمراض التنكس العصبي.","mastery","C1","COCA"],
  ["senolytics","noun","أدوية تستهدف وتزيل الخلايا الهرمة من الجسم","Senolytics represent a promising class of anti-aging therapeutics.","تمثّل حالّات الشيخوخة فئة واعدة من العلاجات المضادة للشيخوخة.","extended","C1","COCA"],
  ["intermittent fasting","noun","صيام متقطع يتناوب بين فترات أكل وصيام","Intermittent fasting improved insulin sensitivity and reduced inflammatory markers.","حسّن الصيام المتقطع حساسية الأنسولين وقلّل مؤشرات الالتهاب.","core","B2","COCA"],
  ["ketogenesis","noun","عملية إنتاج أجسام كيتونية من الدهون عند الصيام","Ketogenesis during fasting provides an alternative fuel source for the brain.","يوفر تكوّن الكيتونات أثناء الصيام مصدر وقود بديل للدماغ.","extended","C1","COCA"],
  ["microbiome","noun","مجتمع الكائنات الدقيقة المعيشة في الجسم البشري","A diverse gut microbiome is associated with healthier aging and longevity.","يرتبط تنوع الميكروبيوم المعوي بشيخوخة أصح وطول عمر.","core","B2","COCA"],
  ["neuroplasticity","noun","قدرة الدماغ على تكوين روابط عصبية جديدة","Lifelong learning maintains neuroplasticity and delays cognitive decline.","يحافظ التعلم مدى الحياة على اللدونة العصبية ويؤخر التدهور المعرفي.","core","B2","COCA"],
  ["cognitive reserve","noun","احتياطي معرفي يحمي الدماغ من تأثيرات الشيخوخة","Higher education and bilingualism build cognitive reserve against dementia.","يبني التعليم العالي وثنائية اللغة احتياطياً معرفياً ضد الخرف.","extended","B2","AWL"],
  ["biomarker","noun","مؤشر حيوي قابل للقياس يدلّ على حالة صحية","Blood biomarkers can predict the onset of age-related diseases years in advance.","يمكن للمؤشرات الحيوية في الدم التنبؤ بظهور الأمراض المرتبطة بالعمر قبل سنوات.","core","B2","COCA"],
];

// ============================================================
// MAIN
// ============================================================
async function main() {
  const client = await pool.connect();
  try {
    console.log('Starting batch 27 insertions...\n');

    const u8count = await insertBatch(client, unit8, 8, 27);
    console.log(`Unit 8 (Forensic Science): inserted ${u8count} / ${unit8.length} words`);

    const u9count = await insertBatch(client, unit9, 9, 27);
    console.log(`Unit 9 (Archaeological Mysteries): inserted ${u9count} / ${unit9.length} words`);

    const u10count = await insertBatch(client, unit10, 10, 27);
    console.log(`Unit 10 (Longevity Science): inserted ${u10count} / ${unit10.length} words`);

    const total = u8count + u9count + u10count;
    console.log(`\nTotal inserted: ${total} / ${unit8.length + unit9.length + unit10.length}`);

    // Query final totals per unit
    console.log('\n--- Final totals in vocab_staging_l4 ---');
    const res = await client.query(`
      SELECT recommended_unit, COUNT(*) as count
      FROM public.vocab_staging_l4
      WHERE recommended_unit IN (8, 9, 10)
      GROUP BY recommended_unit
      ORDER BY recommended_unit
    `);
    for (const row of res.rows) {
      console.log(`Unit ${row.recommended_unit}: ${row.count} words`);
    }
    const totalRes = await client.query(`SELECT COUNT(*) as count FROM public.vocab_staging_l4 WHERE recommended_unit IN (8, 9, 10)`);
    console.log(`Overall (U8+U9+U10): ${totalRes.rows[0].count} words`);

  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
