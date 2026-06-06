// Commit the given files' LOCAL content straight to `main` via the GitHub Trees
// API (ref-only; never touches local HEAD). Use ONLY for library-owned files that
// no other session edits, so there's no clobber risk.
//   node scripts/library/deploy-files.mjs "commit message" path1 path2 ...
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const REPO = 'alialahmad2000/fluentia-lms'
const API = 'https://api.github.com'
const [, , message, ...paths] = process.argv
if (!message || paths.length === 0) { console.error('usage: deploy-files.mjs <msg> <paths...>'); process.exit(1) }
const token = execSync('gh auth token', { encoding: 'utf8' }).trim()
const H = { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json', 'User-Agent': 'fluentia-library-deploy' }

async function gh(method, path, body, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(`${API}${path}`, { method, headers: H, body: body ? JSON.stringify(body) : undefined })
      const text = await r.text()
      if (!r.ok) throw new Error(`${method} ${path} -> ${r.status} ${text.slice(0, 300)}`)
      return text ? JSON.parse(text) : {}
    } catch (e) {
      if (i === tries - 1) throw e
      await new Promise((res) => setTimeout(res, 600 * (i + 1)))
    }
  }
}

const ref = await gh('GET', `/repos/${REPO}/git/ref/heads/main`)
const headSha = ref.object.sha
const headCommit = await gh('GET', `/repos/${REPO}/git/commits/${headSha}`)
const tree = []
for (const p of paths) {
  const blob = await gh('POST', `/repos/${REPO}/git/blobs`, { content: readFileSync(p).toString('base64'), encoding: 'base64' })
  tree.push({ path: p, mode: '100644', type: 'blob', sha: blob.sha })
}
const newTree = await gh('POST', `/repos/${REPO}/git/trees`, { base_tree: headCommit.tree.sha, tree })
const commit = await gh('POST', `/repos/${REPO}/git/commits`, { message, tree: newTree.sha, parents: [headSha] })
await gh('PATCH', `/repos/${REPO}/git/refs/heads/main`, { sha: commit.sha })
console.log('DEPLOYED', commit.sha.slice(0, 8), '— files:', paths.length)
