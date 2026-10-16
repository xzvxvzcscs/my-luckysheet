# UPRR_WEB 的 Luckysheet 源码迁移

日期：2026-10-16。源码基于 dream-num/Luckysheet 的 `5b3fe58f5ad2aaa6a3cef15c6d567f5e10ea1f37`，版本为 2.1.13。

## 恢复依据

- 项目基线为 UPRR_WEB 的 `8e6cbd78`，其中已撤销直接修改压缩包的 `285b0ace`。
- 从 UPRR_WEB 的 `dce15b7ab` 恢复 `public/luckysheet/luckysheet.umd.js.map`。它包含 104 个项目源码文件和 29 个依赖源码文件；源码映射在 `3788eefc6` 中被删除。
- 对比上游后，恢复其中 13 个存在历史定制的源码文件，其余源码与上游一致。额外恢复 `src/assets/cellType.json`，供格式菜单使用；draw.js 再加入本次隐藏列修复。
- 历史源码重新打包后，与历史包相比仅剩 3 处手工修改：冻结边界的两处偏移，以及已加载工作表切换时保存实际目标 index。已按项目现有包补回。
- 后续以当前项目包的完整差异为准迁移，涵盖自动合并进入包中的修改，不只依赖提交说明。

## 历史定制清单

| 功能 | 源码文件 | 保留的行为 |
| --- | --- | --- |
| 数字与单位格式 | `src/global/format.js`、`src/global/setdata.js` | 银行家舍入、超长数字原始精度、货币和万元格式、已有单元格格式保留 |
| 格式菜单 | `src/controllers/menuButton.js`、`src/controllers/moreFormat.js`、`src/assets/cellType.json` | 格式类型映射、菜单选中回显、富文本格式转换 |
| 自定义函数 | `src/function/functionImplementation.js`、`src/function/functionListDescriptor.js`、`src/locale/*.js` | 已有银行家舍入函数及其描述、语言文本 |
| 多选与编辑交互 | `src/controllers/handler.js`、`src/global/formula.js` | Ctrl 切换单元格及合并区域选中状态、跨表公式引用、公式删除字符后的光标位置 |
| 工作表加载 | `src/controllers/sheetmanage.js` | 数组与对象响应兼容、calcChain 回填、按配置强制计算、加载钩子、实际切换 index、带引号表名 |
| 冻结窗格 | `src/controllers/freezen.js` | 按实际冻结边界判断，保留项目对滚动条反复归零的修复 |
| 自动行高与列宽 | `src/global/getRowlen.js`、`src/global/rhchInit.js`、`src/global/createdom.js` | 共用离屏画布、空占位行保护、初始化读取本轮矩阵、列宽测量使用实际配置 |
| 下拉候选项与权限 | `src/controllers/dataVerificationCtrl.js`、`src/global/draw.js` | 完整文本及特殊字符、结构化候选项、显示值和富文本匹配、合并主格定位、不可查看格跳过校验 |
| 下拉写入与关联公式 | `src/global/formula.js`、`src/function/functionImplementation.js` | 先格式化再校验、失败不改原数据与公式链、接受更新钩子、精确 MATCH/VLOOKUP/HLOOKUP |
| 日期与编辑值 | `src/global/setdata.js`、`src/global/formula.js`、`src/controllers/updateCell.js`、`src/global/api.js` | cellValueFormat/cellEditValue 钩子、日期序列与显示分离、API 传递 sheetOrder、校验取消后停止写回 |
| 拖拽与批量粘贴 | `src/controllers/dropCell.js`、`src/global/api.js`、`src/global/formula.js` | 常规数值参与序列填充、公式复制保留单位显示、未改公式不重新调行高、批量公式读取本轮数据且保留撤销快照 |
| 规则初始化性能 | `src/global/api.js` | silent 回填不复制整表、不广播协作消息、不写撤销记录，普通用户编辑继续同步 |
| 本次隐藏列修复 | `src/global/draw.js` 的 `cellOverflow_colIn` | 将 285b0ace 迁到源码，在溢出范围与绘制范围内最后一个可见列绘制 |

后续差异涉及 `0814e027`、`3ce34722`、`f752b242`、`79751fa6`、`ba2f7a22`、`1ac50c04`、`7a571125`、`47158eed`、`20ff05bb`、`3ee8ab0e`、`41647a06`；另外加入本次 `285b0ace` 对应的源码修复。

## 依赖与打包

补充精确版本 `bignumber.js@11.1.5`，将 dayjs 固定为历史包实际使用的 `1.11.20`。29 个被打包的依赖源码均已与历史源码映射核对一致。提交时应包含 package-lock.json；已从 .gitignore 移除对它的忽略。

在本目录安装依赖后运行 `npm run build`。后续可通过已保留的锁文件运行 `npm ci`。只将 `dist/luckysheet.umd.js` 及其 `.map` 复制到 UPRR_WEB 的 `public/luckysheet/`，避免覆盖项目已有样式、插件和其他静态资源。

UPRR_WEB 中两个既有验证脚本已改为读取产物源码映射中的原始方法，不再绑定压缩函数名。它们验证映射中的源码，不替代浏览器内实际运行验证。

## 已完成的检查

- 官方 `npm run build` 成功；产物源码映射与本地所有被打包源码逐一相符。
- 对比目标为项目原定制包加 285b0ace。按作用域和源码位置归一变量名，并使用同版本 esbuild 收敛编译语法后，剩余 9 个差异区块已逐一审核。
- 9 个区块分别为：离屏画布变量声明位置变化（2 处）、相邻声明合并（2 处）、等价条件表达式（2 处）、显式导入配置产生的幂等初始化调用（3 处）。未发现额外业务逻辑丢失。
- 新包未增加未绑定全局引用；现有两个验证脚本的语法解析及差异空白检查通过。
- 上述由 Codex 完成的是静态对照及打包验证。自动化脚本和页面操作的验证反馈单独记录如下。

