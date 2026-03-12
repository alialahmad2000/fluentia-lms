import { useState, useRef, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Mic, MicOff, Volume2, Loader2, Zap, RefreshCw,
  CheckCircle2, XCircle, Play, ArrowLeft, Calendar, BookOpen,
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'

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

export default function StudentPronunciation() {
  const { profile, studentData } = useAuthStore()
  const [section, setSection] = useState('daily') // daily | more
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
    const { data: { session } } = await supabase.auth.getSession()
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

    // Call whisper-transcribe edge function
    const res = await supabase.functions.invoke('whisper-transcribe', {
      body: { voice_url: fileName, duration_seconds: 10 },
      headers: { Authorization: `Bearer ${session.access_token}` },
    })

    if (res.error) throw new Error(res.error.message)
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
    const target = currentTarget.toLowerCase().replace(/[.,!?']/g, '').trim()
    const spokenClean = spoken.toLowerCase().replace(/[.,!?']/g, '').trim()

    const targetWords = target.split(/\s+/)
    const spokenWords = spokenClean.split(/\s+/)

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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Volume2 size={24} className="text-sky-400" />
          مدرب النطق
        </h1>
        <p className="text-muted text-sm mt-1">تدرب على النطق الصحيح واحصل على تقييم فوري</p>
        {!hasSpeechRecognition && (
          <p className="text-xs text-amber-400/80 mt-1">
            وضع Safari/iOS — يتم استخدام تقنية Whisper AI للتعرف على الكلام
          </p>
        )}
      </div>

      {/* Section toggle: Daily / More */}
      <div className="flex gap-2">
        <button
          onClick={() => { setSection('daily'); setCurrentIndex(0); setFeedback(null); setTranscript('') }}
          className={`text-sm px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
            section === 'daily' ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30' : 'bg-white/5 text-muted'
          }`}
        >
          <Calendar size={14} />
          تمرين اليوم
        </button>
        <button
          onClick={() => { setSection('more'); setCurrentIndex(0); setFeedback(null); setTranscript('') }}
          className={`text-sm px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
            section === 'more' ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30' : 'bg-white/5 text-muted'
          }`}
        >
          <BookOpen size={14} />
          المزيد
        </button>
      </div>

      {/* Mode toggle: Sentences / Words */}
      <div className="flex gap-2">
        <button
          onClick={() => { setMode('sentences'); setCurrentIndex(0); setFeedback(null); setTranscript('') }}
          className={`text-sm px-4 py-2 rounded-xl transition-all ${
            mode === 'sentences' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' : 'bg-white/5 text-muted'
          }`}
        >
          جمل
        </button>
        <button
          onClick={() => { setMode('words'); setCurrentIndex(0); setFeedback(null); setTranscript('') }}
          className={`text-sm px-4 py-2 rounded-xl transition-all ${
            mode === 'words' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' : 'bg-white/5 text-muted'
          }`}
        >
          كلمات صعبة
        </button>
      </div>

      {/* Daily section header */}
      {section === 'daily' && (
        <div className="glass-card p-3 border border-violet-500/20 bg-violet-500/5">
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
        className="glass-card p-6"
      >
        <div className="text-center mb-6">
          <p className="text-[10px] text-muted mb-2">{currentIndex + 1} / {totalItems}</p>
          <h2 className="text-2xl font-bold text-white mb-2" dir="ltr">
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
          <div className="bg-white/5 rounded-xl p-3 text-center mb-4">
            <p className="text-xs text-muted mb-1">ما سمعناه:</p>
            <p className="text-sm text-white" dir="ltr">{transcript}</p>
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
              <p className="text-sm text-white mt-1">{feedback.message}</p>
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
          <button onClick={() => { setFeedback(null); setTranscript('') }} className="flex-1 text-sm py-2.5 rounded-xl bg-white/5 text-muted hover:text-white transition-all">
            <RefreshCw size={14} className="inline ml-1" />
            إعادة
          </button>
          <button onClick={nextItem} className="flex-1 btn-primary text-sm py-2.5">
            التالي
            <ArrowLeft size={14} className="inline mr-1" />
          </button>
        </div>
      </motion.div>
    </div>
  )
}
