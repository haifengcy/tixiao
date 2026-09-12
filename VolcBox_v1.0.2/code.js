/**
 * =====================================================================
 * VolcBox - Plugin Main Engine (High-Performance Architecture)
 * =====================================================================
 */

// =====================================================================
// 1. CONSTANTS & CONFIGURATION
// =====================================================================
const CONFIG = {
  UI: {
    WIDTH: 420,
    HEIGHT: 680,
    TITLE: 'VolcBox',
  },
  STORAGE_KEYS: {
    SETTINGS: 'volcbox_user_settings_v1',
    STYLE_LIB: 'volcbox_style_library_v1',
    UNDO_STACK: 'volcbox_translation_undo_stack',
  },
};

const DEFAULT_SETTINGS = {
  version: 1,
  theme: 'auto',
  activeProviderId: 'free-fast',
  customLlm: {
    preset: 'deepseek',
    baseUrl: 'https://api.deepseek.com',
    apiKey: '',
    model: 'deepseek-chat',
    testResult: ''
  },
  providerCredentials: {
    deepseek: { model: 'deepseek-chat', apiKey: '', status: 'unconfigured' },
    'google-translate': { status: 'valid' },
  },
  translation: {
    pinnedLanguageCodes: ['en', 'zh-CN', 'ja', 'ko'],
    targetLanguage: 'en',
    translateMode: 'text',
    protectText: true,
    preserveRichText: true,
    recentLanguageCodes: [],
    profiles: [
      {
        id: 'default-profile-1',
        name: '出海常用（英/日/韩）',
        languages: ['en', 'ja', 'ko'],
        direction: 'right',
        spacing: 40,
      },
    ],
    activeProfileId: 'default-profile-1',
    style: 'balanced',
  },
  fill: {
    fillLines: ['张伟', '王芳', '李娜', '刘洋', '陈杰', '杨敏', '赵敏', '周强'],
    fillPrefix: '',
    fillSuffix: '',
    presets: [
      {
        id: 'preset-names-cn',
        name: '中文姓名',
        lines: ['张伟', '王芳', '李娜', '刘洋', '陈杰', '杨敏', '赵敏', '周强'],
        mode: 'sequential',
      },
      {
        id: 'preset-names-en',
        name: '英文姓名',
        lines: ['Emma Watson', 'Liam Smith', 'Olivia Johnson', 'Noah Williams', 'Ava Brown', 'Sophia Garcia'],
        mode: 'sequential',
      },
      {
        id: 'preset-cities',
        name: '常用城市',
        lines: ['北京', '上海', '广州', '深圳', '杭州', '成都', '武汉', '南京'],
        mode: 'sequential',
      },
      {
        id: 'preset-numbers',
        name: '价格金额',
        lines: ['¥ 99.00', '¥ 199.00', '¥ 299.00', '¥ 499.00', '¥ 999.00'],
        mode: 'random',
      },
    ],
  },
  compression: {
    tinifyKeys: [],
    exportScale: 2,
    exportFormat: 'PNG',
    zipName: 'VolcBox_Images',
    engine: 'cloud',
  },
  clipboard: {
    scale: 2,
    frameStyle: {
      preset: 'apple',
      radius: 12,
      borderWidth: 1,
      borderOpacity: 0.15,
      padding: 16,
      lightSurfaceBorder: '#000000',
      darkSurfaceBorder: '#ffffff',
    },
  },
  cloudSync: {
    enabled: false,
    syncKey: '',
    lastSyncTime: null,
    autoSync: true,
  },
  theme: 'light',
};

const DEFAULT_STYLE_LIBRARY = {
  version: 1,
  categories: [
    { id: 'uncategorized', name: '未分类' },
    { id: 'cards', name: '卡片容器' },
    { id: 'buttons', name: '按钮与控件' },
    { id: 'tags', name: '标签与徽标' },
  ],
  styles: [],
};

// =====================================================================
// 2. FONT MANAGER SERVICE (Concurrent Preloader & Graceful Fallback)
// =====================================================================
const FontManagerService = {
  loadedFonts: new Set(),

  fontKey(font) {
    if (!font || typeof font !== 'object') return '';
    return `${font.family}:::${font.style}`;
  },

  async preloadFonts(fonts = []) {
    const toLoad = [];
    for (const f of fonts) {
      if (!f || f === figma.mixed || typeof f !== 'object') continue;
      const key = this.fontKey(f);
      if (!this.loadedFonts.has(key)) {
        toLoad.push(f);
      }
    }
    if (toLoad.length === 0) return;

    await Promise.allSettled(
      toLoad.map(async (font) => {
        try {
          await figma.loadFontAsync(font);
          this.loadedFonts.add(this.fontKey(font));
        } catch (err) {
          console.warn(`[FontManager] Warning: could not preload font ${font.family} ${font.style}:`, err);
        }
      })
    );
  },

  async safeLoadFont(font, fallback = null) {
    if (!font || font === figma.mixed || typeof font !== 'object') return false;
    const key = this.fontKey(font);
    if (this.loadedFonts.has(key)) return true;

    try {
      await figma.loadFontAsync(font);
      this.loadedFonts.add(key);
      return true;
    } catch (e) {
      console.warn(`[FontManager] Load font failed for ${font.family} ${font.style}, trying fallback...`);
      if (fallback && fallback !== figma.mixed && typeof fallback === 'object') {
        try {
          await figma.loadFontAsync(fallback);
          this.loadedFonts.add(this.fontKey(fallback));
          return true;
        } catch (e2) {}
      }
      try {
        const standardFont = { family: 'Inter', style: 'Regular' };
        await figma.loadFontAsync(standardFont);
        this.loadedFonts.add(this.fontKey(standardFont));
        return true;
      } catch (e3) {}
      return false;
    }
  }
};

