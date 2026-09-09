# Custom Rules for XTrend Translation Plugin Project

## 1. Version Label Integrity & Auto-Increment
- **CRITICAL REQUIREMENT**: You MUST always retain the version label element inside `ui.html`.
- The version label element must match the exact HTML pattern: `<span id="plugin-version">X.Y.Z</span>`.
- Never remove, delete, or rename this element during visual style refactorings or code rewrites.
- The build server (`.claude/serve.js`) tracks the incremented version in `.claude/version.txt` and automatically replaces `<span id="plugin-version">...</span>` inside `ui.html` upon edits. Keeping this element ensures the version displays correctly in the UI.

## 2. Multi-Account Release Confirmation Rule
- **CRITICAL REQUIREMENT**: Whenever releasing, pushing, or deploying a new version ("发版", "发布新版本", "部署上线"), you MUST ALWAYS ask the user which accounts to publish to before proceeding.
- The user operates under two separate account ecosystems:
  1. **GitHub Accounts**:
     - `haifengcy` (`haifengcy@gmail.com`) — Repository: `https://github.com/haifengcy/Figma-VolcBox` (SSH key: `~/.ssh/id_ed25519_volcbox`)
     - `walkyufeng-hue` (`walkyufeng@gmail.com`) — Repository: `https://github.com/walkyufeng-hue/Figma-VolcBox` (SSH key: `~/.ssh/id_ed25519_walkyufeng`)
  2. **Cloudflare Accounts**:
     - `haifengcy@gmail.com` — Pages project: `volcbox` (`https://volcbox.pages.dev`)
     - `walkyufeng@gmail.com` — Pages project: `figma-volcbox` (`https://figma-volcbox.pages.dev`)
- Do not assume the destination account; always confirm both the target GitHub account and Cloudflare account with the user.

