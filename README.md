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

- 🌐 **AI 智能多语言翻译**：支持全球 100+ 语言；原地翻译或批量克隆画板；像素级保留局部加粗、颜色与字号等富文本样式；支持内置免费通道及接入 DeepSeek / OpenAI 等自定义 Key。
- 📝 **真实数据批量填充**：内置常用人名、全球城市、电商价格、企业邮箱等多类高频数据；支持自定义词库与正序、随机、倒序填充与图层重命名。
- 🖼️ **TinyPNG 账号池压缩**：支持多个 API Key 轮询调度突破 500 次限额；无 Key 时自动切换本地无损离线引擎；支持批量打包导出。
- 🎨 **画板全局色彩调节**：免解组直接调节色相、饱和度与明度 (HSL)；支持仅作用于填充或仅作用于描边，快速调整设计方案色调。
- 🛠️ **设计快捷小工具**：画布多画板生成带标题拼图、批量导出所选画板、文本行高批量转换、裁切 PNG 透明留白。**支持用户一键安装内置在插件里的本地极速直拷服务，微信/飞书 ⌘+V 秒级直发**。
- ☁️ **跨设备配置云同步**：专属同步密钥机制，换电脑或新安装一键备份与拉取所有设置，免去重复配置的繁琐。

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
