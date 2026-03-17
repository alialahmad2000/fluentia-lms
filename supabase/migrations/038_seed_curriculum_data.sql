-- ═══════════════════════════════════════════════════════════
-- Migration 038: Seed Curriculum Data
-- 6 levels (updated), 72 unit shells, 14 IELTS question types
-- ═══════════════════════════════════════════════════════════

-- ─── 1. Add missing columns to curriculum_levels ───
ALTER TABLE curriculum_levels ADD COLUMN IF NOT EXISTS level_number INTEGER;
ALTER TABLE curriculum_levels ADD COLUMN IF NOT EXISTS color TEXT;
ALTER TABLE curriculum_levels ADD COLUMN IF NOT EXISTS passage_word_range TEXT;
ALTER TABLE curriculum_levels ADD COLUMN IF NOT EXISTS vocab_per_unit INTEGER;
ALTER TABLE curriculum_levels ADD COLUMN IF NOT EXISTS mcq_choices INTEGER;
ALTER TABLE curriculum_levels ADD COLUMN IF NOT EXISTS sentence_complexity TEXT;
ALTER TABLE curriculum_levels ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Update existing 6 levels with new data (id 1-6 maps to level_number 0-5)
UPDATE curriculum_levels SET
  level_number = 0, name_ar = 'تأسيس', name_en = 'Foundation', cefr = 'Pre-A1',
  description_ar = 'للمبتدئين تماماً — لا يعرفون شيئاً في الإنجليزية',
  description_en = 'Complete beginners — no prior English knowledge',
  color = '#854F0B', passage_word_range = '200-300', vocab_per_unit = 16,
  mcq_choices = 3, sentence_complexity = 'Simple', sort_order = 0
WHERE id = 1;

UPDATE curriculum_levels SET
  level_number = 1, name_ar = 'أساسيات', name_en = 'Basics', cefr = 'A1',
  description_ar = 'يفهم جمل بسيطة ويتواصل بشكل محدود',
  description_en = 'Understands simple sentences with limited communication',
  color = '#0F6E56', passage_word_range = '300-400', vocab_per_unit = 20,
  mcq_choices = 3, sentence_complexity = 'Simple-Compound', sort_order = 1
WHERE id = 2;

UPDATE curriculum_levels SET
  level_number = 2, name_ar = 'تطوير', name_en = 'Development', cefr = 'A2',
  description_ar = 'يفهم نصوص متوسطة ويعبّر عن آرائه',
  description_en = 'Understands medium texts and expresses opinions',
  color = '#185FA5', passage_word_range = '400-500', vocab_per_unit = 22,
  mcq_choices = 4, sentence_complexity = 'Compound', sort_order = 2
WHERE id = 3;

UPDATE curriculum_levels SET
  level_number = 3, name_ar = 'طلاقة', name_en = 'Fluency', cefr = 'B1',
  description_ar = 'يتحدث بثقة ويفهم نصوص أكاديمية',
  description_en = 'Speaks confidently and understands academic texts',
  color = '#534AB7', passage_word_range = '500-600', vocab_per_unit = 22,
  mcq_choices = 4, sentence_complexity = 'Compound-Complex', sort_order = 3
WHERE id = 4;

UPDATE curriculum_levels SET
  level_number = 4, name_ar = 'تمكّن', name_en = 'Mastery', cefr = 'B2',
  description_ar = 'يتعامل مع نصوص معقدة ويكتب مقالات',
  description_en = 'Handles complex texts and writes essays',
  color = '#993556', passage_word_range = '700-1000', vocab_per_unit = 24,
  mcq_choices = 4, sentence_complexity = 'Complex', sort_order = 4
WHERE id = 5;

UPDATE curriculum_levels SET
  level_number = 5, name_ar = 'احتراف', name_en = 'Proficiency', cefr = 'C1',
  description_ar = 'مستوى شبه أصلي — يفهم كل شيء تقريباً',
  description_en = 'Near-native level — understands almost everything',
  color = '#993C1D', passage_word_range = '1000-1200', vocab_per_unit = 26,
  mcq_choices = 4, sentence_complexity = 'Academic-Complex', sort_order = 5
WHERE id = 6;

-- ─── 2. Seed 72 Unit Shells (12 per level) ───
-- Uses ON CONFLICT to update existing units (027 seeded 4 per level for levels 1-5)

