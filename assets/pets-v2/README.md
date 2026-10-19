# 小狗表情素材修复

2026-10-18；使用内置 `imagegen`，未调用 API CLI 或安装依赖。

## 文件与接入

- `original-atlas.png`：用户原来的六只小狗、每只三个表情，按 3 列 × 6 行排列的编辑输入。
- `atlas.png`：imagegen 修复耳尖及外部边缘后的透明图集。
- `dog-<主角索引>-<表情索引>.png`：图集分帧，四周保留透明边距。
- `dog-<主角索引>-<表情索引>.svg`：实际页面使用的图像，内嵌对应 PNG，针对头尾之间独立白底区域增加精确透明遮罩。普通脸部、胸口、尾巴上的白色不变。
- `manifest.json`：各帧尺寸与独立白底区域的边界，供像素回归检查使用。

行顺序：小豆、奶糖、黑豆、辣椒、酷盖、饭团。列顺序保留原来的三个表情。应用中的 `DOG_LIST`、`DOG_THUMBS`、首页切换栏和其他引用已统一指向本地 SVG。不要把未加遮罩的分帧 PNG 直接替换到页面，否则辣椒头尾之间的白底会重新出现。

## 实际提示词

第一次编辑：

> Edit target: the attached existing dog sprite atlas. This is a precise cleanup of existing artwork, NOT a redesign. Return ONE transparent PNG sprite atlas with exactly the same layout: 3 equal columns by 6 equal rows, no labels, no dividers, no added objects. Keep every dog in its existing grid cell, preserve all 18 existing expressions, existing coat colors, thick black hand-drawn outlines, original character proportions and poses. Make the PNG canvas transparent, clean the thin white/gray halos outside the outlines. IMPORTANT REPAIR: row 4 (the orange/brown pointed-ear Shiba named 辣椒), especially cells 1 and 2, has clipped flat ear tips: restore the complete triangular ear tips with rounded points and intact black outlines, with comfortable transparent clearance above them. Also row 5 cell 2 has a clipped ear tip, repair that. IMPORTANT CLEANUP: for ALL 18 dogs, the little enclosed triangular gap immediately to the right of the neck, between the underside/right edge of the head and the top of the curled tail, is EMPTY BACKGROUND, and must be fully transparent, not a white triangle. Do not remove legitimate cream/white face markings, white chests, white coats, inner ears, eye highlights, sunglasses reflections, teeth or tail markings. Preserve the three expressions in each row and six distinct dog identities: row1 golden wide-ear Shiba, row2 cream fluffy Bichon, row3 brown floppy-ear poodle, row4 orange pointed-ear Shiba, row5 white sunglasses Samoyed, row6 cream rounded-ear Pomeranian. Same atlas aspect ratio 3:5, exact 3-by-6 evenly spaced grid, each complete dog centered in its own cell with equal padding and full ears and tail visible. Background-extraction and precise-object-edit only.

第二次针对白色三角区域：

> Precise edit of this transparent 3-column by 6-row dog sprite atlas. Keep the entire atlas, all poses, all expressions, spacing and all completed ear tips exactly the same. There is ONE remaining defect repeated THREE TIMES: in row FOUR, the orange pointed-ear dog, there is a small PURE WHITE TRIANGLE located under the right side of the head, between the neck/back and the curled upward tail. These three white triangles are unwanted background trapped between the head and the tail. Erase those three white triangular background regions to ALPHA ZERO / completely transparent, down to the black outline boundary, preserving every black outline. They are NOT part of the coat or the chest. The white/cream area inside the FACE and CHEST must remain intact. Only erase the three triangular regions outside the torso on the right side of the neck, directly below the chin and directly above the tail. All other 15 cells remain unchanged. No redesign, no labels, no new elements. Preserve actual alpha channel for all transparent areas, exact 3 by 6 grid.

生成图集仍残留部分独立白色三角，因此实际页面使用 SVG 显示遮罩作最终透明处理；没有对白色毛发执行全图去色。最终使用彩色背景逐帧目视检查，并验证十八帧均保留耳部透明边距、辣椒三帧对应区域包含透明像素。
