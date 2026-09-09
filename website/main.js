// =====================================================================
// VolcBox Official Landing Page - Interactive Simulator Scripts
// =====================================================================

let currentTab = 'translate';
let currentTheme = 'dark';
let currentLang = 'en';
let currentFillPreset = 0;

const FILL_PRESETS = [
  { name: '✨ 数据模拟', text: 'Emily Watson\nLiam Vance\nSophia Reynolds\nLucas Chen\nOlivia Martinez' },
  { name: '欧美姓名', text: 'Alexander Wright\nCharlotte Evans\nBenjamin Scott\nAmelia Brooks\nJames Bennett' },
  { name: '全球城市', text: 'San Francisco, US\nTokyo, JP\nLondon, UK\nSingapore, SG\nBerlin, DE' },
  { name: '电商价格', text: '$29.99\n$49.00\n$128.50\n$19.90\n$89.00' }
];

const MockupViews = {
  translate() {
    const langs = [
      { code: 'en', flag: '🇺🇸', name: '英语', en: 'English' },
      { code: 'ja', flag: '🇯🇵', name: '日语', en: 'Japanese' },
      { code: 'ko', flag: '🇰🇷', name: '韩语', en: 'Korean' },
      { code: 'es', flag: '🇪🇸', name: '西语', en: 'Spanish' },
      { code: 'fr', flag: '🇫🇷', name: '法语', en: 'French' },
    ];

    return `
      <div class="mockup-segmented-control">
        <button class="mockup-segment-btn active">原地文本翻译</button>
        <button class="mockup-segment-btn">画板方案批量翻译</button>
      </div>

      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; padding: 4px 14px 8px 14px;">
        ${langs.map(l => `
          <div onclick="selectMockupLang('${l.code}')" style="background: ${currentLang === l.code ? 'rgba(255,85,0,0.12)' : 'var(--bg-surface)'}; border: 1px solid ${currentLang === l.code ? 'var(--accent-red)' : 'var(--border-deck)'}; border-radius: 6px; padding: 6px 8px; cursor: pointer; display: flex; flex-direction: column; gap: 2px; transition: all 0.15s;">
            <div style="display: flex; align-items: center; gap: 4px;">
              <span style="font-size: 13px;">${l.flag}</span>
              <span style="font-size: 11px; font-weight: 600; color: ${currentLang === l.code ? 'var(--accent-red)' : 'var(--text-main)'};">${l.name}</span>
            </div>
            <span style="font-size: 9.5px; color: var(--text-muted);">${l.en}</span>
          </div>
        `).join('')}
        <div style="background: var(--bg-surface); border: 1px dashed var(--border-deck); border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 14px; color: var(--text-muted); cursor: pointer;">
          ＋
        </div>
      </div>

      <div class="mockup-setting-group">
        <div class="mockup-setting-row" style="padding: 6px 14px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-subtle);">
          <div style="display: flex; flex-direction: column;">
            <span style="font-size: 11px; font-weight: 500;">数字与数据智能保护</span>
            <span style="font-size: 9.5px; color: var(--text-muted);">百分比、股票代码、金额不被篡改</span>
          </div>
          <div style="width: 32px; height: 18px; border-radius: 9px; background: var(--accent-red); position: relative; cursor: pointer;">
            <div style="width: 14px; height: 14px; border-radius: 50%; background: #FFF; position: absolute; right: 2px; top: 2px; box-shadow: 0 1px 3px rgba(0,0,0,0.3);"></div>
          </div>
        </div>
        <div class="mockup-setting-row" style="padding: 6px 14px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-subtle);">
          <span style="font-size: 11px; font-weight: 500;">保留富文本分段样式</span>
          <div style="width: 32px; height: 18px; border-radius: 9px; background: var(--accent-red); position: relative; cursor: pointer;">
            <div style="width: 14px; height: 14px; border-radius: 50%; background: #FFF; position: absolute; right: 2px; top: 2px; box-shadow: 0 1px 3px rgba(0,0,0,0.3);"></div>
          </div>
        </div>
        <div class="mockup-setting-row" style="padding: 6px 14px; display: flex; justify-content: space-between; align-items: center;">
          <div style="display: flex; flex-direction: column;">
            <span style="font-size: 11px; font-weight: 500;">智能大小写规范</span>
            <span style="font-size: 9.5px; color: var(--text-muted);">单词首字母 · 句子与专有名词规范</span>
          </div>
          <div style="width: 32px; height: 18px; border-radius: 9px; background: var(--accent-red); position: relative; cursor: pointer;">
            <div style="width: 14px; height: 14px; border-radius: 50%; background: #FFF; position: absolute; right: 2px; top: 2px; box-shadow: 0 1px 3px rgba(0,0,0,0.3);"></div>
          </div>
        </div>
      </div>

      <div class="mockup-action-bar">
        <button class="mockup-btn-primary" style="flex: 1;">开始文本翻译 (4)</button>
        <button class="mockup-btn-secondary">撤回</button>
      </div>
    `;
  },

  fill() {
    const preset = FILL_PRESETS[currentFillPreset] || FILL_PRESETS[0];
    const lines = preset.text.split('\n');

    return `
      <div style="display: flex; flex: 1; gap: 8px; padding: 0 14px; min-height: 280px;">
        <!-- Sidebar Presets -->
        <div style="width: 72px; display: flex; flex-direction: column; gap: 6px; flex-shrink: 0;">
          ${FILL_PRESETS.map((p, idx) => `
            <div onclick="selectMockupFillPreset(${idx})" style="background: ${currentFillPreset === idx ? 'rgba(255,85,0,0.12)' : 'var(--bg-surface)'}; border: 1px solid ${currentFillPreset === idx ? 'var(--accent-red)' : 'var(--border-deck)'}; border-radius: 6px; padding: 8px 4px; text-align: center; cursor: pointer; transition: all 0.15s;">
              <div style="font-size: 10px; font-weight: 600; color: ${currentFillPreset === idx ? 'var(--accent-red)' : 'var(--text-sub)'}; line-height: 1.2;">${p.name}</div>
            </div>
          `).join('')}
          <div style="background: transparent; border: 1px dashed var(--border-deck); border-radius: 6px; padding: 6px 4px; text-align: center; color: var(--text-muted); font-size: 10px; cursor: pointer;">＋新建</div>
        </div>

        <!-- Main Editor -->
        <div style="flex: 1; display: flex; flex-direction: column; gap: 6px;">
          <div style="flex: 1; background: var(--bg-surface); border: 1px solid var(--border-deck); border-radius: 6px; padding: 6px 8px; font-family: var(--font-mono); font-size: 10px; color: var(--text-main); line-height: 1.5; overflow: hidden;">
            ${lines.map((l, i) => `<div style="display: flex; gap: 8px;"><span style="color: var(--text-muted);">${i+1}</span><span>${l}</span></div>`).join('')}
          </div>

          <div style="display: flex; gap: 6px;">
            <input class="mockup-input-box" placeholder="前缀: 如 ¥" style="flex: 1; height: 24px; font-size: 10px;" />
            <input class="mockup-input-box" placeholder="后缀: 如 /月" style="flex: 1; height: 24px; font-size: 10px;" />
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
            <button class="mockup-btn-primary" style="height: 26px; font-size: 10.5px; padding: 0;">正序填充</button>
            <button class="mockup-btn-secondary" style="height: 26px; font-size: 10.5px; padding: 0;">随机填充</button>
            <button class="mockup-btn-secondary" style="height: 26px; font-size: 10.5px; padding: 0;">倒序填充</button>
            <button class="mockup-btn-secondary" style="height: 26px; font-size: 10.5px; padding: 0;">图层重命名</button>
          </div>
        </div>
      </div>
    `;
  },

  compress() {
    return `
      <div class="mockup-section-header" style="padding-top: 2px;">
        <span class="mockup-section-title">TinyPNG 账号池配置</span>
        <span class="mockup-section-hint" style="color: var(--text-sub);">额度: 740/1000</span>
      </div>

      <div class="mockup-setting-group">
        <div class="mockup-setting-row" style="flex-direction: column; align-items: stretch; gap: 8px; padding: 8px 14px;">
          <div style="font-size: 10px; color: var(--text-sub); line-height: 1.4;">
            配置 TinyPNG API Key 开启云端极速压缩（不填则使用本地引擎）。
          </div>
          <div style="display: flex; gap: 6px;">
            <input class="mockup-input-box" type="password" value="5c98a72b99f3" placeholder="输入 TinyPNG API Key..." style="flex: 1; font-family: var(--font-mono);" />
            <button class="mockup-btn-primary" style="height: 28px; padding: 0 10px; font-size: 10.5px; flex-shrink: 0;">保存并添加</button>
          </div>
          <div style="display: flex; flex-direction: column; gap: 4px; margin-top: 2px;">
            <div style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-muted); padding: 4px 8px; border-radius: 4px; font-size: 10px;">
              <span style="font-family: var(--font-mono);">5c98****3f1a</span>
              <span style="color: var(--text-muted);">380/500</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-muted); padding: 4px 8px; border-radius: 4px; font-size: 10px;">
              <span style="font-family: var(--font-mono);">9b21****88e4</span>
              <span style="color: var(--text-muted);">360/500</span>
            </div>
          </div>
        </div>
      </div>

      <div class="mockup-section-header" style="padding-top: 4px;">
        <span class="mockup-section-title">导出设置</span>
      </div>

      <div class="mockup-setting-group">
        <div class="mockup-setting-row">
          <span style="font-size: 11px;">输出格式</span>
          <div class="mockup-segmented-control" style="margin: 0; width: 120px;">
            <button class="mockup-segment-btn active">PNG</button>
            <button class="mockup-segment-btn">JPG</button>
          </div>
        </div>
        <div class="mockup-setting-row">
          <span style="font-size: 11px;">导出倍率</span>
          <div class="mockup-segmented-control" style="margin: 0; width: 130px;">
            <button class="mockup-segment-btn">1x</button>
            <button class="mockup-segment-btn active">2x</button>
            <button class="mockup-segment-btn">3x</button>
          </div>
        </div>
      </div>

      <div class="mockup-action-bar">
        <button class="mockup-btn-primary" style="flex: 1;">云端极速压缩导出 (8)</button>
      </div>
    `;
  },

  color() {
    return `
      <div class="mockup-section-header">
        <span class="mockup-section-title">调色范围</span>
      </div>

      <div class="mockup-segmented-control">
        <button class="mockup-segment-btn active">全部色彩</button>
        <button class="mockup-segment-btn">仅填充</button>
        <button class="mockup-segment-btn">仅描边</button>
      </div>

      <div class="mockup-section-header" style="justify-content: space-between; align-items: center;">
        <span class="mockup-section-title">色彩整体调节 (HSL)</span>
        <label style="font-size: 10px; color: var(--text-sub); display: flex; align-items: center; gap: 4px;">
          <input type="checkbox" checked style="accent-color: var(--accent-red); margin: 0;" />
          <span>保护黑白灰</span>
        </label>
      </div>

      <div class="mockup-setting-group">
        <div class="mockup-setting-row" style="flex-direction: column; align-items: stretch; gap: 6px; padding: 10px 14px; border-bottom: 1px solid var(--border-subtle);">
          <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
            <span style="font-size: 11.5px; font-weight: 500; color: var(--text-main);">色相 (Hue)</span>
            <div style="display: flex; align-items: center; gap: 4px;">
              <div style="display: inline-flex; align-items: center; background: var(--bg-hover); border: 1px solid var(--border-deck); border-radius: 4px; padding: 0 4px 0 6px; height: 20px;">
                <input type="number" id="mockup-num-hue" min="-180" max="180" value="15" style="border: none; background: transparent; outline: none; font-family: var(--font-mono); font-size: 11px; font-weight: 600; color: var(--text-main); width: 34px; text-align: right; padding: 0 1px 0 0;" oninput="document.getElementById('mockup-range-hue').value = this.value;" />
                <span style="font-family: var(--font-mono); font-size: 10.5px; font-weight: 600; color: var(--text-muted); margin-left: 1px;">°</span>
              </div>
              <button onclick="document.getElementById('mockup-num-hue').value = 0; document.getElementById('mockup-range-hue').value = 0;" style="background: none; border: none; cursor: pointer; padding: 2px; color: var(--text-muted); display: flex;" title="重置为 0">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                  <path d="M3 3v5h5"/>
                </svg>
              </button>
            </div>
          </div>
          <div style="width: 100%; height: 16px; display: flex; align-items: center;">
            <input type="range" id="mockup-range-hue" min="-180" max="180" value="15" style="width: 100%; accent-color: var(--accent-red); margin: 0;" oninput="document.getElementById('mockup-num-hue').value = this.value;" />
          </div>
        </div>

        <div class="mockup-setting-row" style="flex-direction: column; align-items: stretch; gap: 6px; padding: 10px 14px; border-bottom: 1px solid var(--border-subtle);">
          <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
            <span style="font-size: 11.5px; font-weight: 500; color: var(--text-main);">饱和度 (Saturation)</span>
            <div style="display: flex; align-items: center; gap: 4px;">
              <div style="display: inline-flex; align-items: center; background: var(--bg-hover); border: 1px solid var(--border-deck); border-radius: 4px; padding: 0 4px 0 6px; height: 20px;">
                <input type="number" id="mockup-num-sat" min="-100" max="100" value="10" style="border: none; background: transparent; outline: none; font-family: var(--font-mono); font-size: 11px; font-weight: 600; color: var(--text-main); width: 34px; text-align: right; padding: 0 1px 0 0;" oninput="document.getElementById('mockup-range-sat').value = this.value;" />
                <span style="font-family: var(--font-mono); font-size: 10.5px; font-weight: 600; color: var(--text-muted); margin-left: 1px;">%</span>
              </div>
              <button onclick="document.getElementById('mockup-num-sat').value = 0; document.getElementById('mockup-range-sat').value = 0;" style="background: none; border: none; cursor: pointer; padding: 2px; color: var(--text-muted); display: flex;" title="重置为 0">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                  <path d="M3 3v5h5"/>
                </svg>
              </button>
            </div>
          </div>
          <div style="width: 100%; height: 16px; display: flex; align-items: center;">
            <input type="range" id="mockup-range-sat" min="-100" max="100" value="10" style="width: 100%; accent-color: var(--accent-red); margin: 0;" oninput="document.getElementById('mockup-num-sat').value = this.value;" />
          </div>
        </div>

        <div class="mockup-setting-row" style="flex-direction: column; align-items: stretch; gap: 6px; padding: 10px 14px;">
          <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
            <span style="font-size: 11.5px; font-weight: 500; color: var(--text-main);">明度 (Lightness)</span>
            <div style="display: flex; align-items: center; gap: 4px;">
              <div style="display: inline-flex; align-items: center; background: var(--bg-hover); border: 1px solid var(--border-deck); border-radius: 4px; padding: 0 4px 0 6px; height: 20px;">
                <input type="number" id="mockup-num-lit" min="-100" max="100" value="0" style="border: none; background: transparent; outline: none; font-family: var(--font-mono); font-size: 11px; font-weight: 600; color: var(--text-main); width: 34px; text-align: right; padding: 0 1px 0 0;" oninput="document.getElementById('mockup-range-lit').value = this.value;" />
                <span style="font-family: var(--font-mono); font-size: 10.5px; font-weight: 600; color: var(--text-muted); margin-left: 1px;">%</span>
              </div>
              <button onclick="document.getElementById('mockup-num-lit').value = 0; document.getElementById('mockup-range-lit').value = 0;" style="background: none; border: none; cursor: pointer; padding: 2px; color: var(--text-muted); display: flex;" title="重置为 0">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                  <path d="M3 3v5h5"/>
                </svg>
              </button>
            </div>
          </div>
          <div style="width: 100%; height: 16px; display: flex; align-items: center;">
            <input type="range" id="mockup-range-lit" min="-100" max="100" value="0" style="width: 100%; accent-color: var(--accent-red); margin: 0;" oninput="document.getElementById('mockup-num-lit').value = this.value;" />
          </div>
        </div>
      </div>

      <div class="mockup-action-bar">
        <button class="mockup-btn-primary" style="flex: 1;">应用调色</button>
        <button class="mockup-btn-secondary">重置</button>
      </div>
    `;
  },

  tools() {
    return `
      <div class="mockup-section-header" style="padding-top: 2px;">
        <span class="mockup-section-title">本地服务助手</span>
      </div>

      <div class="mockup-setting-group">
        <div class="mockup-setting-row">
          <span style="font-size: 11.5px; font-weight: 500;">本地直拷服务</span>
          <span style="font-size: 10.5px; color: var(--accent-green); font-weight: 600;">● 极速直拷已开启</span>
        </div>
      </div>

      <div class="mockup-section-header" style="padding-top: 4px;">
        <span class="mockup-section-title">快捷设计工具</span>
      </div>

      <div class="mockup-setting-group">
        <div class="mockup-setting-row">
          <span style="font-size: 11.5px; font-weight: 500;">画布生成拼图（带标题）</span>
          <button class="mockup-btn-primary" style="height: 24px; padding: 0 10px; font-size: 10.5px;">生成</button>
        </div>
        <div class="mockup-setting-row">
          <span style="font-size: 11.5px; font-weight: 500;">批量导出所选画板</span>
          <button class="mockup-btn-primary" style="height: 24px; padding: 0 10px; font-size: 10.5px;">复制</button>
        </div>
        <div class="mockup-setting-row">
          <span style="font-size: 11.5px; font-weight: 500;">文本固定行高转auto</span>
          <button class="mockup-btn-primary" style="height: 24px; padding: 0 10px; font-size: 10.5px;">执行</button>
        </div>
        <div class="mockup-setting-row">
          <span style="font-size: 11.5px; font-weight: 500;">裁切PNG透明边缘</span>
          <button class="mockup-btn-primary" style="height: 24px; padding: 0 10px; font-size: 10.5px;">执行</button>
        </div>
      </div>
    `;
  },

  settings() {
    return `
      <div class="mockup-section-header" style="padding-top: 2px;">
        <span class="mockup-section-title">账号与多端配置同步</span>
        <span class="mockup-section-hint" style="color: var(--accent-green); font-weight: 600;">跨设备免配置</span>
      </div>

      <div class="mockup-setting-group">
        <div class="mockup-setting-row" style="flex-direction: column; align-items: stretch; gap: 8px; padding: 8px 14px;">
          <div style="font-size: 10px; color: var(--text-sub); line-height: 1.4;">
            绑定同步密钥/激活码，换设备一键恢复所有 API Key 与设置。
          </div>
          <div style="display: flex; gap: 6px;">
            <input class="mockup-input-box" value="VB-98F1-3A2B" style="flex: 1; font-family: var(--font-mono);" />
            <button class="mockup-btn-primary" style="height: 28px; padding: 0 10px; font-size: 10.5px; flex-shrink: 0;">绑定并同步</button>
          </div>
        </div>
      </div>

      <div class="mockup-section-header" style="padding-top: 4px;">
        <span class="mockup-section-title">官方免费通道</span>
        <span class="mockup-section-hint" style="color: var(--accent-green); font-weight: 600;">● 运行正常</span>
      </div>

      <div class="mockup-setting-group">
        <div class="mockup-setting-row">
          <div style="display: flex; flex-direction: column; gap: 2px;">
            <span style="font-size: 11.5px; font-weight: 600;">极速翻译引擎</span>
            <span style="font-size: 9.5px; color: var(--text-sub);">全球 100+ 语言 · 毫秒级多通道加速</span>
          </div>
        </div>
      </div>

      <div class="mockup-section-header" style="padding-top: 4px;">
        <span class="mockup-section-title">自定义 AI 大模型（可选）</span>
      </div>

      <div class="mockup-setting-group">
        <div class="mockup-setting-row">
          <span style="font-size: 11px;">服务商</span>
          <select class="mockup-input-box" style="width: 140px;">
            <option>DeepSeek AI (推荐)</option>
            <option>OpenAI (ChatGPT)</option>
          </select>
        </div>
        <div class="mockup-setting-row">
          <span style="font-size: 11px;">API Key</span>
          <input class="mockup-input-box" type="password" value="sk-d98f7123aa" style="width: 140px; font-family: var(--font-mono);" />
        </div>
      </div>
    `;
  }
};

