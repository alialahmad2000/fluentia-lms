-- ═══════════════════════════════════════════════════════════
-- Migration 040: Seed Curriculum Data (correct, from PROMPT-1D)
-- 6 levels, 72 unit shells, 14 IELTS question types
-- ═══════════════════════════════════════════════════════════

-- ─── 1. Seed 6 Curriculum Levels ───
INSERT INTO curriculum_levels (level_number, name_ar, name_en, cefr, description_ar, description_en, color, passage_word_range, vocab_per_unit, mcq_choices, sentence_complexity, sort_order) VALUES
  (0, 'تأسيس', 'Foundation', 'Pre-A1', 'للمبتدئين تماماً — لا يعرفون شيئاً في الإنجليزية', 'Complete beginners — no prior English knowledge', '#854F0B', '200-300', 16, 3, 'Simple', 0),
  (1, 'أساسيات', 'Basics', 'A1', 'يفهم جمل بسيطة ويتواصل بشكل محدود', 'Understands simple sentences with limited communication', '#0F6E56', '300-400', 20, 3, 'Simple-Compound', 1),
  (2, 'تطوير', 'Development', 'A2', 'يفهم نصوص متوسطة ويعبّر عن آرائه', 'Understands medium texts and expresses opinions', '#185FA5', '400-500', 22, 4, 'Compound', 2),
  (3, 'طلاقة', 'Fluency', 'B1', 'يتحدث بثقة ويفهم نصوص أكاديمية', 'Speaks confidently and understands academic texts', '#534AB7', '500-600', 22, 4, 'Compound-Complex', 3),
  (4, 'تمكّن', 'Mastery', 'B2', 'يتعامل مع نصوص معقدة ويكتب مقالات', 'Handles complex texts and writes essays', '#993556', '700-1000', 24, 4, 'Complex', 4),
  (5, 'احتراف', 'Proficiency', 'C1', 'مستوى شبه أصلي — يفهم كل شيء تقريباً', 'Near-native level — understands almost everything', '#993C1D', '1000-1200', 26, 4, 'Academic-Complex', 5)
ON CONFLICT (level_number) DO UPDATE SET
  name_ar = EXCLUDED.name_ar, name_en = EXCLUDED.name_en, cefr = EXCLUDED.cefr,
  description_ar = EXCLUDED.description_ar, description_en = EXCLUDED.description_en,
  color = EXCLUDED.color, passage_word_range = EXCLUDED.passage_word_range,
  vocab_per_unit = EXCLUDED.vocab_per_unit, mcq_choices = EXCLUDED.mcq_choices,
  sentence_complexity = EXCLUDED.sentence_complexity, sort_order = EXCLUDED.sort_order;

-- ─── 2. Seed 72 Unit Shells (12 per level) ───

-- Foundation (Pre-A1, level_number=0)
INSERT INTO curriculum_units (level_id, unit_number, theme_en, theme_ar, sort_order) VALUES
  ((SELECT id FROM curriculum_levels WHERE level_number = 0), 1, 'Daily Life', 'الحياة اليومية', 1),
  ((SELECT id FROM curriculum_levels WHERE level_number = 0), 2, 'Food & Cooking', 'الطعام والطبخ', 2),
  ((SELECT id FROM curriculum_levels WHERE level_number = 0), 3, 'My City', 'مدينتي', 3),
  ((SELECT id FROM curriculum_levels WHERE level_number = 0), 4, 'Animals Around Us', 'الحيوانات من حولنا', 4),
  ((SELECT id FROM curriculum_levels WHERE level_number = 0), 5, 'Weather & Seasons', 'الطقس والفصول', 5),
  ((SELECT id FROM curriculum_levels WHERE level_number = 0), 6, 'Family & Friends', 'العائلة والأصدقاء', 6),
  ((SELECT id FROM curriculum_levels WHERE level_number = 0), 7, 'Shopping & Money', 'التسوق والمال', 7),
  ((SELECT id FROM curriculum_levels WHERE level_number = 0), 8, 'Health & Body', 'الصحة والجسم', 8),
  ((SELECT id FROM curriculum_levels WHERE level_number = 0), 9, 'Hobbies & Free Time', 'الهوايات ووقت الفراغ', 9),
  ((SELECT id FROM curriculum_levels WHERE level_number = 0), 10, 'Travel Basics', 'أساسيات السفر', 10),
  ((SELECT id FROM curriculum_levels WHERE level_number = 0), 11, 'Technology Today', 'التقنية اليوم', 11),
  ((SELECT id FROM curriculum_levels WHERE level_number = 0), 12, 'Jobs & Careers', 'الوظائف والمهن', 12);

