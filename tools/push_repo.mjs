// Push the source tree (no node_modules/build outputs) to GitHub via Contents API.
import {readFileSync, readdirSync, statSync} from 'fs';
import {join, relative} from 'path';
import {execSync} from 'child_process';

const ROOT = '/home/justin/data/explore/cookie-canvas-mobile';
const REPO = 'loveoftheai/cookie-canvas-mobile';
const TOKEN = execSync(
  "grep -oP 'https://[^:]+:\\K[^@]+(?=@github.com)' ~/.git-credentials | head -1",
)
  .toString()
  .trim();
const H = {
  Authorization: `Bearer ${TOKEN}`,
  Accept: 'application/vnd.github+json',
  'Content-Type': 'application/json',
};

const SKIP_DIRS = new Set([
  'node_modules',
  'build',
  '.cxx',
  '.gradle',
  '.idea',
  '.git',
  '.ds_store',
  '__tests__',
  '.buckconfig.bakd',
]);
const SKIP_FILES = new Set([
  'yarn.lock',
  '.watchmanconfig',
  'Gemfile',
  'Gemfile.lock',
  '.ruby-version',
  '.eslintrc.js',
  '.prettierrc.js',
  'babel.config.js',
]);
// babel.config.js IS needed for RN builds — keep it. Remove from skip.
SKIP_FILES.delete('babel.config.js');

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name.startsWith('.') && name !== '.gitignore') continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (SKIP_DIRS.has(name)) continue;
      walk(p, out);
    } else {
      if (SKIP_FILES.has(name)) continue;
      if (st.size > 3_000_000) continue; // no huge binaries
      out.push(p);
    }
  }
  return out;
}

const files = walk(ROOT);
console.log('files to push:', files.length);

// NOTE: keep .gitignore/.prettierrc.js/.eslintrc.js/.watchmanconfig out (dot-prefix rule above already skips most)
const extraIgnores = ['.gitignore'];
const list = files.filter(f => !extraIgnores.includes(f.split('/').pop()));

let pushed = 0;
for (const f of list) {
  const rel = relative(ROOT, f);
  // fetch existing sha (if any) for update
  let sha = null;
  const cur = await fetch(
    `https://api.github.com/repos/${REPO}/contents/${rel}?ref=main`,
    {headers: H},
  ).then(r => (r.ok ? r.json() : null));
  if (cur && cur.sha) sha = cur.sha;

  const content = readFileSync(f).toString('base64');
  const body = {
    message: `add ${rel}`,
    content,
    branch: 'main',
    ...(sha ? {sha} : {}),
  };
  const res = await fetch(
    `https://api.github.com/repos/${REPO}/contents/${rel}`,
    {method: 'PUT', headers: H, body: JSON.stringify(body)},
  );
  const j = await res.json().catch(() => ({}));
  if (res.status >= 300) {
    console.log('FAIL', rel, res.status, (j.message || '').slice(0, 80));
  } else {
    pushed++;
  }
  await new Promise(r => setTimeout(r, 120));
}
console.log('pushed:', pushed, '/', list.length);
