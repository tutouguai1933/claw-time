# 原始场景本地缓存

`original-room-T-W.png` 对应原页面的 3 × 3 场景矩阵。T：0 早晨、1 午后、2 夜晚；W：0 晴天、1 雨天、2 雪天。图片为用户原有素材的本地副本，未修改其画面。

| T | 晴天原链接尾段 | 雨天原链接尾段 | 雪天原链接尾段 |
|---|---|---|---|
| 0 | LcmKSzt7z1 | DsS3ujWFRd | SV1n8OoS5x |
| 1 | OHgaHluU66 | zt4h22gAVs | 34MNxzuqcj |
| 2 | gWVi2a3LRN | UbIoRNYtuT | v5SHZjp9n3 |

链接前缀为 `https://aka.doubaocdn.com/s/`。`newyear.png` 对应过年门外 `fMzdbHuQoE`。

原图文件保持不变，SHA256 清单为 `original-checksums.json`。小屋原型、局部换装、首页、总览和导出统一使用 `original-room-1-0.png` 的家具、窗框、云朵及地板几何，未换装的中午晴天与该原图逐像素一致。其他八张仅提供低频 RGB 光照参考，不将其家具边缘或位置复制到画面。

显示入口现使用 `../scene-clean/room.png`、`focus-table.png` 和 `newyear.png`。客厅与饭桌通过内置 ImageGen 局部清理水印，水印矩形外与这里的原图逐像素一致；新年无水印，副本按字节一致。原图继续作备份及宽区域光照参考，去字坐标、校验与提示词见 `../scene-clean/README.md`。

光照场先降采样并模糊再取通道增益；晴雨雪窗景通过固定窗格内的天空调色及雨雪图层变化。夜间保留原夜景的明暗分布和暖光，同时给室内材质设置可见亮度下限。替换家具只在明确选择的区域使用 `house-art/room-1-0.png` 清理层，家具和装饰使用同一空间光照场，右下地毯延伸仍保留统一原型几何。

`focus-table.png` 为原始专注饭桌 `DVXbtGHWfq` 的本地缓存；六种桌面投影通过独立 SVG 层叠加，原桌图未重绘。