-- Level 1 (A1, level_number=1)
INSERT INTO curriculum_units (level_id, unit_number, theme_en, theme_ar, sort_order) VALUES
  ((SELECT id FROM curriculum_levels WHERE level_number = 1), 1, 'Cultural Festivals', 'المهرجانات الثقافية', 1),
  ((SELECT id FROM curriculum_levels WHERE level_number = 1), 2, 'Ocean Life', 'الحياة في المحيط', 2),
  ((SELECT id FROM curriculum_levels WHERE level_number = 1), 3, 'Space Exploration', 'استكشاف الفضاء', 3),
  ((SELECT id FROM curriculum_levels WHERE level_number = 1), 4, 'Music & Art', 'الموسيقى والفن', 4),
  ((SELECT id FROM curriculum_levels WHERE level_number = 1), 5, 'Famous Places', 'أماكن مشهورة', 5),
  ((SELECT id FROM curriculum_levels WHERE level_number = 1), 6, 'Inventions', 'الاختراعات', 6),
  ((SELECT id FROM curriculum_levels WHERE level_number = 1), 7, 'Sports Stars', 'نجوم الرياضة', 7),
  ((SELECT id FROM curriculum_levels WHERE level_number = 1), 8, 'Ancient Civilizations', 'الحضارات القديمة', 8),
  ((SELECT id FROM curriculum_levels WHERE level_number = 1), 9, 'Photography', 'التصوير الفوتوغرافي', 9),
  ((SELECT id FROM curriculum_levels WHERE level_number = 1), 10, 'World Cuisines', 'مطابخ العالم', 10),
  ((SELECT id FROM curriculum_levels WHERE level_number = 1), 11, 'Social Media', 'وسائل التواصل الاجتماعي', 11),
  ((SELECT id FROM curriculum_levels WHERE level_number = 1), 12, 'Green Living', 'الحياة الخضراء', 12);

-- Level 2 (A2, level_number=2)
INSERT INTO curriculum_units (level_id, unit_number, theme_en, theme_ar, sort_order) VALUES
  ((SELECT id FROM curriculum_levels WHERE level_number = 2), 1, 'Brain & Memory', 'الدماغ والذاكرة', 1),
  ((SELECT id FROM curriculum_levels WHERE level_number = 2), 2, 'Endangered Species', 'الأنواع المهددة بالانقراض', 2),
  ((SELECT id FROM curriculum_levels WHERE level_number = 2), 3, 'Extreme Weather', 'الطقس المتطرف', 3),
  ((SELECT id FROM curriculum_levels WHERE level_number = 2), 4, 'Fashion & Identity', 'الموضة والهوية', 4),
  ((SELECT id FROM curriculum_levels WHERE level_number = 2), 5, 'Hidden History', 'التاريخ المخفي', 5),
  ((SELECT id FROM curriculum_levels WHERE level_number = 2), 6, 'Future Cities', 'مدن المستقبل', 6),
  ((SELECT id FROM curriculum_levels WHERE level_number = 2), 7, 'Digital Detox', 'التخلص من الإدمان الرقمي', 7),
  ((SELECT id FROM curriculum_levels WHERE level_number = 2), 8, 'Mountain Adventures', 'مغامرات الجبال', 8),
  ((SELECT id FROM curriculum_levels WHERE level_number = 2), 9, 'Film & Cinema', 'السينما والأفلام', 9),
  ((SELECT id FROM curriculum_levels WHERE level_number = 2), 10, 'Water Crisis', 'أزمة المياه', 10),
  ((SELECT id FROM curriculum_levels WHERE level_number = 2), 11, 'Street Art', 'فن الشارع', 11),
  ((SELECT id FROM curriculum_levels WHERE level_number = 2), 12, 'Remarkable Journeys', 'رحلات استثنائية', 12);

