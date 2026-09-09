#!/usr/bin/env node

/**
 * VolcBox One-Click Deployer for Multi-Accounts
 * Usage: node scripts/deploy.js [haifengcy | walkyufeng]
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const target = process.argv[2];
if (!target || !['haifengcy', 'walkyufeng'].includes(target)) {
  console.error('Usage: node scripts/deploy.js <haifengcy | walkyufeng>');
  process.exit(1);
}

const rootDir = path.resolve(__dirname, '..');

// 1. Run switch-account
console.log(`\n🚀 Step 1: Switching ecosystem files...`);
execSync(`node scripts/switch-account.js ${target}`, { cwd: rootDir, stdio: 'inherit' });

// 2. Commit any pending ecosystem changes if any
console.log(`\n🚀 Step 2: Committing ecosystem synchronization...`);
try {
  const status = execSync(`git status --porcelain`, { cwd: rootDir }).toString().trim();
  if (status) {
    execSync(`git add -A && git commit -m "release: 同步 ${target} 生态配置"`, { cwd: rootDir, stdio: 'inherit' });
  } else {
    console.log(`Working tree clean, no commit needed.`);
  }
} catch (e) {
  console.log(`Commit step completed or not needed.`);
}

// 3. Git Push
console.log(`\n🚀 Step 3: Pushing to GitHub (${target})...`);
const uiHtml = fs.readFileSync(path.join(rootDir, 'ui.html'), 'utf-8');
const versionMatch = uiHtml.match(/id="plugin-version">v?([0-9.]+)<\/span>/);
const version = versionMatch ? versionMatch[1] : '1.0.1';
const versionTag = `v${version}`;

try {
  execSync(`git push ${target} HEAD:main`, { cwd: rootDir, stdio: 'inherit' });
  execSync(`git push ${target} HEAD:refs/tags/${versionTag}`, { cwd: rootDir, stdio: 'inherit' });
  console.log(`✅ GitHub push succeeded for ${target}!`);
} catch (e) {
  console.error(`❌ GitHub push error:`, e.message);
}

// 4. Cloudflare Pages Deploy
console.log(`\n🚀 Step 4: Deploying to Cloudflare Pages (${target})...`);

let tokens = {};
try {
  tokens = JSON.parse(fs.readFileSync(path.join(rootDir, '.tokens.json'), 'utf-8'));
} catch (e) {
  console.error('Warning: .tokens.json not found. Please provide Cloudflare tokens in .tokens.json.');
}

const cfConfig = {
  haifengcy: {
    project: 'volcbox',
    domain: 'https://volcbox.pages.dev'
  },
  walkyufeng: {
    project: 'figma-volcbox',
    domain: 'https://figma-volcbox.pages.dev'
  }
};

const cf = cfConfig[target];
const tokenData = tokens[target];

if (!tokenData || !tokenData.cfApiToken) {
  console.error(`❌ No Cloudflare token configured for ${target} in .tokens.json.`);
} else {
  try {
    const envCmd = `https_proxy=http://127.0.0.1:7897 http_proxy=http://127.0.0.1:7897 CLOUDFLARE_ACCOUNT_ID=${tokenData.cfAccountId} CLOUDFLARE_API_TOKEN=${tokenData.cfApiToken} npx wrangler pages deploy website --project-name=${cf.project} --branch=main`;
    execSync(envCmd, { cwd: rootDir, stdio: 'inherit' });
    console.log(`\n🎉 Deployment Complete! Site is live at: ${cf.domain}\n`);
  } catch (e) {
    console.error(`❌ Cloudflare deployment error:`, e.message);
  }
}
