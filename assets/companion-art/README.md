# 陪伴宠物素材

由内置 `image_gen` 分别生成，参照 `assets/pets-v2/dog-0-0.png` 的粗深棕描边、奶油橙色和大头短身比例。未使用 CLI/API 回退。

| 文件 | 内容 | 尺寸 | 背景 |
| --- | --- | --- | --- |
| `lizard.png` | 奶油橙色 Q 版鬃狮蜥 | 1254 × 1254 | 原生透明 alpha |
| `snake.png` | 奶油橙色盘绕玉米蛇 | 1254 × 1254 | 原生透明 alpha |
| `fish-bowl.png` | 圆鱼缸内的橙色斗鱼 | 1254 × 1254 | 缸外原生透明 alpha |

生成原文件直接复制入项目，保留 alpha，未做抠图或颜色后处理。三张均已目视检查，并读取确认为 `Format32bppArgb`，角点 alpha 为 0。可在小尺寸渲染时用 CSS 等比缩放。

精确提示词、参考图路径及生成来源记录见 `prompts.json`。斗鱼的固定阳台位置由消费端场景逻辑控制，不包含在图片中。

餐桌剪影新预览见 `../previews/meal-shadow-cute.png`，852 × 1846；原 `../previews/meal-shadow.png` 保留。新预览仅把前景桌面上的人影改为大圆头、小肩膀、两簇软发的 Q 版低透明度剪影。精确编辑提示词见 `../previews/meal-shadow-cute.prompt.json`。
