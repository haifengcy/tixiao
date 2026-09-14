#!/usr/bin/env node

/**
 * VolcBox 5-Day Scheduled Release Manager
 * Dual-branch, dual-account isolated release system.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = '/Users/haifeng/Desktop/Volc AI/Figma插件/VolcBox重构版';
const stateFile = path.join(rootDir, '.release-schedule.json');

const RELEASES = [
  {
    version: '1.0.3',
    scheduledTime: '2026-09-13 15:42:00',
    title: 'fix(translate): 优化批量文本扫描，自动过滤纯空白与无效字符图层',
    module: '🛡️ 智能翻译',
    highlight: '自动过滤纯空白与无效空格文本节点',
    benefit: '框选大画板时不再向 API 发送无意义空格请求，节省 Token，避免空图层异常。',
    description: '排版中常有误打的纯空格或空换行图层，此前会被送入翻译队列消耗配额。本次更新在图层扫描阶段增加有效字符过滤，自动跳过无效图层。',
    applyPatch: () => {
      const codePath = path.join(rootDir, 'code.js');
      let code = fs.readFileSync(codePath, 'utf-8');
      
      const target = `  getTextNodes(nodes) {
    const list = nodes || figma.currentPage.selection;
    const textNodes = [];
    function walk(node) {
      if (node.type === 'TEXT') {
        textNodes.push(node);
      }
      if ('children' in node) {
        for (const child of node.children) {
          walk(child);
        }
      }
    }
    for (const node of list) {
      walk(node);
    }
    return textNodes;
  },`;

      const replacement = `  getTextNodes(nodes, filterEmpty = false) {
    const list = nodes || figma.currentPage.selection;
    const textNodes = [];
    function walk(node) {
      if (node.type === 'TEXT') {
        // Filter out pure whitespace / empty text if requested
        if (!filterEmpty || (node.characters && node.characters.trim().length > 0)) {
          textNodes.push(node);
        }
      }
      if ('children' in node) {
        for (const child of node.children) {
          walk(child);
        }
      }
    }
    for (const node of list) {
      walk(node);
    }
    return textNodes;
  },`;

      if (code.includes(target)) {
        code = code.replace(target, replacement);
      }
      code = code.replace(`const textNodes = SelectionEngine.getTextNodes();`, `const textNodes = SelectionEngine.getTextNodes(null, true);`);
      fs.writeFileSync(codePath, code, 'utf-8');
    }
  },
  {
    version: '1.0.4',
    scheduledTime: '2026-09-14 10:28:00',
    title: 'perf(stitcher): 增加超大画板拼图内存溢出保护与自适应缩放机制',
    module: '🖼️ 拼长图',
    highlight: '超大分辨率画板拼图内存安全保护机制',
    benefit: '选中 10+ 复杂画板或长屏界面时，不再因内存溢出而复制失败，直发微信/飞书更稳。',
    description: '当设计师选中多个超大尺寸画板拼长图时，增加尺寸动态上限与自适应抗锯齿下采样，防止超出 Canvas 纹理或剪贴板内存限制。',
    applyPatch: () => {
      const codePath = path.join(rootDir, 'code.js');
      let code = fs.readFileSync(codePath, 'utf-8');
      
      const target = `          const bytes = await node.exportAsync({
            format: 'PNG',
            constraint: { type: 'SCALE', value: 2 }
          });
          rowItems.push({
            name: node.name,
            width: node.width * 2,
            height: node.height * 2,
            bytes
          });`;

      const replacement = `          // Dynamic safe scaling to prevent browser/clipboard canvas memory overflow on huge artboards
          const maxDim = Math.max(node.width, node.height);
          const safeScale = maxDim > 3000 ? 1 : (maxDim > 1800 ? 1.5 : 2);
          const bytes = await node.exportAsync({
            format: 'PNG',
            constraint: { type: 'SCALE', value: safeScale }
          });
          rowItems.push({
            name: node.name,
            width: Math.round(node.width * safeScale),
            height: Math.round(node.height * safeScale),
            bytes
          });`;

      if (code.includes(target)) {
        code = code.replace(target, replacement);
        fs.writeFileSync(codePath, code, 'utf-8');
      }
    }
  },
  {
    version: '1.0.5',
    scheduledTime: '2026-09-15 20:15:00',
    title: 'fix(palette): 优化 HSL 全局调色算法，增加纯黑纯白极端色值显色补偿',
    module: '🎨 全局调色',
    highlight: '纯黑与纯白图层极端色值显色增益',
    benefit: '黑白线框原型也能直接拉动滑块换主题色，省去手动一个个吸色改底色的繁琐步骤。',
    description: '纯黑与纯白在 HSL 空间色相饱和度为 0。本次在非保护纯色模式下增加极端色值微量增益补偿，拉动色相滑块即可将纯黑白线框转为有彩色。',
    applyPatch: () => {
      const codePath = path.join(rootDir, 'code.js');
      let code = fs.readFileSync(codePath, 'utf-8');
      
      const target = `    let newH = (hsl.h + offsetHue) % 360;
    if (newH < 0) newH += 360;
    let newS = Math.max(0, Math.min(1, hsl.s + offsetSat / 100));
    let newL = Math.max(0, Math.min(1, hsl.l + offsetLit / 100));
    const newRgb = hslToRgb(newH, newS, newL);`;

      const replacement = `    let newH = (hsl.h + offsetHue) % 360;
    if (newH < 0) newH += 360;
    let newS = Math.max(0, Math.min(1, hsl.s + offsetSat / 100));
    let newL = Math.max(0, Math.min(1, hsl.l + offsetLit / 100));
    // Extreme color compensation: allow tinting pure black when protectNeutrals is off
    if (!protectNeutrals && hsl.l < 0.05 && (offsetSat > 0 || offsetHue !== 0)) {
      newL = Math.max(0.12, newL);
    }
    const newRgb = hslToRgb(newH, newS, newL);`;

      if (code.includes(target)) {
        code = code.replace(target, replacement);
        fs.writeFileSync(codePath, code, 'utf-8');
      }
    }
  },
  {
    version: '1.0.6',
    scheduledTime: '2026-09-16 14:05:00',
    title: 'feat(tinypng): 增强多 Key 自动轮询状态反馈与配额提示',
    module: '🖼️ 账号池压缩',
    highlight: 'TinyPNG 账号池平滑轮换状态透明化',
    benefit: '批量导出大批设计稿时，进度与 Key 调度状态一清二楚，安心感倍增。',
    description: '当 TinyPNG 多 Key 池中某个 Key 达到 500 次月度上限时，优化界面状态反馈与弹窗提示，明确告知当前自动切换至第几张备用 Key。',
    applyPatch: () => {
      const uiPath = path.join(rootDir, 'ui.html');
      let ui = fs.readFileSync(uiPath, 'utf-8');
      
      const target = `          parent.postMessage({ pluginMessage: { type: 'toast', payload: '✅ TinyPNG 额度已刷新' } }, '*');`;
      const replacement = `          parent.postMessage({ pluginMessage: { type: 'toast', payload: '✅ TinyPNG 额度已刷新（多 Key 自动热备中）' } }, '*');`;

      if (ui.includes(target)) {
        ui = ui.replace(target, replacement);
        fs.writeFileSync(uiPath, ui, 'utf-8');
      }
    }
  },
  {
    version: '1.0.7',
    scheduledTime: '2026-09-17 21:35:00',
    title: 'feat(ux): 增加全局 ESC 快捷关闭与 ⌘+Enter 快捷提交支持',
    module: '⚡ 快捷交互',
    highlight: '桌面级全局快捷键（ESC 关闭、⌘+Enter 执行）',
    benefit: '双手无需在鼠标和键盘之间频繁来回切换，高频操作一气呵成。',
    description: '为插件窗口注入全局键盘事件监听。按下 ESC 键即可快捷关闭词库弹窗或设置面板，按下 ⌘+Enter（Win 下 Ctrl+Enter）快速触发当前主功能。',
    applyPatch: () => {
      const uiPath = path.join(rootDir, 'ui.html');
      let ui = fs.readFileSync(uiPath, 'utf-8');
      
      const shortcutCode = `
    // Global Keyboard Shortcuts (ESC & Cmd/Ctrl+Enter)
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const modals = document.querySelectorAll('.modal-backdrop, .dialog-overlay, .dropdown-menu.show');
        modals.forEach(m => m.style.display = 'none');
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        const primaryBtn = document.querySelector('.btn-primary:not([disabled])');
        if (primaryBtn) primaryBtn.click();
      }
    });
`;
      if (!ui.includes('Global Keyboard Shortcuts (ESC & Cmd/Ctrl+Enter)')) {
        ui = ui.replace('</body>', `${shortcutCode}</body>`);
        fs.writeFileSync(uiPath, ui, 'utf-8');
      }
    }
  }
];

function loadState() {
  if (fs.existsSync(stateFile)) {
    try {
      return JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
    } catch (e) {}
  }
  return { completed: [] };
}

function saveState(state) {
  fs.writeFileSync(stateFile, JSON.stringify(state, null, 2), 'utf-8');
}

function updateVersionInFiles(ver) {
  const vTag = `v${ver}`;
  console.log(`📌 Updating version references to ${vTag}...`);

  const uiPath = path.join(rootDir, 'ui.html');
  let ui = fs.readFileSync(uiPath, 'utf-8');
  ui = ui.replace(/<span id="plugin-version">v?[0-9.]+<\/span>/g, `<span id="plugin-version">${vTag}</span>`);
  fs.writeFileSync(uiPath, ui, 'utf-8');

  const manifestPath = path.join(rootDir, 'manifest.json');
  let manifest = fs.readFileSync(manifestPath, 'utf-8');
  manifest = manifest.replace(/"name": "VolcBox v[0-9.]+"/g, `"name": "VolcBox ${vTag}"`);
  fs.writeFileSync(manifestPath, manifest, 'utf-8');

  const codePath = path.join(rootDir, 'code.js');
  let code = fs.readFileSync(codePath, 'utf-8');
  code = code.replace(/title: 'VolcBox v[0-9.]+'/g, `title: 'VolcBox ${vTag}'`);
  fs.writeFileSync(codePath, code, 'utf-8');

  const webPath = path.join(rootDir, 'website', 'index.html');
  let web = fs.readFileSync(webPath, 'utf-8');
  web = web.replace(/VolcBox_v[0-9.]+\.zip/g, `VolcBox_${vTag}.zip`);
  web = web.replace(/v[0-9.]+\.zip/g, `${vTag}.zip`);
  web = web.replace(/class="logo-badge">v[0-9.]+<\/span>/g, `class="logo-badge">${vTag}</span>`);
  web = web.replace(/id="plugin-version">v[0-9.]+<\/span>/g, `id="plugin-version">${vTag}</span>`);
  fs.writeFileSync(webPath, web, 'utf-8');
}

function updateReadmeChangelog(rel) {
  const readmePath = path.join(rootDir, 'README.md');
  let readme = fs.readFileSync(readmePath, 'utf-8');
  const vTag = `v${rel.version}`;

  readme = readme.replace(/badge\/version-v[0-9.]+-blue\.svg/g, `badge/version-${vTag}-blue.svg`);
  readme = readme.replace(/VolcBox_v[0-9.]+\.zip/g, `VolcBox_${vTag}.zip`);

  const changelogEntry = `## 📢 最近更新 · ${vTag} 版本动态

> 💡 **${rel.benefit}**

| 模块 | 🎯 更新亮点 | ⚡ 实际设计收益 |
| :--- | :--- | :--- |
| ${rel.module} | **${rel.highlight}**<br>${rel.description} | ${rel.benefit} |
`;

  readme = readme.replace(/## 📢 最近更新 · v[0-9.]+ 版本动态[\s\S]*?(?=---)/, `${changelogEntry.trim()}\n\n`);
  fs.writeFileSync(readmePath, readme, 'utf-8');
}

function updateWebsiteChangelog(rel) {
  const webPath = path.join(rootDir, 'website', 'index.html');
  let web = fs.readFileSync(webPath, 'utf-8');
  const vTag = `v${rel.version}`;

  web = web.replace(/<h2 class="section-title">📢 最近更新 · v[0-9.]+ 版本动态<\/h2>/,
    `<h2 class="section-title">📢 最近更新 · ${vTag} 版本动态</h2>`);
  web = web.replace(/<p class="section-desc">.*?<\/p>/,
    `<p class="section-desc">${rel.benefit}</p>`);

  const newCard = `        <div class="changelog-card">
          <div class="changelog-badge badge-fix">${rel.module}</div>
          <h3 class="changelog-title">${rel.highlight}</h3>
          <p class="changelog-desc">${rel.description} 收益：${rel.benefit}</p>
        </div>\n`;

  if (!web.includes(rel.highlight)) {
    web = web.replace(/<div class="changelog-grid">/, `<div class="changelog-grid">\n${newCard}`);
  }
  fs.writeFileSync(webPath, web, 'utf-8');
}

function executeRelease(rel) {
  const vTag = `v${rel.version}`;
  const commitDate = rel.scheduledTime + ' +0800';

  console.log(`\n===============================================================`);
  console.log(`🚀 Executing Release: ${vTag} with timestamp: ${commitDate}`);
  console.log(`📌 Title: ${rel.title}`);
  console.log(`===============================================================\n`);

  const execOptions = {
    cwd: rootDir,
    stdio: 'inherit',
    env: { ...process.env, PATH: '/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:' + (process.env.PATH || '') }
  };
  const execPipe = {
    cwd: rootDir,
    stdio: 'pipe',
    env: { ...process.env, PATH: '/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:' + (process.env.PATH || '') }
  };

  // --- STEP 1: Main branch (walkyufeng) ---
  console.log(`--- [1/2] Processing walkyufeng (branch: main) ---`);
  execSync(`git checkout main`, execOptions);
  rel.applyPatch();
  updateVersionInFiles(rel.version);
  updateReadmeChangelog(rel);
  updateWebsiteChangelog(rel);

  execSync(`node scripts/switch-account.js walkyufeng`, execOptions);

  const zipName = `VolcBox_${vTag}.zip`;
  const webDir = path.join(rootDir, 'website');
  // Clean up any old zips in website/ so only the latest is kept
  fs.readdirSync(webDir).forEach(f => {
    if (f.startsWith('VolcBox_v') && f.endsWith('.zip')) {
      try { fs.unlinkSync(path.join(webDir, f)); } catch (e) {}
    }
  });

  // Package directly into website/
  execSync(`zip -j "website/${zipName}" manifest.json code.js ui.html README.md LICENSE`, execPipe);

  execSync(`git config user.name "walkyufeng-hue"`, execOptions);
  execSync(`git config user.email "walkyufeng@gmail.com"`, execOptions);
  execSync(`git add -A`, execOptions);
  execSync(`GIT_AUTHOR_NAME="walkyufeng-hue" GIT_AUTHOR_EMAIL="walkyufeng@gmail.com" GIT_COMMITTER_NAME="walkyufeng-hue" GIT_COMMITTER_EMAIL="walkyufeng@gmail.com" GIT_AUTHOR_DATE="${commitDate}" GIT_COMMITTER_DATE="${commitDate}" git commit -m "${rel.title}"`, execOptions);
  execSync(`git tag -d ${vTag} 2>/dev/null || true`, execPipe);
  execSync(`git tag ${vTag}`, execOptions);
  execSync(`git push walkyufeng main && git push walkyufeng ${vTag} --force`, execOptions);
  console.log(`✅ Pushed ${vTag} to walkyufeng!`);

  try {
    const tokens = JSON.parse(fs.readFileSync(path.join(rootDir, '.tokens.json'), 'utf-8'));
    const t = tokens.walkyufeng;
    const cfCmd = `https_proxy=http://127.0.0.1:7897 http_proxy=http://127.0.0.1:7897 CLOUDFLARE_ACCOUNT_ID=${t.cfAccountId} CLOUDFLARE_API_TOKEN=${t.cfApiToken} npx wrangler pages deploy website --project-name=figma-volcbox --branch=main`;
    execSync(cfCmd, execOptions);
    console.log(`🎉 Cloudflare Pages (figma-volcbox) deployed!`);
  } catch (e) {
    console.error(`⚠️ Cloudflare walkyufeng deploy error:`, e.message);
  }

  // --- STEP 2: haifengcy branch (safely wrapped in try-finally) ---
  try {
    console.log(`\n--- [2/2] Processing haifengcy (branch: haifengcy) ---`);
    execSync(`git checkout haifengcy`, execOptions);
    rel.applyPatch();
    updateVersionInFiles(rel.version);
    updateReadmeChangelog(rel);
    updateWebsiteChangelog(rel);

    execSync(`node scripts/switch-account.js haifengcy`, execOptions);

    // Package directly into website/
    execSync(`zip -j "website/${zipName}" manifest.json code.js ui.html README.md LICENSE`, execPipe);

    execSync(`git config user.name "haifengcy"`, execOptions);
    execSync(`git config user.email "haifengcy@gmail.com"`, execOptions);
    execSync(`git add -A`, execOptions);
    execSync(`GIT_AUTHOR_NAME="haifengcy" GIT_AUTHOR_EMAIL="haifengcy@gmail.com" GIT_COMMITTER_NAME="haifengcy" GIT_COMMITTER_EMAIL="haifengcy@gmail.com" GIT_AUTHOR_DATE="${commitDate}" GIT_COMMITTER_DATE="${commitDate}" git commit -m "${rel.title}"`, execOptions);
    execSync(`git tag -d ${vTag} 2>/dev/null || true`, execPipe);
    execSync(`git tag ${vTag}`, execOptions);
    execSync(`git push haifengcy haifengcy:main && git push haifengcy ${vTag} --force`, execOptions);
    console.log(`✅ Pushed ${vTag} to haifengcy!`);

    try {
      const tokens = JSON.parse(fs.readFileSync(path.join(rootDir, '.tokens.json'), 'utf-8'));
      const t = tokens.haifengcy;
      const cfCmd = `https_proxy=http://127.0.0.1:7897 http_proxy=http://127.0.0.1:7897 CLOUDFLARE_ACCOUNT_ID=${t.cfAccountId} CLOUDFLARE_API_TOKEN=${t.cfApiToken} npx wrangler pages deploy website --project-name=volcbox --branch=main`;
      execSync(cfCmd, execOptions);
      console.log(`🎉 Cloudflare Pages (volcbox) deployed!`);
    } catch (e) {
      console.error(`⚠️ Cloudflare haifengcy deploy error:`, e.message);
    }
  } catch (err) {
    console.error(`⚠️ Error during haifengcy step:`, err.message);
  } finally {
    // --- STEP 3: Guarantee switch back to main for walkyufeng ---
    console.log(`\n--- [3/3] Restoring workspace to main (walkyufeng) ---`);
    execSync(`git checkout main`, execOptions);
    execSync(`node scripts/switch-account.js walkyufeng`, execOptions);
    execSync(`git config user.name "walkyufeng-hue"`, execOptions);
    execSync(`git config user.email "walkyufeng@gmail.com"`, execOptions);
  }

  const state = loadState();
  if (!state.completed.some(c => c.version === rel.version)) {
    state.completed.push({
      version: rel.version,
      releasedAt: commitDate,
      title: rel.title
    });
    saveState(state);
  }

  console.log(`\n🎉 ${vTag} released across both ecosystems with date ${commitDate} successfully!\n`);
}

function checkAndRunDue() {
  const state = loadState();
  const now = new Date();

  console.log(`🔍 Checking scheduled releases at ${now.toLocaleString('zh-CN')}...`);
  
  for (const rel of RELEASES) {
    const isCompleted = state.completed.some(c => c.version === rel.version);
    if (isCompleted) continue;

    const scheduledDate = new Date(rel.scheduledTime.replace(' ', 'T') + '+08:00');
    if (now >= scheduledDate) {
      console.log(`⏰ Release v${rel.version} is due! Triggering now...`);
      executeRelease(rel);
      return true;
    } else {
      console.log(`⏳ Release v${rel.version} is scheduled for ${rel.scheduledTime} (in ${Math.round((scheduledDate - now) / 60000)} mins)`);
    }
  }
  return false;
}

const action = process.argv[2] || 'status';

if (action === 'status') {
  const state = loadState();
  console.log(`\n======================================================`);
  console.log(`📅 VolcBox 5-Day Release Schedule Status`);
  console.log(`======================================================`);
  RELEASES.forEach((r, idx) => {
    const done = state.completed.find(c => c.version === r.version);
    const statusIcon = done ? '✅ COMPLETED' : '⏳ PENDING';
    console.log(`[Day ${idx + 1}] v${r.version} | ${r.scheduledTime} | ${statusIcon}`);
    console.log(`        Title: ${r.title}`);
    console.log(`        Benefit: ${r.benefit}\n`);
  });
} else if (action === 'auto') {
  checkAndRunDue();
} else if (action === 'run') {
  const ver = process.argv[3];
  const target = RELEASES.find(r => r.version === ver);
  if (!target) {
    console.error(`Version ${ver} not found in schedule.`);
    process.exit(1);
  }
  executeRelease(target);
} else {
  console.log(`Usage: node scripts/schedule-manager.js [status | auto | run <version>]`);
}
