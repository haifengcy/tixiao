# 🌋 VolcBox — Figma 全能实用提效工具箱

<div align="center">

[![Version](https://img.shields.io/badge/version-v1.0.1-blue.svg?style=flat-square)](https://github.com/walkyufeng-hue/Figma-VolcBox/releases)
[![Website](https://img.shields.io/badge/website-figma--volcbox.pages.dev-orange.svg?style=flat-square)](https://figma-volcbox.pages.dev)
[![Figma](https://img.shields.io/badge/Figma-Plugin_API-F24E1E?style=flat-square&logo=figma&logoColor=white)](https://www.figma.com)
[![License](https://img.shields.io/badge/license-MIT-green.svg?style=flat-square)](LICENSE)

**简单高效的 Figma 全能工具箱 · 开源免费 · 跨端云同步**

[🌐 访问官方主页](https://figma-volcbox.pages.dev) · [📦 下载插件安装包 (.zip)](https://figma-volcbox.pages.dev/VolcBox_v1.0.1.zip) · [🐛 提交反馈 / Issue](https://github.com/walkyufeng-hue/Figma-VolcBox/issues)

</div>

---

<div align="center">
  <img src="community_assets/cover_1920x1080.jpg" alt="VolcBox Cover" width="100%" style="border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);" />
</div>

---

## 🌟 6 大核心功能特性

<table>
<tr>
<td width="50%" valign="top">

### 🌐 1. AI 智能多语言翻译
> **支持 100+ 全球语种 · 像素级富文本保真**

- **全球语种覆盖**：支持英语、日语、韩语、西语等 100+ 主流语言
- **双模灵活翻译**：支持在原画板直接替换，或自动克隆多语言对照画板
- **富文本无损保留**：局部加粗、下划线、字阶与文本颜色 1:1 精准还原
- **双通道引擎支持**：内置官方免费极速通道，同时支持接入 DeepSeek / OpenAI 自定义 Key

</td>
<td width="50%" valign="top">

### 📝 2. 真实业务数据批量填充
> **告别人工假数据 · 智能规范图层结构**

- **高频业务预设**：内置中英文人名、全球热门城市、真实电商标价、企业邮箱
- **灵活填充规则**：支持正序、倒序、随机乱序等多种智能分配方式
- **自定义词库导入**：支持一键黏贴导入业务专属自定义文本库
- **图层联动规范**：填充数据的同时自动规范化重命名图层，提升工程协作规范

</td>
</tr>
<tr>
<td width="50%" valign="top">

### 🖼️ 3. TinyPNG 账号池智能压缩
> **突破月度 500 次限额 · 本地引擎智能兜底**

- **多 Key 轮询调度**：支持配置多个 TinyPNG API Key 自动负载均衡，轻松突破限额
- **离线无损兜底**：无 Key 状态下自动无缝切换本地高保真离线压缩引擎
- **批量打包导出**：一键压缩并输出高质量资产包，节省高达 70%+ 存储空间

</td>
<td width="50%" valign="top">

### 🎨 4. 画板全局色彩调节 (免解组)
> **无需解组画板 · 秒级推演多套设计配色方案**

- **免解组全局调控**：直接对整个复杂画板进行 HSL (色相/饱和度/明度) 调节
- **精准范围分离**：支持「仅调整填充色」或「仅调整描边色」，精细掌控视觉层次
- **方案极速推演**：无需逐个图层调色，3 秒内快速验证深浅色系与多品牌配色

</td>
</tr>
<tr>
<td width="50%" valign="top">

### 🛠️ 5. 系统剪贴板极速直拷
> **内置助手赋能 · 微信 / 飞书 ⌘+V 秒级直发**

- **零延迟直发聊天窗**：后台静默拼图并直接写入系统原生剪贴板，微信/飞书直接粘贴
- **双模自适应架构**：
  - 🚀 **极速直拷模式**：一键安装内置轻量助手，秒级直发高清大图
  - 📦 **纯沙箱模式**：零配置下直接在画布中生成高清拼图 Frame
- **实用效率工具**：自动画板拼图带标题、文本行高批量转换、裁切 PNG 透明留白

</td>
<td width="50%" valign="top">

### ☁️ 6. 跨设备配置云端秒同步
> **专属密钥隔离 · 换机重装一键完整还原**

- **云端一键备份**：将 API Key、自定义词库、通用偏好一键加密备份到云端
- **新机秒级拉取**：更换电脑或重新安装插件，输入专属同步密钥即刻恢复
- **端到端私密保护**：仅凭专属密钥存取，敏感配置不泄露，团队交接/多设备切换无忧

</td>
</tr>
</table>

---

## 🚀 极速安装使用（3 步上手）

1. **获取插件安装包**：
   - 直接下载最新 [VolcBox_v1.0.1.zip](https://figma-volcbox.pages.dev/VolcBox_v1.0.1.zip) 并解压到本地文件夹；
   - 或使用 Git 克隆本仓库：
     ```bash
     git clone https://github.com/walkyufeng-hue/Figma-VolcBox.git
     ```
2. **在 Figma 中导入**：
   - 打开 Figma 任意文件，点击顶部菜单：`Plugins (插件)` ➔ `Development (开发)` ➔ `Import plugin from manifest...`；
   - 选中解压目录中的 **`manifest.json`**；
3. **即刻开始提效**：
   - 在 Figma 中随时运行 VolcBox，即可开启极速翻译、数据模拟与图片压缩！

---

## 🛠️ 本地直拷双模架构

VolcBox 为剪贴板直拷功能设计了双模自适应降级机制：

| 模式 | 运行机制 | 交互体验 |
| :--- | :--- | :--- |
| **🚀 极速直拷模式（已安装内置助手）** | 后台静默拼图后直接写入操作系统剪贴板 | **微信/飞书窗口直接 ⌘+V 粘贴发送高清大图** |
| **📦 纯沙箱模式（未安装助手/零门槛）** | 直接在当前 Figma 画布中生成带标题的 Frame 画板 | 在画布中自由排版、二次编辑与导出 |

> 💡 *本地服务代码 100% 静态内置于插件前端中，点击插件小工具内的「安装」即可一键解压双击启动，零外部依赖。*

---

## 🌐 官方主页与生态

- 🔗 **官方主页**：[https://figma-volcbox.pages.dev](https://figma-volcbox.pages.dev)
- 📦 **Releases 发版**：[GitHub Releases](https://github.com/walkyufeng-hue/Figma-VolcBox/releases)
- 💬 **问题反馈**：[GitHub Issues](https://github.com/walkyufeng-hue/Figma-VolcBox/issues)

---

## 📄 开源协议

本项目基于 [MIT License](LICENSE) 协议开源。