-- Level 3 (B1, level_number=3)
INSERT INTO curriculum_units (level_id, unit_number, theme_en, theme_ar, sort_order) VALUES
  ((SELECT id FROM curriculum_levels WHERE level_number = 3), 1, 'Artificial Intelligence', 'الذكاء الاصطناعي', 1),
  ((SELECT id FROM curriculum_levels WHERE level_number = 3), 2, 'Coral Reefs', 'الشعاب المرجانية', 2),
  ((SELECT id FROM curriculum_levels WHERE level_number = 3), 3, 'Earthquake Science', 'علم الزلازل', 3),
  ((SELECT id FROM curriculum_levels WHERE level_number = 3), 4, 'Global Coffee Culture', 'ثقافة القهوة حول العالم', 4),
  ((SELECT id FROM curriculum_levels WHERE level_number = 3), 5, 'Renewable Energy', 'الطاقة المتجددة', 5),
  ((SELECT id FROM curriculum_levels WHERE level_number = 3), 6, 'Virtual Reality', 'الواقع الافتراضي', 6),
  ((SELECT id FROM curriculum_levels WHERE level_number = 3), 7, 'Psychology of Fear', 'علم نفس الخوف', 7),
  ((SELECT id FROM curriculum_levels WHERE level_number = 3), 8, 'Ancient Engineering', 'الهندسة القديمة', 8),
  ((SELECT id FROM curriculum_levels WHERE level_number = 3), 9, 'Genetic Science', 'علم الجينات', 9),
  ((SELECT id FROM curriculum_levels WHERE level_number = 3), 10, 'Urban Farming', 'الزراعة الحضرية', 10),
  ((SELECT id FROM curriculum_levels WHERE level_number = 3), 11, 'Digital Privacy', 'الخصوصية الرقمية', 11),
  ((SELECT id FROM curriculum_levels WHERE level_number = 3), 12, 'Mars Exploration', 'استكشاف المريخ', 12);

-- Level 4 (B2, level_number=4)
INSERT INTO curriculum_units (level_id, unit_number, theme_en, theme_ar, sort_order) VALUES
  ((SELECT id FROM curriculum_levels WHERE level_number = 4), 1, 'Bioethics', 'أخلاقيات علم الأحياء', 1),
  ((SELECT id FROM curriculum_levels WHERE level_number = 4), 2, 'Deep Ocean Discovery', 'اكتشاف أعماق المحيط', 2),
  ((SELECT id FROM curriculum_levels WHERE level_number = 4), 3, 'Food Security', 'الأمن الغذائي', 3),
  ((SELECT id FROM curriculum_levels WHERE level_number = 4), 4, 'Biomimicry Design', 'تصميم محاكاة الطبيعة', 4),
  ((SELECT id FROM curriculum_levels WHERE level_number = 4), 5, 'Human Migration', 'الهجرة البشرية', 5),
  ((SELECT id FROM curriculum_levels WHERE level_number = 4), 6, 'Cryptocurrency', 'العملات الرقمية', 6),
  ((SELECT id FROM curriculum_levels WHERE level_number = 4), 7, 'Crowd Psychology', 'علم نفس الجماهير', 7),
  ((SELECT id FROM curriculum_levels WHERE level_number = 4), 8, 'Forensic Science', 'علم الطب الشرعي', 8),
  ((SELECT id FROM curriculum_levels WHERE level_number = 4), 9, 'Archaeological Mysteries', 'ألغاز أثرية', 9),
  ((SELECT id FROM curriculum_levels WHERE level_number = 4), 10, 'Longevity Science', 'علم طول العمر', 10),
  ((SELECT id FROM curriculum_levels WHERE level_number = 4), 11, 'Sustainable Architecture', 'العمارة المستدامة', 11),
  ((SELECT id FROM curriculum_levels WHERE level_number = 4), 12, 'Exoplanet Hunting', 'البحث عن كواكب خارجية', 12);

-- Level 5 (C1, level_number=5)
INSERT INTO curriculum_units (level_id, unit_number, theme_en, theme_ar, sort_order) VALUES
  ((SELECT id FROM curriculum_levels WHERE level_number = 5), 1, 'Civilization Collapse', 'انهيار الحضارات', 1),
  ((SELECT id FROM curriculum_levels WHERE level_number = 5), 2, 'Extreme Achievement', 'الإنجاز المتطرف', 2),
  ((SELECT id FROM curriculum_levels WHERE level_number = 5), 3, 'Scientific Skepticism', 'الشك العلمي', 3),
  ((SELECT id FROM curriculum_levels WHERE level_number = 5), 4, 'Climate Adaptation', 'التكيف المناخي', 4),
  ((SELECT id FROM curriculum_levels WHERE level_number = 5), 5, 'Nuclear Energy Debate', 'جدل الطاقة النووية', 5),
  ((SELECT id FROM curriculum_levels WHERE level_number = 5), 6, 'Biodiversity Crisis', 'أزمة التنوع البيولوجي', 6),
  ((SELECT id FROM curriculum_levels WHERE level_number = 5), 7, 'Neuroscience Frontiers', 'آفاق علم الأعصاب', 7),
  ((SELECT id FROM curriculum_levels WHERE level_number = 5), 8, 'Swarm Intelligence', 'ذكاء الأسراب', 8),
  ((SELECT id FROM curriculum_levels WHERE level_number = 5), 9, 'Creative Genius', 'العبقرية الإبداعية', 9),
  ((SELECT id FROM curriculum_levels WHERE level_number = 5), 10, 'Quantum Discovery', 'اكتشافات الكم', 10),
  ((SELECT id FROM curriculum_levels WHERE level_number = 5), 11, 'Cross-Cultural Exchange', 'التبادل الثقافي', 11),
  ((SELECT id FROM curriculum_levels WHERE level_number = 5), 12, 'Resource Economics', 'اقتصاديات الموارد', 12);

