#!/usr/bin/env node
// Commit a fixed set of NEW (additive) files straight onto origin/main via the
// GitHub Git Data API — no local checkout, no working-tree changes (safe with
// parallel sessions sharing this tree). gh provides the token.
const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const REPO = 'alialahmad2000/fluentia-lms'
const FILES = [
  'supabase/functions/bug-report-ai-reply/index.ts',
  'supabase/functions/bug-report-notify/index.ts',
  'supabase/migrations/20260606120000_bug_report_reply_notify_ai.sql',
  'scripts/_mgmt-query.cjs',
  'scripts/_commit-to-main.cjs',
]
const MESSAGE =
  'feat(bug-tickets): AI first-responder + email/push to admin on every student reply\n\n' +
  '- bug-report-ai-reply edge fn: Claude auto-acknowledges the student, asks one smart\n' +
  '  follow-up if needed, reassures the tech team will follow up (never claims "fixed").\n' +
  '- bug-report-notify edge fn: emails admins/Dr. Ali on each student reply.\n' +
  '- migration: notify_bug_report_reply trigger now also web-pushes admins, emails them,\n' +
  '  and fires the AI reply on a student reply (30s pg_net timeouts); pushes the student\n' +
  '  when staff/AI reply. Closes the gap where student replies produced no email/push.'

const token = execSync('gh auth token', { encoding: 'utf8' }).trim()
const API = 'https://api.github.com'
const H = {
  Authorization: `Bearer ${token}`,
  Accept: 'application/vnd.github+json',
  'User-Agent': 'fluentia-commit-script',
  'Content-Type': 'application/json',
}

async function gh(method, url, body) {
  const r = await fetch(`${API}/repos/${REPO}${url}`, {
    method,
    headers: H,
    body: body ? JSON.stringify(body) : undefined,
  })
  const t = await r.text()
  if (!r.ok) throw new Error(`${method} ${url} → ${r.status}\n${t}`)
  return JSON.parse(t)
}

async function main() {
  const ref = await gh('GET', '/git/ref/heads/main')
  const headSha = ref.object.sha
  const headCommit = await gh('GET', `/git/commits/${headSha}`)
  const baseTree = headCommit.tree.sha

  const tree = []
  for (const f of FILES) {
    const content = fs.readFileSync(path.join(__dirname, '..', f), 'utf8')
    const blob = await gh('POST', '/git/blobs', { content, encoding: 'utf-8' })
    tree.push({ path: f, mode: '100644', type: 'blob', sha: blob.sha })
  }

  const newTree = await gh('POST', '/git/trees', { base_tree: baseTree, tree })
  const commit = await gh('POST', '/git/commits', {
    message: MESSAGE,
    tree: newTree.sha,
    parents: [headSha],
  })
  await gh('PATCH', '/git/refs/heads/main', { sha: commit.sha })
  console.log('committed', commit.sha, 'to main')
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})
