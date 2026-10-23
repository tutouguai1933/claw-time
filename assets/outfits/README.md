# 用户提供的九件装扮

2026-10-23，旧装扮的临时图片链接返回 `403 / url is expired`。根据项目早期衣橱截图重建四件本地矢量替代素材：`emperor.svg`（「321跪」冕旒帽）、`alien.svg`（绿色触角）、`christmas-sock.svg`（红绿条纹袜）、`eye-patch.svg`（棕色眼罩）。它们不属于下述用户提供的九件原始 PNG；名称、索引、价格及穿戴锚点均保留。胡子和口水巾继续复用 `art-sources.js` 中的原始本地缓存，并将初次加载的回退地址改为该缓存，所有旧六件装扮均不再请求临时图片主机。

素材及穿戴参考由用户于2026-10-18提供，没有重新绘制。`sources/`保存九个原始透明PNG，SHA-256与轮廓显示范围记录在`manifest.json`。显示用SVG只以viewBox裁去透明边距，内部嵌入原始PNG字节，保留线稿、内部白色、抗锯齿和雨衣半透明填充。

|显示名|素材文件|类别|
|---|---|---|
|小红帽|red-cap.svg|头饰|
|三好学生围巾|student-scarf.svg|颈饰|
|伞|umbrella.svg|手持|
|耳暖|earmuffs.svg|头饰|
|帅气披风|cape.svg|颈饰|
|毛绒围巾|fluffy-scarf.svg|颈饰|
|雨衣|raincoat.svg|外衣（占用头与颈部）|
|今天我生日|birthday.svg|头饰|
|圣诞帽|santa.svg|头饰|

`references/`依次保留生日/伞/披风、圣诞帽、帽子围巾耳暖雨衣的三张穿戴参考。`outfit-catalog.js`以小狗预览校准，`x/y/w`为宠物方框百分比；其他物种通过`profiles`映射头身锚点，新增角色可继续补充。鱼的锚点位于鱼缸内部。绘画伙伴复用原来的主体适配和动画容器。

旧六件装扮索引和存档名称保持兼容。三好学生围巾50鱼币，红帽/伞/耳暖/毛绒围巾100，披风200；雨衣/生日帽/圣诞帽各¥1。所有衣服可先试穿，确认才校验和兑换；鱼币交易失败回滚，现金支付未开放不能模拟解锁，旧已穿戴衣服保留拥有权益。衣橱单排横滑并显示价格。披风中心上移至74%，雨衣43%。同类头饰或颈饰互相替换，允许帽子配围巾。雨衣原有透明度不变，蓝色通过色相滤镜派生，不覆盖原文件。颜色试穿与服装一起确认保存，`outfitColors[角色ID].raincoat`随账号隔离并随角色索引迁移。

重新准备素材（需要原九文件与三参考在指定目录、使用本机已有pngjs）：

```powershell
$nodePath = Join-Path $env:USERPROFILE '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe'
& $nodePath '.\scripts\prepare-supplied-outfits.cjs' 'C:\Users\19332\Desktop'
& $nodePath '.\tests\new-outfits.cjs'
```

预期打包9件，原始alpha/白色填充检查和浏览器穿戴/确认/刷新/账号隔离检查通过。运行时无需桌面文件，无需联网。
