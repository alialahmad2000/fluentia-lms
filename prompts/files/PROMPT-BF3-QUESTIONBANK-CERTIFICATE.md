# PROMPT BF3: Question Bank Preview + Certificate Fixes
# Priority: 🟡 IMPORTANT
# Estimated time: 15-20 minutes

---

## CONTEXT

Fluentia LMS — production Arabic-first LMS.
- **Repo:** alialahmad2000/fluentia-lms
- **Stack:** React 18 + Vite + Tailwind + Supabase (ref: nmjexpuycmqcxuxljier) + Framer Motion
- **Design:** Dark theme default, RTL, Tajawal font, CSS variables only, mobile-first

## ⚠️ CRITICAL RULES

1. `const { data, error } = await ...` — NEVER `.catch()`
2. RTL Arabic-first, all colors via CSS variables, 44px touch targets
3. Light mode MUST work equally well — test both themes
4. Icons: smooth rounded corners (10-12px radius), strokeWidth 1.5

---

## TASK A: QUESTION BANK PREVIEW CARDS (Point 4)

**Problem:** Question banks load "blind" — user has no idea what's inside before opening. Need preview cards.

**Find:** The question bank page — likely in `src/pages/trainer/` or `src/pages/admin/` — search for "question" or "quiz" or "bank"

**For each question bank, show a preview card with:**
1. **Title** of the bank (bold, large)
2. **Question count** badge: "١٢ سؤال"
3. **Question types** as small pills: MCQ, صح/خطأ, Fill-in, etc.
4. **Difficulty level** indicator: سهل / متوسط / صعب (with color coding)
5. **First 2 questions** as collapsible preview (collapsed by default)

**Card design:**
```jsx
<motion.div
  initial={{ opacity: 0, y: 10 }}
  animate={{ opacity: 1, y: 0 }}
  className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]
    overflow-hidden hover:border-[var(--color-primary)]/30 transition-colors"
>
  {/* Header */}
  <div className="p-5">
    <div className="flex items-start justify-between mb-3">
      <h3 className="text-lg font-bold">{bank.title}</h3>
      <span className="px-3 py-1 rounded-full text-xs font-medium
        bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
        {bank.question_count} سؤال
      </span>
    </div>
    
    {/* Question type pills */}
    <div className="flex flex-wrap gap-2 mb-3">
      {questionTypes.map(type => (
        <span key={type} className="px-2 py-0.5 rounded-md text-xs
          bg-[var(--color-bg)] text-[var(--color-muted)]">
          {type}
        </span>
      ))}
    </div>
    
    {/* Difficulty */}
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full ${difficultyColor}`} />
      <span className="text-xs text-[var(--color-muted)]">{difficultyLabel}</span>
    </div>
  </div>
  
  {/* Collapsible Preview */}
  <button onClick={() => setExpanded(!expanded)}
    className="w-full px-5 py-3 flex items-center justify-between
      border-t border-[var(--color-border)] text-sm text-[var(--color-muted)]
      hover:bg-[var(--color-bg)] transition-colors">
    <span>معاينة الأسئلة</span>
    <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
  </button>
  
  <AnimatePresence>
    {expanded && (
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        className="overflow-hidden"
      >
        <div className="px-5 pb-4 space-y-3">
          {firstTwoQuestions.map((q, i) => (
            <div key={i} className="p-3 rounded-xl bg-[var(--color-bg)] text-sm">
              <span className="text-[var(--color-muted)] ml-2">{i + 1}.</span>
              {q.text}
            </div>
          ))}
        </div>
      </motion.div>
    )}
  </AnimatePresence>
