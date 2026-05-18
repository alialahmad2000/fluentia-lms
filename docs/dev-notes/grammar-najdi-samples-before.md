# Grammar Najdi — Cache Samples (Before Polish, 2026-05-18)

All 5 rows in `grammar_explanation_cache` are **old HTML format** (`explanation_md` IS NULL —
the `20260513000000` migration was not yet applied at sample time). Every live explanation shown
to students was re-generated fresh from Claude on each request (cache bypassed because
`explanation_md` column did not exist in DB).

---

## Sample 1

**Question:** Change to a question: The ancient library had 700,000 books. (Use how many)  
**Correct answer:** How many books did the ancient library have?  
**Hit count:** 2 · **Created:** 2026-05-16

**explanation_html (raw excerpt):**
```html
<p><strong>سبب الإجابة الصحيحة:</strong></p>
<p>عند استخدام <strong>How many</strong> لتحويل جملة ماضية إلى سؤال، نحتاج:</p>
<ul>
  <li>الفعل المساعد <code>did</code> في الزمن الماضي</li>
  <li>تحويل الفعل ال...</li>
</ul>
```

**tldr_ar:** عند تحويل الجملة لسؤال، نحتاج فعل مساعد مثل did ونعكس ترتيب...

---

## Sample 2

**Question:** Reorder: been / protecting / have / conservationists / coral / the / reefs  
**Correct answer:** Conservationists have been protecting the coral reefs.  
**Hit count:** 2 · **Created:** 2026-05-16

**explanation_html (raw excerpt):**
```html
<p><strong>السبب الصحيح:</strong> في جملة <strong>Present Perfect Continuous</strong>،
الترتيب الثابت هو:</p>
<ul>
  <li><strong>الفاعل</strong> (Subject) أولاً</li>
  <li><strong>have/has</strong> ثانياً</li>
  ...
</ul>
```

---

## Sample 3

**Question:** Change to negative: The footballer has some injuries.  
**Correct answer:** The footballer doesn't have any injuries.  
**Hit count:** 1 · **Created:** 2026-05-13

**explanation_html (raw excerpt):**
```html
<p><strong>السبب في الإجابة الصحيحة:</strong></p>
<p>لتحويل الجملة للنفي، نحتاج عنصرين أساسيين:</p>
<ul>
  <li><strong>أداة النفي:</strong> <code>doesn't</code> (لا يملك)</li>
  <li><strong>تغيير some إلى any...</strong></li>
</ul>
```

---

## Observations

- All old rows: flat HTML, no section structure, dense paragraphs
- No `## الفكرة الأساسية` / `## القاعدة` separators → reader must scan prose to find the rule
- Single large wall of text → exactly the "dense" complaint
- After applying migration + clearing cache, all rows will regenerate in 6-section Markdown via `NajdiExplanationView`