## 验证记录与范围

- 用户已在 UPRR_WEB 运行 `node scripts/test_luckysheet_auto_dimensions.js` 和 `node scripts/test_luckysheet_verification_hydration.js`，截图显示尺寸回归通过，1000 条规则回填无广播和整表复制，用户编辑仍正常同步。
- 用户反馈功能验证通过。该反馈以本次实际验证范围为准，不推定所有浏览器、接口及协作场景均已覆盖。
- 本轮只拆分提交、审查差异并核对文件哈希，没有重新运行构建或测试；每个中间批次也未分别运行构建或测试。
- 分批提交后的源码和依赖文件与拆分前已验证版本逐字节一致；UPRR_WEB 的产物、验证脚本及 CommonExcel.vue 保持不变。

打包保留上游已有的打印插件导出警告：空的 `src/expendPlugins/print/print.js` 没有导出 `luckysheetPrint`。本次未扩展修改打印功能。

取消“设置单元格格式后自动调整宽高”的改动位于 UPRR_WEB 的 `src/views/reportForm/editExcelReport/CommonExcel.vue`，不属于本源码仓库，本轮未提交。

## 本地分批提交

在 Luckysheet 的 master 分支创建以下 19 次代码与依赖提交，另以一次文档提交保存本文。标题沿用或补充原 `luckysheet.umd.js` 提交标题，提交说明保存原提交完整 SHA、标题及实际迁移范围。历史上反复调试的数字格式实现按功能归并，仅保存最终实现。

| 批次 | 本地提交 | 提交标题 | UPRR_WEB 原提交 |
| --- | --- | --- | --- |
| 1 | `b33aefd8` | build: 固定 Luckysheet 定制包依赖版本并保存锁文件 | 依赖准备 |
| 2 | `2afb39ce` | fix: 修复bug #96473（迁移 ROUNDBANK 银行家舍入函数） | `b0801c5e1` |
| 3 | `cfec2564` | fix:计算结果未按银行家舍入法处理（迁移数字格式与精度修复） | `9f8e5cf2e`、`4dea5d0d5`、`bc57a8e7e`、`1959132b2`、`4d926c7ae`、`69c106f30`、`ec911b82a`、`31e1ca17b`、`0e26508dd` |
| 4 | `58217568` | fix:导入数据支持万元格式（保留货币符号兼容修复） | `31e1ca17b`、`b3354997a`、`60856a85b` |
| 5 | `b91cb501` | fix:点击单元格报错问题修复（保留 Ctrl 多选交互） | `5a72e201e`、`84951753a` |
| 6 | `25f1b87e` | 切回已加载的工作表报错问题（恢复工作表加载兼容） | `697932055`、`7a1d91bcf`、`72d585938`、`2783b058a`、`dce15b7ab` |
| 7 | `6bcdec02` | 修正冻结窗格边界计算，避免拖选超出视口时滚动条被反复重置 | `650abfa42` |
| 8 | `0bb1d48e` | fix：修復掛表引用公式出現單引號時名稱不匹配的問題 | `0814e0272` |
| 9 | `6f8b42b2` | fix: 修改報表校驗結果文本展示樣式 | `3ce347226` |
| 10 | `144a3d0d` | 修復拖拽複製問題 | `f752b2426` |
| 11 | `77a1dd0f` | 报表下拉框修复，下拉数据调整，外部复制下拉值匹配不准修复（含旧数据） | `79751fa68` |
| 12 | `291e70f5` | 下拉选项值修复（统一候选项读取、富文本取值、合并区域和含逗号的多选匹配） | `ba2f7a22b` |
| 13 | `fad3999f` | 不可查看单元格跳过下拉失效提示、红色标记和保存前下拉校验；可查看区域继续正常校验 | `1ac50c04e` |
| 14 | `cf561e61` | 修复复制粘贴后的单位格式被覆盖问题，修复拖拽填充问题 | `7a5711259` |
| 15 | `8b0c6955` | 修复带公式复制粘贴编辑状态退出时的高度改变问题 | `47158eed2` |
| 16 | `7c3b2141` | 158：单元格格式（加入千分位分隔符，加入日期类型中文格式） | `20ff05bb4` |
| 17 | `455d5c85` | fix: 修復加載下拉選項數據的報表導致界面卡死的問題 | `3ee8ab0eb` |
| 18 | `fb2c6e9e` | fix: 复用自动行高和列宽的离屏测量画布，适配尺寸回归脚本 | `41647a062` |
| 19 | `2d4ee698` | 修复lucksheet渲染问题：溢出文字改在最后一个可见列绘制，避免隐藏列导致漏绘 | `285b0aced` |

第 9 批只包含原提交中属于 Luckysheet 的 WebSocket 提示文本；第 16 批只包含产物侧的日期和编辑值钩子，原提交里的主项目页面配置仍由 UPRR_WEB 管理。

本轮仅创建本地提交，未推送；UPRR_WEB 的 5 个待提交文件留待下一步处理。

## 本次产物 SHA-256

- dist/luckysheet.umd.js: `0fd64d07c53a6f4c2c1c23e7b097f6312a615669988c9aae97c7d2f41b8130ac`
- dist/luckysheet.umd.js.map: `9517c8f38c524b544f77105de32a463db5c128e8ae08d8be10e5e35d7efbce2c`
- package-lock.json: `12c3601d14f3a7c5a99bd834bf062aae36f0e927b6de0cd490c110f9ec5acdc2`
