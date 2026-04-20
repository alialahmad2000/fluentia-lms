const http = require('http');
const path = require('path');

(async () => {
  const server = http.createServer(() => { /* hang */ });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const fakeSupabaseUrl = `http://127.0.0.1:${port}`;
  console.log(`[integration] Hang-server at ${fakeSupabaseUrl}`);

  const { createClient } = require(path.resolve('node_modules/@supabase/supabase-js'));

  function fetchWithTimeout(input, init = {}) {
    const url = typeof input === 'string' ? input : (input?.url || '');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort(new DOMException(`Supabase fetch timeout after 3000ms: ${url}`, 'TimeoutError'));
    }, 3000);
    if (init.signal) {
      if (init.signal.aborted) controller.abort(init.signal.reason);
      else init.signal.addEventListener('abort', () => controller.abort(init.signal.reason), { once: true });
    }
    return fetch(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(timeoutId));
  }

  const sb = createClient(
    fakeSupabaseUrl,
    'anon-key-placeholder',
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: fetchWithTimeout },
    }
  );

  console.log('[integration] Calling sb.from("x").select() — should timeout at ~3s…');

  const start = Date.now();
  const { data, error } = await sb.from('x').select('*').limit(1);
  const elapsed = Date.now() - start;

  server.close();

  console.log(`[integration] Result: ${JSON.stringify({
    elapsed: `${elapsed}ms`,
    data,
    errMsg: error?.message,
    errName: error?.name,
  }, null, 2)}`);

  const pass = data === null && error && (elapsed >= 2800 && elapsed <= 3700);

  if (pass) {
    console.log('✅ INTEGRATION TEST PASS — Supabase client respects fetchWithTimeout');
    process.exit(0);
  } else {
    console.log('❌ INTEGRATION TEST FAIL');
    process.exit(1);
  }
})().catch((e) => { console.error('FATAL:', e); process.exit(1); });
