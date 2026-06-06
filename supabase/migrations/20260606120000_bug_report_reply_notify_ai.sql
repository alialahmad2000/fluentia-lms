-- Bug-ticket replies: make a STUDENT reply as loud as the original report, and
-- give every student an instant AI first-response.
--
-- Before: notify_bug_report_reply() only inserted an in-app notification row
-- (admins on a student reply / the student on a staff reply). A student reply
-- therefore produced no email and no push — so it was easy to miss entirely.
--
-- After (this migration) — on a STUDENT reply the trigger ALSO:
--   1) web-pushes every admin           (send-push-notification, skip_in_app)
--   2) emails the admins / Dr. Ali       (bug-report-notify)
--   3) fires the AI first-responder      (bug-report-ai-reply)
-- and on a STAFF/AI reply it ALSO web-pushes the student so they see the answer.
--
-- pg_net is fire-and-forget (matches the existing dm_notify_push pattern), so the
-- student's insert never waits on email/AI. All three edge functions are deployed
-- verify_jwt=false and are called with the project anon key.

CREATE OR REPLACE FUNCTION public.notify_bug_report_reply()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_reporter  uuid;
  v_is_staff  boolean;
  v_admin_ids jsonb;
  v_fn   text := 'https://nmjexpuycmqcxuxljier.supabase.co/functions/v1';
  v_anon text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tamV4cHV5Y21xY3h1eGxqaWVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxMjU2MTgsImV4cCI6MjA4ODcwMTYxOH0.Lznjnw2Pmrr04tFjQD6hRfWp-12JlRagZaCmo59KG8A';
  v_headers jsonb;
BEGIN
  SELECT reporter_id INTO v_reporter FROM bug_reports WHERE id = NEW.report_id;
  v_is_staff := NEW.sender_role IN ('admin','trainer');
  UPDATE bug_reports SET last_reply_at = now() WHERE id = NEW.report_id;

  v_headers := jsonb_build_object(
    'Content-Type','application/json',
    'apikey', v_anon,
    'Authorization', 'Bearer ' || v_anon
  );

  IF v_is_staff THEN
    -- staff / AI replied → notify the student who reported it (in-app + web push)
    IF v_reporter IS NOT NULL AND v_reporter <> NEW.sender_id THEN
      INSERT INTO notifications (user_id, type, title, body, data, read, action_url, priority)
      VALUES (v_reporter, 'system', 'رد على بلاغك 💬', left(NEW.body, 140),
              jsonb_build_object('kind','bug_reply','report_id',NEW.report_id), false,
              '/student/my-reports', 'high');

      PERFORM net.http_post(
        url := v_fn || '/send-push-notification',
        headers := v_headers,
        body := jsonb_build_object(
          'user_ids', jsonb_build_array(v_reporter),
          'title', 'رد على بلاغك 💬',
          'body', left(NEW.body, 140),
          'url', '/student/my-reports',
          'type', 'system',
          'priority', 'high',
          'tag', 'bug-reply-' || NEW.report_id::text,
          'skip_in_app', true,
          'data', jsonb_build_object('kind','bug_reply','report_id',NEW.report_id)
        ),
        timeout_milliseconds := 30000
      );
    END IF;
  ELSE
    -- student replied → notify every admin (in-app + web push + EMAIL + AI reply)
    INSERT INTO notifications (user_id, type, title, body, data, read, action_url, priority)
    SELECT p.id, 'system', 'رد جديد على بلاغ 💬', left(NEW.body, 140),
           jsonb_build_object('kind','bug_reply','report_id',NEW.report_id), false,
           '/admin/bug-reports', 'high'
    FROM profiles p WHERE p.role = 'admin';

    SELECT coalesce(jsonb_agg(p.id), '[]'::jsonb) INTO v_admin_ids
    FROM profiles p WHERE p.role = 'admin';

    -- 1) web push to admins (in-app already inserted above → skip_in_app)
    PERFORM net.http_post(
      url := v_fn || '/send-push-notification',
      headers := v_headers,
      body := jsonb_build_object(
        'user_ids', v_admin_ids,
        'title', 'رد جديد على بلاغ 💬',
        'body', coalesce(NEW.body,''),
        'url', '/admin/bug-reports',
        'type', 'system',
        'priority', 'high',
        'tag', 'bug-reply-admin-' || NEW.report_id::text,
        'skip_in_app', true,
        'data', jsonb_build_object('kind','bug_reply','report_id',NEW.report_id)
      ),
      timeout_milliseconds := 30000
    );

    -- 2) email the admins / Dr. Ali's main inbox
    PERFORM net.http_post(
      url := v_fn || '/bug-report-notify',
      headers := v_headers,
      body := jsonb_build_object('report_id', NEW.report_id, 'message_id', NEW.id),
      timeout_milliseconds := 30000
    );

    -- 3) AI first-responder (acknowledge + smart follow-up + reassure)
    PERFORM net.http_post(
      url := v_fn || '/bug-report-ai-reply',
      headers := v_headers,
      body := jsonb_build_object('report_id', NEW.report_id, 'message_id', NEW.id),
      timeout_milliseconds := 30000
    );
  END IF;

  RETURN NEW;
END $function$;
