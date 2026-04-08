-- RPC function for service worker to fetch notification text (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_notification_text(notif_id UUID)
RETURNS TABLE(title TEXT, body TEXT, ntype TEXT, action_url TEXT, priority TEXT, image_url TEXT)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT n.title::TEXT, n.body::TEXT, n.type::TEXT, n.action_url::TEXT, n.priority::TEXT, n.image_url::TEXT
  FROM public.notifications n WHERE n.id = notif_id
  LIMIT 1;
$$;

-- Allow anon to call this function
GRANT EXECUTE ON FUNCTION public.get_notification_text(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.get_notification_text(UUID) TO authenticated;
