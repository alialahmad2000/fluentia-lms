# 🚀 FLUENTIA LMS — Bug Fix & Enhancement Prompts
# Total: 5 Prompts | 17 Points | Est. 85-110 minutes

---

## ترتيب التنفيذ (EXECUTION ORDER)

### 🔴 CRITICAL — نفّذ أولاً:

| # | الملف | الوصف | النقاط | الوقت |
|---|-------|-------|--------|-------|
| 1 | `PROMPT-BF1-FIX-AI-GRADING-ASSESSMENT.md` | إصلاح جميع ميزات AI + التصحيح + التقييم | 5, 6-10, 11 | ~25 min |
| 2 | `PROMPT-BF2-SCHEDULE-FIXES.md` | الجدول: إظهار الكلاسات + قراءة فقط + تخطيط المهام | 1, 2, 3 | ~18 min |

### 🟡 IMPORTANT — بعدهم:

| # | الملف | الوصف | النقاط | الوقت |
|---|-------|-------|--------|-------|
| 3 | `PROMPT-BF3-QUESTIONBANK-CERTIFICATE.md` | بنك الأسئلة Preview + إصلاح الشهادة + صفحة التحقق | 4, 12 | ~18 min |
| 4 | `PROMPT-BF4-PROFILE-ENHANCEMENTS.md` | صورة شخصية + يوزرنيم + تغيير/إعادة باسورد | 13, 14, 15, 16 | ~23 min |

### 🟢 ENHANCEMENT — آخر شي:

| # | الملف | الوصف | النقاط | الوقت |
|---|-------|-------|--------|-------|
| 5 | `PROMPT-BF5-NOTIFICATION-SETTINGS.md` | إعدادات الإشعارات بتصميم Accordion | 17 | ~15 min |

---

## طريقة التنفيذ (HOW TO EXECUTE)

### الخطوة 1: انسخ الملفات لمجلد المشروع
```bash
# من مجلد المشروع
mkdir -p prompts
# انقل الملفات الـ 5 لمجلد prompts/
```

### الخطوة 2: شغّل Claude Code
```bash
cd /path/to/fluentia-lms
claude --dangerously-skip-permissions
```

### الخطوة 3: نفّذ كل برومت بالترتيب
```
Read and execute prompts/PROMPT-BF1-FIX-AI-GRADING-ASSESSMENT.md
```

**انتظر يخلص ← تأكد كل شي يشتغل ← ثم التالي:**
```
Read and execute prompts/PROMPT-BF2-SCHEDULE-FIXES.md
```

**وهكذا للباقي...**

---

## ⚠️ ملاحظات مهمة

1. **بعد BF1:** تأكد إن الـ AI features كلها ترجع نتائج — هذا أهم برومت
2. **بعد BF2:** جرّب من حساب طالب — لازم الكلاسات تظهر
3. **بعد BF4:** تأكد إن RESEND_API_KEY مضبوط في Supabase secrets لأن Reset Password يحتاجه
4. **Edge Functions:** بعد BF1 لازم تتأكد إن كل الـ functions deployed بنجاح
5. **كل برومت يسوي commit + push تلقائياً** — سهل ترجع لأي نقطة