-- Foundation (level=1, Pre-A1)
INSERT INTO curriculum_units (level, unit_number, title_en, title_ar, theme_en, theme_ar, cefr, description_en, description_ar) VALUES
  (1, 1, 'Daily Life', 'الحياة اليومية', 'Daily Life', 'الحياة اليومية', 'Pre-A1', 'Everyday activities and routines', 'الأنشطة والروتين اليومي'),
  (1, 2, 'Food & Cooking', 'الطعام والطبخ', 'Food & Cooking', 'الطعام والطبخ', 'Pre-A1', 'Food vocabulary and simple recipes', 'مفردات الطعام والوصفات البسيطة'),
  (1, 3, 'My City', 'مدينتي', 'My City', 'مدينتي', 'Pre-A1', 'Places and directions in a city', 'الأماكن والاتجاهات في المدينة'),
  (1, 4, 'Animals Around Us', 'الحيوانات من حولنا', 'Animals Around Us', 'الحيوانات من حولنا', 'Pre-A1', 'Common animals and their habitats', 'الحيوانات الشائعة وموائلها'),
  (1, 5, 'Weather & Seasons', 'الطقس والفصول', 'Weather & Seasons', 'الطقس والفصول', 'Pre-A1', 'Weather patterns and seasonal activities', 'أنماط الطقس والأنشطة الموسمية'),
  (1, 6, 'Family & Friends', 'العائلة والأصدقاء', 'Family & Friends', 'العائلة والأصدقاء', 'Pre-A1', 'Family relationships and friendships', 'العلاقات العائلية والصداقات'),
  (1, 7, 'Shopping & Money', 'التسوق والمال', 'Shopping & Money', 'التسوق والمال', 'Pre-A1', 'Buying things and handling money', 'شراء الأشياء والتعامل مع المال'),
  (1, 8, 'Health & Body', 'الصحة والجسم', 'Health & Body', 'الصحة والجسم', 'Pre-A1', 'Body parts and basic health', 'أجزاء الجسم والصحة الأساسية'),
  (1, 9, 'Hobbies & Free Time', 'الهوايات ووقت الفراغ', 'Hobbies & Free Time', 'الهوايات ووقت الفراغ', 'Pre-A1', 'Leisure activities and hobbies', 'أنشطة الترفيه والهوايات'),
  (1, 10, 'Travel Basics', 'أساسيات السفر', 'Travel Basics', 'أساسيات السفر', 'Pre-A1', 'Simple travel vocabulary and situations', 'مفردات السفر البسيطة والمواقف'),
  (1, 11, 'Technology Today', 'التقنية اليوم', 'Technology Today', 'التقنية اليوم', 'Pre-A1', 'Basic technology and devices', 'التقنية الأساسية والأجهزة'),
  (1, 12, 'Jobs & Careers', 'الوظائف والمهن', 'Jobs & Careers', 'الوظائف والمهن', 'Pre-A1', 'Common jobs and workplaces', 'الوظائف الشائعة وأماكن العمل')
ON CONFLICT (level, unit_number) DO UPDATE SET
  title_en = EXCLUDED.title_en, title_ar = EXCLUDED.title_ar,
  theme_en = EXCLUDED.theme_en, theme_ar = EXCLUDED.theme_ar,
  cefr = EXCLUDED.cefr, description_en = EXCLUDED.description_en, description_ar = EXCLUDED.description_ar;

