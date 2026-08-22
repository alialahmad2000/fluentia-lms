import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, X, Copy, Check, Share, Plus, Smartphone, Monitor } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { usePWAInstall } from '../../hooks/usePWAInstall'
import { useAuthStore } from '../../stores/authStore'

/**
 * Bilingual, because for a phone-only staff member this gate IS the product:
 * it is what puts the app on the home screen and turns push notifications on.
 * It was entirely Arabic, so the learning coach — hired precisely because he
 * works from his phone, and unable to read a word of Arabic — met an
 * instruction screen he could not follow before he ever saw the console.
 *
 * Keyed on profiles.ui_language, like the forced password change. Every Arabic
 * account renders byte-identically to before.
 */
const COPY = {
  ar: {
    title: 'ثبّت تطبيق Fluentia',
    subtitle: 'عشان توصلك الإشعارات وتفتح التطبيق بسرعة',
    later: 'تذكيرني لاحقاً',
    nativeBlurb: 'احصل على أفضل تجربة تعلم — ثبّت التطبيق على جهازك بنقرة واحدة',
    installNow: 'ثبّت الآن',
    menuOpen: 'افتح قائمة المتصفح',
    menuChoose: 'اختر',
    menuInstallApp: '"تثبيت التطبيق"',
    iphoneTitle: 'ثبّت Fluentia على آيفونك في 3 خطوات:',
    ipadTitle: 'ثبّت Fluentia على آيبادك في 3 خطوات:',
    tapShare: 'اضغط زر المشاركة',
    inThe: 'في',
    bottomOfScreen: 'أسفل الشاشة',
    topOfScreen: 'أعلى الشاشة',
    besideAddressBar: '(بجانب شريط العنوان)',
    scrollAndChoose: 'مرر للأسفل واختر',
    choose: 'اختر',
    addToHome: '"إضافة إلى الشاشة الرئيسية"',
    tap: 'اضغط',
    add: '"إضافة"',
    atTop: 'في الأعلى',
    afterInstall: 'بعد التثبيت، افتح التطبيق من شاشتك الرئيسية وفعّل الإشعارات.',
    safariOnly: 'متصفحك الحالي لا يدعم تثبيت التطبيقات على iPhone/iPad (قيد من Apple). استخدم Safari.',
    copyLink: 'انسخ هذا الرابط:',
    openSafari: 'افتح',
    pasteAndInstall: 'الصق الرابط وثبّت التطبيق من هناك',
    unsupported1: 'لتثبيت التطبيق، استخدم متصفح',
    unsupportedOr: 'أو',
    macTitle: 'ثبّت Fluentia على Mac:',
    macMenu: 'من شريط القوائم:',
    macTap: 'اضغط',
  },
  en: {
    title: 'Install the Fluentia app',
    subtitle: 'So notifications reach you and the app opens instantly',
    later: 'Remind me later',
    nativeBlurb: 'Install it on your device in one tap — notifications and offline access.',
    installNow: 'Install now',
    menuOpen: 'Open the browser menu',
    menuChoose: 'Choose',
    menuInstallApp: '"Install app"',
    iphoneTitle: 'Add Fluentia to your iPhone in 3 steps:',
    ipadTitle: 'Add Fluentia to your iPad in 3 steps:',
    tapShare: 'Tap the Share button',
    inThe: 'at the',
    bottomOfScreen: 'bottom of the screen',
    topOfScreen: 'top of the screen',
    besideAddressBar: '(next to the address bar)',
    scrollAndChoose: 'Scroll down and choose',
    choose: 'Choose',
    addToHome: '"Add to Home Screen"',
    tap: 'Tap',
    add: '"Add"',
    atTop: 'at the top',
    afterInstall: 'Once installed, open it from your home screen and allow notifications.',
    safariOnly: 'This browser cannot install apps on iPhone or iPad — an Apple restriction. Use Safari.',
    copyLink: 'Copy this link:',
    openSafari: 'Open',
    pasteAndInstall: 'Paste the link and install from there',
    unsupported1: 'To install the app, use',
    unsupportedOr: 'or',
    macTitle: 'Add Fluentia to your Mac:',
    macMenu: 'From the menu bar:',
    macTap: 'Click',
  },
}

const EXCLUDED_ROUTES = ['/login', '/signup', '/reset-password', '/install']

function ShareIcon({ className }) {
  // iOS Share button SVG (square with arrow pointing up)
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} width={18} height={18}>
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  )
}

function StepNumber({ n }) {
  return (
    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: 'rgba(56,189,248,0.15)' }}>
      <span className="text-xs font-bold" style={{ color: 'var(--accent-sky)' }}>{n}</span>
    </div>
  )
}

function StepText({ children }) {
  return <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{children}</p>
}