-- ─── 3. Seed 14 IELTS Reading Question Types ───
INSERT INTO ielts_reading_skills (question_type, name_ar, name_en, explanation_ar, strategy_steps, practice_items, sort_order) VALUES
  ('multiple_choice', 'اختيار من متعدد', 'Multiple Choice', 'اختر الإجابة الصحيحة من بين عدة خيارات. قد يكون السؤال عن الفكرة الرئيسية أو تفاصيل محددة.', '[]', '[]', 1),
  ('true_false_not_given', 'صح / خطأ / غير مذكور', 'True/False/Not Given', 'حدد إذا كانت المعلومة صحيحة أو خاطئة أو غير مذكورة في النص. انتبه: "غير مذكور" يعني أن النص لم يتحدث عن هذه المعلومة أصلاً.', '[]', '[]', 2),
  ('yes_no_not_given', 'نعم / لا / غير مذكور', 'Yes/No/Not Given', 'مشابه لـ True/False/Not Given لكن يركز على آراء الكاتب وليس الحقائق.', '[]', '[]', 3),
  ('matching_headings', 'مطابقة العناوين', 'Matching Headings', 'اختر العنوان المناسب لكل فقرة من قائمة العناوين. اقرأ الفقرة كاملة وحدد الفكرة الرئيسية.', '[]', '[]', 4),
  ('matching_information', 'مطابقة المعلومات', 'Matching Information', 'حدد أي فقرة تحتوي على المعلومة المطلوبة. قد تُستخدم فقرة واحدة أكثر من مرة.', '[]', '[]', 5),
  ('matching_features', 'مطابقة السمات', 'Matching Features', 'اربط بين قائمة من العبارات وقائمة من الخيارات (أشخاص، تواريخ، نظريات...).', '[]', '[]', 6),
  ('matching_sentence_endings', 'مطابقة نهايات الجمل', 'Matching Sentence Endings', 'أكمل الجملة باختيار النهاية الصحيحة من القائمة.', '[]', '[]', 7),
  ('sentence_completion', 'إكمال الجمل', 'Sentence Completion', 'أكمل الجملة بكلمات من النص. التزم بعدد الكلمات المطلوب.', '[]', '[]', 8),
  ('summary_completion', 'إكمال الملخص', 'Summary Completion', 'أكمل الملخص بكلمات من النص أو من قائمة كلمات.', '[]', '[]', 9),
  ('note_table_flowchart', 'إكمال ملاحظات / جدول / مخطط', 'Note/Table/Flow-chart Completion', 'أكمل الفراغات في ملاحظات أو جدول أو مخطط تدفق باستخدام كلمات من النص.', '[]', '[]', 10),
  ('diagram_label', 'تسمية الرسم البياني', 'Diagram Label Completion', 'أكمل تسميات الرسم البياني أو الخريطة بكلمات من النص.', '[]', '[]', 11),
  ('short_answer', 'إجابة قصيرة', 'Short Answer Questions', 'أجب عن الأسئلة بكلمات قليلة من النص. التزم بعدد الكلمات المحدد.', '[]', '[]', 12),
  ('list_selection', 'اختيار من قائمة', 'List Selection', 'اختر العدد المطلوب من الإجابات من قائمة الخيارات.', '[]', '[]', 13),
  ('paragraph_matching', 'مطابقة الفقرات', 'Paragraph Matching', 'حدد أي فقرة تحتوي على معلومة أو رأي محدد.', '[]', '[]', 14)
ON CONFLICT (question_type) DO UPDATE SET
  name_ar = EXCLUDED.name_ar, name_en = EXCLUDED.name_en,
  explanation_ar = EXCLUDED.explanation_ar, sort_order = EXCLUDED.sort_order;
