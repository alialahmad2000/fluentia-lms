// Pro Desk — «يومي» vocabulary vault. A curated deck of the most important
// professional + IT words for Sara, delivered daily via spaced repetition.
// 100% CREDITLESS: authored here, on-device audio (Web Speech), local SRS.
//
// Each word: { id, word, pos, ipa, ar, example, example_ar, tier }
//   tier 1 = essential work words · 2 = professional · 3 = IT domain
// Ordered roughly foundational → specialized; the SRS introduces ~5 new/day.

export const DESK_VOCAB = [
  // ── tier 1 — essential work words ──
  { id: 'v-issue', word: 'issue', pos: 'noun', ipa: 'ˈɪʃ.uː', ar: 'مشكلة / عُطل', example: 'The issue started right after the update.', example_ar: 'المشكلة بدأت بعد التحديث مباشرة.', tier: 1 },
  { id: 'v-resolve', word: 'resolve', pos: 'verb', ipa: 'rɪˈzɒlv', ar: 'يحلّ / يعالج', example: 'We resolved the outage in twenty minutes.', example_ar: 'حللنا الانقطاع في عشرين دقيقة.', tier: 1 },
  { id: 'v-impact', word: 'impact', pos: 'noun', ipa: 'ˈɪm.pækt', ar: 'الأثر', example: 'The impact was limited to one region.', example_ar: 'الأثر اقتصر على منطقة واحدة.', tier: 1 },
  { id: 'v-deadline', word: 'deadline', pos: 'noun', ipa: 'ˈded.laɪn', ar: 'الموعد النهائي', example: 'The deadline is end of day today.', example_ar: 'الموعد النهائي نهاية اليوم.', tier: 1 },
  { id: 'v-schedule', word: 'schedule', pos: 'verb', ipa: 'ˈskedʒ.uːl', ar: 'يجدول / يحدّد موعد', example: 'Let’s schedule a call for tomorrow.', example_ar: 'نجدول مكالمة بكرة.', tier: 1 },
  { id: 'v-approve', word: 'approve', pos: 'verb', ipa: 'əˈpruːv', ar: 'يعتمد / يوافق', example: 'The manager approved the change.', example_ar: 'المدير اعتمد التغيير.', tier: 1 },
  { id: 'v-request', word: 'request', pos: 'noun', ipa: 'rɪˈkwest', ar: 'طلب', example: 'I sent a request for server access.', example_ar: 'أرسلت طلبًا للوصول للخادم.', tier: 1 },
  { id: 'v-update', word: 'update', pos: 'noun', ipa: 'ˈʌp.deɪt', ar: 'تحديث', example: 'I’ll send an update in an hour.', example_ar: 'بأرسل تحديثًا بعد ساعة.', tier: 1 },
  { id: 'v-confirm', word: 'confirm', pos: 'verb', ipa: 'kənˈfɜːm', ar: 'يؤكّد', example: 'Please confirm you received the report.', example_ar: 'رجاءً أكّدي إنك استلمتِ التقرير.', tier: 1 },
  { id: 'v-priority', word: 'priority', pos: 'noun', ipa: 'praɪˈɒr.ə.ti', ar: 'أولوية', example: 'This ticket is our top priority.', example_ar: 'هذي التذكرة أولويتنا القصوى.', tier: 1 },
  { id: 'v-clarify', word: 'clarify', pos: 'verb', ipa: 'ˈklær.ɪ.faɪ', ar: 'يوضّح', example: 'Could you clarify the last step?', example_ar: 'ممكن توضّح الخطوة الأخيرة؟', tier: 1 },
  { id: 'v-feedback', word: 'feedback', pos: 'noun', ipa: 'ˈfiːd.bæk', ar: 'ملاحظات / تغذية راجعة', example: 'Thanks for the quick feedback.', example_ar: 'شكرًا على الملاحظات السريعة.', tier: 1 },

  // ── tier 2 — professional ──
  { id: 'v-reliable', word: 'reliable', pos: 'adjective', ipa: 'rɪˈlaɪ.ə.bəl', ar: 'موثوق', example: 'We need a reliable backup system.', example_ar: 'نحتاج نظام نسخ احتياطي موثوق.', tier: 2 },
  { id: 'v-available', word: 'available', pos: 'adjective', ipa: 'əˈveɪ.lə.bəl', ar: 'متاح / متوفّر', example: 'The service is available again.', example_ar: 'الخدمة رجعت متاحة.', tier: 2 },
  { id: 'v-reduce', word: 'reduce', pos: 'verb', ipa: 'rɪˈdʒuːs', ar: 'يقلّل', example: 'We reduced the latency by half.', example_ar: 'قلّلنا زمن الاستجابة للنصف.', tier: 2 },
  { id: 'v-improve', word: 'improve', pos: 'verb', ipa: 'ɪmˈpruːv', ar: 'يحسّن', example: 'We improved the response time.', example_ar: 'حسّنّا زمن الاستجابة.', tier: 2 },
  { id: 'v-maintain', word: 'maintain', pos: 'verb', ipa: 'meɪnˈteɪn', ar: 'يصون / يحافظ على', example: 'We maintain the servers every week.', example_ar: 'نصون الخوادم كل أسبوع.', tier: 2 },
  { id: 'v-estimate', word: 'estimate', pos: 'verb', ipa: 'ˈes.tɪ.meɪt', ar: 'يقدّر', example: 'Can you estimate the effort for this?', example_ar: 'تقدرين تقدّرين الجهد لهذا؟', tier: 2 },
  { id: 'v-escalate', word: 'escalate', pos: 'verb', ipa: 'ˈes.kə.leɪt', ar: 'يصعّد', example: 'We had to escalate the incident.', example_ar: 'اضطرينا نصعّد الحادثة.', tier: 2 },
  { id: 'v-prioritize', word: 'prioritize', pos: 'verb', ipa: 'praɪˈɒr.ə.taɪz', ar: 'يرتّب الأولويات', example: 'Let’s prioritize the critical bugs.', example_ar: 'نرتّب أولوية الأخطاء الحرجة.', tier: 2 },
  { id: 'v-collaborate', word: 'collaborate', pos: 'verb', ipa: 'kəˈlæb.ə.reɪt', ar: 'يتعاون', example: 'We collaborate with the Bangalore team.', example_ar: 'نتعاون مع فريق بنغالور.', tier: 2 },
  { id: 'v-overview', word: 'overview', pos: 'noun', ipa: 'ˈəʊ.və.vjuː', ar: 'نظرة عامة', example: 'Let me give you a quick overview.', example_ar: 'خلّيني أعطيك نظرة عامة سريعة.', tier: 2 },

  // ── tier 3 — IT domain ──
  { id: 'v-outage', word: 'outage', pos: 'noun', ipa: 'ˈaʊ.tɪdʒ', ar: 'انقطاع خدمة', example: 'The outage lasted about forty minutes.', example_ar: 'الانقطاع استمر تقريبًا أربعين دقيقة.', tier: 3 },
  { id: 'v-backup', word: 'backup', pos: 'noun', ipa: 'ˈbæk.ʌp', ar: 'نسخة احتياطية', example: 'We restored from the latest backup.', example_ar: 'استرجعنا من آخر نسخة احتياطية.', tier: 3 },
  { id: 'v-latency', word: 'latency', pos: 'noun', ipa: 'ˈleɪ.tən.si', ar: 'زمن الاستجابة', example: 'Users noticed high latency this morning.', example_ar: 'المستخدمون لاحظوا زمن استجابة عالي الصباح.', tier: 3 },
  { id: 'v-throughput', word: 'throughput', pos: 'noun', ipa: 'ˈθruː.pʊt', ar: 'معدّل المعالجة', example: 'Throughput dropped after the deploy.', example_ar: 'معدّل المعالجة نزل بعد النشر.', tier: 3 },
  { id: 'v-downtime', word: 'downtime', pos: 'noun', ipa: 'ˈdaʊn.taɪm', ar: 'وقت التعطّل', example: 'The migration had zero downtime.', example_ar: 'الترحيل صار بدون أي تعطّل.', tier: 3 },
  { id: 'v-rollback', word: 'rollback', pos: 'noun', ipa: 'ˈrəʊl.bæk', ar: 'تراجع (لإصدار سابق)', example: 'We did a rollback to the stable version.', example_ar: 'سوّينا تراجعًا للإصدار المستقر.', tier: 3 },
  { id: 'v-scalable', word: 'scalable', pos: 'adjective', ipa: 'ˈskeɪ.lə.bəl', ar: 'قابل للتوسّع', example: 'We need a scalable solution.', example_ar: 'نحتاج حلًّا قابلًا للتوسّع.', tier: 3 },
  { id: 'v-redundancy', word: 'redundancy', pos: 'noun', ipa: 'rɪˈdʌn.dən.si', ar: 'تكرار احتياطي', example: 'We lost redundancy when the node failed.', example_ar: 'فقدنا التكرار الاحتياطي لما طاحت العقدة.', tier: 3 },
  { id: 'v-bottleneck', word: 'bottleneck', pos: 'noun', ipa: 'ˈbɒt.əl.nek', ar: 'عنق الزجاجة (نقطة اختناق)', example: 'The database is the bottleneck.', example_ar: 'قاعدة البيانات هي نقطة الاختناق.', tier: 3 },
  { id: 'v-deprecate', word: 'deprecate', pos: 'verb', ipa: 'ˈdep.rə.keɪt', ar: 'يوقف / يُهمل (تدريجيًا)', example: 'We deprecated the old API last month.', example_ar: 'أوقفنا الواجهة القديمة الشهر الماضي.', tier: 3 },
  { id: 'v-provision', word: 'provision', pos: 'verb', ipa: 'prəˈvɪʒ.ən', ar: 'يجهّز / يوفّر (مورد)', example: 'I’ll provision a new server for staging.', example_ar: 'بجهّز خادمًا جديدًا للـ staging.', tier: 3 },
]

export const TOTAL_VOCAB = DESK_VOCAB.length
export function getWord(id) { return DESK_VOCAB.find((w) => w.id === id) || null }
