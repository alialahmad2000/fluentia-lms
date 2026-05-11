import pg from 'pg';

const { Pool } = pg;

const POOL_CONFIG = {
  host: 'aws-1-eu-central-1.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.nmjexpuycmqcxuxljier',
  password: 'Ali-al-ahmad2000',
  ssl: { rejectUnauthorized: false },
  max: 5,
  idleTimeoutMillis: 0,       // never drop idle connections from pool
  connectionTimeoutMillis: 15000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
};

let _pool = null;

function makePool() {
  const p = new Pool(POOL_CONFIG);
  p.on('error', (err) => {
    // Swallow pool-level errors so they don't crash; query() retry handles reconnect
    if (!['ECONNRESET', 'EPIPE', 'ECONNREFUSED'].includes(err.code)) {
      console.warn('[db] pool error:', err.message);
    }
  });
  return p;
}

function getPool() {
  if (!_pool) _pool = makePool();
  return _pool;
}

export async function closeDb() {
  if (_pool) { await _pool.end().catch(() => {}); _pool = null; }
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

export async function query(sql, params = []) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return (await getPool().query(sql, params)).rows;
    } catch (err) {
      const retriable = ['ECONNRESET', 'EPIPE', 'ECONNREFUSED', 'ETIMEDOUT'].includes(err.code)
        || err.message?.includes('Connection terminated');
      if (retriable && attempt < 2) {
        console.warn(`[db] connection error (${err.code}), recreating pool and retrying...`);
        await _pool?.end().catch(() => {});
        _pool = makePool();
        await sleep(1000 * (attempt + 1));
        continue;
      }
      throw err;
    }
  }
}