function renderMockup() {
  const container = document.getElementById('mockup-view-content');
  if (container && MockupViews[currentTab]) {
    container.innerHTML = MockupViews[currentTab]();
  }

  // Update Top Keypad active buttons
  document.querySelectorAll('#mockup-keypad .mockup-key').forEach(btn => {
    if (btn.getAttribute('data-tab') === currentTab) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

function setMockupTab(tab) {
  currentTab = tab;
  renderMockup();
}

function setMockupTheme(theme) {
  currentTheme = theme;
  const sim = document.getElementById('plugin-simulator');
  const btnLight = document.getElementById('mockup-theme-light');
  const btnDark = document.getElementById('mockup-theme-dark');

  if (theme === 'light') {
    sim.classList.remove('theme-dark');
    sim.classList.add('theme-light');
    btnLight.classList.add('active');
    btnDark.classList.remove('active');
  } else {
    sim.classList.remove('theme-light');
    sim.classList.add('theme-dark');
    btnDark.classList.add('active');
    btnLight.classList.remove('active');
  }
}

function selectMockupLang(code) {
  currentLang = code;
  renderMockup();
}

function selectMockupFillPreset(idx) {
  currentFillPreset = idx;
  renderMockup();
}

function toggleFaq(btn) {
  const item = btn.closest('.faq-item');
  if (item) {
    item.classList.toggle('active');
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  renderMockup();
});
