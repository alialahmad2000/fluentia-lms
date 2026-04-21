import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";

export default function PartnerSetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sessionReady, setSessionReady] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSessionReady(!!session);
      setChecking(false);
    };
    check();
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionReady(!!session);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const handleSubmit = async () => {
    setError("");
    if (password.length < 8) return setError("كلمة المرور لازم 8 أحرف على الأقل");
    if (password !== confirmPw) return setError("كلمتا المرور غير متطابقتين");
    setLoading(true);
    const { error: updErr } = await supabase.auth.updateUser({ password });
    if (updErr) {
      setError(updErr.message || "فشل تعيين كلمة المرور");
      setLoading(false);
      return;
    }
    navigate("/partner", { replace: true });
  };

  if (checking) {
    return (
      <div dir="rtl" style={{ minHeight: "100vh", background: "#0b1628", color: "#e5e7eb", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div>جارٍ التحقق من الرابط...</div>
      </div>
    );
  }

  if (!sessionReady) {
    return (
      <div dir="rtl" style={{ minHeight: "100vh", background: "#0b1628", color: "#e5e7eb", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
        <div style={{ maxWidth: 480, textAlign: "center", background: "#111d35", padding: 32, borderRadius: 16, border: "1px solid #1f2d4a" }}>
          <h1 style={{ color: "#fbbf24", fontSize: 24, margin: "0 0 12px" }}>انتهت صلاحية الرابط</h1>
          <p style={{ color: "#94a3b8", lineHeight: 1.8, margin: "0 0 20px" }}>
            رابط الدخول صالح لساعة واحدة ومرة واحدة فقط. اطلب من الإدارة إعادة إرسال الرابط، أو تواصل معنا على واتساب +966558669974.
          </p>
          <a href="/partner/login" style={{ display: "inline-block", background: "linear-gradient(90deg,#fbbf24,#f59e0b)", color: "#0b1628", padding: "12px 28px", borderRadius: 10, textDecoration: "none", fontWeight: 700 }}>
            تسجيل الدخول بكلمة المرور
          </a>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" style={{ minHeight: "100vh", background: "#0b1628", color: "#e5e7eb", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", fontFamily: "'Tajawal','Segoe UI',sans-serif" }}>
      <div style={{ maxWidth: 480, width: "100%", background: "#111d35", padding: 32, borderRadius: 16, border: "1px solid #1f2d4a" }}>
        <h1 style={{ color: "#fbbf24", fontSize: 28, margin: "0 0 8px" }}>أهلاً بك في بوابة الشركاء 🎉</h1>
        <p style={{ color: "#94a3b8", margin: "0 0 28px", lineHeight: 1.7 }}>
          عيّن كلمة المرور لحسابك لتتمكن من الدخول لاحقاً متى ما تشاء.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ display: "block", marginBottom: 8, color: "#cbd5e1", fontSize: 14 }}>كلمة المرور الجديدة</label>
            <input
              type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="8 أحرف على الأقل"
              style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid #1f2d4a", background: "#0b1628", color: "#e5e7eb", fontSize: 16, direction: "ltr", textAlign: "right", boxSizing: "border-box" }}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: 8, color: "#cbd5e1", fontSize: 14 }}>تأكيد كلمة المرور</label>
            <input
              type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)}
              style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid #1f2d4a", background: "#0b1628", color: "#e5e7eb", fontSize: 16, direction: "ltr", textAlign: "right", boxSizing: "border-box" }}
            />
          </div>
          {error && <div style={{ color: "#fca5a5", fontSize: 14 }}>{error}</div>}
          <button
            onClick={handleSubmit} disabled={loading}
            style={{ padding: "14px 20px", borderRadius: 10, border: "none", background: loading ? "#64748b" : "linear-gradient(90deg,#fbbf24,#f59e0b)", color: "#0b1628", fontWeight: 700, fontSize: 16, cursor: loading ? "not-allowed" : "pointer" }}
          >
            {loading ? "جارٍ الحفظ..." : "حفظ والدخول للوحة التحكم"}
          </button>
        </div>
      </div>
    </div>
  );
}