-- Level 1 (level=2, A1)
INSERT INTO curriculum_units (level, unit_number, title_en, title_ar, theme_en, theme_ar, cefr, description_en, description_ar) VALUES
  (2, 1, 'Cultural Festivals', 'المهرجانات الثقافية', 'Cultural Festivals', 'المهرجانات الثقافية', 'A1', 'Celebrations and festivals around the world', 'الاحتفالات والمهرجانات حول العالم'),
  (2, 2, 'Ocean Life', 'الحياة في المحيط', 'Ocean Life', 'الحياة في المحيط', 'A1', 'Marine creatures and ocean ecosystems', 'الكائنات البحرية والأنظمة البيئية'),
  (2, 3, 'Space Exploration', 'استكشاف الفضاء', 'Space Exploration', 'استكشاف الفضاء', 'A1', 'Planets, astronauts, and space missions', 'الكواكب ورواد الفضاء والمهمات الفضائية'),
  (2, 4, 'Music & Cinema', 'الموسيقى والسينما', 'Music & Cinema', 'الموسيقى والسينما', 'A1', 'Music genres and the film industry', 'أنواع الموسيقى وصناعة الأفلام'),
  (2, 5, 'Ancient Wonders', 'عجائب قديمة', 'Ancient Wonders', 'عجائب قديمة', 'A1', 'Historical monuments and ancient civilizations', 'المعالم التاريخية والحضارات القديمة'),
  (2, 6, 'Inventions & Innovation', 'الاختراعات والابتكار', 'Inventions & Innovation', 'الاختراعات والابتكار', 'A1', 'Famous inventions that changed the world', 'الاختراعات الشهيرة التي غيّرت العالم'),
  (2, 7, 'Desert Wildlife', 'حياة الصحراء البرية', 'Desert Wildlife', 'حياة الصحراء البرية', 'A1', 'Animals and plants that survive in deserts', 'الحيوانات والنباتات التي تعيش في الصحراء'),
  (2, 8, 'Sports Champions', 'أبطال الرياضة', 'Sports Champions', 'أبطال الرياضة', 'A1', 'Inspiring athletes and their achievements', 'الرياضيون الملهمون وإنجازاتهم'),
  (2, 9, 'Photography & Art', 'التصوير والفن', 'Photography & Art', 'التصوير والفن', 'A1', 'Visual arts and creative expression', 'الفنون البصرية والتعبير الإبداعي'),
  (2, 10, 'Water Crisis', 'أزمة المياه', 'Water Crisis', 'أزمة المياه', 'A1', 'Water scarcity and conservation efforts', 'شح المياه وجهود الحفاظ عليها'),
  (2, 11, 'Street Art', 'فن الشارع', 'Street Art', 'فن الشارع', 'A1', 'Graffiti, murals, and public art', 'الغرافيتي والجداريات والفن العام'),
  (2, 12, 'Remarkable Journeys', 'رحلات استثنائية', 'Remarkable Journeys', 'رحلات استثنائية', 'A1', 'Inspiring travel stories and adventures', 'قصص سفر ومغامرات ملهمة')
ON CONFLICT (level, unit_number) DO UPDATE SET
  title_en = EXCLUDED.title_en, title_ar = EXCLUDED.title_ar,
  theme_en = EXCLUDED.theme_en, theme_ar = EXCLUDED.theme_ar,
  cefr = EXCLUDED.cefr, description_en = EXCLUDED.description_en, description_ar = EXCLUDED.description_ar;

-- Level 2 (level=3, A2)
INSERT INTO curriculum_units (level, unit_number, title_en, title_ar, theme_en, theme_ar, cefr, description_en, description_ar) VALUES
  (3, 1, 'Volcanic Wonders', 'عجائب البراكين', 'Volcanic Wonders', 'عجائب البراكين', 'A2', 'Volcanoes and their impact on Earth', 'البراكين وتأثيرها على الأرض'),
  (3, 2, 'Modern Architecture', 'العمارة الحديثة', 'Modern Architecture', 'العمارة الحديثة', 'A2', 'Innovative buildings and design concepts', 'المباني المبتكرة ومفاهيم التصميم'),
  (3, 3, 'The Science of Sleep', 'علم النوم', 'The Science of Sleep', 'علم النوم', 'A2', 'Sleep patterns, dreams, and health effects', 'أنماط النوم والأحلام والتأثيرات الصحية'),
  (3, 4, 'Endangered Species', 'الأنواع المهددة', 'Endangered Species', 'الأنواع المهددة', 'A2', 'Animals at risk and conservation efforts', 'الحيوانات المهددة وجهود الحماية'),
  (3, 5, 'World Cuisines', 'المطابخ العالمية', 'World Cuisines', 'المطابخ العالمية', 'A2', 'Food traditions from different cultures', 'تقاليد الطعام من ثقافات مختلفة'),
  (3, 6, 'Social Media Impact', 'تأثير وسائل التواصل', 'Social Media Impact', 'تأثير وسائل التواصل', 'A2', 'How social media shapes our lives', 'كيف تشكّل وسائل التواصل حياتنا'),
  (3, 7, 'Ancient Trade Routes', 'طرق التجارة القديمة', 'Ancient Trade Routes', 'طرق التجارة القديمة', 'A2', 'The Silk Road and historic trade networks', 'طريق الحرير وشبكات التجارة التاريخية'),
  (3, 8, 'Extreme Weather', 'الطقس المتطرف', 'Extreme Weather', 'الطقس المتطرف', 'A2', 'Storms, floods, and climate events', 'العواصف والفيضانات والأحداث المناخية'),
  (3, 9, 'Human Memory', 'الذاكرة البشرية', 'Human Memory', 'الذاكرة البشرية', 'A2', 'How memory works and techniques to improve it', 'كيف تعمل الذاكرة وتقنيات تحسينها'),
  (3, 10, 'Recycling & Waste', 'إعادة التدوير والنفايات', 'Recycling & Waste', 'إعادة التدوير والنفايات', 'A2', 'Waste management and sustainability', 'إدارة النفايات والاستدامة'),
  (3, 11, 'Film & Storytelling', 'السينما وفن السرد', 'Film & Storytelling', 'السينما وفن السرد', 'A2', 'The art of cinema and narrative techniques', 'فن السينما وتقنيات السرد'),
  (3, 12, 'Robot Revolution', 'ثورة الروبوتات', 'Robot Revolution', 'ثورة الروبوتات', 'A2', 'Robots in daily life and industry', 'الروبوتات في الحياة اليومية والصناعة')
