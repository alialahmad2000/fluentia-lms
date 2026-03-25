import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const INACTIVE_DAYS = 3;
    const cutoff = new Date(Date.now() - INACTIVE_DAYS * 24 * 60 * 60 * 1000).toISOString();

    // Find students inactive for 3+ days
    const { data: inactiveStudents, error: studErr } = await supabase
      .from("students")
      .select("id, profiles(display_name, full_name), group_id, groups(trainer_id)")
      .eq("status", "active")
      .lt("last_active_at", cutoff);

    if (studErr) throw studErr;
    if (!inactiveStudents || inactiveStudents.length === 0) {
      return new Response(
        JSON.stringify({ message: "No inactive students found", count: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get all admin IDs
    const { data: admins } = await supabase
      .from("profiles")
      .select("id")
      .eq("role", "admin");

    const adminIds = (admins || []).map((a: any) => a.id);

    // Build notifications
    const notifications: any[] = [];
    const alreadyNotified = new Set<string>();

    for (const student of inactiveStudents) {
      const name = (student as any).profiles?.display_name || (student as any).profiles?.full_name || "طالب";
      const trainerId = (student as any).groups?.trainer_id;
      const daysSince = Math.floor((Date.now() - new Date(cutoff).getTime()) / (1000 * 60 * 60 * 24)) + INACTIVE_DAYS;

      const title = `⚠️ ${name} لم يدخل النظام`;
      const body = `${name} لم يدخل النظام منذ أكثر من ${INACTIVE_DAYS} أيام`;
      const data = { student_id: student.id };

      // Check if we already sent this notification today
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      // Notify trainer
      if (trainerId && !alreadyNotified.has(`${trainerId}-${student.id}`)) {
        notifications.push({
          user_id: trainerId,
          type: "student_inactive",
          title,
          body,
          data,
        });
        alreadyNotified.add(`${trainerId}-${student.id}`);
      }

      // Notify admins
      for (const adminId of adminIds) {
        if (!alreadyNotified.has(`${adminId}-${student.id}`)) {
          notifications.push({
            user_id: adminId,
            type: "student_inactive",
            title,
            body,
            data,
          });
          alreadyNotified.add(`${adminId}-${student.id}`);
        }
      }
    }

    // Insert notifications in batches
    if (notifications.length > 0) {
      const { error: notifErr } = await supabase
        .from("notifications")
        .insert(notifications);

      if (notifErr) throw notifErr;
    }

    return new Response(
      JSON.stringify({
        message: "Inactive student check complete",
        inactive_count: inactiveStudents.length,
        notifications_sent: notifications.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
