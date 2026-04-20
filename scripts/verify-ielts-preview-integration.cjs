const fs = require('fs');

let ok = true;
function check(label, pass, detail) {
  if (pass) { console.log(`  ✓ ${label}`); }
  else       { console.log(`  ✗ ${label}${detail ? ': ' + detail : ''}`); ok = false; }
}

// Nav config has the new entry
const nav = fs.readFileSync('src/config/navigation.js', 'utf8');
check('nav entry id=ielts-v2-preview exists',   /ielts-v2-preview/.test(nav));
check('nav label "معاينة منهج IELTS" exists',  /معاينة منهج IELTS/.test(nav));
check('nav to=/admin/ielts-v2-preview exists',  /\/admin\/ielts-v2-preview/.test(nav));

// New page file exists
const pageExists = fs.existsSync('src/pages/admin/IELTSPreview.jsx');
check('IELTSPreview.jsx exists', pageExists);
if (pageExists) {
  const page = fs.readFileSync('src/pages/admin/IELTSPreview.jsx', 'utf8');
  check('IELTSPreview imports PreviewBanner',              /PreviewBanner/.test(page));
  check('IELTSPreview imports IELTSMasterclassV2Preview', /IELTSMasterclassV2Preview/.test(page));
  check('IELTSPreview has default export',                 /export default/.test(page));
}

// App.jsx has the route
const app = fs.readFileSync('src/App.jsx', 'utf8');
check('App.jsx has IELTSPreview lazy import', /IELTSPreview.*lazyRetry/.test(app));
check('App.jsx has /admin/ielts-v2-preview route', /path=["']\/admin\/ielts-v2-preview["']/.test(app));

// V2 preview component still exists
const panelExists = fs.existsSync('src/pages/admin/curriculum/components/IELTSMasterclassV2Preview.jsx');
check('IELTSMasterclassV2Preview.jsx (Phase 0C panel) still exists', panelExists);
if (panelExists) {
  const panel = fs.readFileSync('src/pages/admin/curriculum/components/IELTSMasterclassV2Preview.jsx', 'utf8');
  const count = (panel.match(/id:\s*'/g) || []).length;
  check(`Panel has 11 sacred pages (found ${count})`, count === 11);
  check('Panel links include ?ielts-v2=1', /ielts-v2=1/.test(panel));
}

// Phase 0C tab still wired in IELTSManagement
const mgmt = fs.readFileSync('src/pages/admin/curriculum/IELTSManagement.jsx', 'utf8');
check('IELTSManagement still imports IELTSMasterclassV2Preview', /IELTSMasterclassV2Preview/.test(mgmt));
check('IELTSManagement still has masterclass-v2 render condition', /masterclass-v2/.test(mgmt));

console.log(ok ? '\n✓ IELTS preview integration verified.' : '\n✗ Some checks failed.');
if (!ok) process.exit(1);