</motion.div>
```

**Difficulty colors:**
- سهل (easy): emerald/green
- متوسط (medium): amber/yellow
- صعب (hard): rose/red

**Data:** The preview data should come from the same query that loads question banks — just include: `title`, `questions(count)`, `questions(type)`, `difficulty`, and `questions(text).limit(2)`.

---

## TASK B: CERTIFICATE FIXES (Point 12)

### Fix B1: Corner Brackets Cut Off

**Problem:** The decorative corner brackets on the certificate border overflow outside the certificate container — they're clipped/cut.

**Fix:**
1. Find the certificate component: search `src/` for "certificate" or "شهادة"
2. The corner decorations need:
   - Container with `overflow: hidden` (or `visible` if intentional bleed)
   - Corner elements positioned with `absolute` inside the container
   - Proper inset values (e.g., `top-4 right-4` not `top-0 right-0`)
   - The parent must have `position: relative` and enough padding
3. Ensure corners are INSIDE the certificate boundary:
```jsx
<div className="relative p-8 border-2 border-[var(--color-primary)]/30 rounded-2xl overflow-hidden">
  {/* Corner decorations — INSIDE the border */}
  <div className="absolute top-3 right-3 w-8 h-8 border-t-2 border-r-2 
    border-[var(--color-primary)]/50 rounded-tr-sm" />
  <div className="absolute top-3 left-3 w-8 h-8 border-t-2 border-l-2 
    border-[var(--color-primary)]/50 rounded-tl-sm" />
  <div className="absolute bottom-3 right-3 w-8 h-8 border-b-2 border-r-2 
    border-[var(--color-primary)]/50 rounded-br-sm" />
  <div className="absolute bottom-3 left-3 w-8 h-8 border-b-2 border-l-2 
    border-[var(--color-primary)]/50 rounded-bl-sm" />
  
  {/* Certificate content */}
  ...
</div>
```

### Fix B2: QR Code Not Readable

**Problem:** QR code on the certificate has poor contrast — can't be scanned.

**Fix:**
1. QR code MUST have:
   - **White background** ALWAYS (regardless of certificate theme)
   - **White padding** of 8px around the QR
   - **Size:** 80×80px on mobile, 100×100px on desktop
   - **Black foreground** on white background (maximum contrast)
2. Implementation:
```jsx
<div className="bg-white p-2 rounded-lg inline-block">
  <QRCode 
    value={`https://fluentia-lms.vercel.app/verify/${certificateId}`}
    size={80}  // or 100 on desktop
    bgColor="#FFFFFF"
    fgColor="#000000"
    level="M"
    className="md:w-[100px] md:h-[100px]"
  />
</div>
```

### Fix B3: Create Public Verification Page

**Problem:** QR code needs to link to a public verification page.

**Create:** `/verify/:id` — a PUBLIC page (no login required)

**Route:** Add to router as public route (outside auth guard)

**Page content:**
```jsx
// src/pages/public/VerifyCertificate.jsx

const VerifyCertificate = () => {
  const { id } = useParams();
  const [cert, setCert] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchCert = async () => {
      // Use anon key — this is a public page
      const { data, error } = await supabase
        .from('certificates')
        .select('*, profiles(full_name)')
        .eq('id', id)
        .single();
      
      if (isMounted) {
        if (error || !data) setNotFound(true);
        else setCert(data);
        setLoading(false);
      }
    };
    fetchCert();
    return () => { isMounted = false; };
  }, [id]);

  if (loading) return <SkeletonLoader />;
  if (notFound) return <NotFoundState />;

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center p-6" dir="rtl">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Fluentia Logo */}
        <img src="/logo.svg" alt="Fluentia Academy" className="h-12 mx-auto" />
        
        {/* Verification badge */}
        <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/10 
          flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-emerald-500" />
        </div>
        
        <h1 className="text-2xl font-bold">شهادة موثّقة ✅</h1>
        
        <div className="p-6 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)]
          space-y-4 text-right">
          <div>
            <p className="text-xs text-[var(--color-muted)]">الاسم</p>
            <p className="text-lg font-semibold">{cert.profiles?.full_name}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--color-muted)]">المستوى المكتمل</p>
            <p className="font-medium">{cert.level_name}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--color-muted)]">تاريخ الإصدار</p>
            <p className="font-medium">{formatDate(cert.issued_at)}</p>
          </div>
        </div>
        
        <p className="text-sm text-[var(--color-muted)]">
          شهادة صادرة من أكاديمية طلاقة لتعليم اللغة الإنجليزية
        </p>
      </div>
    </div>
  );
};
```

**RLS for certificates table — allow public SELECT:**
```sql
CREATE POLICY "Public can view certificates for verification"
  ON certificates FOR SELECT
  TO anon
  USING (true);
```

---

## VERIFICATION

- [ ] Question bank cards show: title, count, types, difficulty, preview
- [ ] Preview section collapses/expands smoothly
- [ ] Certificate corner brackets are INSIDE the border (not cut off)
- [ ] QR code has white background + padding + readable contrast
- [ ] QR links to `/verify/{id}`
- [ ] Verification page loads WITHOUT login
- [ ] Shows student name, level, date, "شهادة موثّقة ✅"
- [ ] All works in dark + light mode
- [ ] All works on mobile Safari

---

## GIT

```bash
git add -A
git commit -m "feat: question bank preview cards + certificate corner fix + QR fix + verification page"
git push origin main
```
