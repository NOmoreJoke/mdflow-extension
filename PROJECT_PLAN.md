# Web to Markdown - 浏览器插件开发计划

> **项目代号**: MDFlow
> **开发周期**: TDB
> **目标平台**: Chrome Extension (Manifest V3)

---

## 1. 项目概述

### 1.1 核心愿景

MDFlow 是一款专注于**纯净内容提取**的浏览器插件，致力于将网页和文档转换为结构化的 Markdown 格式，让知识管理变得优雅而高效。

### 1.2 设计理念

```
┌─────────────────────────────────────────────────────────┐
│  "When you read, you extract.                           │
│   When you extract, you remember."                       │
│                                                         │
│  We believe in clean, structured knowledge              │
│  liberated from the chaos of the web.                   │
└─────────────────────────────────────────────────────────┘
```

### 1.3 核心价值主张

- **零依赖纯前端**: 所有转换在浏览器内完成，无需服务器，保护隐私
- **智能内容识别**: 自动提取核心内容，过滤广告和导航噪音
- **格式保真度**: 保留公式（MathJax）、代码高亮、表格结构
- **无缝工作流**: 右键、快捷键、工具栏 - 触发方式随你选择

---

## 2. 功能需求矩阵

### 2.1 核心功能 (MVP)

| 模块 | 功能 | 优先级 | 复杂度 | 依赖 |
|------|------|--------|--------|------|
| **网页转换** | HTML → Markdown | P0 | 中高 | TurndownJS |
| **PDF转换** | PDF → Markdown | P0 | 高 | PDF.js + pdf2md |
| **Word转换** | DOCX → Markdown | P0 | 中 | Mammoth.js |
| **触发方式** | 右键菜单集成 | P0 | 低 | Chrome API |
| **触发方式** | 工具栏按钮 | P0 | 低 | Chrome API |
| **触发方式** | 全局快捷键 | P1 | 中 | Chrome Commands API |
| **输出方式** | 复制到剪贴板 | P0 | 低 | Clipboard API |
| **输出方式** | 下载.md文件 | P0 | 低 | Chrome Downloads API |
| **输出方式** | 本地存储管理 | P1 | 中 | Chrome Storage API |

### 2.2 增强功能

| 功能模块 | 描述 | 价值 |
|----------|------|------|
| **公式转换** | LaTeX → MathJax 语法 | 学术场景必备 |
| **代码高亮** | 保留 Prism/HighlightJS 类名 | 开发者友好 |
| **图片本地化** | 自动下载并重写相对路径 | 离线可用 |
| **批量转换** | 队列处理多个任务 | 效率提升 |
| **历史记录** | 浏览和重新导出历史 | 内容追溯 |
| **多格式导出** | MD/HTML/TXT/PDF | 灵活性 |
| **自定义配置** | 转换规则、样式预设 | 可定制性 |

### 2.3 用户故事

```
AS a 研究人员
I WANT to 将论文网页转换为带公式的 Markdown
SO THAT 我可以在 Obsidian 中继续标注

AS a 开发者
I WANT to 右键转换技术文档并保留代码高亮
SO THAT 我可以快速存入知识库

AS a 内容创作者
I WANT to 批量转换参考文章为本地 MD
SO THAT 我可以离线查阅和引用
```

---

## 3. 技术架构设计

### 3.1 整体架构图

```
┌──────────────────────────────────────────────────────────────┐
│                        User Interface                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│  │ Popup    │  │ Options  │  │ History  │  │  Preview │     │
│  │ Panel    │  │ Page     │  │  Page    │  │  Modal   │     │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘     │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                    Content Service Layer                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Converter  │  │  Extractor   │  │  Formatter   │      │
│  │   Factory    │  │  Engine      │  │  Pipeline    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                    Parser Layer                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│  │   HTML   │  │   PDF    │  │  DOCX    │  │   TXT    │     │
│  │  Parser  │  │  Parser  │  │  Parser  │  │  Parser  │     │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘     │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                    Storage & Export                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│  │ Chrome   │  │ Indexed  │  │ Clipboard│  │ Download │     │
│  │ Storage  │  │    DB    │  │   API    │  │   API    │     │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘     │
└──────────────────────────────────────────────────────────────┘
```

### 3.2 目录结构