// ─── Case 1: Native prompt (Android Chrome, Desktop Chrome/Edge) ──────
function NativePromptContent({ hasNativePrompt, onInstall, c }) {
  return (
    <div className="space-y-4 text-center">
      <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        {c.nativeBlurb}
      </p>
      {hasNativePrompt ? (
        <button
          onClick={onInstall}
          className="w-full h-12 rounded-xl text-sm font-bold transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2"
          style={{ background: 'linear-gradient(135deg, var(--accent-sky), var(--accent-violet))', color: '#fff' }}
        >
          <Download size={18} />
          {c.installNow}
        </button>
      ) : (
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <StepNumber n={1} />
            <StepText>
              {c.menuOpen} <span className="inline-block mx-1 align-middle">⋮</span>
            </StepText>
          </div>
          <div className="flex items-start gap-3">
            <StepNumber n={2} />
            <StepText>
              {c.menuChoose} <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{c.menuInstallApp}</span>
            </StepText>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Case 2: iPhone Safari (Share at bottom) ──────────────────────────
function IOSShareBottomContent({ c }) {
  return (
    <div className="space-y-4">
      <p className="text-sm font-medium text-center" style={{ color: 'var(--text-secondary)' }}>
        {c.iphoneTitle}
      </p>
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <StepNumber n={1} />
          <StepText>
            {c.tapShare} <ShareIcon className="inline text-sky-400 mx-1 align-middle" /> {c.inThe} <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{c.bottomOfScreen}</span>
          </StepText>
        </div>
        <div className="flex items-start gap-3">
          <StepNumber n={2} />
          <StepText>
            {c.scrollAndChoose} <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{c.addToHome}</span> <Plus size={14} className="inline text-sky-400 mx-1 align-middle" />
          </StepText>
        </div>
        <div className="flex items-start gap-3">
          <StepNumber n={3} />
          <StepText>
            {c.tap} <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{c.add}</span> {c.atTop}
          </StepText>
        </div>
      </div>
      <p className="text-xs text-center mt-2" style={{ color: 'var(--text-tertiary)' }}>
        {c.afterInstall}
      </p>
    </div>
  )
}

// ─── Case 3: iPad Safari (Share at top) ───────────────────────────────
function IPadShareTopContent({ c }) {
  return (
    <div className="space-y-4">
      <p className="text-sm font-medium text-center" style={{ color: 'var(--text-secondary)' }}>
        {c.ipadTitle}
      </p>
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <StepNumber n={1} />
          <StepText>
            {c.tapShare} <ShareIcon className="inline text-sky-400 mx-1 align-middle" /> {c.inThe} <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{c.topOfScreen}</span> {c.besideAddressBar}
          </StepText>
        </div>
        <div className="flex items-start gap-3">
          <StepNumber n={2} />
          <StepText>
            {c.choose} <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{c.addToHome}</span> <Plus size={14} className="inline text-sky-400 mx-1 align-middle" />
          </StepText>
        </div>
        <div className="flex items-start gap-3">
          <StepNumber n={3} />
          <StepText>
            {c.tap} <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{c.add}</span>
          </StepText>
        </div>
      </div>
      <p className="text-xs text-center mt-2" style={{ color: 'var(--text-tertiary)' }}>
        {c.afterInstall}
      </p>
    </div>
  )
}

// ─── Case 4: iOS Chrome/Firefox/Edge (switch to Safari) ───────────────
function SwitchToSafariContent({ c }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText('app.fluentia.academy').then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {})
  }, [])

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)' }}>
        <span className="text-sm" style={{ color: 'var(--accent-gold, #f59e0b)' }}>
          {c.safariOnly}
        </span>
      </div>
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <StepNumber n={1} />
          <div className="flex-1">
            <StepText>{c.copyLink}</StepText>
            <div className="flex items-center gap-2 mt-1.5 px-3 py-2 rounded-lg" style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)' }}>
              <span className="text-xs flex-1 font-mono" style={{ color: 'var(--text-primary)' }}>app.fluentia.academy</span>
              <button
                onClick={handleCopy}
                className="p-1.5 rounded-lg transition-all hover:scale-105 active:scale-95"
                style={{ color: copied ? '#10b981' : 'var(--accent-sky)' }}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </div>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <StepNumber n={2} />
          <StepText>{c.openSafari} <span className="font-bold" style={{ color: 'var(--text-primary)' }}>Safari</span></StepText>
        </div>
        <div className="flex items-start gap-3">
          <StepNumber n={3} />
          <StepText>{c.pasteAndInstall}</StepText>
        </div>
      </div>
    </div>
  )
}

