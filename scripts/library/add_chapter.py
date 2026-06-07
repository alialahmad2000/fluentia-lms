#!/usr/bin/env python3
# Append ONE chapter to an existing Library novel (idempotent per chapter number).
# Usage: python3 add_chapter.py <chapter.json>  ->  writes /tmp/chapter.sql
# JSON shape:
# { "book_title": "The Silent Tide", "chapter_number": 2,
#   "title_en": "...", "title_ar": "...",
#   "paragraphs": [ [ {en, ar, d?, sp?}, ... ], ... ] }   # sp = speaker (narrator / character name)
import sys, json, uuid

def dq(s):
    return "$t$" + (s if s is not None else "").replace("\r", "") + "$t$"

ch = json.load(open(sys.argv[1], encoding="utf-8"))
title = ch["book_title"]
ch_id = str(uuid.uuid4())
wc = sum(len((s.get("en") or "").split()) for para in ch["paragraphs"] for s in para)
out = []
# idempotent: cascade-delete any prior copy of this chapter number, then insert fresh
out.append(f"DELETE FROM public.library_chapters c USING public.library_books b WHERE c.book_id=b.id AND b.title_en={dq(title)} AND c.chapter_number={int(ch['chapter_number'])};")
out.append(
    "INSERT INTO public.library_chapters (id,book_id,chapter_number,title_en,title_ar,word_count) "
    f"SELECT '{ch_id}', b.id, {int(ch['chapter_number'])}, {dq(ch.get('title_en'))}, {dq(ch.get('title_ar'))}, {wc} "
    f"FROM public.library_books b WHERE b.title_en={dq(title)};"
)
for pi, para in enumerate(ch["paragraphs"]):
    p_id = str(uuid.uuid4())
    out.append(f"INSERT INTO public.library_paragraphs (id,chapter_id,paragraph_index) VALUES ('{p_id}','{ch_id}',{pi});")
    for si, s in enumerate(para):
        d = "true" if s.get("d") else "false"
        sp = dq(s.get("sp")) if s.get("sp") else "NULL"
        out.append(
            "INSERT INTO public.library_sentence_pairs (paragraph_id,sentence_index,text_en,text_ar,is_dialogue,speaker) VALUES ("
            f"'{p_id}',{si},{dq(s.get('en'))},{dq(s.get('ar'))},{d},{sp});"
        )
# keep total_chapters in sync
out.append(f"UPDATE public.library_books SET total_chapters=(SELECT count(*) FROM public.library_chapters c WHERE c.book_id=public.library_books.id) WHERE title_en={dq(title)};")
open("/tmp/chapter.sql", "w", encoding="utf-8").write("\n".join(out))
print(f"chapter {ch['chapter_number']} '{ch.get('title_en')}': {len(out)} statements · ~{wc} words")