// =====================================================================
// 2.1 NATIVE RICH TEXT ENGINE (High Performance Segmented Styling)
// =====================================================================
const NativeRichTextEngine = {
  isRich(node) {
    if (!node || node.type !== 'TEXT') return false;
    if (node.characters.length === 0) return false;
    if (node.fontName === figma.mixed || 
        node.fills === figma.mixed || 
        node.fontSize === figma.mixed || 
        node.textDecoration === figma.mixed ||
        node.letterSpacing === figma.mixed ||
        node.lineHeight === figma.mixed ||
        node.textCase === figma.mixed ||
        node.textStyleId === figma.mixed ||
        node.fillStyleId === figma.mixed) {
      return true;
    }
    if (typeof node.getStyledTextSegments === 'function') {
      try {
        const segs = node.getStyledTextSegments(['fontSize', 'fontName']);
        return segs && segs.length > 1;
      } catch (e) {}
    }
    return false;
  },

  extract(node) {
    if (!node || node.type !== 'TEXT' || node.characters.length === 0) {
      return { taggedText: "", styles: [] };
    }

    const styles = [];
    const styleMap = new Map();

    // 1. Preferred: Native C++ getStyledTextSegments (O(1) IPC bridge call)
    if (typeof node.getStyledTextSegments === 'function') {
      try {
        const rawSegments = node.getStyledTextSegments([
          'fontSize',
          'fontName',
          'textDecoration',
          'letterSpacing',
          'lineHeight',
          'fills',
          'textStyleId',
          'fillStyleId',
          'textCase'
        ]);

        if (rawSegments && rawSegments.length > 0) {
          let taggedText = "";
          for (const seg of rawSegments) {
            const styleObj = {
              fontName: seg.fontName,
              fontSize: seg.fontSize,
              fills: seg.fills,
              textDecoration: seg.textDecoration,
              letterSpacing: seg.letterSpacing,
              lineHeight: seg.lineHeight,
              textStyleId: seg.textStyleId || '',
              fillStyleId: seg.fillStyleId || '',
              textCase: seg.textCase || 'ORIGINAL'
            };
            const fingerprint = JSON.stringify(styleObj);
            let sIdx = styleMap.get(fingerprint);
            if (sIdx === undefined) {
              sIdx = styles.length;
              styles.push(styleObj);
              styleMap.set(fingerprint, sIdx);
            }
            taggedText += `<s id="${sIdx}">${seg.characters}</s>`;
          }
          return { taggedText, styles };
        }
      } catch (err) {
        console.warn('[NativeRichTextEngine] getStyledTextSegments fallback to range loop:', err);
      }
    }

    // 2. Fallback: Range-based inspection
    const len = node.characters.length;
    let taggedText = "";
    let currentStyleIdx = -1;
    let currentSegmentText = "";

    for (let i = 0; i < len; i++) {
      const char = node.characters[i];
      const font = node.getRangeFontName(i, i + 1);
      const fill = node.getRangeFills(i, i + 1);
      const size = node.getRangeFontSize(i, i + 1);
      const dec = node.getRangeTextDecoration(i, i + 1);
      const ls = node.getRangeLetterSpacing(i, i + 1);
      const lh = node.getRangeLineHeight(i, i + 1);
      
      const styleObj = { fontName: font, fills: fill, fontSize: size, textDecoration: dec, letterSpacing: ls, lineHeight: lh };
      const styleStr = JSON.stringify(styleObj);
      let sIdx = styleMap.get(styleStr);
      if (sIdx === undefined) {
        sIdx = styles.length;
        styles.push(styleObj);
        styleMap.set(styleStr, sIdx);
      }

      if (currentStyleIdx === -1) {
        currentStyleIdx = sIdx;
        currentSegmentText = char;
      } else if (currentStyleIdx === sIdx) {
        currentSegmentText += char;
      } else {
        taggedText += `<s id="${currentStyleIdx}">${currentSegmentText}</s>`;
        currentStyleIdx = sIdx;
        currentSegmentText = char;
      }
    }
    if (currentStyleIdx !== -1) {
      taggedText += `<s id="${currentStyleIdx}">${currentSegmentText}</s>`;
    }

    return { taggedText, styles };
  },

  async apply(node, translatedTaggedText, styles) {
    if (!node || node.type !== 'TEXT') return;
    if (!translatedTaggedText && translatedTaggedText !== '') return;
    if (!styles || styles.length === 0) {
      const clean = (translatedTaggedText || '').replace(/<[^>]+>/g, '');
      const baseFont = node.fontName === figma.mixed ? node.getRangeFontName(0, 1) : node.fontName;
      await FontManagerService.safeLoadFont(baseFont);
      if (node.fontName === figma.mixed) {
        node.fontName = baseFont;
      }
      node.characters = clean;
      return;
    }

    // 1. Unescape HTML entities from translation models
    let unescaped = translatedTaggedText
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'")
        .replace(/&amp;/gi, '&');

    // 2. Tolerant tag regex matching both <s id="0">...</s> and <span id="0">...</span> with flexible spacing
    const tagRegex = /<\s*(?:s|span)\s+id\s*=\s*["']?(\d+)["']?\s*>([\s\S]*?)<\s*\/\s*(?:s|span)\s*>/gi;
    
    let finalString = "";
    const segmentsToApply = [];
    let match;
    let lastIndex = 0;

    while ((match = tagRegex.exec(unescaped)) !== null) {
      const before = unescaped.substring(lastIndex, match.index);
      if (before) {
        segmentsToApply.push({ start: finalString.length, end: finalString.length + before.length, styleIdx: 0 });
        finalString += before;
      }

      const styleIdx = parseInt(match[1], 10);
      const innerText = match[2];
      if (innerText) {
        const start = finalString.length;
        finalString += innerText;
        const end = finalString.length;
        segmentsToApply.push({ start, end, styleIdx });
      }

      lastIndex = tagRegex.lastIndex;
    }

    const after = unescaped.substring(lastIndex);
    if (after) {
      segmentsToApply.push({ start: finalString.length, end: finalString.length + after.length, styleIdx: 0 });
      finalString += after;
    }

    // Fallback if no tags detected
    if (segmentsToApply.length === 0) {
      finalString = unescaped.replace(/<[^>]+>/g, '');
      segmentsToApply.push({ start: 0, end: finalString.length, styleIdx: 0 });
    }

    // 3. Preload all unique fonts required
    const fontsToLoad = [];
    for (const s of styles) {
      const fn = s.fontName || s.font;
      if (fn && fn !== figma.mixed) fontsToLoad.push(fn);
    }
    const currentBaseFont = node.fontName === figma.mixed ? node.getRangeFontName(0, 1) : node.fontName;
    if (currentBaseFont && currentBaseFont !== figma.mixed) fontsToLoad.push(currentBaseFont);

    await FontManagerService.preloadFonts(fontsToLoad);

    const fallbackFont = (styles[0] && (styles[0].fontName || styles[0].font)) || currentBaseFont;
    await FontManagerService.safeLoadFont(fallbackFont);

    // If text node has mixed fonts, unify to fallbackFont first so Figma allows setting characters
    if (node.fontName === figma.mixed) {
      node.fontName = fallbackFont;
    }

    // 4. Assign characters
    node.characters = finalString;

    // 5. Apply segmented styling with boundary clamping
    const totalLen = finalString.length;
    for (const seg of segmentsToApply) {
      const s = styles[seg.styleIdx] || styles[0];
      if (!s) continue;

      const start = Math.max(0, Math.min(seg.start, totalLen));
      const end = Math.max(start, Math.min(seg.end, totalLen));
      if (start >= end) continue;

      const fn = s.fontName || s.font;
      if (fn && fn !== figma.mixed) {
        try { node.setRangeFontName(start, end, fn); } catch (e) {}
      }
      const fills = s.fills !== undefined ? s.fills : s.fill;
      if (fills && fills !== figma.mixed) {
        try { node.setRangeFills(start, end, fills); } catch (e) {}
      }
      const size = s.fontSize !== undefined ? s.fontSize : s.size;
      if (size && size !== figma.mixed) {
        try { node.setRangeFontSize(start, end, size); } catch (e) {}
      }
      const dec = s.textDecoration !== undefined ? s.textDecoration : s.dec;
      if (dec && dec !== figma.mixed) {
        try { node.setRangeTextDecoration(start, end, dec); } catch (e) {}
      }
      const ls = s.letterSpacing !== undefined ? s.letterSpacing : s.ls;
      if (ls && ls !== figma.mixed) {
        try { node.setRangeLetterSpacing(start, end, ls); } catch (e) {}
      }
      const lh = s.lineHeight !== undefined ? s.lineHeight : s.lh;
      if (lh && lh !== figma.mixed) {
        try { node.setRangeLineHeight(start, end, lh); } catch (e) {}
      }
      if (s.textCase && s.textCase !== figma.mixed) {
        try { node.setRangeTextCase(start, end, s.textCase); } catch (e) {}
      }
      if (s.textStyleId && typeof node.setRangeTextStyleId === 'function') {
        try { node.setRangeTextStyleId(start, end, s.textStyleId); } catch (e) {}
      }
      if (s.fillStyleId && typeof node.setRangeFillStyleId === 'function') {
        try { node.setRangeFillStyleId(start, end, s.fillStyleId); } catch (e) {}
      }
    }
  }
};

// Backward-compatible alias for existing modules
const RichTextHelper = NativeRichTextEngine;

// =====================================================================
// 3. SELECTION SCANNER & UTILS
// =====================================================================
const SelectionEngine = {
  scan() {
    const selection = figma.currentPage.selection;
    let textNodeCount = 0;
    let colorLayerCount = 0;
    let artboardCount = 0;

    let dominantColor = null;
    let fallbackColor = null;
    const colorFrequency = new Map();

    function walk(node) {
      if (node.type === 'TEXT') {
        textNodeCount++;
        // Self-healing: Purge any contaminated / cloned pluginData
        try {
          const tMem = node.getPluginData('volc_translate_original_mem');
          if (tMem) {
            const parsed = JSON.parse(tMem);
            if ((parsed.nodeId && parsed.nodeId !== node.id) ||
                (parsed.appliedText && node.characters !== parsed.appliedText && node.characters === parsed.beforeText) ||
                (DataProtectionEngine.isProtected(node.characters) && parsed.text && !DataProtectionEngine.isProtected(parsed.text))) {
              node.setPluginData('volc_translate_original_mem', '');
            }
          }
          const fMem = node.getPluginData('volc_fill_original_mem');
          if (fMem) {
            const parsed = JSON.parse(fMem);
            if ((parsed.nodeId && parsed.nodeId !== node.id) ||
                (parsed.appliedText && node.characters !== parsed.appliedText && node.characters === parsed.beforeText) ||
                (DataProtectionEngine.isProtected(node.characters) && parsed.text && !DataProtectionEngine.isProtected(parsed.text))) {
              node.setPluginData('volc_fill_original_mem', '');
            }
          }
        } catch (e) {}
      }
      if (node.type === 'FRAME' || node.type === 'SECTION' || node.type === 'COMPONENT') {
        artboardCount++;
      }
      if ('fills' in node || 'strokes' in node) {
        colorLayerCount++;
      }
      if ('fills' in node && Array.isArray(node.fills)) {
        for (const fill of node.fills) {
          if (fill.type === 'SOLID' && fill.visible !== false && fill.opacity !== 0) {
            const r255 = Math.round(fill.color.r * 255);
            const g255 = Math.round(fill.color.g * 255);
            const b255 = Math.round(fill.color.b * 255);
            const hex = `#${((1 << 24) + (r255 << 16) + (g255 << 8) + b255).toString(16).slice(1).toUpperCase()}`;
            if (!fallbackColor) {
              fallbackColor = { hex, r: r255, g: g255, b: b255, color01: fill.color };
            }
            // Give non-neutral (colorful) layers higher weight
            const isNeutral = (r255 > 240 && g255 > 240 && b255 > 240) || (r255 < 20 && g255 < 20 && b255 < 20);
            const score = isNeutral ? 1 : 10;
            const item = colorFrequency.get(hex) || { hex, r: r255, g: g255, b: b255, color01: fill.color, score: 0 };
            item.score += score;
            colorFrequency.set(hex, item);
          }
        }
      }
      if ('children' in node) {
        for (const child of node.children) {
          walk(child);
        }
      }
    }

    for (const node of selection) {
      walk(node);
    }

    let best = null;
    for (const item of colorFrequency.values()) {
      if (!best || item.score > best.score) best = item;
    }
    const chosen = best || fallbackColor;
    if (chosen) {
      const hsl = rgbToHsl(chosen.color01.r, chosen.color01.g, chosen.color01.b);
      dominantColor = {
        hex: chosen.hex,
        r: chosen.r,
        g: chosen.g,
        b: chosen.b,
        h: Math.round(hsl.h),
        s: Math.round(hsl.s * 100),
        l: Math.round(hsl.l * 100)
      };
    }

    const topColors = Array.from(colorFrequency.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map(item => ({
        hex: item.hex,
        count: item.score
      }));

    return {
      totalSelected: selection.length,
      artboardCount,
      textNodeCount,
      colorLayerCount,
      dominantColor,
      topColors,
      canSaveStyle: selection.length === 1 && colorLayerCount > 0,
      detectedSourceLanguage: 'auto',
      detectedSourceLanguageName: '自动检测',
      nodeIds: selection.map((n) => n.id),
    };
  },

  getTextNodes(nodes) {
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
  },

  getArtboards() {
    const selection = figma.currentPage.selection;
    return selection.filter(
      (n) => n.type === 'FRAME' || n.type === 'SECTION' || n.type === 'COMPONENT'
    );
  },
};

// =====================================================================
// 2.8 DATA & SYMBOL PROTECTION ENGINE (Guards numbers, currencies, tickers)
// =====================================================================
const DataProtectionEngine = {
  COMMON_TICKERS: new Set([
    'NVDA', 'TSLA', 'AAPL', 'MSFT', 'GOOG', 'GOOGL', 'AMZN', 'META', 'AMD', 'INTC',
    'ADM', 'BABA', 'NFLX', 'DIS', 'PYPL', 'UBER', 'COIN', 'NKE', 'SBUX', 'ORCL',
    'EURUSD', 'GBPUSD', 'USDJPY', 'NZDUSD', 'AUDUSD', 'USDCAD', 'USDCHF', 'EURGBP',
    'EURJPY', 'GBPJPY', 'XAUUSD', 'XAGUSD', 'BTCUSD', 'ETHUSD', 'USDX', 'USOIL', 'UKOIL',
    'SPX', 'NDX', 'DJI', 'VIX', 'US30', 'NAS100', 'SP500', 'HK0700', 'HK09988'
  ]),

  isProtected(rawText) {
    if (!rawText || typeof rawText !== 'string') return false;
    const text = rawText.replace(/<[^>]+>/g, '').trim();
    if (!text) return true;

    // 1. Strings with NO letters at all (pure numbers, signs, currencies, punctuation)
    if (!/[a-zA-Z\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af\u0400-\u04ff\u0600-\u06ff\u0e00-\u0e7f]/.test(text)) {
      return true;
    }

    // 2. Percentages or signed numbers: e.g. "+0.69%", "-0.20%", "+0.09%", "+0.05%"
    if (/^[+-]?\s*[\d,.]+\s*[%％]$/.test(text)) {
      return true;
    }

    // 3. Currency with number: e.g. "US$ 100", "HK$ 500", "100 USD", "50 EUR", "¥ 199.00", "$99"
    if (/^(?:US\$|HK\$|AU\$|CA\$|RMB|USD|EUR|GBP|JPY|CNY|KRW)\s*[\d,.]+/i.test(text) ||
        /^[\d,.]+\s*(?:USD|EUR|GBP|JPY|CNY|KRW|RMB)$/i.test(text)) {
      return true;
    }

    // 4. Financial Tickers / Forex pairs / Stock codes:
    const commonUIWords = new Set(['ALL', 'NEW', 'ADD', 'EDIT', 'HOME', 'VIEW', 'SAVE', 'MORE', 'NEXT', 'BACK', 'DONE', 'USER', 'MENU', 'HELP', 'SEND', 'INFO', 'CART', 'ITEM', 'TAG', 'TAB', 'PAGE', 'TOP', 'LIST', 'CODE', 'DATA', 'FILE', 'TYPE', 'DATE', 'NAME', 'POST', 'TEXT', 'ICON', 'OK']);
    const upper = text.toUpperCase();
    if (this.COMMON_TICKERS.has(upper)) {
      return true;
    }
    if (/^[A-Z]{3,7}$/.test(text) && !commonUIWords.has(upper)) {
      if (text === upper) return true;
    }

    // 5. Stock codes: e.g. '600519.SH', '00700.HK', 'NASDAQ:NVDA'
    if (/^(?:[A-Z]{2,6}:[A-Z0-9]+|\d{5,6}\.(?:SH|SZ|HK|BJ))$/i.test(text)) {
      return true;
    }

    // 6. Timestamps, durations, metrics:
    if (/^(?:\d+:\d+(?::\d+)?(?:\s*(?:AM|PM))?|\d+(?:\.\d+)?\s*(?:ms|s|min|h|fps|px|pt|dp|rem|em|vh|vw|kb|mb|gb|tb|k|w|p)\b|v\d+(?:\.\d+)+)$/i.test(text)) {
      return true;
    }

    return false;
  }
};

// =====================================================================
// 2.9 NODE HISTORY MANAGER (Pure In-Memory Session Undo / Anti-Crosstalk Engine)
// =====================================================================
const NodeHistoryManager = {
  // Map of nodeId -> Array of historical states: [{ txId, text, isRich, taggedText, styles, timestamp }]
  historyMap: new Map(),
  // Global transaction log: [{ txId, type: 'translate'|'fill', nodeIds: [...] }]
  transactionStack: [],

  recordBeforeChange(nodeList, type = 'translate') {
    const txId = 'tx_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    const affectedNodeIds = [];

    for (const node of nodeList) {
      if (!node || node.type !== 'TEXT') continue;
      
      const isRich = RichTextHelper.isRich(node);
      const extracted = isRich ? RichTextHelper.extract(node) : null;
      const history = this.historyMap.get(node.id) || [];

      history.push({
        txId,
        text: node.characters,
        isRich,
        taggedText: extracted ? extracted.taggedText : null,
        styles: extracted ? extracted.styles : null,
        timestamp: Date.now()
      });

      if (history.length > 20) history.shift();
      this.historyMap.set(node.id, history);
      affectedNodeIds.push(node.id);

      // Clean up any legacy contaminated pluginData from previous versions!
      try {
        node.setPluginData('volc_translate_original_mem', '');
        node.setPluginData('volc_fill_original_mem', '');
      } catch (e) {}
    }

    if (affectedNodeIds.length > 0) {
      this.transactionStack.push({ txId, type, nodeIds: affectedNodeIds });
      if (this.transactionStack.length > 30) this.transactionStack.shift();
    }
  },

  async undo(type = 'translate', explicitNodes = null) {
    let nodesToRestore = [];

    // Case 1: The user has specific text layer(s) selected
    if (explicitNodes && explicitNodes.length > 0) {
      const restoredNodeIds = new Set();
      for (const node of explicitNodes) {
        if (!node || node.type !== 'TEXT') continue;
        const history = this.historyMap.get(node.id);
        if (history && history.length > 0) {
          const prevState = history.pop();
          nodesToRestore.push({ node, state: prevState });
          restoredNodeIds.add(node.id);
        }
      }
      // Clean up transactions from transactionStack if all nodes in them have been reverted
      if (restoredNodeIds.size > 0 && this.transactionStack.length > 0) {
        for (let i = this.transactionStack.length - 1; i >= 0; i--) {
          const tx = this.transactionStack[i];
          if (tx.type === type && tx.nodeIds.every(id => restoredNodeIds.has(id))) {
            this.transactionStack.splice(i, 1);
          }
        }
      }
      // If none of the explicitly selected text nodes have history, do NOT touch other unselected nodes!
      if (nodesToRestore.length === 0) {
        return { restored: 0, reason: 'selection_no_history' };
      }
    } else {
      // Case 2: User selected a frame/group or nothing: undo the most recent transaction
      if (this.transactionStack.length > 0) {
        for (let i = this.transactionStack.length - 1; i >= 0; i--) {
          const tx = this.transactionStack[i];
          if (tx.type === type) {
            this.transactionStack.splice(i, 1);
            for (const id of tx.nodeIds) {
              const node = await figma.getNodeByIdAsync(id);
              if (node && node.type === 'TEXT') {
                const history = this.historyMap.get(node.id);
                if (history && history.length > 0) {
                  const prevState = history.pop();
                  nodesToRestore.push({ node, state: prevState });
                }
              }
            }
            break;
          }
        }
      }
    }

    if (nodesToRestore.length === 0) {
      return { restored: 0, reason: 'empty_stack' };
    }

    let count = 0;
    for (const { node, state } of nodesToRestore) {
      try {
        if (state.taggedText && state.styles) {
          await RichTextHelper.apply(node, state.taggedText, state.styles);
        } else if (state.text !== undefined) {
          let baseFont;
          if (node.fontName === figma.mixed) {
            baseFont = node.getRangeFontName(0, 1);
            try { await figma.loadFontAsync(baseFont); } catch (e) {}
            node.fontName = baseFont;
          } else {
            baseFont = node.fontName;
            try { await figma.loadFontAsync(baseFont); } catch (e) {}
          }
          node.characters = state.text;
        }
        count++;
      } catch (e) {
        console.error('[Node Restore Error]', e);
      }
    }

    // Do NOT overwrite figma.currentPage.selection with leaf text nodes!
    // Preserves the user's parent container / frame selection and enables smooth continuous undo.
    return { restored: count };
  }
};

// =====================================================================
// 3. STORAGE & STATE MANAGER
// =====================================================================
const StorageEngine = {
  translationUndoStack: [],
  fillUndoStack: [],

  deepMerge(target, source) {
    if (!source || typeof source !== 'object') return target;
    const output = { ...target };
    for (const key of Object.keys(source)) {
      if (
        source[key] &&
        typeof source[key] === 'object' &&
        !Array.isArray(source[key])
      ) {
        output[key] = this.deepMerge(target[key] || {}, source[key]);
      } else {
        output[key] = source[key];
      }
    }
    return output;
  },

  async getSettings() {
    try {
      const raw = await figma.clientStorage.getAsync(CONFIG.STORAGE_KEYS.SETTINGS);
      if (raw && typeof raw === 'string') {
        const parsed = JSON.parse(raw);
        return this.deepMerge(DEFAULT_SETTINGS, parsed);
      }
    } catch (e) {
      console.error('[Get Settings Error]', e);
    }
    return DEFAULT_SETTINGS;
  },

  async saveSettings(partial) {
    const current = await this.getSettings();
    const updated = this.deepMerge(current, partial);
    try {
      await figma.clientStorage.setAsync(CONFIG.STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
    } catch (e) {
      console.error('[Save Settings Error]', e);
    }
    return updated;
  },

  async resetSettings() {
    try {
      await figma.clientStorage.deleteAsync(CONFIG.STORAGE_KEYS.SETTINGS);
    } catch {}
    return DEFAULT_SETTINGS;
  },

  async getStyleLibrary() {
    try {
      const raw = await figma.clientStorage.getAsync(CONFIG.STORAGE_KEYS.STYLE_LIB);
      if (raw && typeof raw === 'string') {
        return { ...DEFAULT_STYLE_LIBRARY, ...JSON.parse(raw) };
      }
    } catch {}
    return DEFAULT_STYLE_LIBRARY;
  },

  pushTranslationUndo(snapshot) {
    if (!snapshot || !snapshot.records || snapshot.records.length === 0) return;
    this.translationUndoStack.push(snapshot);
    if (this.translationUndoStack.length > 30) {
      this.translationUndoStack.shift();
    }
  },

  popTranslationUndo() {
    return this.translationUndoStack.pop() || null;
  },

  pushFillUndo(snapshot) {
    if (!snapshot || !snapshot.records || snapshot.records.length === 0) return;
    this.fillUndoStack.push(snapshot);
    if (this.fillUndoStack.length > 30) {
      this.fillUndoStack.shift();
    }
  },

  popFillUndo() {
    return this.fillUndoStack.pop() || null;
  },

  // Compatibility aliases
  pushUndo(snapshot) {
    this.pushTranslationUndo(snapshot);
  },

  popUndo() {
    return this.popTranslationUndo();
  },
};

// =====================================================================
// 3.5 CLOUD CONFIG SYNC ENGINE (High-Availability Edge Key-Value Gateway)
// =====================================================================
const CloudSyncEngine = {
  ENDPOINT: 'https://api.restful-api.dev/objects',

  cleanKey(key) {
    if (!key) return '';
    return key.trim().replace(/^VB-/i, '');
  },

  formatKey(rawId) {
    if (!rawId) return '';
    return rawId.startsWith('VB-') ? rawId : `VB-${rawId}`;
  },

  extractSyncPayload(settings) {
    return {
      version: 1,
      updatedAt: new Date().toISOString(),
      settings: {
        customLlm: settings.customLlm,
        providerCredentials: settings.providerCredentials,
        translation: settings.translation,
        fill: settings.fill,
        compression: settings.compression,
        clipboard: settings.clipboard,
      }
    };
  },

  async createSync(settings) {
    const payload = {
      name: 'VolcBox_CloudSync',
      data: this.extractSyncPayload(settings)
    };

    const res = await fetch(this.ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      throw new Error(`创建同步通道失败: HTTP ${res.status}`);
    }

    const data = await res.json();
    return {
      syncKey: this.formatKey(data.id),
      rawId: data.id,
      updatedAt: data.data?.updatedAt || new Date().toISOString()
    };
  },

  async pushSync(syncKey, settings) {
    const rawId = this.cleanKey(syncKey);
    if (!rawId) throw new Error('无效的同步密钥');

    const payload = {
      name: 'VolcBox_CloudSync',
      data: this.extractSyncPayload(settings)
    };

    const res = await fetch(`${this.ENDPOINT}/${rawId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      if (res.status === 404) {
        throw new Error('同步密钥在云端不存在或已失效');
      }
      throw new Error(`云端备份失败: HTTP ${res.status}`);
    }

    const data = await res.json();
    return {
      syncKey: this.formatKey(rawId),
      updatedAt: data.data?.updatedAt || new Date().toISOString()
    };
  },

  async pullSync(syncKey) {
    const rawId = this.cleanKey(syncKey);
    if (!rawId) throw new Error('请输入有效的同步密钥');

    const res = await fetch(`${this.ENDPOINT}/${rawId}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (!res.ok) {
      if (res.status === 404) {
        throw new Error('未找到该密钥对应的云端配置，请检查密钥是否正确');
      }
      throw new Error(`拉取云端配置失败: HTTP ${res.status}`);
    }

    const data = await res.json();
    if (!data.data || !data.data.settings) {
      throw new Error('云端配置格式解析异常');
    }

    return {
      syncKey: this.formatKey(rawId),
      updatedAt: data.data.updatedAt || new Date().toISOString(),
      settings: data.data.settings
    };
  }
};

// =====================================================================
// 4. LAYOUT & SPATIAL CLUSTERING ENGINE
// =====================================================================
const LayoutEngine = {
  // Group selected nodes into 2D rows matching canvas visual layout
  groupByCanvasRows(nodes) {
    if (!nodes || nodes.length === 0) return [];
    const sorted = [...nodes].sort((a, b) => a.y - b.y || a.x - b.x);
    const rows = [];
    for (const node of sorted) {
      let matchedRow = null;
      for (const r of rows) {
        const overlaps = r.some(item => {
          const top = Math.max(node.y, item.y);
          const bottom = Math.min(node.y + node.height, item.y + item.height);
          const overlapHeight = bottom - top;
          const minHeight = Math.min(node.height, item.height);
          return overlapHeight > 0 && (overlapHeight / minHeight >= 0.35 || Math.abs(node.y - item.y) < 100);
        });
        if (overlaps) {
          matchedRow = r;
          break;
        }
      }
      if (matchedRow) {
        matchedRow.push(node);
      } else {
        rows.push([node]);
      }
    }
    rows.sort((r1, r2) => Math.min(...r1.map(n => n.y)) - Math.min(...r2.map(n => n.y)));
    rows.forEach(r => r.sort((a, b) => a.x - b.x));
    return rows;
  },

  // Sort nodes in top-to-bottom, left-to-right visual reading order
  sortByVisualOrder(nodes) {
    if (!nodes || nodes.length === 0) return [];
    return [...nodes].sort((a, b) => {
      if (Math.abs(a.y - b.y) < 120) return a.x - b.x;
      return a.y - b.y;
    });
  }
};


// =====================================================================
// 5. PROTOCOL & MESSAGE DISPATCHER
// =====================================================================
function sendToUI(response) {
  figma.ui.postMessage(response);
}

// Modular Feature Handlers Registry
// =====================================================================
// COLOR ADJUSTMENT LOGIC
// =====================================================================
const OriginalColorState = new Map();
let cachedColorNodes = null;
let currentColorVersion = 0;

function revertActiveColorPreview() {
  if (OriginalColorState.size === 0) {
    cachedColorNodes = null;
    return;
  }
  for (const [nodeId, original] of OriginalColorState.entries()) {
    try {
      const node = figma.getNodeById(nodeId);
      if (node && !node.removed) {
        if ('fills' in node && Array.isArray(original.fills)) {
          node.fills = original.fills;
        }
        if ('strokes' in node && Array.isArray(original.strokes)) {
          node.strokes = original.strokes;
        }
      }
    } catch (e) {}
  }
  OriginalColorState.clear();
  cachedColorNodes = null;
}

figma.on('selectionchange', () => {
  currentColorVersion++;
  revertActiveColorPreview();
});

function rgbToHsl(r, g, b) {
  let max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    let d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: h * 360, s, l };
}

function hslToRgb(h, s, l) {
  let r, g, b;
  h = ((h % 360) + 360) % 360;
  h /= 360;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    let q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    let p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return {
    r: Math.max(0, Math.min(1, r)),
    g: Math.max(0, Math.min(1, g)),
    b: Math.max(0, Math.min(1, b))
  };
}

function clonePaints(paints) {
  if (!Array.isArray(paints)) return [];
  return paints.map(p => {
    if (p.type === 'SOLID' && p.color) {
      return {
        ...p,
        color: { r: p.color.r, g: p.color.g, b: p.color.b }
      };
    } else if (p.gradientStops && Array.isArray(p.gradientStops)) {
      return {
        ...p,
        gradientStops: p.gradientStops.map(s => ({
          ...s,
          color: { r: s.color.r, g: s.color.g, b: s.color.b, a: s.color.a !== undefined ? s.color.a : 1 }
        }))
      };
    }
    return { ...p };
  });
}

function hexToRgb01(hex) {
  if (!hex) return null;
  hex = hex.replace('#', '').trim();
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('');
  }
  if (hex.length !== 6) return null;
  return {
    r: parseInt(hex.substring(0, 2), 16) / 255,
    g: parseInt(hex.substring(2, 4), 16) / 255,
    b: parseInt(hex.substring(4, 6), 16) / 255
  };
}

function isColorClose(c1, c2, tolerance = 18) {
  if (!c1 || !c2) return false;
  const rDiff = Math.abs(Math.round(c1.r * 255) - Math.round(c2.r * 255));
  const gDiff = Math.abs(Math.round(c1.g * 255) - Math.round(c2.g * 255));
  const bDiff = Math.abs(Math.round(c1.b * 255) - Math.round(c2.b * 255));
  return (rDiff + gDiff + bDiff) <= tolerance;
}

function adjustColorPaint(paint, offsetHue, offsetSat, offsetLit, protectNeutrals = true) {
  if (paint.type === 'SOLID') {
    const hsl = rgbToHsl(paint.color.r, paint.color.g, paint.color.b);

    // If protectNeutrals is on, preserve pure white, pure black, and low-saturation grays
    if (protectNeutrals) {
      const isPureWhite = (paint.color.r > 0.96 && paint.color.g > 0.96 && paint.color.b > 0.96) || hsl.l > 0.97;
      const isPureBlack = (paint.color.r < 0.08 && paint.color.g < 0.08 && paint.color.b < 0.08) || hsl.l < 0.04;
      const isNeutralGray = hsl.s < 0.08;
      if (isPureWhite || isPureBlack || isNeutralGray) {
        return paint; // Protect neutral background/text
      }
    }

    let newH = (hsl.h + offsetHue) % 360;
    if (newH < 0) newH += 360;
    let newS = Math.max(0, Math.min(1, hsl.s + offsetSat / 100));
    let newL = Math.max(0, Math.min(1, hsl.l + offsetLit / 100));
    const newRgb = hslToRgb(newH, newS, newL);
    return { ...paint, color: newRgb };
  } else if (paint.type && paint.type.startsWith('GRADIENT_') && Array.isArray(paint.gradientStops)) {
    const newStops = paint.gradientStops.map(stop => {
      const hsl = rgbToHsl(stop.color.r, stop.color.g, stop.color.b);
      if (protectNeutrals) {
        const isPureWhite = (stop.color.r > 0.96 && stop.color.g > 0.96 && stop.color.b > 0.96) || hsl.l > 0.97;
        const isPureBlack = (stop.color.r < 0.08 && stop.color.g < 0.08 && stop.color.b < 0.08) || hsl.l < 0.04;
        const isNeutralGray = hsl.s < 0.08;
        if (isPureWhite || isPureBlack || isNeutralGray) {
          return stop;
        }
      }
      let newH = (hsl.h + offsetHue) % 360;
      if (newH < 0) newH += 360;
      let newS = Math.max(0, Math.min(1, hsl.s + offsetSat / 100));
      let newL = Math.max(0, Math.min(1, hsl.l + offsetLit / 100));
      const newRgb = hslToRgb(newH, newS, newL);
      return {
        ...stop,
        color: {
          r: newRgb.r,
          g: newRgb.g,
          b: newRgb.b,
          a: stop.color.a !== undefined ? stop.color.a : 1
        }
      };
    });
    return { ...paint, gradientStops: newStops };
  }
  return paint;
}

function adjustPaints(paints, offsetHue, offsetSat, offsetLit, protectNeutrals = true) {
  if (!Array.isArray(paints)) return paints;
  return paints.map(p => adjustColorPaint(p, offsetHue, offsetSat, offsetLit, protectNeutrals));
}

function recolorPaintToTone(paint, baseHsl, targetHsl) {
  if (!paint || !baseHsl || !targetHsl) return paint;

  function remapColor(color) {
    if (!color) return color;
    const hsl = rgbToHsl(color.r, color.g, color.b);

    // 1. Absolute Neutral Protection (Pure White, Pure Black, Neutral Gray, Off-White card bases, typography)
    const isPureWhite = color.r > 0.96 && color.g > 0.96 && color.b > 0.96;
    const isPureBlack = color.r < 0.08 && color.g < 0.08 && color.b < 0.08;
    const isNeutralGray = hsl.s < 0.08;
    if (isPureWhite || isPureBlack || isNeutralGray) {
      return color; // Retain crisp neutrals unchanged
    }

    // 2. Harmonic Angle Shift relative to base theme color
    let offsetFromBase = hsl.h - baseHsl.h;
    if (offsetFromBase > 180) offsetFromBase -= 360;
    if (offsetFromBase < -180) offsetFromBase += 360;

    // Elements in the primary family (offset within 40 degrees) converge tightly on the target hue
    // Elements that are secondary/accent maintain their harmonic relationship
    let newH;
    if (Math.abs(offsetFromBase) <= 40) {
      // Primary family: button, light container, border, active state
      newH = (targetHsl.h + offsetFromBase * 0.35 + 720) % 360;
    } else {
      // Secondary/Accents: maintain full harmonic relation
      newH = (targetHsl.h + offsetFromBase + 720) % 360;
    }

    // 3. New Saturation: scale proportionally to target vibrancy
    let newS = hsl.s;
    if (baseHsl.s > 0.15) {
      const sRatio = targetHsl.s / baseHsl.s;
      newS = Math.max(0.06, Math.min(1, hsl.s * Math.max(0.5, Math.min(1.8, sRatio))));
    } else {
      newS = Math.max(0.06, Math.min(1, hsl.s + (targetHsl.s - baseHsl.s)));
    }

    // 4. New Lightness: adaptive curve preservation
    const deltaL = targetHsl.l - baseHsl.l;
    const factor = Math.max(0, 1 - Math.abs(hsl.l - 0.5) * 1.6);
    let newL = Math.max(0.04, Math.min(0.96, hsl.l + deltaL * factor));

    return hslToRgb(newH, newS, newL);
  }

  if (paint.type === 'SOLID') {
    const newColor = remapColor(paint.color);
    return { ...paint, color: newColor };
  } else if (paint.type && paint.type.startsWith('GRADIENT_') && Array.isArray(paint.gradientStops)) {
    const newStops = paint.gradientStops.map(stop => {
      const newColor = remapColor(stop.color);
      return {
        ...stop,
        color: {
          r: newColor.r,
          g: newColor.g,
          b: newColor.b,
          a: stop.color.a !== undefined ? stop.color.a : 1
        }
      };
    });
    return { ...paint, gradientStops: newStops };
  }
  return paint;
}

function getAllColorNodes(nodes) {
  const map = new Map();
  function walk(node) {
    if (('fills' in node && node.fills !== figma.mixed && Array.isArray(node.fills) && node.fills.length > 0) || 
        ('strokes' in node && node.strokes !== figma.mixed && Array.isArray(node.strokes) && node.strokes.length > 0)) {
      if (!map.has(node.id)) {
        map.set(node.id, node);
      }
    }
    if ('children' in node) {
      for (const child of node.children) {
        walk(child);
      }
    }
  }
  for (const n of (nodes || figma.currentPage.selection)) {
    walk(n);
  }
  return Array.from(map.values());
}

function getCachedColorNodes() {
  if (!cachedColorNodes) {
    cachedColorNodes = getAllColorNodes(figma.currentPage.selection);
  }
  return cachedColorNodes;
}

const NativeLineHeightCache = new Map();

async function getExactDefaultLineHeight(fontName, fontSize) {
  const key = `${fontName.family}_${fontName.style}_${fontSize}`;
  if (NativeLineHeightCache.has(key)) {
    return NativeLineHeightCache.get(key);
  }

  try {
    await figma.loadFontAsync(fontName);
    const testNode = figma.createText();
    testNode.fontName = fontName;
    testNode.fontSize = fontSize;
    testNode.characters = 'Ag';
    testNode.lineHeight = { unit: 'AUTO' };
    testNode.textAutoResize = 'WIDTH_AND_HEIGHT';
    
    const rawHeight = testNode.height;
    testNode.remove();
    
    // Exact native line height value from Figma's font layout engine
    const exactVal = Math.round(rawHeight * 100) / 100;
    NativeLineHeightCache.set(key, exactVal);
    return exactVal;
  } catch (e) {
    console.error('[Get Native LineHeight Error]', e);
    return Math.round(fontSize * 1.2);
  }
}

// =====================================================================
// SMART MOCK ENGINE (Context-Aware & Semantic-Driven)
// =====================================================================
const SmartMockEngine = {
  CHINESE_NAMES: ['张伟', '王芳', '李娜', '刘洋', '陈杰', '杨敏', '赵敏', '周强', '徐磊', '孙悦', '林晨', '黄博', '吴昊', '朱婷', '何静', '高飞', '郭涛', '马超', '唐雪', '范文'],
  ENGLISH_NAMES: ['Alex Morgan', 'Sarah Jenkins', 'Michael Chang', 'Jessica Taylor', 'David Miller', 'Emma Watson', 'James Wilson', 'Olivia Brown', 'Daniel Craig', 'Sophia Garcia'],
  CITIES: ['北京市朝阳区', '上海市浦东新区', '深圳市南山区', '广州市天河区', '杭州市西湖区', '成都市高新区', '武汉市武昌区', '南京市玄武区', '苏州市工业园区'],
  GLOBAL_CITIES: ['New York, US', 'London, UK', 'Tokyo, Japan', 'Singapore', 'Paris, France', 'Sydney, Australia', 'Berlin, Germany', 'Toronto, Canada', 'Seoul, Korea'],
  COMPANIES: ['字节跳动', '腾讯科技', '阿里巴巴', '美团点评', '蚂蚁集团', '小红书', '商汤科技', '米哈游', '快手科技', '微软中国', '谷歌中国', '苹果公司'],
  JOB_TITLES: ['高级产品经理', '全栈开发工程师', '资深视觉设计师', '运营总监', '技术专家', '用户增长负责人', '系统架构师', '市场战略专家'],
  STATUSES: ['进行中', '已完成', '待支付', '审核中', '已发货', '已归档', '处理中', '已关闭', '待确认'],
  PRODUCT_NAMES: ['无线降噪蓝牙耳机 Pro', '4K 超清智能投影仪', '人体工学机械键盘', '便携式快充移动电源', '极简陶瓷马克杯', '智能恒温电水壶', '全自动手冲咖啡机', '真皮极简卡包'],
  DESCRIPTIONS: [
    '打造下一代高效协同设计体验，专注于用户价值与业务增长。',
    '基于前沿大模型与自动化工作流，重塑数字产品研发全生命周期。',
    '极简现代工业美学设计，兼顾极致性能与直觉化操作手感。',
    '覆盖全球多语言与本地化设计规范，助力团队无缝开拓出海业务。'
  ],
  TICKERS: ['USDX', 'EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD', 'BTCUSD', 'ETHUSD', 'USOIL', 'HK0700', 'AAPL', 'TSLA', 'NVDA', 'AUDUSD', 'USDCAD', 'NZDUSD', 'USDCHF'],
  NAMES: ['腾讯控股', '苹果', '特斯拉', '英伟达', '美元指数', '欧元/美元', '英镑/美元', '黄金', '比特币', '原油', '纳斯达克', '标普500'],

  mockText(original, node) {
    const trimmed = (original || '').trim();
    const layerName = node ? (node.name || '').toLowerCase() : '';

    // --- Phase 1: Layer Name Context Inference ---
    if (layerName) {
      // 1. User Names
      if (/name|姓名|用户|author|user|昵称|owner/i.test(layerName)) {
        if (/[A-Za-z]{2,}\s+[A-Za-z]{2,}/.test(trimmed) || /en_name|english/i.test(layerName)) {
          return this.ENGLISH_NAMES[Math.floor(Math.random() * this.ENGLISH_NAMES.length)];
        }
        return this.CHINESE_NAMES[Math.floor(Math.random() * this.CHINESE_NAMES.length)];
      }

      // 2. Price & Amounts
      if (/price|价格|金额|cost|fee|原价|现价|售价|amount/i.test(layerName)) {
        const symbolMatch = trimmed.match(/^([¥$€£￥]\s*)/);
        const prefix = symbolMatch ? symbolMatch[1] : (trimmed.startsWith('¥') ? '¥' : '');
        const suffixMatch = trimmed.match(/(\s*[\/月年次件套包])$/);
        const suffix = suffixMatch ? suffixMatch[1] : '';
        const priceVal = (Math.floor(Math.random() * 800) + 19) + (Math.random() > 0.5 ? '.00' : '.90');
        return `${prefix}${priceVal}${suffix}`;
      }

      // 3. City / Address
      if (/city|城市|address|地址|location|地区|省份/i.test(layerName)) {
        if (/global|en|world/i.test(layerName) || /^[A-Za-z\s,]+$/.test(trimmed)) {
          return this.GLOBAL_CITIES[Math.floor(Math.random() * this.GLOBAL_CITIES.length)];
        }
        return this.CITIES[Math.floor(Math.random() * this.CITIES.length)];
      }

      // 4. Company / Org
      if (/company|公司|企业|org|corp|brand|品牌/i.test(layerName)) {
        return this.COMPANIES[Math.floor(Math.random() * this.COMPANIES.length)];
      }

      // 5. Job Title
      if (/job|title|role|position|职位|岗位|角色/i.test(layerName)) {
        return this.JOB_TITLES[Math.floor(Math.random() * this.JOB_TITLES.length)];
      }

      // 6. Status / Tag / Badge
      if (/status|state|tag|badge|状态|标签/i.test(layerName)) {
        return this.STATUSES[Math.floor(Math.random() * this.STATUSES.length)];
      }

      // 7. Product / Item / Goods
      if (/product|goods|item|sku|商品|产品/i.test(layerName)) {
        return this.PRODUCT_NAMES[Math.floor(Math.random() * this.PRODUCT_NAMES.length)];
      }

      // 8. Order / ID / Code
      if (/order|sn|no|id|code|订单|单号|编号/i.test(layerName)) {
        const year = 2024;
        const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
        const randomNum = Math.floor(Math.random() * 900000) + 100000;
        return `ORD${year}${month}${randomNum}`;
      }

      // 9. Score / Rating
      if (/score|rate|rating|star|评分|评价|得分/i.test(layerName)) {
        return (4.5 + Math.random() * 0.5).toFixed(1);
      }

      // 10. Description / Intro
      if (/desc|intro|summary|bio|content|描述|简介|摘要|内容/i.test(layerName) && trimmed.length > 10) {
        return this.DESCRIPTIONS[Math.floor(Math.random() * this.DESCRIPTIONS.length)];
      }
    }

    // --- Phase 2: Content Pattern Matching (Text Regex) ---
    let modified = original;

    // A. Tickers & Financial Names
    if (this.TICKERS.includes(trimmed) || /^[A-Z]{4,6}$/.test(trimmed)) {
      return this.TICKERS[Math.floor(Math.random() * this.TICKERS.length)];
    }
    if (this.NAMES.includes(trimmed)) {
      return this.NAMES[Math.floor(Math.random() * this.NAMES.length)];
    }

    // B. Chinese Names (2-3 chars matching common surnames)
    if (/^[赵钱孙李周吴郑王冯陈褚卫蒋沈韩杨朱秦尤许何吕施张孔曹严华金魏陶姜戚谢邹喻柏水窦章云苏潘葛奚范彭郎鲁韦昌马苗凤花方俞任袁柳酆鲍史唐费廉岑薛雷贺倪汤滕殷罗毕郝邬安常乐于时傅皮卞齐康伍余元卜顾孟平黄和穆萧尹姚邵湛汪祁毛禹狄米贝明臧计伏成戴谈宋茅庞熊纪舒屈项祝董梁杜阮蓝闵席季麻强贾路娄危江童颜郭梅盛林刁钟徐邱骆高夏蔡田樊胡凌霍虞万支柯昝管卢莫经房裘缪干解应宗丁宣贲邓郁单杭洪包诸左石崔吉钮龚程嵇邢滑裴陆荣翁荀羊於惠甄曲家封芮羿储靳汲邴糜松井段富巫乌焦巴弓牧隗山谷车侯宓蓬全郗班仰秋仲伊宫宁仇栾暴甘钭厉戎祖武符刘景詹束龙叶幸司韶郜黎蓟薄印宿白怀蒲邰从鄂索咸籍赖卓蔺屠蒙池乔阴鬱胥能苍双闻莘党翟谭贡劳逄姬申扶堵冉宰郦雍郤璩桑桂濮扈套寿通边扈燕冀郏浦尚农温别庄晏柴瞿阎充慕连茹习宦艾鱼容向古易慎戈廖庾终暨居衡步都耿满弘匡国文寇广禄阙东欧殳沃利蔚越夔隆师巩厍聂晁勾敖融冷訾辛阚那简饶空曾毋沙乜养鞠须丰巢关蒯相查后荆红游竺权逯盖益桓公][\u4e00-\u9fa5]{1,2}$/.test(trimmed)) {
      return this.CHINESE_NAMES[Math.floor(Math.random() * this.CHINESE_NAMES.length)];
    }

    // C. English Full Names (Capitalized First + Last)
    if (/^[A-Z][a-z]{2,}\s+[A-Z][a-z]{2,}$/.test(trimmed)) {
      return this.ENGLISH_NAMES[Math.floor(Math.random() * this.ENGLISH_NAMES.length)];
    }

    // D. Emails
    modified = modified.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, () => {
      const domains = ['gmail.com', 'outlook.com', '163.com', 'qq.com', 'company.com'];
      const names = ['alex', 'sarah', 'michael', 'jessica', 'chen', 'li', 'wang', 'smith', 'john'];
      return `${names[Math.floor(Math.random() * names.length)]}${Math.floor(Math.random() * 999)}@${domains[Math.floor(Math.random() * domains.length)]}`;
    });

    // E. Phones (11 digits, typical Chinese mobile, spaced or dashed)
    modified = modified.replace(/(^|[^\d])(1[3-9]\d)([-\s]?)(\d{4})\3(\d{4})(?![\d])/g, (match, prefix, head, sep, m1, m2) => {
      const newHead = '1' + (Math.floor(Math.random() * 7) + 3) + Math.floor(Math.random() * 10);
      const newM1 = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      const newM2 = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      return `${prefix}${newHead}${sep}${newM1}${sep}${newM2}`;
    });

    // F. Dates (YYYY-MM-DD, YYYY/MM/DD, or MM/DD)
    modified = modified.replace(/(^|[^\d])((?:19|20)\d{2})([-\/.])(\d{1,2})\3(\d{1,2})(?![\d])/g, (match, prefix, yStr, sep, mStr, dStr) => {
      const y = 2024 + Math.floor(Math.random() * 3);
      const m = Math.floor(Math.random() * 12 + 1).toString().padStart(mStr.length, '0');
      const d = Math.floor(Math.random() * 28 + 1).toString().padStart(dStr.length, '0');
      return `${prefix}${y}${sep}${m}${sep}${d}`;
    });
    modified = modified.replace(/(^|[^\d])(\d{1,2})([-\/])(\d{1,2})(?![\d])/g, (match, prefix, mStr, sep, dStr) => {
      const m = Math.floor(Math.random() * 12 + 1).toString().padStart(mStr.length, '0');
      const d = Math.floor(Math.random() * 28 + 1).toString().padStart(dStr.length, '0');
      return `${prefix}${m}${sep}${d}`;
    });

    // G. A-Share Codes (e.g. 600519)
    modified = modified.replace(/(^|[^\d])(600|601|603|688|000|002|003|300)(\d{3})(?![\d])/g, (match, prefix, head) => {
      const tail = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      return `${prefix}${head}${tail}`;
    });

    // H. Times (HH:MM or HH:MM:SS)
    modified = modified.replace(/\b(\d{1,2}):(\d{2})(?::(\d{2}))?\b/g, (match, hStr, mStr, sStr) => {
      const h = Math.floor(Math.random() * 24).toString().padStart(hStr.length, '0');
      const m = Math.floor(Math.random() * 60).toString().padStart(2, '0');
      if (sStr) {
        const s = Math.floor(Math.random() * 60).toString().padStart(2, '0');
        return `${h}:${m}:${s}`;
      }
      return `${h}:${m}`;
    });

    // I. Currency & Price Numbers (e.g. ¥199.00 or $49.90)
    modified = modified.replace(/(¥|\$|€|£|￥)\s*(\d+)(?:\.(\d+))?/g, (match, symbol, intPart, decPart) => {
      const newInt = Math.floor(Math.random() * 800) + 19;
      const newDec = decPart ? (Math.random() > 0.5 ? '00' : '90') : '';
      return newDec ? `${symbol}${newInt}.${newDec}` : `${symbol}${newInt}`;
    });

    // J. Percentages & Decimals
    modified = modified.replace(/([+-]?\s*)(\d+)(?:\.(\d+))?(%?)/g, (match, sign, intStr, decStr, isPercent) => {
      if (!decStr && !isPercent) return match;
      
      let min = Math.pow(10, intStr.length - 1);
      if (intStr === '0') min = 0;
      let max = Math.pow(10, intStr.length) - 1;
      if (intStr === '0') max = 0;
      
      let newInt = Math.floor(Math.random() * (max - min + 1)) + min;
      
      let newDec = '';
      if (decStr) {
        for (let j = 0; j < decStr.length; j++) newDec += Math.floor(Math.random() * 10);
        return `${sign}${newInt}.${newDec}${isPercent}`;
      } else {
        return `${sign}${newInt}${isPercent}`;
      }
    });

    // K. Isolated Integers
    modified = modified.replace(/(^|[^\d\.:])([+-]?\s*)(\d+)(?![\d\.%:\/])/g, (match, prefix, sign, intStr) => {
      if (intStr.length === 4 && (intStr.startsWith('1') || intStr.startsWith('2'))) return match; // Skip years
      if (intStr === '0') return match;
      if ((prefix === '-' || prefix === '/') && intStr.length <= 2) return match;

      let min = Math.pow(10, intStr.length - 1);
      let max = Math.pow(10, intStr.length) - 1;
      let newInt = Math.floor(Math.random() * (max - min + 1)) + min;
      return `${prefix}${sign}${newInt}`;
    });

    return modified;
  },

  mockTaggedText(taggedText, node) {
    return taggedText.replace(/<span\s+id\s*=\s*["']?(\d+)["']?\s*>([\s\S]*?)<\/\s*span\s*>/gi, (match, id, innerText) => {
      const transformed = this.mockText(innerText, node);
      return `<span id="${id}">${transformed}</span>`;
    });
  }
};

const Handlers = {
  // --- 1. Selection & Core Handlers ---
  'selection/request': async (requestId) => {
    const summary = SelectionEngine.scan();
    sendToUI({ type: 'selection/changed', requestId, payload: summary });
  },

  'settings/save': async (requestId, payload) => {
    const updated = await StorageEngine.saveSettings(payload);
    sendToUI({ type: 'settings/updated', requestId, payload: updated });

    // Background auto-sync if sync key is bound
    if (updated.cloudSync?.enabled && updated.cloudSync?.syncKey && updated.cloudSync?.autoSync) {
      setTimeout(async () => {
        try {
          const res = await CloudSyncEngine.pushSync(updated.cloudSync.syncKey, updated);
          updated.cloudSync.lastSyncTime = res.updatedAt;
          await StorageEngine.saveSettings({ cloudSync: updated.cloudSync });
        } catch (e) {
          console.warn('[Background AutoSync Error]', e);
        }
      }, 1200);
    }
  },

  'account/create-sync-key': async (requestId) => {
    try {
      const current = await StorageEngine.getSettings();
      const res = await CloudSyncEngine.createSync(current);
      
      const cloudSync = {
        enabled: true,
        syncKey: res.syncKey,
        lastSyncTime: res.updatedAt,
        autoSync: true
      };
      
      const updated = await StorageEngine.saveSettings({ cloudSync });
      void CloudSyncEngine.registerWithControlCenter(res.syncKey);
      figma.notify('✨ 密钥已生成并备份到云端！');
      sendToUI({
        type: 'account/sync-status-updated',
        requestId,
        payload: { success: true, settings: updated, cloudSync, message: '✨ 密钥已生成并备份到云端' }
      });
    } catch (e) {
      console.error('[Create Sync Key Error]', e);
      figma.notify('❌ 生成密钥失败: ' + e.message, { error: true });
      sendToUI({
        type: 'account/sync-status-updated',
        requestId,
        payload: { success: false, error: e.message }
      });
    }
  },

  'account/bind-sync-key': async (requestId, payload) => {
    const { syncKey } = payload || {};
    if (!syncKey) {
      figma.notify('请输入有效的同步密钥', { error: true });
      return;
    }

    try {
      const res = await CloudSyncEngine.pullSync(syncKey);
      const cloudSync = {
        enabled: true,
        syncKey: res.syncKey,
        lastSyncTime: res.updatedAt,
        autoSync: true
      };

      const toMerge = {
        ...res.settings,
        cloudSync
      };

      const updated = await StorageEngine.saveSettings(toMerge);
      void CloudSyncEngine.registerWithControlCenter(res.syncKey);
      figma.notify('✅ 成功绑定并还原云端配置！');
      sendToUI({
        type: 'account/sync-status-updated',
        requestId,
        payload: { success: true, settings: updated, cloudSync, message: '✅ 成功绑定并还原云端配置' }
      });
    } catch (e) {
      console.error('[Bind Sync Key Error]', e);
      figma.notify('❌ 绑定失败: ' + e.message, { error: true });
      sendToUI({
        type: 'account/sync-status-updated',
        requestId,
        payload: { success: false, error: e.message }
      });
    }
  },

  'account/push-backup': async (requestId) => {
    try {
      const current = await StorageEngine.getSettings();
      const syncKey = current.cloudSync?.syncKey;
      if (!syncKey) {
        throw new Error('未绑定同步密钥');
      }

      const res = await CloudSyncEngine.pushSync(syncKey, current);
      const cloudSync = {
        ...current.cloudSync,
        lastSyncTime: res.updatedAt
      };

      const updated = await StorageEngine.saveSettings({ cloudSync });
      void CloudSyncEngine.registerWithControlCenter(syncKey);
      figma.notify('✅ 配置已成功备份至云端！');
      sendToUI({
        type: 'account/sync-status-updated',
        requestId,
        payload: { success: true, settings: updated, cloudSync, message: '✅ 配置已成功备份至云端' }
      });
    } catch (e) {
      console.error('[Push Backup Error]', e);
      figma.notify('❌ 备份失败: ' + e.message, { error: true });
      sendToUI({
        type: 'account/sync-status-updated',
        requestId,
        payload: { success: false, error: e.message }
      });
    }
  },

  'account/pull-backup': async (requestId) => {
    try {
      const current = await StorageEngine.getSettings();
      const syncKey = current.cloudSync?.syncKey;
      if (!syncKey) {
        throw new Error('未绑定同步密钥');
      }

      const res = await CloudSyncEngine.pullSync(syncKey);
      const cloudSync = {
        ...current.cloudSync,
        lastSyncTime: res.updatedAt
      };

      const toMerge = {
        ...res.settings,
        cloudSync
      };

      const updated = await StorageEngine.saveSettings(toMerge);
      figma.notify('✅ 已从云端拉取并同步最新配置！');
      sendToUI({
        type: 'account/sync-status-updated',
        requestId,
        payload: { success: true, settings: updated, cloudSync, message: '✅ 已从云端拉取并同步最新配置' }
      });
    } catch (e) {
      console.error('[Pull Backup Error]', e);
      figma.notify('❌ 拉取失败: ' + e.message, { error: true });
      sendToUI({
        type: 'account/sync-status-updated',
        requestId,
        payload: { success: false, error: e.message }
      });
    }
  },

  'account/unbind': async (requestId) => {
    try {
      const cloudSync = {
        enabled: false,
        syncKey: '',
        lastSyncTime: null,
        autoSync: true
      };

      const updated = await StorageEngine.saveSettings({ cloudSync });
      figma.notify('已解除当前设备同步绑定');
      sendToUI({
        type: 'account/sync-status-updated',
        requestId,
        payload: { success: true, settings: updated, cloudSync, message: '已解除设备绑定' }
      });
    } catch (e) {
      console.error('[Unbind Error]', e);
    }
  },

  'settings/reset': async (requestId) => {
    const reset = await StorageEngine.resetSettings();
    sendToUI({ type: 'settings/updated', requestId, payload: reset });
  },
  
  'toast': async (requestId, payload) => {
    figma.notify(payload.message || payload, { error: payload.error || false });
  },

  'compression/test-api': async (requestId, payload) => {
    const { apiKey } = payload;
    
    try {
      const res = await fetch('https://api.walkyufeng.xyz/tinify-validate', {
        method: 'POST',
        headers: { 'X-Tinify-Key': apiKey }
      });
      
      const data = await res.json();
      
      if (res.ok && data.usable) {
        sendToUI({ type: 'compression/test-api-result', requestId, payload: { success: true, apiKey, compressionCount: data.compressionCount } });
      } else {
        figma.notify('❌ 测试失败: ' + (data.message || 'API Key 无效或额度不足'), { error: true });
        sendToUI({ type: 'compression/test-api-result', requestId, payload: { success: false, error: data.message || '验证失败' } });
      }
    } catch (e) {
      console.error("Proxy validation failed:", e);
      figma.notify('❌ 验证服务无法连接，请检查网络环境或关闭代理服务', { error: true });
      sendToUI({ type: 'compression/test-api-result', requestId, payload: { success: false, error: '网络连接失败' } });
    }
  },

  'compression/refresh-quotas': async (requestId, payload) => {
    const { tinifyKeys = [] } = payload || {};
    if (!tinifyKeys || tinifyKeys.length === 0) {
      sendToUI({ type: 'compression/refresh-quotas-result', requestId, payload: { keys: [] } });
      return;
    }

    try {
      const results = await Promise.all(tinifyKeys.map(async (kObj) => {
        const key = typeof kObj === 'string' ? kObj : kObj.key;
        if (!key) return null;
        try {
          const res = await fetch('https://api.walkyufeng.xyz/tinify-validate', {
            method: 'POST',
            headers: { 'X-Tinify-Key': key }
          });
          const data = await res.json();
          if (res.ok && data.usable) {
            return { key, compressCount: data.compressionCount ?? 0, valid: true };
          } else {
            return { key, compressCount: data.compressionCount ?? 500, valid: false, message: data.message };
          }
        } catch (err) {
          return { key, compressCount: kObj.compressCount || 0, valid: true };
        }
      }));

      sendToUI({
        type: 'compression/refresh-quotas-result',
        requestId,
        payload: { keys: results.filter(Boolean) }
      });
    } catch (e) {
      console.error("Failed to refresh quotas:", e);
    }
  },

  'compression/start': async (requestId, payload) => {
    const { scale = 2, format = 'PNG', tinifyKeys, zipName = 'VolcBox_Export' } = payload || {};
    const selection = figma.currentPage.selection;
    if (!selection || selection.length === 0) {
      figma.notify('请先选中图层', { error: true });
      return;
    }
    
    try {
      const total = selection.length;
      const keys = (tinifyKeys || []).filter(k => (k.compressCount || 0) < 500);
      const isCloudCompress = keys.length > 0;
      
      const compressedItems = new Array(total);
      let completedCount = 0;
      let keyPointer = 0;

      // Parallel worker pool (Concurrency: 6 for maximum network & export throughput)
      const CONCURRENCY = Math.min(6, total);
      let nextIndex = 0;

      sendToUI({
        type: 'compression/progress',
        requestId,
        payload: {
          phase: 'start',
          current: 0,
          total,
          layerName: selection[0]?.name || '图层',
          text: `启动并发引擎 (${CONCURRENCY} 线程)...`
        }
      });

      async function worker() {
        while (nextIndex < total) {
          const i = nextIndex++;
          const node = selection[i];
          const layerName = node.name || `图层 ${i + 1}`;

          sendToUI({
            type: 'compression/progress',
            requestId,
            payload: {
              phase: isCloudCompress ? 'compressing' : 'extracting',
              current: completedCount,
              total,
              layerName,
              text: isCloudCompress ? `正在云端压缩: ${layerName}` : `正在提取: ${layerName}`
            }
          });

          // 1. Export from Figma
          const bytes = await node.exportAsync({
            format: format,
            constraint: { type: 'SCALE', value: scale }
          });

          let finalBytes = bytes;

          // 2. Cloud Compression (if keys available)
          if (isCloudCompress) {
            let success = false;
            let lastError = null;
            let attempts = 0;

            while (!success && attempts < keys.length) {
              const currentKeyObj = keys[(keyPointer + attempts) % keys.length];
              if (!currentKeyObj || currentKeyObj.compressCount >= 500) {
                attempts++;
                continue;
              }

              try {
                const targetUrl = 'https://api.walkyufeng.xyz/tinify-compress';
                const response = await fetch(targetUrl, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/octet-stream',
                    'X-Tinify-Key': currentKeyObj.key
                  },
                  body: bytes
                });

                if (response.ok) {
                  let countHeader = null;
                  if (response.headers) {
                    countHeader = typeof response.headers.get === 'function'
                      ? response.headers.get('Compression-Count')
                      : (response.headers['compression-count'] || response.headers['Compression-Count']);
                  }

                  if (countHeader) {
                    const parsedCount = parseInt(countHeader, 10);
                    currentKeyObj.compressCount = parsedCount;
                    sendToUI({
                      type: 'compression/quota-update',
                      requestId,
                      payload: { apiKey: currentKeyObj.key, count: parsedCount }
                    });
                  }

                  const compBuf = await response.arrayBuffer();
                  finalBytes = new Uint8Array(compBuf);
                  success = true;
                  keyPointer = (keyPointer + 1) % keys.length; // Rotate key for next image
                } else {
                  const status = response.status;
                  lastError = await response.text();
                  if (status === 429) {
                    currentKeyObj.compressCount = 500;
                    sendToUI({
                      type: 'compression/quota-update',
                      requestId,
                      payload: { apiKey: currentKeyObj.key, count: 500 }
                    });
                  }
                  attempts++;
                }
              } catch (err) {
                lastError = err.message;
                attempts++;
              }
            }

            if (!success) {
              console.warn(`[Cloud Compress Failed for ${layerName}, using original bytes]:`, lastError);
            }
          }

          compressedItems[i] = {
            name: layerName,
            bytes: finalBytes,
            format
          };

          completedCount++;
          sendToUI({
            type: 'compression/progress',
            requestId,
            payload: {
              phase: 'item_done',
              current: completedCount,
              total,
              layerName,
              text: `已处理 (${completedCount}/${total})`
            }
          });
        }
      }

      const workers = [];
      for (let w = 0; w < CONCURRENCY; w++) {
        workers.push(worker());
      }
      await Promise.all(workers);

      sendToUI({
        type: 'compression/progress',
        requestId,
        payload: {
          phase: 'packing',
          current: total,
          total,
          layerName: 'ZIP 打包',
          text: '正在生成 ZIP 压缩包...'
        }
      });

      figma.notify(`✨ ${total} 个图层处理完毕，正在下载...`, { timeout: 1200 });
      sendToUI({ type: 'compression/done', requestId, payload: { items: compressedItems, zipName } });
    } catch (e) {
      console.error('[Compression Export Error]', e);
      sendToUI({ type: 'compression/done', requestId, payload: { items: [], zipName: '', error: e.message } });
      figma.notify(`导出失败: ${e.message}`, { error: true });
    }
  },

  // --- 2. Translation Handlers (UI-side network architecture) ---
  // code.js has NO network access in Figma sandbox.
  // Flow: code.js collects texts → sends to UI → UI fetches translation → sends back → code.js writes.

  'translation/start': async (requestId, payload) => {
    const { targetLanguage = 'en', preserveRichText = false } = payload || {};
    const textNodes = SelectionEngine.getTextNodes();

    if (textNodes.length === 0) {
      figma.notify('请先选择包含文本的图层或画板');
      sendToUI({
        type: 'task/failed',
        requestId,
        payload: { taskId: requestId, error: { message: '未选中任何文本图层' } },
      });
      return;
    }

    // 1. Collect unique texts with node mapping and optional tagging
    const nodeTexts = textNodes.map((n) => {
      let text = n.characters;
      let richStyles = null;
      if (preserveRichText && RichTextHelper.isRich(n)) {
        const extracted = RichTextHelper.extract(n);
        text = extracted.taggedText;
        richStyles = extracted.styles;
      }
      return { id: n.id, text, richStyles };
    });

    // 2. Send to UI for translation (UI has network access)
    sendToUI({
      type: 'translation/do-translate',
      requestId,
      payload: {
        targetLanguage,
        nodeTexts,
        preserveRichText,
      },
    });
    // UI will call back with 'translation/apply-results'
  },

  'translation/apply-results': async (requestId, payload) => {
    const { results, preserveRichText } = payload || {};
    // results = [{ id, translated, richStyles }]
    if (!results || results.length === 0) {
      figma.notify('翻译结果为空');
      sendToUI({ type: 'task/failed', requestId, payload: { taskId: requestId, error: { message: '翻译结果为空' } } });
      return;
    }

    // 1. Filter valid nodes to modify
    const nodesToModify = [];
    const targetItems = [];

    for (const item of results) {
      const node = await figma.getNodeByIdAsync(item.id);
      if (node && node.type === 'TEXT' && item.translated && item.translated !== node.characters) {
        if (DataProtectionEngine.isProtected(node.characters)) {
          continue;
        }
        nodesToModify.push(node);
        targetItems.push(item);
      }
    }

    // 2. Record clean in-memory history before changing (Zero layer contamination)
    if (nodesToModify.length > 0) {
      NodeHistoryManager.recordBeforeChange(nodesToModify, 'translate');
    }

    // 3. Batch preload all needed fonts concurrently
    const fontsToPreload = [];
    for (let i = 0; i < nodesToModify.length; i++) {
      const node = nodesToModify[i];
      const item = targetItems[i];
      if (preserveRichText && item.richStyles && Array.isArray(item.richStyles)) {
        for (const s of item.richStyles) {
          const fn = s.fontName || s.font;
          if (fn && fn !== figma.mixed) fontsToPreload.push(fn);
        }
      }
      if (node.fontName && node.fontName !== figma.mixed) {
        fontsToPreload.push(node.fontName);
      }
    }
    await FontManagerService.preloadFonts(fontsToPreload);

    // 4. Smooth slice write-back with microtask yielding
    let completed = 0;
    const SLICE_SIZE = 15;
    for (let i = 0; i < nodesToModify.length; i += SLICE_SIZE) {
      const sliceNodes = nodesToModify.slice(i, i + SLICE_SIZE);
      const sliceItems = targetItems.slice(i, i + SLICE_SIZE);

      for (let j = 0; j < sliceNodes.length; j++) {
        const node = sliceNodes[j];
        const item = sliceItems[j];
        try {
          if (preserveRichText && item.richStyles) {
            await NativeRichTextEngine.apply(node, item.translated, item.richStyles);
          } else {
            const baseFont = node.fontName === figma.mixed ? node.getRangeFontName(0, 1) : node.fontName;
            await FontManagerService.safeLoadFont(baseFont);
            if (node.fontName === figma.mixed) {
              node.fontName = baseFont;
            }
            node.characters = item.translated;
          }
          completed++;
        } catch (e) {
          console.error('[Write Node Error]', e);
        }
      }

      if (i + SLICE_SIZE < nodesToModify.length) {
        await new Promise(r => setTimeout(r, 0));
      }
    }

    if (completed > 0) {
      figma.notify(`⚡️ 翻译完成，已更新 ${completed} 个文本图层`);
    } else {
      figma.notify(`⚡️ 选中文本均为纯数据或已是目标语言，内容保持原样`);
    }

    sendToUI({
      type: 'task/completed',
      requestId,
      payload: { taskId: requestId, message: `翻译完成 ${completed} 个图层` },
    });
    sendToUI({ type: 'selection/changed', requestId, payload: SelectionEngine.scan() });
  },

  'translation/frame-scheme-run': async (requestId, payload) => {
    const { scheme, preserveRichText } = payload || {};
    const selection = figma.currentPage.selection;
    const targets = selection.filter(n => n.type === 'FRAME' || n.type === 'SECTION' || n.type === 'COMPONENT' || n.type === 'GROUP' || n.type === 'TEXT');

    if (targets.length === 0) {
      figma.notify('请先选中至少一个画板、组件、编组或文本');
      sendToUI({ type: 'task/failed', requestId, payload: { error: { message: '未选中目标' } } });
      return;
    }

    const batches = [];
    const lastPositions = new Map();

    for (const langObj of scheme.languages) {
      const langCode = langObj.code;
      const langTexts = [];
      const newSelection = [];
      
      for (const node of targets) {
        const clone = node.clone();
        if (node.parent) {
           node.parent.appendChild(clone);
        }
        const ref = lastPositions.get(node.id) || node;
        
        if (scheme.direction === 'right') {
          clone.x = ref.x + ref.width + (scheme.spacing || 100);
          clone.y = ref.y;
        } else {
          clone.x = ref.x;
          clone.y = ref.y + ref.height + (scheme.spacing || 100);
        }
        
        // 首页 - 英文 - English
        clone.name = `${node.name} - ${langObj.name} - ${langObj.en}`;
        
        lastPositions.set(node.id, clone);
        newSelection.push(clone);
        
        // Gather texts
        const textNodes = [];
        function walk(n) {
          if (n.type === 'TEXT') textNodes.push(n);
          if ('children' in n) n.children.forEach(walk);
        }
        walk(clone);
        
        for (const t of textNodes) {
          if (preserveRichText && RichTextHelper.isRich(t)) {
            const extracted = RichTextHelper.extract(t);
            langTexts.push({ id: t.id, text: extracted.taggedText, richStyles: extracted.styles });
          } else {
            langTexts.push({ id: t.id, text: t.characters });
          }
        }
      }
      
      figma.currentPage.selection = newSelection;
      if (langTexts.length > 0) {
        batches.push({ targetLanguage: langCode, nodeTexts: langTexts });
      }
    }

    if (batches.length === 0) {
      figma.notify('画板中没有可翻译的文本');
      sendToUI({ type: 'task/completed', requestId });
      return;
    }

    figma.notify('⚡️ 正在生成并翻译多语言画板矩阵...');
    sendToUI({
      type: 'translation/do-scheme-translate',
      requestId,
      payload: { batches, preserveRichText }
    });
  },

  'translation/undo': async (requestId) => {
    // If the user explicitly selected specific text layer(s) directly, undo only those.
    // If user selected a Frame/Group or nothing, undo the most recent transaction cleanly!
    const directSelection = figma.currentPage.selection;
    const isExplicitTextOnly = directSelection.length > 0 && directSelection.every(n => n.type === 'TEXT');
    const textNodes = isExplicitTextOnly ? directSelection : null;
    const result = await NodeHistoryManager.undo('translate', textNodes);

    if (result.restored > 0) {
      figma.notify(`↩️ 已成功撤回，恢复 ${result.restored} 个图层至上一步`);
    } else if (result.reason === 'selection_no_history') {
      figma.notify('当前选中的图层在本次会话中没有可撤回的修改记录');
    } else {
      figma.notify('当前没有可撤回的翻译记录');
    }
    
    sendToUI({
      type: 'task/completed',
      requestId,
      payload: { taskId: requestId, message: `已撤回 ${result.restored} 个图层` },
    });
    sendToUI({ type: 'selection/changed', requestId, payload: SelectionEngine.scan() });
  },

  // --- 3. Fill Handlers ---
  'fill/smart': async (requestId) => {
    const textNodes = SelectionEngine.getTextNodes();
    if (textNodes.length === 0) {
      figma.notify('请先选中包含文本的图层或画板');
      sendToUI({ type: 'task/failed', requestId, payload: { taskId: requestId, error: { message: '未选中文本图层' } } });
      return;
    }

    NodeHistoryManager.recordBeforeChange(textNodes, 'fill');

    let count = 0;
    for (let i = 0; i < textNodes.length; i++) {
      const node = textNodes[i];
      const original = node.characters;
      const isRich = RichTextHelper.isRich(node);

      try {
        if (isRich) {
          const extracted = RichTextHelper.extract(node);
          const modifiedTagged = SmartMockEngine.mockTaggedText(extracted.taggedText, node);
          if (modifiedTagged !== extracted.taggedText) {
            await RichTextHelper.apply(node, modifiedTagged, extracted.styles);
            count++;
          }
        } else {
          const modified = SmartMockEngine.mockText(original, node);
          if (modified !== original) {
            let baseFont;
            if (node.fontName === figma.mixed) {
              baseFont = node.getRangeFontName(0, 1);
              await FontManagerService.safeLoadFont(baseFont);
              node.fontName = baseFont;
            } else {
              baseFont = node.fontName;
              await FontManagerService.safeLoadFont(baseFont);
            }
            node.characters = modified;
            count++;
          }
        }
      } catch (err) {
        console.error('[Smart Fill Node Error]', err);
      }
    }

    figma.notify(`✨ 数据模拟完成 (替换了 ${count} 个数据节点)`);
    sendToUI({
      type: 'task/completed',
      requestId,
      payload: { taskId: requestId, message: `替换完成` },
    });
    sendToUI({ type: 'selection/changed', requestId, payload: SelectionEngine.scan() });
  },

  'fill/undo': async (requestId) => {
    const directSelection = figma.currentPage.selection;
    const isExplicitTextOnly = directSelection.length > 0 && directSelection.every(n => n.type === 'TEXT');
    const textNodes = isExplicitTextOnly ? directSelection : null;
    const result = await NodeHistoryManager.undo('fill', textNodes);

    if (result.restored > 0) {
      figma.notify(`↩️ 已撤回 ${result.restored} 个图层的填充`);
    } else if (result.reason === 'selection_no_history') {
      figma.notify('当前选中的图层在本次会话中没有可撤回的填充记录');
    } else {
      figma.notify('当前没有可撤回的填充记录');
    }
    
    sendToUI({ type: 'task/completed', requestId, payload: { taskId: requestId, message: '撤回完成' } });
    sendToUI({ type: 'selection/changed', requestId, payload: SelectionEngine.scan() });
  },

  'fill/start': async (requestId, payload) => {
    const { lines, prefix = '', suffix = '', mode = 'sequential' } = payload || {};
    if (!lines || lines.length === 0) {
      figma.notify('请提供填充数据');
      sendToUI({
        type: 'task/failed',
        requestId,
        payload: { taskId: requestId, error: { message: '填充内容为空' } },
      });
      return;
    }

    const textNodes = SelectionEngine.getTextNodes();
    if (textNodes.length === 0) {
      figma.notify('请先选中需要填充的文本图层');
      sendToUI({
        type: 'task/failed',
        requestId,
        payload: { taskId: requestId, error: { message: '未选中文本图层' } },
      });
      return;
    }

    NodeHistoryManager.recordBeforeChange(textNodes, 'fill');

    let count = 0;
    for (let i = 0; i < textNodes.length; i++) {
      const node = textNodes[i];
      try {
        let baseFont;
        if (node.fontName === figma.mixed) {
          baseFont = node.getRangeFontName(0, 1);
          await FontManagerService.safeLoadFont(baseFont);
          node.fontName = baseFont;
        } else {
          baseFont = node.fontName;
          await FontManagerService.safeLoadFont(baseFont);
        }

        let raw = lines[i % lines.length];
        if (mode === 'random') {
          raw = lines[Math.floor(Math.random() * lines.length)];
        } else if (mode === 'reverse') {
          raw = lines[(lines.length - 1) - (i % lines.length)];
        }

        node.characters = `${prefix}${raw}${suffix}`;
        count++;
      } catch (err) {
        console.error('[Fill Node Error]', err);
      }
    }

    figma.notify(`✨ 成功填充 ${count} 个文本图层`);
    sendToUI({
      type: 'task/completed',
      requestId,
      payload: { taskId: requestId, message: `成功填充 ${count} 个图层` },
    });
    sendToUI({ type: 'selection/changed', requestId, payload: SelectionEngine.scan() });
  },

  'layers/rename': async (requestId, payload) => {
    const { lines, prefix = '', suffix = '', mode = 'sequential' } = payload || {};
    const selection = figma.currentPage.selection;
    if (!selection || selection.length === 0) {
      figma.notify('请先选中需要重命名的图层');
      sendToUI({
        type: 'task/failed',
        requestId,
        payload: { taskId: requestId, error: { message: '未选中图层' } },
      });
      return;
    }

    let count = 0;
    for (let i = 0; i < selection.length; i++) {
      const node = selection[i];
      const raw = (lines && lines.length > 0)
        ? (mode === 'random' ? lines[Math.floor(Math.random() * lines.length)] : lines[i % lines.length])
        : node.name;
      node.name = `${prefix}${raw}${suffix}`;
      count++;
    }

    figma.notify(`🏷️ 成功重命名 ${count} 个图层`);
    sendToUI({
      type: 'task/completed',
      requestId,
      payload: { taskId: requestId, message: `成功重命名 ${count} 个图层` },
    });
  },

  // --- 4. Crop & Tools Handlers ---
  'line-height/fixed-to-auto': async (requestId) => {
    const textNodes = SelectionEngine.getTextNodes();
    if (textNodes.length === 0) {
      figma.notify('请先选中包含文本的图层', { error: true });
      sendToUI({
        type: 'task/failed',
        requestId,
        payload: { taskId: requestId, error: { message: '未选中文本图层' } },
      });
      return;
    }

    let count = 0;
    for (const node of textNodes) {
      try {
        if (node.fontName === figma.mixed) {
          const uniqueFonts = new Map();
          const len = node.characters.length;
          for (let i = 0; i < len; i++) {
            const f = node.getRangeFontName(i, i + 1);
            if (f && f !== figma.mixed) {
              const k = `${f.family}::${f.style}`;
              if (!uniqueFonts.has(k)) uniqueFonts.set(k, f);
            }
          }
          await FontManagerService.preloadAllFonts(Array.from(uniqueFonts.values()));
        } else {
          await FontManagerService.safeLoadFont(node.fontName);
        }

        if (node.lineHeight !== figma.mixed) {
          if (node.lineHeight.unit !== 'AUTO') {
            node.lineHeight = { unit: 'AUTO' };
            count++;
          }
        } else {
          const len = node.characters.length;
          let changed = false;
          for (let i = 0; i < len; i++) {
            const lh = node.getRangeLineHeight(i, i + 1);
            if (lh.unit !== 'AUTO') {
              node.setRangeLineHeight(i, i + 1, { unit: 'AUTO' });
              changed = true;
            }
          }
          if (changed) count++;
        }
      } catch (err) {
        console.error('[LineHeight Auto Error]', err);
      }
    }

    figma.notify(`✨ 已将 ${count} 个文本图层行高设为 Auto`);
    sendToUI({
      type: 'task/completed',
      requestId,
      payload: { taskId: requestId, message: `已将 ${count} 个图层转为 auto 行高` },
    });
  },

  'line-height/auto-to-pixels': async (requestId) => {
    const textNodes = SelectionEngine.getTextNodes();
    if (textNodes.length === 0) {
      figma.notify('请先选中包含文本的图层', { error: true });
      sendToUI({
        type: 'task/failed',
        requestId,
        payload: { taskId: requestId, error: { message: '未选中文本图层' } },
      });
      return;
    }

    let count = 0;
    for (const node of textNodes) {
      try {
        if (node.fontName !== figma.mixed && node.fontSize !== figma.mixed) {
          if (node.lineHeight !== figma.mixed && node.lineHeight.unit === 'AUTO') {
            await figma.loadFontAsync(node.fontName);
            const exactHeight = await getExactDefaultLineHeight(node.fontName, node.fontSize);
            node.lineHeight = { unit: 'PIXELS', value: exactHeight };
            count++;
          }
        } else {
          const len = node.characters.length;
          let changed = false;
          for (let i = 0; i < len; i++) {
            const lh = node.getRangeLineHeight(i, i + 1);
            if (lh.unit === 'AUTO') {
              const font = node.getRangeFontName(i, i + 1);
              const sz = node.getRangeFontSize(i, i + 1);
              if (font !== figma.mixed && typeof sz === 'number') {
                await figma.loadFontAsync(font);
                const exactHeight = await getExactDefaultLineHeight(font, sz);
                node.setRangeLineHeight(i, i + 1, { unit: 'PIXELS', value: exactHeight });
                changed = true;
              }
            }
          }
          if (changed) count++;
        }
      } catch (err) {
        console.error('[LineHeight Convert Error]', err);
      }
    }

    figma.notify(`📏 已将 ${count} 个文本图层的 auto 行高具体化为默认固定行高`);
    sendToUI({
      type: 'task/completed',
      requestId,
      payload: { taskId: requestId, message: `已将 ${count} 个文本图层转为默认固定行高` },
    });
  },

  'crop/trim-png': async (requestId) => {
    const selection = figma.currentPage.selection;
    if (!selection || selection.length === 0) {
      figma.notify('请先选中需要裁切透明边缘的 PNG 图片或图层', { error: true });
      sendToUI({
        type: 'task/failed',
        requestId,
        payload: { taskId: requestId, error: { message: '未选中图层' } },
      });
      return;
    }

    const imageNodes = [];
    
    // Helper function to extract or export image data from a node
    async function processCandidateNode(node) {
      if (!node || node.removed) return;
      let hasImageFill = false;
      if ('fills' in node && Array.isArray(node.fills)) {
        for (const f of node.fills) {
          if (f.type === 'IMAGE' && f.imageHash) {
            hasImageFill = true;
            try {
              const image = figma.getImageByHash(f.imageHash);
              if (image) {
                const bytes = await image.getBytesAsync();
                imageNodes.push({
                  nodeId: node.id,
                  nodeType: node.type,
                  bytes,
                  width: node.width,
                  height: node.height,
                  type: 'image_fill'
                });
              }
            } catch (e) {
              console.error('[Get Image Bytes Error]', e);
            }
            break;
          }
        }
      }

      if (!hasImageFill) {
        try {
          const bytes = await node.exportAsync({
            format: 'PNG',
            constraint: { type: 'SCALE', value: 1 }
          });
          imageNodes.push({
            nodeId: node.id,
            nodeType: node.type,
            bytes,
            width: node.width,
            height: node.height,
            type: 'exported_png'
          });
        } catch (e) {
          console.error('[Export Node Error]', e);
        }
      }
    }

    for (const node of selection) {
      // If user selected a container without image fills that has child layers with image fills, check children
      if (node.type === 'FRAME' || node.type === 'GROUP' || node.type === 'SECTION') {
        let foundDirectImageChild = false;
        if ('findAll' in node) {
          const imgChildren = node.findAll(c => {
            if ('fills' in c && Array.isArray(c.fills)) {
              return c.fills.some(f => f.type === 'IMAGE' && f.imageHash);
            }
            return false;
          });
          if (imgChildren.length > 0 && imgChildren.length <= 10) {
            foundDirectImageChild = true;
            for (const child of imgChildren) {
              await processCandidateNode(child);
            }
          }
        }
        if (!foundDirectImageChild) {
          await processCandidateNode(node);
        }
      } else {
        await processCandidateNode(node);
      }
    }

    if (imageNodes.length === 0) {
      figma.notify('未找到有效的图片图层', { error: true });
      sendToUI({
        type: 'crop/completed',
        requestId,
        payload: { trimmedCount: 0 }
      });
      return;
    }

    sendToUI({
      type: 'crop/do-trim-images',
      requestId,
      payload: { images: imageNodes }
    });
  },

  'crop/apply-trimmed-image': async (requestId, payload) => {
    const { nodeId, newBytes, origW, origH, cropX, cropY, cropW, cropH, noCropNeeded, type, nodeType, topTrim, bottomTrim, leftTrim, rightTrim } = payload || {};
    const node = await figma.getNodeByIdAsync(nodeId);
    if (!node || node.removed || noCropNeeded || !newBytes) {
      sendToUI({ type: 'crop/completed', requestId, payload: { trimmedCount: 0 } });
      return;
    }

    try {
      const newImage = figma.createImage(newBytes);
      const scaleX = node.width / (origW || node.width);
      const scaleY = node.height / (origH || node.height);
      const newW = Math.max(1, Math.round(cropW * scaleX));
      const newH = Math.max(1, Math.round(cropH * scaleY));
      const dx = cropX * scaleX;
      const dy = cropY * scaleY;

      // Handle position with rotation
      const rot = ('rotation' in node && typeof node.rotation === 'number') ? node.rotation : 0;
      const rad = (rot * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      node.x += dx * cos - dy * sin;
      node.y += dx * sin + dy * cos;

      if (type === 'image_fill' && 'fills' in node && Array.isArray(node.fills)) {
        const newFills = node.fills.map(f => {
          if (f.type === 'IMAGE') {
            return { ...f, imageHash: newImage.hash, scaleMode: 'FILL' };
          }
          return f;
        });
        node.fills = newFills;
        node.resize(newW, newH);
      } else if ('fills' in node && node.type !== 'GROUP') {
        node.fills = [{ type: 'IMAGE', scaleMode: 'FILL', imageHash: newImage.hash }];
        node.resize(newW, newH);
      } else {
        // Group or container without direct fills
        const parent = node.parent || figma.currentPage;
        const index = parent.children.indexOf(node);
        const rect = figma.createRectangle();
        rect.name = node.name + ' (已裁切留白)';
        rect.x = node.x;
        rect.y = node.y;
        rect.resize(newW, newH);
        rect.fills = [{ type: 'IMAGE', scaleMode: 'FILL', imageHash: newImage.hash }];
        parent.insertChild(Math.max(0, index), rect);
        node.remove();
        figma.currentPage.selection = [rect];
      }

      figma.notify(`✂️ PNG 透明边缘已精确裁切 (上:${topTrim || 0}px 下:${bottomTrim || 0}px 左:${leftTrim || 0}px 右:${rightTrim || 0}px)`);
      sendToUI({ type: 'crop/completed', requestId, payload: { trimmedCount: 1 } });
    } catch (e) {
      console.error('[Apply Trim Error]', e);
      figma.notify('裁切应用失败: ' + e.message, { error: true });
      sendToUI({ type: 'crop/completed', requestId, payload: { error: e.message } });
    }
  },

  'artboards/create-canvas-composite': async (requestId, payload) => {
    const { withTitles = true } = payload || {};
    const selection = figma.currentPage.selection;
    if (!selection || selection.length === 0) {
      figma.notify('请先选中需要拼图的画板或图层', { error: true });
      sendToUI({
        type: 'task/failed',
        requestId,
        payload: { taskId: requestId, error: { message: '未选中图层' } },
      });
      return;
    }

    try {
      await figma.loadFontAsync({ family: "Inter", style: "Bold" });
    } catch (e) {
      try {
        await figma.loadFontAsync({ family: "Roboto", style: "Bold" });
      } catch (err) {}
    }

    try {
      const rows = LayoutEngine.groupByCanvasRows(selection);
      const allNodesCount = selection.length;

      let maxX = -Infinity, minY = Infinity;
      for (const n of selection) {
        if (n.x + n.width > maxX) maxX = n.x + n.width;
        if (n.y < minY) minY = n.y;
      }

      const parentFrame = figma.createFrame();
      parentFrame.name = withTitles ? `📋 设计方案拼图(带标题) - ${allNodesCount}个画板` : `📋 设计方案拼图(无标题) - ${allNodesCount}个画板`;
      parentFrame.fills = [{ type: 'SOLID', color: { r: 0.957, g: 0.957, b: 0.961 } }];
      parentFrame.cornerRadius = 16;
      parentFrame.layoutMode = 'VERTICAL';
      parentFrame.itemSpacing = 36;
      parentFrame.paddingLeft = 40;
      parentFrame.paddingRight = 40;
      parentFrame.paddingTop = 40;
      parentFrame.paddingBottom = 40;
      parentFrame.primaryAxisSizingMode = 'AUTO';
      parentFrame.counterAxisSizingMode = 'AUTO';

      for (const row of rows) {
        const rowFrame = figma.createFrame();
        rowFrame.name = 'Row';
        rowFrame.layoutMode = 'HORIZONTAL';
        rowFrame.itemSpacing = 36;
        rowFrame.fills = [];
        rowFrame.primaryAxisSizingMode = 'AUTO';
        rowFrame.counterAxisSizingMode = 'AUTO';

        for (const node of row) {
          const clone = node.clone();
          if (withTitles) {
            const cardFrame = figma.createFrame();
            cardFrame.name = node.name;
            cardFrame.layoutMode = 'VERTICAL';
            cardFrame.primaryAxisSizingMode = 'AUTO';
            cardFrame.counterAxisSizingMode = 'AUTO';
            cardFrame.itemSpacing = 12;
            cardFrame.fills = [];

            const titleText = figma.createText();
            try {
              titleText.fontName = { family: "Inter", style: "Bold" };
            } catch(e){}
            titleText.fontSize = 20;
            titleText.characters = node.name;
            titleText.fills = [{ type: 'SOLID', color: { r: 0.094, g: 0.094, b: 0.106 } }];

            cardFrame.appendChild(titleText);
            cardFrame.appendChild(clone);
            rowFrame.appendChild(cardFrame);
          } else {
            rowFrame.appendChild(clone);
          }
        }
        parentFrame.appendChild(rowFrame);
      }

      parentFrame.x = maxX + 80;
      parentFrame.y = minY;

      figma.currentPage.selection = [parentFrame];
      figma.viewport.scrollAndZoomIntoView([parentFrame]);
      figma.notify('✨ 拼图画板已生成！按 ⌘+Shift+C 即可复制超清图片到聊天框', { timeout: 4000 });

      sendToUI({
        type: 'task/completed',
        requestId,
        payload: { taskId: requestId, message: '拼图画板生成成功' }
      });
    } catch (err) {
      console.error('[Create Canvas Composite Error]', err);
      figma.notify('生成拼图画板失败: ' + err.message, { error: true });
    }
  },

  'artboards/render-composite-for-local': async (requestId, payload) => {
    const selection = figma.currentPage.selection;
    if (!selection || selection.length === 0) {
      figma.notify('请先选中需要拼图的画板或图层', { error: true });
      sendToUI({
        type: 'task/failed',
        requestId,
        payload: { taskId: requestId, error: { message: '未选中图层' } },
      });
      return;
    }

    figma.notify('⏳ 正在导出并合成拼图...', { timeout: 1500 });

    try {
      const rows = LayoutEngine.groupByCanvasRows(selection);
      const rowsPayload = [];

      for (const row of rows) {
        const rowItems = [];
        for (const node of row) {
          const bytes = await node.exportAsync({
            format: 'PNG',
            constraint: { type: 'SCALE', value: 2 }
          });
          rowItems.push({
            name: node.name,
            width: node.width * 2,
            height: node.height * 2,
            bytes
          });
        }
        rowsPayload.push(rowItems);
      }

      sendToUI({
        type: 'artboards/do-local-image-clipboard',
        requestId,
        payload: { rows: rowsPayload, withTitles: true }
      });
    } catch (err) {
      console.error('[Render Composite For Local Error]', err);
      figma.notify('导出画板失败: ' + err.message, { error: true });
    }
  },

  'artboards/export-files-for-local': async (requestId) => {
    const selection = figma.currentPage.selection;
    if (!selection || selection.length === 0) {
      figma.notify('请先选中需要复制的画板或图层', { error: true });
      sendToUI({
        type: 'task/failed',
        requestId,
        payload: { taskId: requestId, error: { message: '未选中图层' } },
      });
      return;
    }

    figma.notify('⏳ 正在导出画板文件...', { timeout: 1500 });

    try {
      const sortedNodes = LayoutEngine.sortByVisualOrder(selection);

      const files = [];
      for (let i = 0; i < sortedNodes.length; i++) {
        const node = sortedNodes[i];
        const bytes = await node.exportAsync({
          format: 'PNG',
          constraint: { type: 'SCALE', value: 2 }
        });
        const safeName = (node.name || `Artboard_${i + 1}`).replace(/[\\/:*?"<>|]/g, '_');
        files.push({
          name: safeName,
          bytes
        });
      }

      sendToUI({
        type: 'artboards/do-local-files-clipboard',
        requestId,
        payload: { files }
      });
    } catch (err) {
      console.error('[Export Files For Local Error]', err);
      figma.notify('导出画板失败: ' + err.message, { error: true });
    }
  },

  'export/export-selected-artboards': async (requestId) => {
    const selection = figma.currentPage.selection;
    if (!selection || selection.length === 0) {
      figma.notify('请先选中需要导出的画板或图层', { error: true });
      sendToUI({
        type: 'task/failed',
        requestId,
        payload: { taskId: requestId, error: { message: '未选中图层' } },
      });
      return;
    }

    figma.notify('⏳ 正在导出所选画板...', { timeout: 1500 });

    try {
      const sortedNodes = LayoutEngine.sortByVisualOrder(selection);

      const items = [];
      for (let i = 0; i < sortedNodes.length; i++) {
        const node = sortedNodes[i];
        const bytes = await node.exportAsync({
          format: 'PNG',
          constraint: { type: 'SCALE', value: 2 }
        });
        const safeName = (node.name || `Artboard_${i + 1}`).replace(/[\\/:*?"<>|]/g, '_');
        items.push({
          name: safeName,
          format: 'PNG',
          bytes
        });
      }

      sendToUI({
        type: 'export/completed-artboards',
        requestId,
        payload: {
          items,
          zipName: `所选画板切图_${items.length}张`
        }
      });
      figma.notify(`✅ 成功导出 ${items.length} 个画板切图`);
    } catch (err) {
      console.error('[Export Selected Artboards Error]', err);
      figma.notify('批量导出失败: ' + err.message, { error: true });
    }
  },

  'color/preview': async (requestId, payload) => {
    const { hue = 0, saturation = 0, lightness = 0, scope = 'all', protectNeutrals = true, version = 0 } = payload || {};
    if (version > 0 && version < currentColorVersion) {
      return; // Stale preview packet, ignore
    }
    const targetNodes = getCachedColorNodes();
    
    for (let i = 0; i < targetNodes.length; i++) {
      const node = targetNodes[i];
      if (node.removed) continue;
      
      let original = OriginalColorState.get(node.id);
      if (!original) {
        original = {
          fills: ('fills' in node && Array.isArray(node.fills)) ? clonePaints(node.fills) : [],
          strokes: ('strokes' in node && Array.isArray(node.strokes)) ? clonePaints(node.strokes) : []
        };
        OriginalColorState.set(node.id, original);
      }
      
      if ('fills' in node && original.fills.length > 0) {
        try {
          if (scope === 'all' || scope === 'fill') {
            node.fills = adjustPaints(original.fills, hue, saturation, lightness, protectNeutrals);
          } else {
            node.fills = original.fills;
          }
        } catch (e) {}
      }
      
      if ('strokes' in node && original.strokes.length > 0) {
        try {
          if (scope === 'all' || scope === 'stroke') {
            node.strokes = adjustPaints(original.strokes, hue, saturation, lightness, protectNeutrals);
          } else {
            node.strokes = original.strokes;
          }
        } catch (e) {}
      }
    }
  },

  'color/reset': async (requestId) => {
    currentColorVersion++;
    revertActiveColorPreview();
    figma.notify('🔄 调色已重置');
    sendToUI({ type: 'task/completed', requestId, payload: { taskId: requestId, message: '已重置' } });
  },

  'color/apply': async (requestId, payload) => {
    currentColorVersion++;
    const { hue = 0, saturation = 0, lightness = 0, scope = 'all', protectNeutrals = true } = payload || {};
    const targetNodes = getCachedColorNodes();
    
    for (const node of targetNodes) {
      if (node.removed) continue;
      const original = OriginalColorState.get(node.id);
      const baseFills = original ? original.fills : (('fills' in node && Array.isArray(node.fills)) ? node.fills : []);
      const baseStrokes = original ? original.strokes : (('strokes' in node && Array.isArray(node.strokes)) ? node.strokes : []);

      if ('fills' in node && baseFills.length > 0) {
        try {
          if (scope === 'all' || scope === 'fill') {
            node.fills = adjustPaints(baseFills, hue, saturation, lightness, protectNeutrals);
          } else if (original) {
            node.fills = original.fills;
          }
        } catch (e) {}
      }
      if ('strokes' in node && baseStrokes.length > 0) {
        try {
          if (scope === 'all' || scope === 'stroke') {
            node.strokes = adjustPaints(baseStrokes, hue, saturation, lightness, protectNeutrals);
          } else if (original) {
            node.strokes = original.strokes;
          }
        } catch (e) {}
      }
    }
    OriginalColorState.clear();
    cachedColorNodes = null;
    figma.notify('🎨 调色已应用');
    sendToUI({ type: 'task/completed', requestId, payload: { taskId: requestId, message: '调色完成' } });
  },

  'color/replace-exact': async (requestId, payload) => {
    const { sourceHex, targetHex, scope = 'all', matchTolerance = 18 } = payload || {};
    const targetNodes = getAllColorNodes(figma.currentPage.selection);
    const targetRgb = hexToRgb01(targetHex);
    const sourceRgb = hexToRgb01(sourceHex);

    if (!targetRgb || !sourceRgb) {
      figma.notify('颜色代码解析失败', { error: true });
      return;
    }

    let count = 0;
    for (const node of targetNodes) {
      let modified = false;
      if ('fills' in node && (scope === 'all' || scope === 'fill') && Array.isArray(node.fills)) {
        const newFills = node.fills.map(fill => {
          if (fill.type === 'SOLID' && isColorClose(fill.color, sourceRgb, matchTolerance)) {
            modified = true;
            return { ...fill, color: targetRgb };
          }
          return fill;
        });
        if (modified) {
          try { node.fills = newFills; } catch(e){}
        }
      }
      if ('strokes' in node && (scope === 'all' || scope === 'stroke') && Array.isArray(node.strokes)) {
        const newStrokes = node.strokes.map(stroke => {
          if (stroke.type === 'SOLID' && isColorClose(stroke.color, sourceRgb, matchTolerance)) {
            modified = true;
            return { ...stroke, color: targetRgb };
          }
          return stroke;
        });
        if (modified) {
          try { node.strokes = newStrokes; } catch(e){}
        }
      }
      if (modified) count++;
    }

    figma.notify(`🎯 已将 ${count} 个图层的 ${sourceHex} 精准替换为 ${targetHex}`);
    sendToUI({ type: 'task/completed', requestId, payload: { taskId: requestId, message: `替换了 ${count} 处色彩` } });
    sendToUI({ type: 'selection/changed', requestId, payload: SelectionEngine.scan() });
  },

  'theme/recolor-to-tone': async (requestId, payload) => {
    const { baseHex, targetHex, scope = 'all' } = payload || {};
    const targetNodes = getAllColorNodes(figma.currentPage.selection);
    if (!targetNodes || targetNodes.length === 0) {
      figma.notify('请先在画布上选中需要换色的设计内容', { error: true });
      return;
    }

    const targetRgb = hexToRgb01(targetHex);
    if (!targetRgb) {
      figma.notify('未能识别目标颜色色值', { error: true });
      return;
    }

    let baseHsl = null;
    const baseRgb = hexToRgb01(baseHex);
    if (baseRgb) {
      baseHsl = rgbToHsl(baseRgb.r, baseRgb.g, baseRgb.b);
    } else {
      const scan = SelectionEngine.scan();
      if (scan && scan.dominantColor) {
        baseHsl = { h: scan.dominantColor.h, s: scan.dominantColor.s / 100, l: scan.dominantColor.l / 100 };
      }
    }
    if (!baseHsl) {
      baseHsl = { h: 217, s: 1, l: 0.5 };
    }

    const targetHsl = rgbToHsl(targetRgb.r, targetRgb.g, targetRgb.b);

    let modifiedCount = 0;
    for (const node of targetNodes) {
      let nodeModified = false;
      if ('fills' in node && (scope === 'all' || scope === 'fill') && Array.isArray(node.fills) && node.fills.length > 0) {
        const newFills = node.fills.map(fill => {
          const adapted = recolorPaintToTone(fill, baseHsl, targetHsl);
          if (adapted !== fill) nodeModified = true;
          return adapted;
        });
        if (nodeModified) {
          try { node.fills = newFills; } catch (e) {}
        }
      }
      if ('strokes' in node && (scope === 'all' || scope === 'stroke') && Array.isArray(node.strokes) && node.strokes.length > 0) {
        const newStrokes = node.strokes.map(stroke => {
          const adapted = recolorPaintToTone(stroke, baseHsl, targetHsl);
          if (adapted !== stroke) nodeModified = true;
          return adapted;
        });
        if (nodeModified) {
          try { node.strokes = newStrokes; } catch (e) {}
        }
      }
      if (nodeModified) modifiedCount++;
    }

    figma.notify(`✨ 选中设计已自适应切换至 ${targetHex.toUpperCase()} 整体色调`);
    sendToUI({ type: 'task/completed', requestId, payload: { taskId: requestId, message: `已自适应切换至 ${targetHex} 整体色调` } });
    sendToUI({ type: 'selection/changed', requestId, payload: SelectionEngine.scan() });
  },
};

// Central Request Router
async function handleUIRequest(request) {
  const { type, requestId, payload } = request;
  try {
    const handler = Handlers[type];
    if (typeof handler === 'function') {
      await handler(requestId, payload);
    } else {
      console.log(`[Router] Unhandled action: ${type}`, payload);
      sendToUI({
        type: 'task/completed',
        requestId,
        payload: { taskId: requestId, message: `指令 ${type} 执行完成` },
      });
    }
  } catch (err) {
    console.error(`[Router] Error executing ${type}:`, err);
    figma.notify(`执行异常: ${err.message}`, { error: true });
    sendToUI({
      type: 'task/failed',
      requestId,
      payload: {
        taskId: requestId,
        error: { code: 'EXEC_ERROR', message: err.message },
      },
    });
  }
}

// =====================================================================
// 6. BOOTSTRAP & LIFECYCLE
// =====================================================================
async function bootstrap() {
  // 1. Render UI Frame
  figma.showUI(__html__, {
    width: CONFIG.UI.WIDTH,
    height: CONFIG.UI.HEIGHT,
    themeColors: true,
    title: CONFIG.UI.TITLE,
  });

  // 2. Bind Message Listener
  figma.ui.onmessage = async (msg) => {
    await handleUIRequest(msg);
  };

  // 3. Bind Canvas Selection Listener
  let debounceTimer = null;
  figma.on('selectionchange', () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const summary = SelectionEngine.scan();
      sendToUI({ type: 'selection/changed', payload: summary });
    }, 80);
  });

  // 4. Push Initial State to UI
  const settings = await StorageEngine.getSettings();
  const styleLibrary = await StorageEngine.getStyleLibrary();
  const selection = SelectionEngine.scan();

  if (settings.cloudSync?.syncKey) {
    void CloudSyncEngine.registerWithControlCenter(settings.cloudSync.syncKey);
  }

  sendToUI({
    type: 'app/initialized',
    payload: { settings, styleLibrary, selection },
  });
}

bootstrap();