ON CONFLICT (level, unit_number) DO UPDATE SET
  title_en = EXCLUDED.title_en, title_ar = EXCLUDED.title_ar,
  theme_en = EXCLUDED.theme_en, theme_ar = EXCLUDED.theme_ar,
  cefr = EXCLUDED.cefr, description_en = EXCLUDED.description_en, description_ar = EXCLUDED.description_ar;

-- Level 3 (level=4, B1)
INSERT INTO curriculum_units (level, unit_number, title_en, title_ar, theme_en, theme_ar, cefr, description_en, description_ar) VALUES
  (4, 1, 'Artificial Intelligence', 'الذكاء الاصطناعي', 'Artificial Intelligence', 'الذكاء الاصطناعي', 'B1', 'AI technology and its impact on society', 'تقنية الذكاء الاصطناعي وتأثيرها على المجتمع'),
  (4, 2, 'Coral Reefs', 'الشعاب المرجانية', 'Coral Reefs', 'الشعاب المرجانية', 'B1', 'Marine ecosystems and reef conservation', 'الأنظمة البيئية البحرية وحماية الشعاب'),
  (4, 3, 'Earthquake Science', 'علم الزلازل', 'Earthquake Science', 'علم الزلازل', 'B1', 'Seismology and earthquake preparedness', 'علم الزلازل والاستعداد لها'),
  (4, 4, 'Global Coffee Culture', 'ثقافة القهوة حول العالم', 'Global Coffee Culture', 'ثقافة القهوة حول العالم', 'B1', 'Coffee history, production, and traditions', 'تاريخ القهوة وإنتاجها وتقاليدها'),
  (4, 5, 'Renewable Energy', 'الطاقة المتجددة', 'Renewable Energy', 'الطاقة المتجددة', 'B1', 'Solar, wind, and sustainable energy sources', 'الطاقة الشمسية والرياح ومصادر الطاقة المستدامة'),
  (4, 6, 'Virtual Reality', 'الواقع الافتراضي', 'Virtual Reality', 'الواقع الافتراضي', 'B1', 'VR technology and its applications', 'تقنية الواقع الافتراضي وتطبيقاتها'),
  (4, 7, 'Psychology of Fear', 'علم نفس الخوف', 'Psychology of Fear', 'علم نفس الخوف', 'B1', 'Understanding fear and phobias', 'فهم الخوف والرهاب'),
  (4, 8, 'Ancient Engineering', 'الهندسة القديمة', 'Ancient Engineering', 'الهندسة القديمة', 'B1', 'Engineering marvels of ancient civilizations', 'عجائب الهندسة في الحضارات القديمة'),
  (4, 9, 'Genetic Science', 'علم الجينات', 'Genetic Science', 'علم الجينات', 'B1', 'DNA, genetics, and modern medicine', 'الحمض النووي وعلم الوراثة والطب الحديث'),
  (4, 10, 'Urban Farming', 'الزراعة الحضرية', 'Urban Farming', 'الزراعة الحضرية', 'B1', 'Growing food in cities and vertical farms', 'زراعة الطعام في المدن والمزارع العمودية'),
  (4, 11, 'Digital Privacy', 'الخصوصية الرقمية', 'Digital Privacy', 'الخصوصية الرقمية', 'B1', 'Online privacy and data protection', 'الخصوصية على الإنترنت وحماية البيانات'),
  (4, 12, 'Mars Exploration', 'استكشاف المريخ', 'Mars Exploration', 'استكشاف المريخ', 'B1', 'Mars missions and future colonization', 'مهمات المريخ والاستعمار المستقبلي')
