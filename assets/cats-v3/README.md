# 原稿猫咪素材 v3

此目录现为保留的用户原稿版本。用户2026-10-19确认第二版优化稿后，正式应用改用assets/cats-v4；本目录文件和原稿像素检查均保留，以下说明记录原版本制作方式。

直接使用用户提供的 1728 × 864 原稿（3 排 × 6 列），不重新生成画面，不更换眼睛、眉毛或鼻子的颜色。原文件按字节保存在 `sources/original-user.png`，校验值记录在 `manifest.json` 的 `sourceSha256`。

列顺序固定：耳朵（三花）、年糕（白）、煤球（黑）、芝麻（黑白）、布丁（灰白/暹罗）、团子（橘）。`assets/cat-catalog.js` 保持原有 `CatCatalog` 接口和索引，仅更新前两只名字。

## 稳定身份与表情

- 每只猫只以第一排作为共用主体，输出 `cat-{pet}-base.png`。`cat-{pet}-0.png` 与它完全相同。
- 第二、三排仅提供内部脸部的原始表情像素。按鼻子位置做整数平移；不缩放，不重绘。耳朵、头部外轮廓、胡须外端、身体、爪子和尾巴持续使用第一排主体。
- 表情裁切边界在脸部内部用 5 像素透明蒙版融合；眉眼鼻嘴核心保持原稿像素。所有距外部透明区 6 像素以内的主体像素均受到保护。
- 奶油背景只从与画布外沿相连的区域移除，因此眼睛和身体内部的白色、奶油色保持不透明。
- 所有素材使用 288 × 288 画布，实际像素底线统一为 276；同只猫的三个表情位置和外部透明度完全一致。

## 文件接口

应用继续使用 `assets/cats-v3/cat-{pet}-{expr}.svg`，`pet` 为 0–5，`expr` 为 0–2。无需新增运行时模块。

- 18 个 SVG：内嵌共同主体、原稿表情裁片和内部透明蒙版，可直接用于 `<img>`；不依赖 SVG 外部资源。
- 18 个同名 PNG：同一原生组合的栅格版本。
- `manifest.json`：姓名、品种、源文件和输出校验值、共同主体、画布、底线、原稿映射、脸部范围、身体保护线、特征抽样坐标。
- `preview.png` / `preview-cream.png`：透明与奶油背景的完整表情预览。

## 重新生成与验证

使用当前环境已提供的 Node 24、pngjs 和 Playwright，不需要安装或修改依赖。预期脚本生成 18 组素材，两项像素测试输出 PASS。

```powershell
$catNode = 'C:/Users/19332/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe'
& $catNode scripts/prepare-cat-identity.cjs
& $catNode tests/cat-art.cjs
& $catNode tests/cat-face-colors.cjs
```

硬件 Chrome 检查需独占 GPU。预期确认 18 个 SVG 的外轮廓与身体一致，实际渲染与对应 PNG 的各颜色通道误差不超过 2，并生成截图。当前验证使用 NVIDIA GTX 1660 Ti / D3D11。

```powershell
& $catNode tests/cat-identity-browser.cjs
```

视觉证据保存在 `docs/research/2026-10-18-cat-native-identity.png`。原有 `cats-v1`、`cats-v2` 保留供追溯，当前应用使用 `cats-v3`。
