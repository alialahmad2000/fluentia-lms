import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  sendResend,
  applicationReceivedEmail,
  adminNewApplicationEmail,
  ADMIN_EMAIL_ADDRESS,
} from "../_shared/affiliate-emails.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });

// Generate ref_code: first 3 alpha chars of name + 4-digit random, unique-retried
async function generateRefCode(supabase: any, fullName: string): Promise<string> {
  const base =
    fullName
      .replace(/[^a-zA-Z\u0600-\u06FF]/g, "")
      .replace(/[\u0600-\u06FF]/g, "") // strip Arabic — needs ASCII for code
      .slice(0, 3)
      .toUpperCase() || "PAR";
  const prefix = base.length >= 3 ? base : (base + "PAR").slice(0, 3);
  for (let i = 0; i < 20; i++) {
    const code = `${prefix}${Math.floor(1000 + Math.random() * 9000)}`.slice(0, 12);
    const { data } = await supabase
      .from("affiliates")
      .select("id")
      .eq("ref_code", code)
      .maybeSingle();
    if (!data) return code;
  }
  throw new Error("ref_code generation exhausted");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  try {
    const body = await req.json();
    const {
      full_name,
      email,
      phone,
      city,
      audience_size,
      heard_from,
      reason,
      why_join, // accept both field names from the form
      twitter,
      instagram,
      tiktok,
      snapchat,
      website,
      honeypot,
    } = body ?? {};

    // ─── Spam trap ────────────────────────────────────────────────────────
    if (honeypot && typeof honeypot === "string" && honeypot.trim() !== "") {
      return json({ success: true, ref_code: "SPAM" });
    }

    // ─── Validation ───────────────────────────────────────────────────────
    if (!full_name || typeof full_name !== "string" || full_name.trim().length < 2) {
      return json({ error: "الاسم مطلوب" }, 400);
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) {
      return json({ error: "إيميل غير صالح" }, 400);
    }
    if (!phone || typeof phone !== "string" || phone.trim().length < 6) {
      return json({ error: "رقم الجوال مطلوب" }, 400);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const normalizedEmail = String(email).toLowerCase().trim();
    const applicationReason = reason || why_join || null;

    // ─── Duplicate-submission check ───────────────────────────────────────
    const { data: existing } = await admin
      .from("affiliates")
      .select("id, status")
      .ilike("email", normalizedEmail)
      .maybeSingle();
    if (existing) {
      if (existing.status === "pending") {
        return json({ error: "طلبك السابق بهذا الإيميل لا يزال قيد المراجعة." }, 409);
      }
      if (existing.status === "approved") {
        return json(
          {
            error:
              "هذا الإيميل مسجّل مسبقاً كشريك. ادخل على بوابة الشركاء بدلاً من التقديم من جديد.",
          },
          409
        );
      }
      // rejected / suspended → allow re-application (update existing row)
    }

    // ─── Generate ref_code and insert/update ──────────────────────────────
    const ref_code = await generateRefCode(admin, String(full_name));
    const payload = {
      full_name: String(full_name).trim(),
      email: normalizedEmail,
      phone: String(phone).trim(),
      city: city ? String(city).trim() : null,
      audience_size: audience_size != null ? Number(audience_size) : null,
      heard_from: heard_from ? String(heard_from).trim() : null,
      why_join: applicationReason ? String(applicationReason).trim() : null,
      social_handles: {
        twitter: twitter || null,
        instagram: instagram || null,
        tiktok: tiktok || null,
        snapchat: snapchat || null,
        website: website || null,
      },
      ref_code,
      status: "pending",
      terms_accepted_at: new Date().toISOString(),
    };

    let affiliateId: string;
    if (existing) {
      const { data: upd, error } = await admin
        .from("affiliates")
        .update(payload)
        .eq("id", existing.id)
        .select("id")
        .single();
      if (error) {
        console.error("re-apply update failed:", error);
        return json({ error: "فشل حفظ الطلب", detail: error.message }, 500);
      }
      affiliateId = upd.id;
    } else {
      const { data: ins, error } = await admin
        .from("affiliates")
        .insert(payload)
        .select("id")
        .single();
      if (error) {
        console.error("insert failed:", error);
        return json({ error: "فشل حفظ الطلب", detail: error.message }, 500);
      }
      affiliateId = ins.id;
    }

    // ─── Fire both emails in parallel ─────────────────────────────────────
    const applicantTpl = applicationReceivedEmail({ full_name: payload.full_name });
    const adminTpl = adminNewApplicationEmail({
      id: affiliateId,
      full_name: payload.full_name,
      email: payload.email,
      phone: payload.phone,
      city: payload.city,
      audience_size: payload.audience_size,
      heard_from: payload.heard_from,
      reason: applicationReason ? String(applicationReason).trim() : null,
      ref_code,
    });

    const emailResults = await Promise.allSettled([
      sendResend({ to: payload.email, subject: applicantTpl.subject, html: applicantTpl.html }),
      sendResend({
        to: ADMIN_EMAIL_ADDRESS,
        subject: adminTpl.subject,
        html: adminTpl.html,
        replyTo: payload.email,
      }),
    ]);
    emailResults.forEach((r, i) => {
      if (r.status === "rejected") {
        console.error(`email ${i === 0 ? "applicant" : "admin"} failed:`, r.reason);
      }
    });

    return json({
      success: true,
      ref_code,
      affiliate_id: affiliateId,
      emails: {
        applicant_sent: emailResults[0].status === "fulfilled",
        admin_sent: emailResults[1].status === "fulfilled",
      },
    });
  } catch (e) {
    console.error("submit-affiliate-application error:", e);
    return json({ error: "internal error", detail: String(e) }, 500);
  }
});