ON CONFLICT (level, unit_number) DO UPDATE SET
  title_en = EXCLUDED.title_en, title_ar = EXCLUDED.title_ar,
  theme_en = EXCLUDED.theme_en, theme_ar = EXCLUDED.theme_ar,
  cefr = EXCLUDED.cefr, description_en = EXCLUDED.description_en, description_ar = EXCLUDED.description_ar;

-- Level 4 (level=5, B2)
INSERT INTO curriculum_units (level, unit_number, title_en, title_ar, theme_en, theme_ar, cefr, description_en, description_ar) VALUES
  (5, 1, 'Bioethics', 'أخلاقيات علم الأحياء', 'Bioethics', 'أخلاقيات علم الأحياء', 'B2', 'Ethical questions in biology and medicine', 'الأسئلة الأخلاقية في علم الأحياء والطب'),
  (5, 2, 'Deep Ocean Discovery', 'اكتشاف أعماق المحيط', 'Deep Ocean Discovery', 'اكتشاف أعماق المحيط', 'B2', 'Exploring the deepest parts of the ocean', 'استكشاف أعمق أجزاء المحيط'),
  (5, 3, 'Food Security', 'الأمن الغذائي', 'Food Security', 'الأمن الغذائي', 'B2', 'Global food supply and sustainability challenges', 'الإمداد الغذائي العالمي وتحديات الاستدامة'),
  (5, 4, 'Biomimicry Design', 'تصميم محاكاة الطبيعة', 'Biomimicry Design', 'تصميم محاكاة الطبيعة', 'B2', 'Engineering inspired by nature', 'الهندسة المستوحاة من الطبيعة'),
  (5, 5, 'Human Migration', 'الهجرة البشرية', 'Human Migration', 'الهجرة البشرية', 'B2', 'Migration patterns throughout history', 'أنماط الهجرة عبر التاريخ'),
  (5, 6, 'Cryptocurrency', 'العملات الرقمية', 'Cryptocurrency', 'العملات الرقمية', 'B2', 'Digital currencies and blockchain technology', 'العملات الرقمية وتقنية البلوكتشين'),
  (5, 7, 'Crowd Psychology', 'علم نفس الجماهير', 'Crowd Psychology', 'علم نفس الجماهير', 'B2', 'Group behavior and social influence', 'سلوك المجموعات والتأثير الاجتماعي'),
  (5, 8, 'Forensic Science', 'علم الطب الشرعي', 'Forensic Science', 'علم الطب الشرعي', 'B2', 'Crime scene investigation and forensic methods', 'التحقيق في مسرح الجريمة والأساليب الجنائية'),
  (5, 9, 'Archaeological Mysteries', 'ألغاز أثرية', 'Archaeological Mysteries', 'ألغاز أثرية', 'B2', 'Unsolved mysteries from ancient sites', 'ألغاز لم تُحل من المواقع الأثرية'),
  (5, 10, 'Longevity Science', 'علم طول العمر', 'Longevity Science', 'علم طول العمر', 'B2', 'The science of aging and living longer', 'علم الشيخوخة والعيش لفترة أطول'),
  (5, 11, 'Sustainable Architecture', 'العمارة المستدامة', 'Sustainable Architecture', 'العمارة المستدامة', 'B2', 'Green building design and eco-friendly structures', 'تصميم المباني الخضراء والهياكل الصديقة للبيئة'),
  (5, 12, 'Exoplanet Hunting', 'البحث عن كواكب خارجية', 'Exoplanet Hunting', 'البحث عن كواكب خارجية', 'B2', 'Discovering planets beyond our solar system', 'اكتشاف كواكب خارج نظامنا الشمسي')
