# MDFlow 测试指南

## 构建状态

✅ 开发服务器正在运行
✅ 构建输出位于 `dist/` 目录

---

## 如何加载和测试扩展

### 步骤 1: 打开 Chrome 扩展管理页面

在 Chrome 浏览器地址栏输入：
```
chrome://extensions/
```

### 步骤 2: 启用开发者模式

在页面右上角找到并开启 **"开发者模式"** 开关。

### 步骤 3: 加载扩展

1. 点击 **"加载已解压的扩展程序"** 按钮
2. 选择项目的 `dist` 目录
   - 完整路径: `F:\Project\web-to-md-plugin\dist`
3. 点击"选择文件夹"

### 步骤 4: 验证扩展已加载

扩展加载成功后，你应该看到：
- MDFlow 图标出现在扩展列表中
- 浏览器工具栏出现 MDFlow 图标（紫色文档图标）
- 没有错误提示

---

## 测试检查清单

### 1. Popup 界面测试

- [ ] 点击工具栏的 MDFlow 图标，弹出窗口应该打开
- [ ] 界面显示：Logo、转换按钮、文件上传区域、最近转换列表
- [ ] 点击设置图标（齿轮），应该跳转到 Options 页面
- [ ] 点击 History 按钮，应该跳转到历史记录页面

### 2. Options 页面测试

- [ ] 在扩展管理页面点击"扩展程序选项"
- [ ] 或者在 Popup 中点击设置图标
- [ ] 页面应显示侧边栏导航（General、Conversion、Shortcuts、About）
- [ ] 各个设置选项应正常显示

### 3. History 页面测试

- [ ] 应该能够打开并显示历史记录页面
- [ ] 当前应显示空状态（因为还没有转换记录）

### 4. 右键菜单测试

- [ ] 在任意网页右键，应看到 "Convert Page to Markdown" 选项
- [ ] 选中文字后右键，应看到 "Convert Selection to Markdown" 选项
- [ ] 点击后目前会提示错误（因为转换功能还未实现）

### 5. 快捷键测试

- [ ] 按 `Ctrl+Shift+M` 应触发转换命令
- [ ] 按 `Ctrl+Shift+K` 应触发选中内容转换

---

## 当前已知限制

⚠️ 以下功能尚未实现，点击会显示错误：

- 实际的网页到 Markdown 转换功能
- PDF/Word 文件转换
- 右键菜单的实际转换操作

这些功能将在 Phase 2 开发中实现。

---

## 调试技巧

### 查看 Console 日志

**Popup / Options / History 页面：**
1. 右键点击页面
2. 选择"检查"
3. 查看 Console 标签

**Background Service Worker：**
1. 在 chrome://extensions/ 页面
2. 找到 MDFlow 扩展
3. 点击 "Service Worker" 链接查看日志

**Content Script：**
1. 在任意网页按 F12 打开开发者工具
2. 查看 Console 标签

### 重新加载扩展

修改代码后：
1. 在 chrome://extensions/ 页面
2. 点击 MDFlow 扩展卡片的刷新图标 🔄
3. 或者按 `Ctrl+R` 刷新

### 查看详细错误

如果扩展加载失败：
1. 点击 "错误" 按钮查看具体错误信息
2. 检查 manifest.json 语法
3. 检查所有引用的文件是否存在

---

## 开发模式热重载

Vite 开发服务器支持热重载：
- 修改 HTML/CSS/TS 文件后会自动重新编译
- 在扩展管理页面点击刷新按钮即可看到更改
- 某些更改可能需要完全重新加载扩展

---

## 下一步

基础框架测试通过后，可以开始 **Phase 2: HTML 到 Markdown 转换引擎** 的开发。

详见: [PROJECT_PLAN.md](./PROJECT_PLAN.md)
