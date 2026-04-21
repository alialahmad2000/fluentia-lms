import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";

export default function PartnerLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState("password"); // "password" | "forgot"
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const handlePasswordLogin = async () => {
    setErr(""); setMsg(""); setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return setErr("بيانات الدخول غير صحيحة");
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).single();
    if (profile?.role !== "affiliate") {
      await supabase.auth.signOut();
      return setErr("هذا الحساب ليس حساب مسوّق. تواصل مع الإدارة.");
    }
    navigate("/partner", { replace: true });
  };

  const handleForgot = async () => {
    setErr(""); setMsg(""); setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "https://app.fluentia.academy/partner/set-password",
    });
    setLoading(false);
    if (error) return setErr("فشل إرسال الرابط — تأكد من الإيميل");
    setMsg("تم إرسال رابط إعادة تعيين كلمة المرور إلى إيميلك. تحقق من صندوق الوارد.");
  };

  return (
    <div dir="rtl" style={{ minHeight: "100vh", background: "#0b1628", color: "#e5e7eb", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", fontFamily: "'Tajawal','Segoe UI',sans-serif" }}>
      <div style={{ maxWidth: 440, width: "100%", background: "#111d35", padding: 32, borderRadius: 16, border: "1px solid #1f2d4a" }}>
        <h1 style={{ color: "#fbbf24", fontSize: 26, margin: "0 0 8px", textAlign: "center" }}>بوابة الشركاء</h1>
        <p style={{ color: "#94a3b8", margin: "0 0 28px", textAlign: "center", fontSize: 14 }}>
          {mode === "password" ? "سجّل دخول لحسابك كشريك" : "سنرسل رابط إعادة تعيين إلى إيميلك"}
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <input
            type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="البريد الإلكتروني"
            style={{ padding: "12px 14px", borderRadius: 10, border: "1px solid #1f2d4a", background: "#0b1628", color: "#e5e7eb", fontSize: 15, direction: "ltr", textAlign: "right", boxSizing: "border-box" }}
          />

          {mode === "password" && (
            <input
              type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="كلمة المرور"
              style={{ padding: "12px 14px", borderRadius: 10, border: "1px solid #1f2d4a", background: "#0b1628", color: "#e5e7eb", fontSize: 15, direction: "ltr", textAlign: "right", boxSizing: "border-box" }}
            />
          )}

          {err && <div style={{ color: "#fca5a5", fontSize: 14 }}>{err}</div>}
          {msg && <div style={{ color: "#86efac", fontSize: 14 }}>{msg}</div>}

          <button
            onClick={mode === "password" ? handlePasswordLogin : handleForgot}
            disabled={loading || !email || (mode === "password" && !password)}
            style={{ padding: "14px 20px", borderRadius: 10, border: "none", background: loading ? "#64748b" : "linear-gradient(90deg,#fbbf24,#f59e0b)", color: "#0b1628", fontWeight: 700, fontSize: 16, cursor: loading ? "not-allowed" : "pointer" }}
          >
            {loading ? "..." : mode === "password" ? "دخول" : "أرسل رابط الاستعادة"}
          </button>

          <button
            onClick={() => { setMode(mode === "password" ? "forgot" : "password"); setErr(""); setMsg(""); }}
            style={{ background: "transparent", border: "none", color: "#7dd3fc", fontSize: 14, cursor: "pointer", marginTop: 4 }}
          >
            {mode === "password" ? "نسيت كلمة المرور؟" : "العودة لتسجيل الدخول"}
          </button>
        </div>

        <p style={{ color: "#64748b", fontSize: 12, textAlign: "center", marginTop: 24, lineHeight: 1.7 }}>
          للتواصل مع الإدارة: +966558669974
        </p>
      </div>
    </div>
  );
}