ON CONFLICT (level, unit_number) DO UPDATE SET
  title_en = EXCLUDED.title_en, title_ar = EXCLUDED.title_ar,
  theme_en = EXCLUDED.theme_en, theme_ar = EXCLUDED.theme_ar,
  cefr = EXCLUDED.cefr, description_en = EXCLUDED.description_en, description_ar = EXCLUDED.description_ar;

-- Level 5 (level=6, C1)
INSERT INTO curriculum_units (level, unit_number, title_en, title_ar, theme_en, theme_ar, cefr, description_en, description_ar) VALUES
  (6, 1, 'Civilization Collapse', 'انهيار الحضارات', 'Civilization Collapse', 'انهيار الحضارات', 'C1', 'Why great civilizations rise and fall', 'لماذا تنهض الحضارات العظيمة وتسقط'),
  (6, 2, 'Extreme Achievement', 'الإنجاز المتطرف', 'Extreme Achievement', 'الإنجاز المتطرف', 'C1', 'Human endurance and extraordinary accomplishments', 'قدرة التحمل البشرية والإنجازات الاستثنائية'),
  (6, 3, 'Scientific Skepticism', 'الشك العلمي', 'Scientific Skepticism', 'الشك العلمي', 'C1', 'Critical thinking and challenging assumptions', 'التفكير النقدي وتحدي الافتراضات'),
  (6, 4, 'Climate Adaptation', 'التكيف المناخي', 'Climate Adaptation', 'التكيف المناخي', 'C1', 'How communities adapt to climate change', 'كيف تتكيف المجتمعات مع تغير المناخ'),
  (6, 5, 'Nuclear Energy Debate', 'جدل الطاقة النووية', 'Nuclear Energy Debate', 'جدل الطاقة النووية', 'C1', 'The pros and cons of nuclear power', 'إيجابيات وسلبيات الطاقة النووية'),
  (6, 6, 'Biodiversity Crisis', 'أزمة التنوع البيولوجي', 'Biodiversity Crisis', 'أزمة التنوع البيولوجي', 'C1', 'Species loss and ecosystem collapse', 'فقدان الأنواع وانهيار الأنظمة البيئية'),
  (6, 7, 'Neuroscience Frontiers', 'آفاق علم الأعصاب', 'Neuroscience Frontiers', 'آفاق علم الأعصاب', 'C1', 'Brain research and consciousness studies', 'أبحاث الدماغ ودراسات الوعي'),
  (6, 8, 'Swarm Intelligence', 'ذكاء الأسراب', 'Swarm Intelligence', 'ذكاء الأسراب', 'C1', 'Collective behavior in nature and technology', 'السلوك الجماعي في الطبيعة والتقنية'),
  (6, 9, 'Creative Genius', 'العبقرية الإبداعية', 'Creative Genius', 'العبقرية الإبداعية', 'C1', 'The neuroscience and psychology of creativity', 'علم الأعصاب وعلم النفس وراء الإبداع'),
  (6, 10, 'Quantum Discovery', 'اكتشافات الكم', 'Quantum Discovery', 'اكتشافات الكم', 'C1', 'Quantum physics and its real-world applications', 'فيزياء الكم وتطبيقاتها في العالم الحقيقي'),
  (6, 11, 'Cross-Cultural Exchange', 'التبادل الثقافي', 'Cross-Cultural Exchange', 'التبادل الثقافي', 'C1', 'Cultural exchange and global understanding', 'التبادل الثقافي والتفاهم العالمي'),
  (6, 12, 'Resource Economics', 'اقتصاديات الموارد', 'Resource Economics', 'اقتصاديات الموارد', 'C1', 'Natural resources, scarcity, and economic systems', 'الموارد الطبيعية والندرة والأنظمة الاقتصادية')
ON CONFLICT (level, unit_number) DO UPDATE SET
  title_en = EXCLUDED.title_en, title_ar = EXCLUDED.title_ar,
  theme_en = EXCLUDED.theme_en, theme_ar = EXCLUDED.theme_ar,
  cefr = EXCLUDED.cefr, description_en = EXCLUDED.description_en, description_ar = EXCLUDED.description_ar;

