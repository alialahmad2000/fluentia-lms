import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'

export default function AccountPausedPage() {
  // ── ALL HOOKS FIRST ──────────────────────────────────────────────
  const { profile, signOut } = useAuthStore()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  const waLink = `https://wa.me/966558669974?text=${encodeURIComponent('اشتراكي في أكاديمية طلاقة متوقف - أحتاج استفسار')}`

  return (
    <div
      dir="rtl"
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(ellipse at 50% 0%, rgba(20,10,50,0.98) 0%, rgb(2,6,23) 60%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        fontFamily: "'Tajawal', sans-serif",
      }}
    >
      {/* Logo */}
      <div style={{ marginBottom: '40px', fontSize: '22px', fontWeight: 900, color: 'rgba(248,250,252,0.9)', letterSpacing: '1px' }}>
        طلاقة
      </div>

      {/* Glass card */}
      <div style={{
        width: '100%',
        maxWidth: '440px',
        borderRadius: '24px',
        padding: '40px 32px',
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(12px)',
        textAlign: 'center',
      }}>
        {/* Icon */}
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>🌙</div>

        {/* Title */}
        <h1 style={{
          margin: '0 0 12px',
          fontSize: '22px',
          fontWeight: 800,
          color: 'rgba(248,250,252,0.95)',
        }}>
          حسابك متوقف مؤقتاً
        </h1>

        {/* Body */}
        <p style={{
          margin: '0 0 28px',
          fontSize: '14px',
          lineHeight: 1.9,
          color: 'rgba(148,163,184,0.9)',
        }}>
          عزيزتي{profile?.full_name ? ` ${profile.full_name}` : ''},
          <br />
          حسابك في أكاديمية طلاقة متوقف حالياً.
          <br />
          بياناتك محفوظة بالكامل لو قررتِ العودة في أي وقت.
          <br /><br />
          لو فيه أي استفسار أو حابة تستأنفي رحلتك معنا،
          <br />
          تواصلي معنا:
          <br /><br />
          <span style={{ color: 'rgba(248,250,252,0.7)' }}>📱 واتساب: </span>
          <span style={{ color: 'rgba(248,250,252,0.9)', fontWeight: 700 }}>+966 55 866 9974</span>
          <br />
          <span style={{ color: 'rgba(248,250,252,0.7)' }}>📧 إيميل: </span>
          <span style={{ color: 'rgba(248,250,252,0.9)', fontWeight: 700 }}>hello@fluentia.academy</span>
          <br /><br />
          <span style={{ color: 'rgba(148,163,184,0.7)' }}>شاكرين ثقتك بنا ❤️</span>
          <br />
          <span style={{ color: 'rgba(148,163,184,0.5)', fontSize: '13px' }}>— فريق طلاقة</span>
        </p>

        {/* WhatsApp CTA */}
        <a
          href={waLink}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            width: '100%',
            height: '48px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #25d366, #128c7e)',
            color: '#fff',
            fontSize: '14px',
            fontWeight: 700,
            textDecoration: 'none',
            marginBottom: '16px',
            fontFamily: "'Tajawal', sans-serif",
          }}
        >
          تواصلي معنا على واتساب
        </a>

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '13px',
            color: 'rgba(148,163,184,0.5)',
            fontFamily: "'Tajawal', sans-serif",
            textDecoration: 'underline',
          }}
        >
          تسجيل الخروج
        </button>
      </div>
    </div>
  )
}