```
mdflow-extension/
├── manifest.json                 # Chrome Extension 配置
├── package.json                  # 依赖管理
├── tsconfig.json                 # TypeScript 配置
│
├── src/
│   ├── background/               # Service Worker (MV3)
│   │   ├── index.ts
│   │   ├── context-menu.ts      # 右键菜单逻辑
│   │   ├── keyboard-shortcuts.ts # 快捷键处理
│   │   └── download-manager.ts   # 下载任务管理
│   │
│   ├── content/                  # Content Scripts
│   │   ├── index.ts
│   │   ├── page-extractor.ts    # 页面内容提取
│   │   └── injection-styles.css  # 注入样式
│   │
│   ├── popup/                    # 弹出窗口
│   │   ├── index.html
│   │   ├── app.ts
│   │   └── styles.css
│   │
│   ├── options/                  # 设置页面
│   │   ├── index.html
│   │   ├── app.ts
│   │   └── styles.css
│   │
│   ├── history/                  # 历史记录页面
│   │   ├── index.html
│   │   ├── app.ts
│   │   └── styles.css
│   │
│   ├── core/                     # 核心转换引擎
│   │   ├── converter-factory.ts
│   │   ├── parsers/
│   │   │   ├── html-parser.ts
│   │   │   ├── pdf-parser.ts
│   │   │   ├── docx-parser.ts
│   │   │   └── base-parser.ts
│   │   ├── formatters/
│   │   │   ├── markdown-formatter.ts
│   │   │   ├── math-formatter.ts
│   │   │   └── code-formatter.ts
│   │   └── processors/
│   │       ├── image-processor.ts
│   │       └── table-processor.ts
│   │
│   ├── storage/                  # 存储层
│   │   ├── index.ts
│   │   ├── chrome-storage.ts
│   │   └── indexed-db.ts
│   │
│   ├── utils/                    # 工具函数
│   │   ├── dom.ts
│   │   ├── file.ts
│   │   └── logger.ts
│   │
│   └── types/                    # TypeScript 类型
│       ├── index.ts
│       └── config.ts
│
├── public/
│   ├── icons/                    # 插件图标
│   │   ├── icon16.png
│   │   ├── icon48.png
│   │   └── icon128.png
│   └── _locales/                 # 多语言支持
│       ├── en/messages.json
│       └── zh_CN/messages.json
│
└── tests/                        # 测试文件
    ├── unit/
    └── e2e/
```

### 3.3 数据流设计

```
用户触发转换
     │
     ▼
┌─────────────────┐
│  Content Script │───► 提取页面 DOM/文件内容
└─────────────────┘
     │
     ▼
┌─────────────────┐     ┌──────────────────┐
│ Converter Engine│────►│  HTML Parser     │
│                 │     │  PDF Parser      │
│                 │     │  DOCX Parser     │
└─────────────────┘     └──────────────────┘
     │
     ▼
┌─────────────────┐
│ Format Pipeline │───► 公式转换 → 代码处理 → 图片处理
└─────────────────┘
     │
     ▼
┌─────────────────┐     ┌──────────────────┐
│  Output Manager │────►│ 剪贴板 / 下载     │
│                 │     │ 存储 / 历史记录   │
└─────────────────┘     └──────────────────┘
```

---

## 4. 开发阶段规划

### Phase 1: 基础框架 (Week 1-2)
**目标**: 搭建可运行的基础架构

- [ ] Chrome Extension 项目初始化
- [ ] Manifest V3 配置
- [ ] TypeScript + Webpack/Vite 构建流程
- [ ] 基础 UI 骨架 (Popup/Options/History 页面)
- [ ] Chrome Storage API 封装

**交付物**: 可安装的空壳插件，三个页面可正常打开

---

### Phase 2: HTML 转换引擎 (Week 3-4)
**目标**: 实现网页到 Markdown 的核心转换

- [ ] TurndownJS 集成与配置
- [ ] 智能内容提取算法 (Readability 式)
- [ ] 噪音过滤 (广告、导航、页脚)
- [ ] 右键菜单集成
- [ ] 剪贴板输出

**交付物**: 右键任意网页可转换为 MD 并复制

---

### Phase 3: 文档解析器 (Week 5-7)
**目标**: 支持 PDF 和 Word 文件

**Week 5-6: PDF 支持**
- [ ] PDF.js 集成
- [ ] 文本提取与结构识别
- [ ] 表格检测与转换
- [ ] 公式提取为 LaTeX

**Week 7: Word 支持**
- [ ] Mammoth.js 集成
- [ ] DOCX 解析与 MD 映射
- [ ] 样式保留策略

**交付物**: 支持拖拽 PDF/DOCX 文件转换为 MD

---

### Phase 4: 增强处理 (Week 8-9)
**目标**: 实现公式、代码、图片的高级处理

- [ ] MathJax 公式检测与转换
- [ ] 代码块语言识别与高亮保留
- [ ] 图片下载与相对路径重写
- [ ] 表格格式化优化

**交付物**: 转换结果格式保真度 > 90%

---

### Phase 5: 批量与历史 (Week 10-11)
**目标**: 支持批量操作和历史管理

- [ ] 任务队列系统
- [ ] IndexedDB 历史存储
- [ ] 历史记录页面 (搜索/过滤/重新导出)
- [ ] 批量选择与操作 UI