-- ─── 3. Seed 14 IELTS Reading Question Types ───
INSERT INTO ielts_reading_skills (question_type, name_ar, name_en, explanation_ar, strategy_steps, practice_items, sort_order) VALUES
  ('multiple_choice', 'اختيار من متعدد', 'Multiple Choice',
   'اختر الإجابة الصحيحة من بين عدة خيارات. قد يكون السؤال عن الفكرة الرئيسية أو تفاصيل محددة أو استنتاجات.',
   '[]'::jsonb, '[]'::jsonb, 1),
  ('true_false_not_given', 'صح / خطأ / غير مذكور', 'True/False/Not Given',
   'حدد إذا كانت المعلومة في النص صحيحة (TRUE) أو خاطئة (FALSE) أو غير مذكورة (NOT GIVEN). ركّز على ما هو مكتوب فعلاً وليس ما تعرفه.',
   '[]'::jsonb, '[]'::jsonb, 2),
  ('yes_no_not_given', 'نعم / لا / غير مذكور', 'Yes/No/Not Given',
   'مشابه لـ True/False/Not Given لكن يسأل عن آراء الكاتب وليس الحقائق. هل يوافق الكاتب (YES) أو لا يوافق (NO) أو لم يذكر رأيه (NOT GIVEN).',
   '[]'::jsonb, '[]'::jsonb, 3),
  ('matching_headings', 'مطابقة العناوين', 'Matching Headings',
   'اختر العنوان المناسب لكل فقرة من قائمة العناوين. اقرأ الفقرة كاملة وحدد الفكرة الرئيسية وليس تفصيلة واحدة.',
   '[]'::jsonb, '[]'::jsonb, 4),
  ('matching_information', 'مطابقة المعلومات', 'Matching Information',
   'حدد أي فقرة تحتوي على معلومة معينة. قد تحتاج لقراءة كل الفقرات. يمكن استخدام نفس الفقرة أكثر من مرة.',
   '[]'::jsonb, '[]'::jsonb, 5),
  ('matching_features', 'مطابقة السمات', 'Matching Features',
   'طابق مجموعة من العبارات أو السمات مع قائمة من الخيارات (مثلاً: أسماء باحثين أو دول أو تواريخ).',
   '[]'::jsonb, '[]'::jsonb, 6),
  ('matching_sentence_endings', 'إكمال الجمل بالمطابقة', 'Matching Sentence Endings',
   'أكمل بداية الجملة باختيار النهاية الصحيحة من القائمة. انتبه للمعنى والقواعد معاً.',
   '[]'::jsonb, '[]'::jsonb, 7),
  ('sentence_completion', 'إكمال الجمل', 'Sentence Completion',
   'أكمل الجملة بكلمات من النص. التزم بعدد الكلمات المحدد في التعليمات.',
   '[]'::jsonb, '[]'::jsonb, 8),
  ('summary_completion', 'إكمال الملخص', 'Summary/Note Completion',
   'أكمل ملخصاً أو جدولاً أو مخططاً بكلمات من النص أو من قائمة خيارات.',
   '[]'::jsonb, '[]'::jsonb, 9),
  ('table_completion', 'إكمال الجدول أو المخطط', 'Table/Flow-chart/Diagram Completion',
   'أكمل الفراغات في جدول أو مخطط انسيابي أو رسم بياني بكلمات من النص.',
   '[]'::jsonb, '[]'::jsonb, 10),
  ('diagram_labelling', 'تسمية الرسم البياني', 'Diagram Label Completion',
   'ضع التسميات الصحيحة على الرسم البياني أو الخريطة بكلمات من النص.',
   '[]'::jsonb, '[]'::jsonb, 11),
  ('short_answer', 'إجابة قصيرة', 'Short Answer Questions',
   'أجب عن الأسئلة بكلمات قليلة من النص. التزم بعدد الكلمات المحدد.',
   '[]'::jsonb, '[]'::jsonb, 12),
  ('list_selection', 'اختيار من قائمة', 'List Selection',
   'اختر العدد المطلوب من الإجابات من قائمة الخيارات.',
   '[]'::jsonb, '[]'::jsonb, 13),
  ('paragraph_matching', 'مطابقة الفقرات', 'Paragraph Matching',
   'حدد أي فقرة تحتوي على معلومة أو رأي محدد.',
   '[]'::jsonb, '[]'::jsonb, 14)
ON CONFLICT (question_type) DO UPDATE SET
  name_ar = EXCLUDED.name_ar, name_en = EXCLUDED.name_en,
  explanation_ar = EXCLUDED.explanation_ar, sort_order = EXCLUDED.sort_order;
