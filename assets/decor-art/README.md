# 房间小物件素材

`atlas.png` 是内置 image_gen 生成的 4 列 × 3 行透明图集，第 12 格为空；生成提示词及参考来源见 `generation.json`。

已拆分 11 件：`wand.png`、`yarn.png`、`bowl.png`、`mouse.png`、`cushion.png`、`plant.png`、`rug.png`、`moon.png`、`stars.png`、`raindrop.png`、`rainbow.png`。

使用 Chrome Canvas 原像素裁切，按 alpha > 8 的最大连通主体确定边界，以主体中心匹配格位。原图的地毯跨列，星星与雨滴吊绳跨行，裁切保留完整主体，不受格线截断；不含其他格残片。每边增加 8px 透明边距，保留原始 alpha，不重绘、不改色、不缩放。

`manifest.json` 记录每张尺寸、来源格位与完整裁切坐标。人工逐项检查拼图：`../../docs/research/2026-10-18-decor-candidates.png`。
