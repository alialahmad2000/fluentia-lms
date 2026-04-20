const http = require('http');

(async () => {
  const server = http.createServer((req, res) => { /* hang — never respond */ });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const hangUrl = `http://127.0.0.1:${port}/`;

  console.log(`[unit] Local hang-server on ${hangUrl}`);

  function quickTimeoutFetch(url) {
    const controller = new AbortController();
    const start = Date.now();
    const timeoutId = setTimeout(() => {
      controller.abort(new DOMException('test timeout after 3000ms', 'TimeoutError'));
    }, 3000);
    return fetch(url, { signal: controller.signal })
      .finally(() => clearTimeout(timeoutId))
      .then(() => ({ ok: true, elapsed: Date.now() - start }))
      .catch((err) => ({ ok: false, err, elapsed: Date.now() - start }));
  }

  console.log('[unit] Testing 3s timeout against hang-server…');
  const t0 = Date.now();
  const result = await quickTimeoutFetch(hangUrl);
  const elapsed = Date.now() - t0;

  server.close();

  console.log(`[unit] Result: ${JSON.stringify({
    ok: result.ok,
    elapsed: `${elapsed}ms`,
    errName: result.err?.name,
    errMsg: result.err?.message,
  }, null, 2)}`);

  const pass =
    !result.ok &&
    (result.err.name === 'TimeoutError' || result.err.name === 'AbortError') &&
    elapsed >= 2900 && elapsed <= 3500;

  if (pass) {
    console.log('✅ UNIT TEST PASS — timeout mechanism aborts hanging fetches correctly');
    process.exit(0);
  } else {
    console.log('❌ UNIT TEST FAIL');
    process.exit(1);
  }
})().catch((e) => { console.error('FATAL:', e); process.exit(1); });
