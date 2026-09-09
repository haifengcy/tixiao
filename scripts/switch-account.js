#!/usr/bin/env node

/**
 * VolcBox Multi-Account Switcher & Ecosystem Builder
 * Usage: node scripts/switch-account.js [haifengcy | walkyufeng]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const targetAccount = process.argv[2];

const ACCOUNTS = {
  haifengcy: {
    key: 'haifengcy',
    userName: 'haifengcy',
    userEmail: 'haifengcy@gmail.com',
    githubRepo: 'haifengcy/Figma-VolcBox',
    githubUrl: 'https://github.com/haifengcy/Figma-VolcBox',
    githubIssues: 'https://github.com/haifengcy/Figma-VolcBox/issues',
    githubReleases: 'https://github.com/haifengcy/Figma-VolcBox/releases',
    domain: 'https://volcbox.pages.dev',
    domainBadgeName: 'volcbox.pages.dev',
    cfProject: 'volcbox',
    remote: 'haifengcy'
  },
  walkyufeng: {
    key: 'walkyufeng',
    userName: 'walkyufeng-hue',
    userEmail: 'walkyufeng@gmail.com',
    githubRepo: 'walkyufeng-hue/Figma-VolcBox',
    githubUrl: 'https://github.com/walkyufeng-hue/Figma-VolcBox',
    githubIssues: 'https://github.com/walkyufeng-hue/Figma-VolcBox/issues',
    githubReleases: 'https://github.com/walkyufeng-hue/Figma-VolcBox/releases',
    domain: 'https://figma-volcbox.pages.dev',
    domainBadgeName: 'figma--volcbox.pages.dev',
    cfProject: 'figma-volcbox',
    remote: 'walkyufeng'
  }
};

if (!targetAccount || !ACCOUNTS[targetAccount]) {
  console.error(`Usage: node scripts/switch-account.js <haifengcy | walkyufeng>`);
  process.exit(1);
}

const config = ACCOUNTS[targetAccount];
const rootDir = path.resolve(__dirname, '..');

// 1. Detect version from ui.html
const uiHtmlPath = path.join(rootDir, 'ui.html');
const uiHtml = fs.readFileSync(uiHtmlPath, 'utf-8');
const versionMatch = uiHtml.match(/id="plugin-version">v?([0-9.]+)<\/span>/);
const version = versionMatch ? versionMatch[1] : '1.0.1';
const versionTag = `v${version}`;
const zipFileName = `VolcBox_${versionTag}.zip`;
const versionDir = `VolcBox_${versionTag}`;

console.log(`\n========================================`);
console.log(`🔄 Switching ecosystem to: ${config.key.toUpperCase()} (${config.userEmail})`);
console.log(`📦 Detected Version: ${versionTag}`);
console.log(`========================================\n`);

// 2. Update README.md
const readmePath = path.join(rootDir, 'README.md');
let readme = fs.readFileSync(readmePath, 'utf-8');

// Replace badge version & releases
readme = readme.replace(/badge\/version-v[0-9.]+-blue\.svg\?style=flat-square\)\(https:\/\/github\.com\/[^/]+\/Figma-VolcBox\/releases\)/g,
  `badge/version-${versionTag}-blue.svg?style=flat-square)(${config.githubReleases})`);

// Replace website badge
readme = readme.replace(/badge\/website-[^/]+-orange\.svg\?style=flat-square\)\(https:\/\/[^)]+\)/g,
  `badge/website-${config.domainBadgeName}-orange.svg?style=flat-square)(${config.domain})`);

// Replace quick links
readme = readme.replace(/\[🌐 访问官方主页\]\([^)]+\) · \[📦 下载插件安装包 \(\.zip\)\]\([^)]+\) · \[🐛 提交反馈 \/ Issue\]\([^)]+\)/g,
  `[🌐 访问官方主页](${config.domain}) · [📦 下载插件安装包 (.zip)](${config.domain}/${zipFileName}) · [🐛 提交反馈 / Issue](${config.githubIssues})`);

// Replace step 1
readme = readme.replace(/直接下载最新 \[VolcBox_v[0-9.]+\.zip\]\([^)]+\)/g,
  `直接下载最新 [${zipFileName}](${config.domain}/${zipFileName})`);
readme = readme.replace(/git clone https:\/\/github\.com\/[^/]+\/Figma-VolcBox\.git/g,
  `git clone ${config.githubUrl}.git`);

// Replace footer links
readme = readme.replace(/- 🔗 \*\*官方主页\*\*：\[https:\/\/[^\]]+\]\([^)]+\)/g,
  `- 🔗 **官方主页**：[${config.domain}](${config.domain})`);
readme = readme.replace(/- 📦 \*\*Releases 发版\*\*：\[GitHub Releases\]\([^)]+\)/g,
  `- 📦 **Releases 发版**：[GitHub Releases](${config.githubReleases})`);
readme = readme.replace(/- 💬 \*\*问题反馈\*\*：\[GitHub Issues\]\([^)]+\)/g,
  `- 💬 **问题反馈**：[GitHub Issues](${config.githubIssues})`);

fs.writeFileSync(readmePath, readme, 'utf-8');
console.log(`✅ Updated root README.md for ${config.key}`);

// 3. Sync to VolcBox_vX.Y.Z/README.md
const dirReadmePath = path.join(rootDir, versionDir, 'README.md');
if (fs.existsSync(path.join(rootDir, versionDir))) {
  fs.writeFileSync(dirReadmePath, readme, 'utf-8');
  console.log(`✅ Synced ${versionDir}/README.md`);
}

// 4. Update website/index.html
const websiteHtmlPath = path.join(rootDir, 'website', 'index.html');
let websiteHtml = fs.readFileSync(websiteHtmlPath, 'utf-8');

// Replace GitHub links in header, hero, footer
websiteHtml = websiteHtml.replace(/href="https:\/\/github\.com\/[^/]+\/Figma-VolcBox"/g, `href="${config.githubUrl}"`);
websiteHtml = websiteHtml.replace(/href="https:\/\/github\.com\/[^/]+\/Figma-VolcBox\/issues"/g, `href="${config.githubIssues}"`);

fs.writeFileSync(websiteHtmlPath, websiteHtml, 'utf-8');
console.log(`✅ Updated website/index.html for ${config.key}`);

// 5. Re-package Zip
console.log(`📦 Re-packaging ${zipFileName}...`);
execSync(`zip -r "${zipFileName}" manifest.json code.js ui.html README.md LICENSE "${versionDir}/"`, { cwd: rootDir, stdio: 'pipe' });
execSync(`cp "${zipFileName}" "website/${zipFileName}"`, { cwd: rootDir, stdio: 'pipe' });
console.log(`✅ Rebuilt ${zipFileName} and synced to website/${zipFileName}`);

// 6. Update Git User config
execSync(`git config user.name "${config.userName}"`, { cwd: rootDir });
execSync(`git config user.email "${config.userEmail}"`, { cwd: rootDir });
console.log(`✅ Set Git user to: ${config.userName} <${config.userEmail}>`);

// 7. Cloudflare Wrangler Config Switch if available
const wranglerConfigDir = path.join(process.env.HOME || '', 'Library', 'Preferences', '.wrangler', 'config');
const accountToml = path.join(wranglerConfigDir, `${config.key}.toml`);
const defaultToml = path.join(wranglerConfigDir, 'default.toml');

if (fs.existsSync(accountToml)) {
  fs.copyFileSync(accountToml, defaultToml);
  console.log(`✅ Switched Cloudflare authentication to ${config.userEmail}`);
} else {
  console.log(`ℹ️  Note: Cloudflare profile '${config.key}.toml' not cached yet.`);
}

console.log(`\n🎉 Ecosystem switched to [${config.key}] successfully!\n`);