**交付物**: 可管理转换历史，支持批量转换

---

### Phase 6: 导出与配置 (Week 12-13)
**目标**: 完善输出方式和自定义能力

- [ ] 多格式导出 (HTML/TXT/PDF)
- [ ] 自定义转换规则配置
- [ ] 预设模板系统
- [ ] 快捷键配置界面

**交付物**: 完整的设置页面，支持个性化配置

---

### Phase 7: 优化与测试 (Week 14-15)
**目标**: 性能优化与稳定性保证

- [ ] 大文件处理优化 (分块解析)
- [ ] 内存泄漏排查
- [ ] 单元测试覆盖 > 70%
- [ ] 真实场景 E2E 测试

**交付物**: 性能报告 + 测试报告

---

## 5. 关键技术选型

### 5.1 核心依赖库

| 功能 | 技术选型 | 理由 |
|------|----------|------|
| **HTML → MD** | `turndown` + `turndown-plugin-gfm` | 成熟稳定，支持 GitHub Flavored MD |
| **PDF 解析** | `pdfjs-dist` | Mozilla 官方，功能强大 |
| **PDF → MD** | `pdf2md` (需 fork 改造) | 专门的转换逻辑 |
| **Word 解析** | `mammoth.js` | 专注于文档内容，轻量 |
| **公式解析** | `mathjax-node` | 服务端 MathJax 渲染 |
| **代码高亮** | `highlight.js` | 语言识别准确 |
| **DOM 操作** | `jsdom` (content script 内用原生 DOM) | 服务端测试用 |
| **内容提取** | 自研 (参考 Readability 算法) | 针对中文优化 |
| **日期处理** | `date-fns` | 轻量级 |
| **UI 组件** | 原生 Web Components / Lit | 无框架依赖，体积小 |

### 5.2 构建工具

- **打包器**: Vite (快速 HMR)
- **语言**: TypeScript (类型安全)
- **代码规范**: ESLint + Prettier
- **测试**: Vitest + Playwright (E2E)
- **发布**: Chrome Web Store API

### 5.3 Chrome API 使用

| API | 用途 |
|-----|------|
| `chrome.contextMenus` | 右键菜单 |
| `chrome.commands` | 快捷键 |
| `chrome.storage` | 配置存储 |
| `chrome.downloads` | 文件下载 |
| `chrome.offscreen` | 离屏文档处理 (PDF 解析) |
| `chrome.tabs` | 标签页操作 |
| `chrome.notifications` | 系统通知 |

---

## 6. 风险与挑战

### 6.1 技术风险

| 风险 | 影响 | 缓解策略 |
|------|------|----------|
| PDF 公式提取准确率低 | 高 | 提供手动编辑模式，保留原始图像 |
| 大文件内存溢出 | 中 | 实现分块处理和 Web Worker |
| 某些网站反爬虫 | 中 | 提供"选择模式"手动选取内容 |
| 跨域图片下载失败 | 低 | 使用背景页面代理下载 |

### 6.2 产品风险

| 风险 | 缓解策略 |
|------|----------|
| 转换质量不满足预期 | 提供详细的自定义配置 |
| 用户使用门槛 | 提供视频教程和示例 |
| 浏览器兼容性 | 明确标注仅支持 Chrome |

---

## 7. 成功指标

### 7.1 技术指标

- **转换准确率**: > 90% (基于 100 个常见网站测试)
- **平均转换速度**: < 3s (普通网页)
- **内存占用**: < 200MB (单次转换)
- **崩溃率**: < 0.1%

### 7.2 产品指标

- **Chrome Web Store 评分**: > 4.5/5
- **周活用户**: TBD
- **功能采用率**: 60%+ 用户使用过高级功能

---

## 8. 后续迭代方向

- **v1.1**: 浏览器同步 (Firefox/Safari)
- **v1.2**: AI 辅助摘要提取
- **v1.3**: Notion/Obsidian 直接集成
- **v2.0**: 云端版本 + 团队协作

---

## 附录: 参考资源

### 开源项目参考
- [MarkDownload](https://github.com/deathau/markdownload) - 类似功能插件
- [SingleFile](https://github.com/gildas-lormeau/SingleFile) - 页面存档
- [Turndown](https://github.com/mixmark-io/turndown) - HTML to MD 库

### 技术文档
- [Chrome Extension Manifest V3](https://developer.chrome.com/docs/extensions/mv3/)
- [Turndown Documentation](https://mixmark-io.github.io/turndown/)
- [PDF.js API](https://mozilla.github.io/pdf.js/)

---

**文档版本**: v1.0
**最后更新**: 2026-01-06
**下一步**: 开始 Phase 1 开发 - 项目初始化