// ─── Case 5: Unsupported browser (Firefox desktop, etc.) ──────────────
function UnsupportedBrowserContent({ c }) {
  return (
    <div className="text-center space-y-2">
      <Monitor size={24} className="mx-auto" style={{ color: 'var(--text-tertiary)' }} />
      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
        {c.unsupported1} <span className="font-bold" style={{ color: 'var(--text-primary)' }}>Chrome</span> {c.unsupportedOr} <span className="font-bold" style={{ color: 'var(--text-primary)' }}>Edge</span>.
      </p>
    </div>
  )
}

// ─── Case 6: macOS Safari ─────────────────────────────────────────────
function MacOSDockContent({ c }) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-center" style={{ color: 'var(--text-secondary)' }}>
        {c.macTitle}
      </p>
      <div className="flex items-start gap-3">
        <StepNumber n={1} />
        <StepText>
          {c.macMenu} <span className="font-bold" style={{ color: 'var(--text-primary)' }}>File</span> → <span className="font-bold" style={{ color: 'var(--text-primary)' }}>Add to Dock</span>
        </StepText>
      </div>
      <div className="flex items-start gap-3">
        <StepNumber n={2} />
        <StepText>
          {c.macTap} <span className="font-bold" style={{ color: 'var(--text-primary)' }}>Add</span>
        </StepText>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
// Main Gate Component
// ═══════════════════════════════════════════════════════════════════════
export default function PWAInstallGate() {
  const { device, shouldShow, hasNativePrompt, triggerNativeInstall, dismiss } = usePWAInstall()
  const location = useLocation()
  const uiLanguage = useAuthStore((s) => s.profile?.ui_language)
  const c = COPY[uiLanguage === 'en' ? 'en' : 'ar']

  // The fixed mobile bottom nav sits in a stacking context this gate cannot
  // out-rank from inside the content shell — it swallowed taps on "Remind me
  // later", so on a phone the gate could not be dismissed at all and the app
  // was unreachable. index.css already hides the nav for `body.modal-open`;
  // the gate simply never set it.
  const gateVisible = shouldShow && !EXCLUDED_ROUTES.some(r => location.pathname.startsWith(r))
  useEffect(() => {
    if (!gateVisible) return undefined
    document.body.classList.add('modal-open')
    return () => document.body.classList.remove('modal-open')
  }, [gateVisible])

  // Don't render on excluded routes
  if (EXCLUDED_ROUTES.some(r => location.pathname.startsWith(r))) return null
  if (!shouldShow) return null

  const handleNativeInstall = async () => {
    const result = await triggerNativeInstall()
    if (result.outcome === 'accepted') {
      dismiss()
    }
  }

  const isMobile = ['iphone', 'ipad', 'android_phone', 'android_tablet'].includes(device.type)

  const content = (() => {
    switch (device.installMethod) {
      case 'native_prompt':
        return <NativePromptContent hasNativePrompt={hasNativePrompt} onInstall={handleNativeInstall} c={c} />
      case 'ios_share_bottom':
        return <IOSShareBottomContent c={c} />
      case 'ios_share_top':
        return <IPadShareTopContent c={c} />
      case 'switch_to_safari':
        return <SwitchToSafariContent c={c} />
      case 'macos_dock':
        return <MacOSDockContent c={c} />
      default:
        return <UnsupportedBrowserContent c={c} />
    }
  })()

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9998] flex items-end sm:items-center justify-center"
        style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
        dir={uiLanguage === 'en' ? 'ltr' : 'rtl'}
      >
        <motion.div
          initial={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.95 }}
          animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1 }}
          exit={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.95 }}
          transition={isMobile ? { type: 'spring', damping: 30, stiffness: 400 } : { duration: 0.2 }}
          className={
            isMobile
              ? 'w-full rounded-t-3xl p-6 pb-10'
              : 'w-full max-w-md rounded-2xl p-6 sm:p-8 mx-4'
          }
          style={{ background: 'var(--surface-base)', border: '1px solid var(--border-subtle)' }}
        >
          {/* Close button */}
          <button
            onClick={dismiss}
            className="absolute top-4 left-4 p-2 rounded-lg transition-all"
            style={{ color: 'var(--text-tertiary)' }}
          >
            <X size={18} />
          </button>

          {/* Handle (mobile) */}
          {isMobile && (
            <div className="flex justify-center mb-4">
              <div className="w-10 h-1 rounded-full" style={{ background: 'var(--border-default)' }} />
            </div>
          )}

          {/* Header */}
          <div className="text-center mb-5">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: 'rgba(56,189,248,0.1)' }}>
              <Smartphone size={24} className="text-sky-400" />
            </div>
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              {c.title}
            </h2>
            <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
              {c.subtitle}
            </p>
          </div>

          {/* Device-specific content */}
          {content}

          {/* Dismiss button */}
          <button
            onClick={dismiss}
            className="w-full mt-5 py-3 rounded-xl text-sm font-medium transition-all"
            style={{ color: 'var(--text-tertiary)', border: '1px solid var(--border-subtle)' }}
          >
            {c.later}
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
