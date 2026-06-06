#!/usr/bin/env python3
# Build idempotent seed SQL for one Library novel from a structured JSON.
# Usage: python3 build_seed_sql.py <novel.json>  ->  writes /tmp/seed.sql
# JSON shape:
# { "book": {title_en,title_ar,synopsis_en,synopsis_ar,theme,cefr,level_number,
#            cover_data,author_label,sort_order,status},
#   "chapters": [ {chapter_number,title_en,title_ar,
#                  paragraphs: [ [ {en, ar, d?}, ... ], ... ]} ] }
import sys, json, uuid

def dq(s):                       # dollar-quoted literal, safe for quotes/newlines
    return "$t$" + (s if s is not None else "").replace("\r", "") + "$t$"

novel = json.load(open(sys.argv[1], encoding="utf-8"))
b = novel["book"]
book_id = str(uuid.uuid4())
out = []
# idempotent: cascade-delete any prior copy of this title, then insert fresh
out.append(f"DELETE FROM public.library_books WHERE title_en = {dq(b['title_en'])};")
cover = json.dumps(b.get("cover_data", {}), ensure_ascii=False)
out.append(
    "INSERT INTO public.library_books "
    "(id,title_en,title_ar,synopsis_en,synopsis_ar,theme,cefr,level_number,cover_data,author_label,total_chapters,status,sort_order) VALUES ("
    f"'{book_id}',{dq(b['title_en'])},{dq(b.get('title_ar'))},{dq(b.get('synopsis_en'))},{dq(b.get('synopsis_ar'))},"
    f"{dq(b['theme'])},{dq(b['cefr'])},{int(b['level_number'])},{dq(cover)}::jsonb,{dq(b.get('author_label'))},"
    f"{len(novel['chapters'])},{dq(b.get('status','published'))},{int(b.get('sort_order',0))});"
)
for ch in novel["chapters"]:
    ch_id = str(uuid.uuid4())
    wc = sum(len((s.get("en") or "").split()) for para in ch["paragraphs"] for s in para)
    out.append(
        "INSERT INTO public.library_chapters (id,book_id,chapter_number,title_en,title_ar,word_count) VALUES ("
        f"'{ch_id}','{book_id}',{int(ch['chapter_number'])},{dq(ch.get('title_en'))},{dq(ch.get('title_ar'))},{wc});"
    )
    for pi, para in enumerate(ch["paragraphs"]):
        p_id = str(uuid.uuid4())
        out.append(f"INSERT INTO public.library_paragraphs (id,chapter_id,paragraph_index) VALUES ('{p_id}','{ch_id}',{pi});")
        for si, s in enumerate(para):
            d = "true" if s.get("d") else "false"
            out.append(
                "INSERT INTO public.library_sentence_pairs (paragraph_id,sentence_index,text_en,text_ar,is_dialogue) VALUES ("
                f"'{p_id}',{si},{dq(s.get('en'))},{dq(s.get('ar'))},{d});"
            )
open("/tmp/seed.sql", "w", encoding="utf-8").write("\n".join(out))
print(f"built {len(out)} statements · book_id={book_id} · chapters={len(novel['chapters'])}")
