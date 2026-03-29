import { useState, useRef, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mic, MicOff, Volume2, Loader2, Zap, RefreshCw,
  CheckCircle2, XCircle, Play, ArrowLeft, Calendar, BookOpen,
  GitCompareArrows, TrendingUp, TrendingDown, Minus, Share2,
  Award, ChevronLeft, ChevronRight, Check,
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { invokeWithRetry } from '../../lib/invokeWithRetry'

// ──────────────────────────────────────────────────
// Safari / iOS detection
// ──────────────────────────────────────────────────
const hasSpeechRecognition = !!(window.SpeechRecognition || window.webkitSpeechRecognition)

// ──────────────────────────────────────────────────
// Expanded word pools — focused on Arabic-speaker problem areas
// th (θ/ð), p/b, v/f, short vowels, silent letters, clusters
// ──────────────────────────────────────────────────
const WORD_POOLS = {
  beginner: [
    { word: 'think', phonetic: '/θɪŋk/', tip: 'ضع لسانك بين أسنانك للـ th' },
    { word: 'this', phonetic: '/ðɪs/', tip: 'th مجهورة — اهتزاز في الحنجرة' },
    { word: 'three', phonetic: '/θriː/', tip: 'th + r معاً' },
    { word: 'park', phonetic: '/pɑːrk/', tip: 'p ليست b — نفخة هواء قوية' },
    { word: 'push', phonetic: '/pʊʃ/', tip: 'p مع نفخة هواء' },
    { word: 'pull', phonetic: '/pʊl/', tip: 'ليست bull — شفتان مغلقتان ثم نفخة' },
    { word: 'very', phonetic: '/ˈvɛri/', tip: 'v ليست f — أسنان على الشفة السفلى مع اهتزاز' },
    { word: 'five', phonetic: '/faɪv/', tip: 'تنتهي بـ v وليس f' },
    { word: 'village', phonetic: '/ˈvɪlɪdʒ/', tip: 'تبدأ بـ v وليس f' },
    { word: 'bat', phonetic: '/bæt/', tip: 'æ صوت بين الفتحة والكسرة' },
    { word: 'bet', phonetic: '/bɛt/', tip: 'e قصيرة — ليست كالعربية' },
    { word: 'bit', phonetic: '/bɪt/', tip: 'i قصيرة — ليست إي طويلة' },
    { word: 'but', phonetic: '/bʌt/', tip: 'ʌ صوت قصير مفتوح' },
    { word: 'put', phonetic: '/pʊt/', tip: 'oo قصيرة — وليست كـ cut' },
    { word: 'red', phonetic: '/rɛd/', tip: 'r إنجليزية بدون لمس سقف الحلق' },
    { word: 'light', phonetic: '/laɪt/', tip: 'l خفيفة — طرف اللسان فقط' },
    { word: 'right', phonetic: '/raɪt/', tip: 'r إنجليزية — لا تلمس شيئاً' },
    { word: 'ship', phonetic: '/ʃɪp/', tip: 'sh + i قصيرة + p بنفخة' },
    { word: 'cheap', phonetic: '/tʃiːp/', tip: 'ch — ليست sh' },
    { word: 'job', phonetic: '/dʒɑːb/', tip: 'j إنجليزية = دج' },
    { word: 'zero', phonetic: '/ˈzɪroʊ/', tip: 'z مع اهتزاز — ليست s' },
    { word: 'sing', phonetic: '/sɪŋ/', tip: 'ng صوت أنفي واحد' },
    { word: 'thing', phonetic: '/θɪŋ/', tip: 'th + ng — صوتان صعبان معاً' },
    { word: 'pen', phonetic: '/pɛn/', tip: 'p وليست b' },
    { word: 'van', phonetic: '/væn/', tip: 'v وليست f أو b' },
    { word: 'fan', phonetic: '/fæn/', tip: 'f واضحة — مختلفة عن v' },
    { word: 'ban', phonetic: '/bæn/', tip: 'b واضحة — مختلفة عن p' },
    { word: 'then', phonetic: '/ðɛn/', tip: 'ð مجهورة' },
    { word: 'thin', phonetic: '/θɪn/', tip: 'θ مهموسة — بدون اهتزاز' },
    { word: 'west', phonetic: '/wɛst/', tip: 'w — شفتان مضمومتان ثم تفتحان' },
    { word: 'wish', phonetic: '/wɪʃ/', tip: 'w ثم i قصيرة ثم sh' },
    { word: 'year', phonetic: '/jɪr/', tip: 'y إنجليزية خفيفة' },
  ],
  intermediate: [
    { word: 'comfortable', phonetic: '/ˈkʌmftəbəl/', tip: 'ثلاثة مقاطع فقط: KUMF-tuh-bul' },
    { word: 'vegetable', phonetic: '/ˈvedʒtəbəl/', tip: 'VEJ-tuh-bul — ثلاثة مقاطع' },
    { word: 'temperature', phonetic: '/ˈtemprətʃər/', tip: 'TEM-pruh-chur' },
    { word: 'restaurant', phonetic: '/ˈrestərɑːnt/', tip: 'REST-runt — لا تنطق au' },
    { word: 'Wednesday', phonetic: '/ˈwenzdeɪ/', tip: 'd صامتة: WENZ-day' },
    { word: 'schedule', phonetic: '/ˈskedʒuːl/', tip: 'SKEJ-ool — sk وليست sh' },
    { word: 'through', phonetic: '/θruː/', tip: 'th + r + oo طويلة' },
    { word: 'though', phonetic: '/ðoʊ/', tip: 'ð + oh — بدون t في النهاية' },
    { word: 'thought', phonetic: '/θɔːt/', tip: 'θ + aw + t' },
    { word: 'thoroughly', phonetic: '/ˈθɜːrəli/', tip: 'THUR-uh-lee' },
    { word: 'weather', phonetic: '/ˈwɛðər/', tip: 'ð مجهورة في المنتصف' },
    { word: 'whether', phonetic: '/ˈwɛðər/', tip: 'نفس نطق weather تقريباً' },
    { word: 'clothes', phonetic: '/kloʊðz/', tip: 'مقطع واحد: klohðz' },
    { word: 'months', phonetic: '/mʌnθs/', tip: 'n + th + s — صعبة!' },
    { word: 'particular', phonetic: '/pərˈtɪkjələr/', tip: 'pur-TIK-yuh-lur' },
    { word: 'environment', phonetic: '/ɪnˈvaɪrənmənt/', tip: 'in-VY-run-munt' },
    { word: 'pronunciation', phonetic: '/prəˌnʌnsiˈeɪʃən/', tip: 'pruh-NUN-see-AY-shun — ليست pronounciation' },
    { word: 'development', phonetic: '/dɪˈvɛləpmənt/', tip: 'dih-VEL-up-munt' },
    { word: 'vocabulary', phonetic: '/voʊˈkæbjəlɛri/', tip: 'voh-KAB-yuh-leh-ree' },
    { word: 'world', phonetic: '/wɜːrld/', tip: 'w + ur + ld — لسان ملتف' },
    { word: 'girl', phonetic: '/ɡɜːrl/', tip: 'g + ur + l' },
    { word: 'purple', phonetic: '/ˈpɜːrpəl/', tip: 'PUR-pul — p مرتين' },
    { word: 'breathe', phonetic: '/briːð/', tip: 'فعل — ð مجهورة في النهاية' },
    { word: 'breath', phonetic: '/brɛθ/', tip: 'اسم — θ مهموسة + e قصيرة' },
    { word: 'southern', phonetic: '/ˈsʌðərn/', tip: 'SUTH-urn — ð مجهورة' },
    { word: 'variety', phonetic: '/vəˈraɪəti/', tip: 'vuh-RY-uh-tee' },
    { word: 'available', phonetic: '/əˈveɪləbəl/', tip: 'uh-VAY-luh-bul' },
    { word: 'experience', phonetic: '/ɪkˈspɪriəns/', tip: 'ik-SPEER-ee-unts' },
    { word: 'photography', phonetic: '/fəˈtɑːɡrəfi/', tip: 'fuh-TOG-ruh-fee — التشديد على المقطع الثاني' },
    { word: 'literature', phonetic: '/ˈlɪtərətʃər/', tip: 'LIT-uh-ruh-chur' },
    { word: 'natural', phonetic: '/ˈnætʃərəl/', tip: 'NATCH-uh-rul' },
    { word: 'chocolate', phonetic: '/ˈtʃɑːklət/', tip: 'CHOK-lut — مقطعان فقط' },
  ],
  advanced: [
    { word: 'entrepreneurship', phonetic: '/ˌɑːntrəprəˈnɜːrʃɪp/', tip: 'on-truh-pruh-NUR-ship' },
    { word: 'phenomenon', phonetic: '/fɪˈnɑːmɪnɑːn/', tip: 'fih-NOM-ih-non' },
    { word: 'simultaneously', phonetic: '/ˌsaɪməlˈteɪniəsli/', tip: 'sy-mul-TAY-nee-us-lee' },
    { word: 'archaeological', phonetic: '/ˌɑːrkiəˈlɑːdʒɪkəl/', tip: 'ar-kee-uh-LOJ-ih-kul' },
    { word: 'infrastructure', phonetic: '/ˈɪnfrəstrʌktʃər/', tip: 'IN-fruh-struk-chur' },
    { word: 'communication', phonetic: '/kəˌmjuːnɪˈkeɪʃən/', tip: 'kuh-myoo-nih-KAY-shun' },
    { word: 'consciousness', phonetic: '/ˈkɑːnʃəsnəs/', tip: 'KON-shus-nus' },
    { word: 'sophisticated', phonetic: '/səˈfɪstɪkeɪtɪd/', tip: 'suh-FIS-tih-kay-tid' },
    { word: 'enthusiastically', phonetic: '/ɪnˌθjuːziˈæstɪkli/', tip: 'in-thoo-zee-AS-tik-lee' },
    { word: 'vulnerability', phonetic: '/ˌvʌlnərəˈbɪləti/', tip: 'vul-nuh-ruh-BIL-ih-tee' },
    { word: 'characteristics', phonetic: '/ˌkærəktəˈrɪstɪks/', tip: 'kar-uk-tuh-RIS-tiks' },
    { word: 'photographer', phonetic: '/fəˈtɑːɡrəfər/', tip: 'fuh-TOG-ruh-fur — التشديد يتغير عن photography' },
    { word: 'philosophical', phonetic: '/ˌfɪləˈsɑːfɪkəl/', tip: 'fil-uh-SOF-ih-kul' },
    { word: 'particularly', phonetic: '/pərˈtɪkjələrli/', tip: 'pur-TIK-yuh-lur-lee' },
    { word: 'representative', phonetic: '/ˌreprɪˈzentətɪv/', tip: 'rep-rih-ZEN-tuh-tiv' },
    { word: 'hierarchical', phonetic: '/ˌhaɪəˈrɑːrkɪkəl/', tip: 'hy-uh-RAR-kih-kul' },
    { word: 'unquestionably', phonetic: '/ʌnˈkwestʃənəbli/', tip: 'un-KWES-chun-uh-blee' },
    { word: 'psychological', phonetic: '/ˌsaɪkəˈlɑːdʒɪkəl/', tip: 'sy-kuh-LOJ-ih-kul — p صامتة' },
    { word: 'miscellaneous', phonetic: '/ˌmɪsəˈleɪniəs/', tip: 'mis-uh-LAY-nee-us' },
    { word: 'troubleshooting', phonetic: '/ˈtrʌbəlʃuːtɪŋ/', tip: 'TRUB-ul-shoo-ting' },
    { word: 'approximately', phonetic: '/əˈprɑːksɪmətli/', tip: 'uh-PROK-sih-mut-lee' },
    { word: 'autobiography', phonetic: '/ˌɔːtəbaɪˈɑːɡrəfi/', tip: 'aw-toh-by-OG-ruh-fee' },
    { word: 'electromagnetic', phonetic: '/ɪˌlɛktroʊmæɡˈnɛtɪk/', tip: 'ih-lek-troh-mag-NET-ik' },
    { word: 'comprehensive', phonetic: '/ˌkɑːmprɪˈhɛnsɪv/', tip: 'kom-prih-HEN-siv' },
    { word: 'procrastination', phonetic: '/proʊˌkræstɪˈneɪʃən/', tip: 'proh-kras-tih-NAY-shun' },
    { word: 'differentiate', phonetic: '/ˌdɪfəˈrɛnʃieɪt/', tip: 'dif-uh-REN-shee-ayt' },
    { word: 'extraordinary', phonetic: '/ɪkˈstrɔːrdənɛri/', tip: 'ik-STROR-duh-neh-ree' },
    { word: 'overwhelming', phonetic: '/ˌoʊvərˈwɛlmɪŋ/', tip: 'oh-vur-WEL-ming' },
    { word: 'determination', phonetic: '/dɪˌtɜːrmɪˈneɪʃən/', tip: 'dih-tur-mih-NAY-shun' },
    { word: 'administration', phonetic: '/ədˌmɪnɪˈstreɪʃən/', tip: 'ud-min-ih-STRAY-shun' },
    { word: 'refrigerator', phonetic: '/rɪˈfrɪdʒəreɪtər/', tip: 'rih-FRIJ-uh-ray-tur' },
    { word: 'enthusiastic', phonetic: '/ɪnˌθjuːziˈæstɪk/', tip: 'in-thoo-zee-AS-tik' },
  ],
}

// ──────────────────────────────────────────────────
// Expanded sentence pools — Arabic-speaker challenges
// ──────────────────────────────────────────────────
const SENTENCE_POOLS = {
  beginner: [
    'Hello, my name is Ali.',
    'I think this is very good.',
    'The weather is nice today.',
    'Please pass me the pepper.',
    'I have three brothers and five sisters.',
    'Can I have a glass of water?',
    'Put the book on the table.',
    'The park is very beautiful.',
    'I like to play video games.',
    'She is a very kind person.',
    'This pen is better than that one.',
    'I live in a big village.',
    'The van is parked over there.',
    'I wish I could visit the beach.',
    'My father drives to work every day.',
    'We think the movie is funny.',
    'They went to the shop together.',
    'The bath water is too hot.',
    'I need to buy some food.',
    'The ship sailed across the river.',
    'This is the path to the school.',
    'Both of them passed the test.',
    'I feel very happy today.',
    'The sun rises in the east.',
    'Please sit in the chair.',
    'He gave me a red rose.',
    'Where is the nearest bus stop?',
    'I would like some fish and chips.',
    'The child is playing in the yard.',
    'It is the third day of the week.',
    'I paid the bill with cash.',
    'The bird is singing in the tree.',
  ],
  intermediate: [
    'I would like to improve my English pronunciation.',
    'Could you please explain that more thoroughly?',
    'I have been studying English for three years.',
    'The temperature dropped significantly overnight.',
    'She thought about it, though she was not sure.',
    'The restaurant was particularly busy on Wednesday.',
    'I am looking forward to the development of this project.',
    'Although the weather was terrible, we decided to go hiking.',
    'The children breathed heavily after running through the park.',
    'I am comfortable with the schedule we have set.',
    'The vegetables at this market are fresh and available.',
    'Photography is one of my favorite hobbies.',
    'Whether or not it rains, the event will continue.',
    'This is a valuable experience for personal growth.',
    'The southern part of the country has warmer weather.',
    'Her vocabulary has improved through reading literature.',
    'I need to purchase a variety of supplies.',
    'The purple flowers bloom naturally in spring.',
    'He is particularly interested in world history.',
    'The environment requires our protection and care.',
    'Chocolate is the most popular flavor of ice cream.',
    'I would have visited, but I could not find the address.',
    'The government announced further development plans.',
    'Can you describe the characteristics of this material?',
    'They arrived simultaneously, which was quite surprising.',
    'The path through the forest was thoroughly beautiful.',
    'Breathing exercises help reduce stress and anxiety.',
    'The clothes were hung out to dry for several months.',
    'Please provide the specific details of the problem.',
    'The girl from the southern village speaks three languages.',
    'We should focus on the quality rather than the quantity.',
    'The infrastructure of the city needs improvement.',
  ],
  advanced: [
    'The government should invest more in renewable energy infrastructure.',
    'Despite the overwhelming challenges, the project was completed on time.',
    'The consequences of climate change are becoming increasingly apparent.',
    'The entrepreneur demonstrated extraordinary determination throughout.',
    'I would have gone to the philosophical conference if I had known about it.',
    'The archaeological findings were simultaneously fascinating and controversial.',
    'Her sophisticated approach to problem-solving differentiated her from others.',
    'The representative thoroughly addressed the vulnerability in the system.',
    'Procrastination is a psychological phenomenon that affects approximately everyone.',
    'The comprehensive autobiography revealed the author\'s remarkable journey.',
    'His enthusiastic participation in the program was unquestionably valuable.',
    'The hierarchical structure of the administration requires restructuring.',
    'Electromagnetic waves travel at the speed of light through a vacuum.',
    'The photographer captured particularly breathtaking images of the landscape.',
    'Miscellaneous troubleshooting techniques are essential for IT professionals.',
    'The consciousness of environmental responsibility has grown substantially.',
    'Communication skills are a representative characteristic of effective leadership.',
    'The refrigerator in the restaurant needs to maintain a consistent temperature.',
    'They enthusiastically volunteered for the extraordinary community project.',
    'The vulnerability of the infrastructure was a philosophical question for the committee.',
    'Approximately three thousand participants registered for the conference simultaneously.',
    'The psychological impact of the phenomenon was overwhelming for researchers.',
    'The administration differentiated between the various levels of responsibility.',
    'Her determination to succeed was unquestionably her most extraordinary quality.',
    'The sophisticated infrastructure of the development surpassed all expectations.',
    'Particularly comprehensive research is required for the archaeological project.',
    'The entrepreneurship program has produced representative leaders in the industry.',
    'Troubleshooting the electromagnetic equipment required sophisticated knowledge.',
    'The philosophical consciousness of the community has developed hierarchically.',
    'Overwhelming evidence suggests that the vulnerability was thoroughly exploited.',
    'His autobiography particularly emphasized the extraordinary characteristics of his culture.',
    'The administration procrastinated on addressing the comprehensive infrastructure plan.',
  ],
}

// ──────────────────────────────────────────────────
// Original hardcoded content (preserved as المزيد)
// ──────────────────────────────────────────────────
const PRACTICE_SENTENCES = {
  beginner: [
    'Hello, my name is...',
    'How are you today?',
    'I like to read books.',
    'The weather is nice today.',
    'Can I have some water please?',
    'I go to school every day.',
    'My favorite color is blue.',
    'I have two brothers.',
  ],
  intermediate: [
    'I would like to improve my English skills.',
    'Could you please explain that again?',
    'I have been studying English for two years.',
    'What do you think about this idea?',
    'The restaurant was really busy last night.',
    'I am looking forward to the weekend.',
  ],
  advanced: [
    'Although the weather was terrible, we decided to go hiking.',
    'The government should invest more in renewable energy.',
    'I would have gone to the party if I had known about it.',
    'Despite the challenges, the project was completed on time.',
    'The consequences of climate change are becoming increasingly apparent.',
  ],
}

const DIFFICULT_WORDS = [
  { word: 'through', phonetic: '/θruː/' },
  { word: 'though', phonetic: '/ðoʊ/' },
  { word: 'thought', phonetic: '/θɔːt/' },
  { word: 'thoroughly', phonetic: '/ˈθɜːrəli/' },
  { word: 'comfortable', phonetic: '/ˈkʌmftəbəl/' },
  { word: 'vegetable', phonetic: '/ˈvedʒtəbəl/' },
  { word: 'schedule', phonetic: '/ˈskedʒuːl/' },
  { word: 'pronunciation', phonetic: '/prəˌnʌnsiˈeɪʃən/' },
  { word: 'environment', phonetic: '/ɪnˈvaɪrənmənt/' },
  { word: 'temperature', phonetic: '/ˈtemprətʃər/' },
  { word: 'restaurant', phonetic: '/ˈrestərɑːnt/' },
  { word: 'Wednesday', phonetic: '/ˈwenzdeɪ/' },
]

// ──────────────────────────────────────────────────
// Daily rotation helper
// ──────────────────────────────────────────────────
function getDailyItems(pool, count = 5) {
  const dayIndex = Math.floor(Date.now() / 86400000)
  const items = []
  const len = pool.length
  for (let i = 0; i < count; i++) {
    items.push(pool[(dayIndex + i) % len])
  }
  return items
}

// ──────────────────────────────────────────────────
// CSS Waveform — animated bars, no external lib
// ──────────────────────────────────────────────────
function Waveform({ playing = false, color = 'violet', barCount = 20 }) {
  // Deterministic bar heights seeded by index so they're consistent per card
  const bars = useMemo(
    () => Array.from({ length: barCount }, (_, i) => {
      const h = 20 + ((i * 37 + 13) % 60) // pseudo-random 20–79%
      return h
    }),
    [barCount],
  )

  const colorMap = {
    violet: 'bg-violet-400',
    sky: 'bg-sky-400',
    emerald: 'bg-emerald-400',
    gold: 'bg-amber-400',
  }
  const barCls = colorMap[color] || colorMap.violet

  return (
    <div className="flex items-center justify-center gap-0.5 h-10 select-none" aria-hidden>
      {bars.map((h, i) => (
        <div
          key={i}
          className={`w-1 rounded-full transition-all ${barCls} ${playing ? 'opacity-100' : 'opacity-30'}`}
          style={{
            height: `${h}%`,
            animationName: playing ? 'waveBar' : 'none',
            animationDuration: `${0.4 + (i % 5) * 0.12}s`,
            animationTimingFunction: 'ease-in-out',
            animationIterationCount: 'infinite',
            animationDirection: 'alternate',
            animationDelay: `${(i % 7) * 0.06}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes waveBar {
          from { transform: scaleY(0.35); }
          to   { transform: scaleY(1); }
        }
      `}</style>
    </div>
  )
}

// ──────────────────────────────────────────────────
// Mini audio player for a single comparison card
// ──────────────────────────────────────────────────
function ComparisonPlayer({ label, phrase, score, date, color, side }) {
  const [playing, setPlaying] = useState(false)
  const synthRef = useRef(null)

  function togglePlay() {
    if (playing) {
      speechSynthesis.cancel()
      setPlaying(false)
      return
    }
    const utt = new SpeechSynthesisUtterance(phrase)
    utt.lang = 'en-US'
    utt.rate = 0.82
    utt.onend = () => setPlaying(false)
    utt.onerror = () => setPlaying(false)
    synthRef.current = utt
    speechSynthesis.speak(utt)
    setPlaying(true)
  }

  useEffect(() => () => speechSynthesis.cancel(), [])

  const scoreColor =
    score >= 90 ? 'text-emerald-400' :
    score >= 70 ? 'text-sky-400' :
    score >= 50 ? 'text-amber-400' : 'text-red-400'

  const scoreBg =
    score >= 90 ? 'bg-emerald-500/10 border-emerald-500/20' :
    score >= 70 ? 'bg-sky-500/10 border-sky-500/20' :
    score >= 50 ? 'bg-amber-500/10 border-amber-500/20' : 'bg-red-500/10 border-red-500/20'

  return (
    <div className={`flex-1 fl-card-static p-4 flex flex-col gap-3 ${side === 'before' ? 'border-[var(--border-subtle)]' : 'border-violet-500/20'}`}>
      {/* Header label */}
      <div className="text-center">
        <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
          side === 'before'
            ? 'bg-[var(--surface-raised)] text-muted'
            : 'bg-violet-500/10 text-violet-400'
        }`}>
          {label}
        </span>
        {date && (
          <p className="text-xs text-muted mt-1">
            {new Date(date).toLocaleDateString('ar-SA', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        )}
      </div>

      {/* Waveform */}
      <Waveform playing={playing} color={color} />

      {/* Play button */}
      <button
        onClick={togglePlay}
        className={`mx-auto w-10 h-10 rounded-full flex items-center justify-center transition-all ${
          playing
            ? 'bg-red-500/20 border border-red-500/30 hover:bg-red-500/30'
            : 'bg-[var(--surface-raised)] border border-[var(--border-subtle)] hover:bg-[var(--sidebar-hover-bg)]'
        }`}
        title={playing ? 'إيقاف' : 'استمع'}
      >
        {playing
          ? <Minus size={16} className="text-red-400" />
          : <Play size={16} className={side === 'after' ? 'text-violet-400' : 'text-muted'} />
        }
      </button>

      {/* Score */}
      <div className={`text-center rounded-xl p-2 border ${scoreBg}`}>
        <p className={`text-2xl font-bold ${scoreColor}`}>{score}%</p>
        <p className="text-xs text-muted">درجة النطق</p>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────
// Before/After Section — full tab component
// ──────────────────────────────────────────────────
function BeforeAfterSection({ profileId, studentName }) {
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [copied, setCopied] = useState(false)

  // Query pronunciation_logs first
  const { data: comparisonData, isLoading } = useQuery({
    queryKey: ['pronunciation-comparison', profileId],
    queryFn: async () => {
      // Attempt pronunciation_logs (stores phrase + accuracy_score + created_at)
      const { data: logs, error: logsErr } = await supabase
        .from('pronunciation_logs')
        .select('id, phrase, accuracy_score, created_at, mode')
        .eq('student_id', profileId)
        .order('created_at', { ascending: true })

      // Fall back to voice_journals if no pronunciation_logs or table missing
      if (!logsErr && logs && logs.length >= 2) {
        return buildComparisons(logs, 'phrase', 'accuracy_score')
      }

      // Fallback: voice_journals (fluency_score, topic as phrase)
      const { data: journals } = await supabase
        .from('voice_journals')
        .select('id, topic, fluency_score, created_at')
        .eq('student_id', profileId)
        .not('fluency_score', 'is', null)
        .order('created_at', { ascending: true })

      if (journals && journals.length >= 2) {
        return buildComparisons(journals, 'topic', 'fluency_score')
      }

      return []
    },
    enabled: !!profileId,
    staleTime: 60_000,
  })

  function buildComparisons(records, phraseKey, scoreKey) {
    // Group records by phrase/topic
    const groups = {}
    for (const r of records) {
      const key = (r[phraseKey] || '').trim().toLowerCase().slice(0, 60)
      if (!key) continue
      if (!groups[key]) groups[key] = []
      groups[key].push(r)
    }

    // Only keep phrases that have at least 2 attempts
    const pairs = []
    for (const [, entries] of Object.entries(groups)) {
      if (entries.length < 2) continue
      const sorted = [...entries].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      const first = sorted[0]
      const last = sorted[sorted.length - 1]
      // Skip if both are identical records
      if (first.id === last.id) continue
      const phraseText = first[phraseKey] || 'تدريب صوتي'
      pairs.push({
        phrase: phraseText,
        before: { score: first[scoreKey] ?? 0, date: first.created_at },
        after: { score: last[scoreKey] ?? 0, date: last.created_at },
        attempts: entries.length,
      })
    }

    // Sort by biggest improvement descending, then by total attempts
    pairs.sort((a, b) => {
      const impA = a.after.score - a.before.score
      const impB = b.after.score - b.before.score
      return impB - impA
    })

    return pairs
  }

  const pairs = comparisonData || []
  const current = pairs[selectedIdx]

  const improvement = current ? current.after.score - current.before.score : 0
  const improvementPct = current && current.before.score > 0
    ? Math.round(((current.after.score - current.before.score) / current.before.score) * 100)
    : improvement

  async function handleShare() {
    if (!current) return

    const lines = [
      `🎯 تقدمي في النطق — ${studentName || 'طالب'}`,
      `📝 "${current.phrase}"`,
      ``,
      `📅 البداية (${new Date(current.before.date).toLocaleDateString('ar-SA')}): ${current.before.score}%`,
      `✅ الآن (${new Date(current.after.date).toLocaleDateString('ar-SA')}): ${current.after.score}%`,
      ``,
      improvement > 0
        ? `🚀 تحسّن بنسبة ${Math.abs(improvementPct)}%!`
        : improvement === 0
          ? `💪 ثبات ممتاز على ${current.after.score}%`
          : `🔄 جاري التحسّن — استمر في التدريب`,
      ``,
      `تعلّم معنا على Fluentia LMS ✨`,
    ]

    const text = lines.join('\n')

    try {
      if (navigator.share) {
        await navigator.share({ title: 'تقدمي في النطق', text })
      } else {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2500)
      }
    } catch {
      // Clipboard fallback
      try {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2500)
      } catch {
        // ignore
      }
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-sky-400" />
      </div>
    )
  }

  if (pairs.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="fl-card-static p-10 text-center space-y-3"
      >
        <GitCompareArrows size={44} className="mx-auto text-violet-400/40" />
        <h3 className="text-lg font-bold text-[var(--text-primary)]">لا توجد مقارنة بعد</h3>
        <p className="text-sm text-muted max-w-xs mx-auto">
          تحتاج إلى تسجيل نفس العبارة أو الكلمة مرتين على الأقل حتى تظهر مقارنة قبل/بعد.
          استمر في التدريب!
        </p>
        <div className="mt-2 inline-flex items-center gap-1.5 text-xs text-violet-400 bg-violet-500/10 rounded-full px-3 py-1.5">
          <Mic size={12} />
          دوّن تمارين يومية لترى تطورك
        </div>
      </motion.div>
    )
  }

  return (
    <div className="space-y-5" dir="rtl">
      {/* Phrase navigator */}
      {pairs.length > 1 && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedIdx(i => Math.max(0, i - 1))}
            disabled={selectedIdx === 0}
            className="w-8 h-8 rounded-lg bg-[var(--surface-raised)] flex items-center justify-center disabled:opacity-30 hover:bg-[var(--sidebar-hover-bg)] transition-all"
          >
            <ChevronRight size={16} className="text-muted" />
          </button>
          <div className="flex-1 text-center">
            <p className="text-xs text-muted">{selectedIdx + 1} / {pairs.length} عبارة</p>
          </div>
          <button
            onClick={() => setSelectedIdx(i => Math.min(pairs.length - 1, i + 1))}
            disabled={selectedIdx === pairs.length - 1}
            className="w-8 h-8 rounded-lg bg-[var(--surface-raised)] flex items-center justify-center disabled:opacity-30 hover:bg-[var(--sidebar-hover-bg)] transition-all"
          >
            <ChevronLeft size={16} className="text-muted" />
          </button>
        </div>
      )}

      {/* Phrase display */}
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedIdx}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.22 }}
          className="space-y-4"
        >
          {/* Phrase label */}
          <div className="fl-card-static p-3 text-center border border-violet-500/10">
            <p className="text-xs text-muted uppercase tracking-wider mb-1">العبارة المقارنة</p>
            <p className="text-base font-bold text-[var(--text-primary)]" dir="ltr">{current.phrase}</p>
            <p className="text-xs text-muted mt-1">{current.attempts} محاولة مسجّلة</p>
          </div>

          {/* Side-by-side players */}
          <div className="flex gap-3">
            <ComparisonPlayer
              label="قبل"
              phrase={current.phrase}
              score={current.before.score}
              date={current.before.date}
              color="sky"
              side="before"
            />
            <ComparisonPlayer
              label="الآن"
              phrase={current.phrase}
              score={current.after.score}
              date={current.after.date}
              color="violet"
              side="after"
            />
          </div>

          {/* Improvement indicator */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className={`fl-card-static p-4 text-center border ${
              improvement > 0
                ? 'border-emerald-500/20 bg-emerald-500/5'
                : improvement < 0
                  ? 'border-red-500/20 bg-red-500/5'
                  : 'border-[var(--border-subtle)] bg-[var(--surface-raised)]'
            }`}
          >
            <div className="flex items-center justify-center gap-2 mb-1">
              {improvement > 0
                ? <TrendingUp size={20} className="text-emerald-400" />
                : improvement < 0
                  ? <TrendingDown size={20} className="text-red-400" />
                  : <Minus size={20} className="text-muted" />
              }
              <span className={`text-2xl font-bold ${
                improvement > 0 ? 'text-emerald-400' :
                improvement < 0 ? 'text-red-400' : 'text-muted'
              }`}>
                {improvement > 0 ? '+' : ''}{improvement}%
              </span>
            </div>
            <p className="text-xs text-muted">
              {improvement > 0
                ? `تحسّن رائع! ارتفعت درجتك بمقدار ${Math.abs(improvement)} نقطة`
                : improvement < 0
                  ? 'لا تستسلم — كل محاولة تعلّم!'
                  : 'نتيجة ثابتة — حاول أن تتجاوز نفسك'
              }
            </p>

            {/* Progress bar */}
            <div className="mt-3 relative h-2 bg-[var(--surface-raised)] rounded-full overflow-hidden">
              {/* Before bar */}
              <div
                className="absolute top-0 right-0 h-full rounded-full bg-sky-500/40"
                style={{ width: `${Math.min(100, current.before.score)}%` }}
              />
              {/* After bar (overlaid to show delta) */}
              <motion.div
                className={`absolute top-0 right-0 h-full rounded-full ${
                  improvement >= 0 ? 'bg-emerald-400' : 'bg-red-400'
                }`}
                initial={{ width: `${Math.min(100, current.before.score)}%` }}
                animate={{ width: `${Math.min(100, current.after.score)}%` }}
                transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
              />
            </div>
            <div className="flex justify-between mt-1 text-[11px] text-muted" dir="ltr">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>

            {/* Achievement badge */}
            {improvement >= 20 && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="mt-3 inline-flex items-center gap-1.5 text-xs bg-gold-500/10 border border-gold-500/20 text-amber-400 rounded-full px-3 py-1"
              >
                <Award size={12} />
                تحسن ملحوظ +{improvement} نقطة
              </motion.div>
            )}
          </motion.div>

          {/* Share button */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleShare}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400 hover:bg-violet-500/20 transition-all text-sm font-medium"
          >
            {copied
              ? <><Check size={16} className="text-emerald-400" /><span className="text-emerald-400">تم النسخ!</span></>
              : <><Share2 size={16} />شارك تقدمي</>
            }
          </motion.button>
        </motion.div>
      </AnimatePresence>

      {/* All phrases mini list */}
      {pairs.length > 1 && (
        <div>
          <p className="text-xs text-muted mb-2">كل المقارنات ({pairs.length})</p>
          <div className="space-y-1.5">
            {pairs.map((p, i) => {
              const imp = p.after.score - p.before.score
              return (
                <button
                  key={i}
                  onClick={() => setSelectedIdx(i)}
                  className={`w-full text-right px-3 py-2.5 rounded-xl flex items-center justify-between gap-3 transition-all text-sm ${
                    i === selectedIdx
                      ? 'bg-violet-500/15 border border-violet-500/25 text-white'
                      : 'bg-[var(--surface-raised)] text-muted hover:text-[var(--text-primary)] hover:bg-[var(--sidebar-hover-bg)]'
                  }`}
                >
                  <span className="truncate flex-1 text-right" dir="ltr">{p.phrase}</span>
                  <span className={`text-xs font-bold shrink-0 ${
                    imp > 0 ? 'text-emerald-400' : imp < 0 ? 'text-red-400' : 'text-muted'
                  }`}>
                    {imp > 0 ? '+' : ''}{imp}%
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default function StudentPronunciation() {
  const { profile, studentData } = useAuthStore()
  const [section, setSection] = useState('daily') // daily | more | compare
  const [mode, setMode] = useState('sentences') // sentences | words
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isListening, setIsListening] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [feedback, setFeedback] = useState(null)
  const recognitionRef = useRef(null)

  // MediaRecorder refs for Whisper fallback (Safari/iOS)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const streamRef = useRef(null)

  const level = studentData?.academic_level || 1
  const levelKey = level <= 2 ? 'beginner' : level <= 4 ? 'intermediate' : 'advanced'

  // Daily rotating items
  const dailyWords = useMemo(() => getDailyItems(WORD_POOLS[levelKey], 5), [levelKey])
  const dailySentences = useMemo(() => getDailyItems(SENTENCE_POOLS[levelKey], 5), [levelKey])

  // Items for current view
  const items = useMemo(() => {
    if (section === 'daily') {
      return mode === 'sentences' ? dailySentences : dailyWords
    }
    // "more" section — original hardcoded content
    return mode === 'sentences'
      ? PRACTICE_SENTENCES[levelKey].map(s => (typeof s === 'string' ? s : s))
      : DIFFICULT_WORDS
  }, [section, mode, levelKey, dailySentences, dailyWords])

  const totalItems = items.length
  const currentItem = items[currentIndex]

  // For daily items: words are objects with { word, phonetic, tip }, sentences are strings
  // For "more" items: words are objects with { word, phonetic }, sentences are strings
  const currentTarget = section === 'daily'
    ? (mode === 'words' ? currentItem?.word : currentItem)
    : (mode === 'words' ? currentItem?.word : currentItem)

  const currentPhonetic = mode === 'words' ? currentItem?.phonetic : null
  const currentTip = section === 'daily' && mode === 'words' ? currentItem?.tip : null

  // Cleanup MediaRecorder stream on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
      }
    }
  }, [])

  function speak(text) {
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'en-US'
    utterance.rate = 0.8
    speechSynthesis.speak(utterance)
  }

  // ──────────────────────────────────────────────────
  // SpeechRecognition path (Chrome / supported browsers)
  // ──────────────────────────────────────────────────
  function startSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    recognition.lang = 'en-US'
    recognition.continuous = false
    recognition.interimResults = false

    recognition.onresult = (event) => {
      const result = event.results[0][0].transcript
      setTranscript(result)
      evaluatePronunciation(result)
    }

    recognition.onerror = () => {
      setIsListening(false)
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognitionRef.current = recognition
    recognition.start()
    setIsListening(true)
    setTranscript('')
    setFeedback(null)
  }

  // ──────────────────────────────────────────────────
  // MediaRecorder + Whisper path (Safari / iOS fallback)
  // ──────────────────────────────────────────────────
  async function startMediaRecording() {
    try {
      // Request microphone — Safari supports getUserMedia
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      // Pick a supported mime type
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : MediaRecorder.isTypeSupported('audio/mp4')
            ? 'audio/mp4'
            : '' // let browser pick default

      const options = mimeType ? { mimeType } : undefined
      const recorder = new MediaRecorder(stream, options)
      audioChunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }

      recorder.onstop = async () => {
        // Stop all tracks
        stream.getTracks().forEach(t => t.stop())
        streamRef.current = null

        const actualMime = recorder.mimeType || mimeType || 'audio/webm'
        const blob = new Blob(audioChunksRef.current, { type: actualMime })

        if (blob.size === 0) {
          setIsListening(false)
          setIsTranscribing(false)
          return
        }

        setIsTranscribing(true)

        try {
          const result = await transcribeWithWhisper(blob, actualMime)
          if (result) {
            setTranscript(result)
            evaluatePronunciation(result)
          }
        } catch (err) {
          console.error('Whisper transcription error:', err)
          setFeedback({
            accuracy: 0,
            wordResults: [],
            xp: 0,
            message: 'حدث خطأ في التعرف على الكلام — حاول مرة أخرى',
          })
        } finally {
          setIsTranscribing(false)
        }
      }

      recorder.onerror = () => {
        setIsListening(false)
        stream.getTracks().forEach(t => t.stop())
        streamRef.current = null
      }

      mediaRecorderRef.current = recorder
      recorder.start()
      setIsListening(true)
      setTranscript('')
      setFeedback(null)
    } catch (err) {
      console.error('Microphone access error:', err)
      alert('لا يمكن الوصول إلى الميكروفون — يرجى السماح بالوصول من إعدادات المتصفح')
    }
  }

  async function transcribeWithWhisper(blob, mimeType) {
    if (!session?.access_token) throw new Error('Not authenticated')

    // Determine file extension from mime
    const ext = mimeType.includes('mp4') ? 'mp4' : 'webm'
    const fileName = `pronunciation/${profile?.id}/${Date.now()}.${ext}`

    // Upload to Supabase storage
    const { error: uploadErr } = await supabase.storage
      .from('voice-notes')
      .upload(fileName, blob, {
        contentType: mimeType,
        upsert: false,
      })

    if (uploadErr) {
      console.error('Upload error:', uploadErr)
      throw new Error('Failed to upload audio')
    }

    // Call whisper-transcribe edge function with timeout/retry
    const res = await invokeWithRetry('whisper-transcribe', {
      body: { voice_url: fileName, duration_seconds: 10 },
      
    }, { timeoutMs: 30000, retries: 1 })

    if (res.error) {
      const errMsg = typeof res.error === 'object' ? res.error.message : String(res.error)
      throw new Error(errMsg)
    }
    const data = res.data
    if (data?.error) throw new Error(data.error)

    return data?.transcript || ''
  }

  // ──────────────────────────────────────────────────
  // Unified start/stop
  // ──────────────────────────────────────────────────
  function startListening() {
    if (hasSpeechRecognition) {
      startSpeechRecognition()
    } else {
      startMediaRecording()
    }
  }

  function stopListening() {
    if (hasSpeechRecognition) {
      recognitionRef.current?.stop()
    } else {
      // Stop MediaRecorder — triggers onstop which runs Whisper
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
      }
    }
    setIsListening(false)
  }

  async function evaluatePronunciation(spoken) {
    if (!currentTarget) return
    const target = currentTarget.toLowerCase().replace(/[.,!?']/g, '').trim()
    const spokenClean = spoken.toLowerCase().replace(/[.,!?']/g, '').trim()

    const targetWords = target.split(/\s+/).filter(Boolean)
    const spokenWords = spokenClean.split(/\s+/)

    if (targetWords.length === 0) return

    let matches = 0
    const wordResults = targetWords.map((tw, i) => {
      const sw = spokenWords[i] || ''
      const match = tw === sw
      if (match) matches++
      return { target: tw, spoken: sw, match }
    })

    const accuracy = Math.round((matches / targetWords.length) * 100)
    const xp = accuracy >= 90 ? 5 : accuracy >= 70 ? 3 : 1

    setFeedback({
      accuracy,
      wordResults,
      xp,
      message: accuracy >= 90 ? 'ممتاز! نطق رائع 🎯'
        : accuracy >= 70 ? 'جيد جداً! استمر 💪'
        : accuracy >= 50 ? 'لا بأس — حاول مرة أخرى 🔄'
        : 'حاول مرة أخرى — استمع للنموذج أولاً 🎧',
    })

    // Award XP silently
    if (accuracy >= 50) {
      await supabase.from('xp_transactions').insert({
        student_id: profile?.id,
        amount: xp,
        reason: 'custom',
        description: 'تدريب نطق',
      })
    }
  }

  function nextItem() {
    setCurrentIndex((currentIndex + 1) % totalItems)
    setTranscript('')
    setFeedback(null)
  }

  return (
    <div className="space-y-12">
      <div>
        <h1 className="text-page-title flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center">
            <Volume2 size={20} className="text-sky-400" />
          </div>
          مدرب النطق
        </h1>
        <p className="text-muted text-sm mt-1">تدرب على النطق الصحيح واحصل على تقييم فوري</p>
        {!hasSpeechRecognition && (
          <p className="text-xs text-amber-400/80 mt-1">
            وضع Safari/iOS — يتم استخدام تقنية Whisper AI للتعرف على الكلام
          </p>
        )}
      </div>

      {/* Section toggle: Daily / More / Compare */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => { setSection('daily'); setCurrentIndex(0); setFeedback(null); setTranscript('') }}
          className={`text-sm px-4 py-2 rounded-xl transition-all duration-200 flex items-center gap-1.5 ${
            section === 'daily' ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30' : 'bg-[var(--surface-raised)] text-muted'
          }`}
        >
          <Calendar size={14} />
          تمرين اليوم
        </button>
        <button
          onClick={() => { setSection('more'); setCurrentIndex(0); setFeedback(null); setTranscript('') }}
          className={`text-sm px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
            section === 'more' ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30' : 'bg-[var(--surface-raised)] text-muted'
          }`}
        >
          <BookOpen size={14} />
          المزيد
        </button>
        <button
          onClick={() => { setSection('compare'); setFeedback(null); setTranscript('') }}
          className={`text-sm px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
            section === 'compare'
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : 'bg-[var(--surface-raised)] text-muted'
          }`}
        >
          <GitCompareArrows size={14} />
          قبل وبعد
        </button>
      </div>

      {/* ── Compare tab: Before/After ── */}
      {section === 'compare' ? (
        <AnimatePresence mode="wait">
          <motion.div
            key="compare-section"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.22 }}
          >
            {/* Compare header */}
            <div className="fl-card-static p-3 border border-emerald-500/20 bg-emerald-500/5 mb-4">
              <p className="text-xs text-emerald-400 text-center flex items-center justify-center gap-1.5">
                <GitCompareArrows size={13} />
                مقارنة أقدم تسجيل لك مع أحدث تسجيل لنفس العبارة
              </p>
            </div>
            <BeforeAfterSection
              profileId={profile?.id}
              studentName={profile?.display_name || profile?.full_name}
            />
          </motion.div>
        </AnimatePresence>
      ) : (
        <>
          {/* Mode toggle: Sentences / Words — only for daily/more tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => { setMode('sentences'); setCurrentIndex(0); setFeedback(null); setTranscript('') }}
              className={`text-sm px-4 py-2 rounded-xl transition-all ${
                mode === 'sentences' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' : 'bg-[var(--surface-raised)] text-muted'
              }`}
            >
              جمل
            </button>
            <button
              onClick={() => { setMode('words'); setCurrentIndex(0); setFeedback(null); setTranscript('') }}
              className={`text-sm px-4 py-2 rounded-xl transition-all ${
                mode === 'words' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' : 'bg-[var(--surface-raised)] text-muted'
              }`}
            >
              كلمات صعبة
            </button>
          </div>

          {/* Daily section header */}
          {section === 'daily' && (
            <div className="fl-card-static p-3 border border-violet-500/20 bg-violet-500/5">
              <p className="text-xs text-violet-400 text-center">
                <Calendar size={12} className="inline ml-1" />
                تمارين اليوم — تتغير يومياً لتغطي تحديات النطق المختلفة
              </p>
            </div>
          )}

          {/* Practice card */}
          <motion.div
            key={`${section}-${mode}-${currentIndex}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="fl-card-static p-7"
          >
            <div className="text-center mb-6">
              <p className="text-xs text-muted mb-2">{currentIndex + 1} / {totalItems}</p>
              <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2" dir="ltr">
                {currentTarget}
              </h2>
              {mode === 'words' && currentPhonetic && (
                <p className="text-sm text-muted" dir="ltr">{currentPhonetic}</p>
              )}
              {currentTip && (
                <p className="text-xs text-amber-400/80 mt-2 bg-amber-500/5 rounded-lg px-3 py-1.5 inline-block">
                  {currentTip}
                </p>
              )}

              {/* Listen button */}
              <div>
                <button
                  onClick={() => speak(currentTarget)}
                  className="mt-3 inline-flex items-center gap-2 text-sm text-sky-400 hover:text-sky-300 transition-all"
                >
                  <Play size={14} />
                  استمع للنموذج
                </button>
              </div>
            </div>

            {/* Record */}
            <div className="text-center mb-4">
              <button
                onClick={isListening ? stopListening : startListening}
                disabled={isTranscribing}
                className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto transition-all ${
                  isTranscribing
                    ? 'bg-amber-500/20 border-2 border-amber-500/40 cursor-wait'
                    : isListening
                      ? 'bg-red-500 animate-pulse shadow-lg shadow-red-500/30'
                      : 'bg-violet-500/20 border-2 border-violet-500/40 hover:bg-violet-500/30'
                }`}
              >
                {isTranscribing
                  ? <Loader2 size={24} className="text-amber-400 animate-spin" />
                  : isListening
                    ? <MicOff size={24} className="text-white" />
                    : <Mic size={24} className="text-violet-400" />}
              </button>
              <p className="text-muted text-xs mt-2">
                {isTranscribing
                  ? 'جاري تحليل الكلام...'
                  : isListening
                    ? 'يسمعك... تحدث الآن — اضغط مرة أخرى للإيقاف'
                    : 'اضغط وانطق الجملة'}
              </p>
            </div>

            {/* Transcript */}
            {transcript && (
              <div className="bg-[var(--surface-raised)] rounded-xl p-3 text-center mb-4">
                <p className="text-xs text-muted mb-1">ما سمعناه:</p>
                <p className="text-sm text-[var(--text-primary)]" dir="ltr">{transcript}</p>
              </div>
            )}

            {/* Feedback */}
            {feedback && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-3"
              >
                <div className={`text-center p-3 rounded-xl ${
                  feedback.accuracy >= 90 ? 'bg-emerald-500/10 border border-emerald-500/20' :
                  feedback.accuracy >= 70 ? 'bg-sky-500/10 border border-sky-500/20' :
                  'bg-gold-500/10 border border-gold-500/20'
                }`}>
                  <p className={`text-2xl font-bold ${
                    feedback.accuracy >= 90 ? 'text-emerald-400' : feedback.accuracy >= 70 ? 'text-sky-400' : 'text-gold-400'
                  }`}>{feedback.accuracy}%</p>
                  <p className="text-sm text-[var(--text-primary)] mt-1">{feedback.message}</p>
                  {feedback.xp > 0 && <p className="text-xs text-violet-400 mt-1">+{feedback.xp} XP</p>}
                </div>

                {/* Word-by-word comparison */}
                {feedback.wordResults.length > 0 && (
                  <div className="flex flex-wrap gap-2 justify-center" dir="ltr">
                    {feedback.wordResults.map((w, i) => (
                      <span
                        key={i}
                        className={`text-sm px-2 py-1 rounded-lg ${
                          w.match ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                        }`}
                      >
                        {w.match ? <CheckCircle2 size={10} className="inline mr-1" /> : <XCircle size={10} className="inline mr-1" />}
                        {w.target}
                      </span>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* Next button */}
            <div className="flex gap-2 mt-4">
              <button onClick={() => { setFeedback(null); setTranscript('') }} className="flex-1 text-sm py-2.5 rounded-xl bg-[var(--surface-raised)] text-muted hover:text-[var(--text-primary)] transition-all">
                <RefreshCw size={14} className="inline ml-1" />
                إعادة
              </button>
              <button onClick={nextItem} className="flex-1 btn-primary text-sm py-2.5">
                التالي
                <ArrowLeft size={14} className="inline mr-1" />
              </button>
            </div>
          </motion.div>
        </>
      )}
    </div>
  )
}
