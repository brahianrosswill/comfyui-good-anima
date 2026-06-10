---
name: comfyui-animatool
description: |
  Route ALL Anima image generation: validate Danbooru hard anchors, form visual brief, assemble English prompts and args, then load comfyui-manager for workflow execution.
  Triggers: anima, comfyui, 生图, 画图, 出图, 生成, 来一张, roll, 抽卡, 画师融合.
---

# ComfyUI Animatool — Anima 生图唯一入口

本 skill 是 Anima 生图的唯一入口。只做硬约束：路由、视觉简报、tag 校验、prompt 组装、冲突消解、args 输出。不替代模型构图常识；不执行 workflow。

## 硬约束

- 生图任务必须先形成视觉简报，再组装 prompt。
- 视觉简报完成前，不开始 tag 校验和 prompt 组装。
- Hard anchors 必须用 `danbooru-tags` 校验后才回填。
- 冲突检查必须在输出 args 前通过。
- 同一语义不放 tag 和 nltags 两处。
- 不执行 ComfyUI workflow；需要执行时加载 `comfyui-manager`。

---

## 1. 生图分支判断

拿到用户需求后先判断分支：

| 用户意图                                 | 路线                                                                  |
| ---------------------------------------- | --------------------------------------------------------------------- |
| 普通 Anima 生图                          | 视觉简报 → tag 校验 → 组装 prompt + args → 加载 comfyui-manager        |
| 随机 / roll / 抽卡                       | danbooru-tags `--random` → 筛选 → 视觉简报 → tag 校验 → prompt + args |
| 画师融合（明确说融合/混合/artist_chain） | artist_chain → 视觉简报 → prompt + args                               |
| 纯查 tag/画师/角色/作品                  | 只用 `danbooru-tags`，不生图                                          |
| 只抽候选不生成                           | danbooru-tags `--random`，不生图                                      |

"分别用 A/B 各出图"是多个普通 job，不是 Artist Mixer。
"允许多个画师"不是融合指令；每个非融合 job 仍选 1 个画师。

---

## 2. 视觉简报（硬门禁）

组装 prompt 前必须持有视觉简报。简报必须含以下全部字段：

- **主体**：角色名/原创主体/人数
- **场景容器**：花海/教室/街道/神社/抽象空间（用户给出后不可改写）
- **动作/关系**：单人姿态或多人互动关系
- **镜头距离和视角**：close-up / upper body / cowboy shot / full body；eye-level / from above / from below
- **画布比例**：width × height（见 §3 画布表）
- **光影方向**：光源位置和类型（窗光/侧光/背光/顶光/环境漫射）
- **主体占比**：主体在画面中的大致占比
- **nltags 短句**：2-5 句英文控制句

### 简报规则

- 用户已给完整构图 → 整理字段，不重写。
- 用户模糊 → 从场景容器物理属性补合理画面。例：花海 → 户外自然光+微风+花瓣飘动；教室窗边 → 窗光+桌椅+窗帘；雨夜 → 湿地反光+伞+路灯。
- 只选一个画面瞬间。不穷举多个方案。
- 多人必须绑定：每个角色写明位置+角色+2-4 个外观锚点+动作。不写 loose list。
- 默认保护脸部可读性。
- 不写世界观解释、文学比喻、情绪长文。
- 完成后不向用户输出完整推理过程。

---

## 3. 画布选择

画布必须匹配构图。不默认竖图/方图/超宽。

| 比例 | 画布      | 用途                     |
| ---- | --------- | ------------------------ |
| 2:3  | 1024×1536 | 单人全身、立绘、手机壁纸 |
| 3:4  | 1152×1536 | 角色为主、轻环境         |
| 1:1  | 1024×1024 | 头像、半身、简单中心     |
| 1:1  | 1536×1536 | 复杂中心构图、方形海报   |
| 4:3  | 1536×1152 | 室内中景                 |
| 3:2  | 1536×1024 | 多人互动、横向动作       |
| 16:9 | 1536×864  | 宽银幕、远景             |
| 9:16 | 864×1536  | 手机海报、竖向空间       |
| 2:1  | 1536×768  | 超宽场景                 |
| 1:2  | 768×1536  | 超竖图                   |

初始默认使用 1536 级画布。

多人、复杂互动、大场景、强光影、脸部容易糊时，可升到 2048 级。

2048 级常用画布：

| 比例 | 画布      | 用途                         |
| ---- | --------- | ---------------------------- |
| 1:1  | 2048×2048 | 多人中心构图、复杂服装、道具 |
| 4:3  | 2048×1536 | 室内多人、事件 CG            |
| 3:2  | 2048×1365 | 横向互动、宽场景             |
| 2:3  | 1365×2048 | 单人全身、高细节竖图         |
| 3:4  | 1536×2048 | 角色为主、轻环境             |

2048 级只在画面需要时使用；不要为了默认高清强行升分辨率。

用户给定尺寸时保留，调整主体占比和留白。

---

## 4. Tag 校验

### 校验策略

先写检索计划（最多 4 个语义锚点），再调用 `danbooru-tags` 批量查询。典型生图最多 1 次批量查询 + 1 次补查。

**必查**：角色、作品/IP、最终选定画师。
**可查**：用户明确指定的服装/道具/姿势/概念锚点。
**不查**：构图、光影、氛围、情绪、连续动作 → 写 nltags。

### 回填规则

- `confirmed_tags` 按用户意图筛选后回填。
- `candidate_tags` 只作候选，不整批塞进 prompt。
- `missing` → 写 nltags，不伪造 Danbooru tag。
- 画师必须来自 artist category，普通 prompt 保留 `@`。

---

## 5. Canonical 角色处理

- 中文名/外号/CP 简称 → 先网络确认 canonical name，再进 `danbooru-tags` 校验。
- 确认后提取 2-4 个身份锚点：发色、瞳色、发型、标志服装、道具、配色。
- 命名角色必须写外观锚点；多角色每人单独绑定。
- 角色名 + series tag 不替代外观锚点。
- 查到角色后检查独立 series/IP tag。
- 热门稳定角色可少查外观；小众/同名/多形态优先查。
- 外观锚点能落到 Danbooru tag 就回填；查不到或组合复杂写短 nltags。

---

## 6. Prompt 组装

### 组装顺序

```
quality/meta/year/safety → count → character → series → artist → appearance → tags → environment → nltags
```

### tag / nltags 分离

- 组装时先维护 `tag_block` 和 `nltags_block`，最后再拼成 `prompt_11`。
- `tag_block` 只放逗号分隔的 tag：质量、年代、安全、人数、角色、作品、画师、外观、服装、道具、姿势、表情、场景。
- `nltags_block` 只放 2-4 句英文短句：位置、关系、接触、视线、遮挡、光源、景深、脸部可读性。
- `prompt_11 = tag_block + ", " + nltags_block`。
- nltags 必须位于 `prompt_11` 末尾。
- 不把英文句子插入 `tag_block`。
- 不把逗号 tag 列表写进 `nltags_block`。
- `tag_block` 和 `nltags_block` 未分离检查前，不输出 args。

### 质量前缀（双 LoRA 默认）

```
masterpiece, very aesthetic, best quality, score_9, score_8, highres, absurdres, newest, year 2025, nsfw
```

裸模型/对比测试：

```
masterpiece, best quality, score_7, safe
```

安全标签：`safe / sensitive / nsfw / explicit`。用户未指定时默认 `nsfw`。

### 负向

负向按画面风险动态组装。不写 `artist name`。

**核心：**

```
worst quality, low quality, score_1, score_2, score_3, watermark, logo
```

**默认身体保护：**

```
bad anatomy, bad hands, bad feet, extra fingers, missing fingers, distorted face, blurry
```

**按画面追加：**

| 场景 | 追加 |
| --- | --- |
| 普通单人 | 默认身体保护 |
| 头像/半身/表情重点 | `bad eyes, asymmetrical eyes, deformed face, blurry face` |
| 全身/立绘 | `extra limbs, missing limbs, disconnected limbs, bad feet` |
| 动态动作/战斗/跳跃 | `extra limbs, missing limbs, broken joints, disconnected limbs, bad hands, bad feet` |
| 极端透视/低机位/俯视 | `distorted face, bad perspective, broken joints, extra limbs` |
| 手部特写/持物/道具互动 | `bad hands, fused fingers, fused hands, extra fingers, missing fingers, malformed hands` |
| 双人近距离互动 | `merged bodies, extra arms, extra hands, cloned face` |
| 多角色（3+） | `duplicate, twins, merged bodies, fused limbs, extra limbs, cloned face, same outfit` |
| 复杂服装/飘带/长发 | `tangled hair, fused fabric, merged clothing, broken accessories` |
| 背景虚化但主体清楚 | `blurry face, blurry subject, out of focus face` |
| 文字不是画面目标 | `text` |

规则：

- 先按视觉简报选追加项。
- 姿势越复杂，越要补肢体、手、脚、关节负向。
- 多角色越多，越要补复制、融合、串脸、同服装负向。
- 有手部接触或持物时，必须补手指和融合负向。
- 浅景深、bokeh、背景虚化时，移除全局 `blurry`，改用 `blurry face, blurry subject, out of focus face`。
- 用户明确要求文字时，只移除 `text`；保留 `watermark, logo`。
- 只有确认某个负向压制目标，或失败后定位到冲突，才移除对应项。

### 画师规则

- 普通 prompt 写 `@artist name`（不加 `@` 效果极弱）。
- Danbooru vs Gelbooru 标签冲突时，优先 Gelbooru 版本。
- 没有用户偏好时不强制默认画师。可留空，或按风格需求选 1 个已校验画师。
- 画师融合：`artist_chain` 不带 `@`，`prompt_11` 不重复画师名。例：`wlop, (sakimichan:1.2), (krenz:0.7)`。
- **样例隔离**：画师研究只提取视觉倾向（线条、上色、构图、背景复杂度、光影氛围）；不得把画师样例 post 里的角色、服装、姿势、暴露程度或成人向标签自动并入 prompt。
- 同一张非融合图只放 1 个 `@artist`。

### 画师融合（Artist Mixer）

只在用户明确说"融合/混合/artist_chain/多画师合一"时启用。"分别用 A 和 B 各出图"是多个普通 job。

`artist_chain` 规则：

- 画师名不带 `@`，逗号或换行分隔。
- 权重语法：`(name:1.2)` 或 `::name::1.2`。
- 主辅关系：主画师 `1.0`，辅画师 `0.2–0.4`。
- 使用 2-4 个画师。越多速度和风格可控性越差。
- 风格相近的组合效果更好。

默认 mixer 参数由 workflow 提供，不在 args 中传：

- `combine_mode=output_avg`，`fusion_mode=interpolate`，`artist_mixer_strength=1.0`。
- `artist_mixer_apply_to_uncond` 默认 `false`，不要主动打开。
- block 范围、percent 范围等高级参数只在用户明确调试 Artist Mixer 时传。

### 年代规则

- 默认 `newest, year 2025`。
- 用户要求旧番/赛璐璐 → 移除 `newest`，匹配 period tag。
- `year` 和 `period` 不走 `danbooru-tags` 校验。
- 年代、作品/IP、画师时期尽量一致，不确定的作品不伪造 tag。

### 标签格式

- tag 用小写和空格：`red hair`，不写 `red_hair`。
- `score_9` 等质量 token 保留下划线。
- 多角色同一作品/IP 时，`series` 只写一次，不重复。
- 角色有明确作品/IP 时，`character` 和 `series` 都写。查不到独立 `series` tag 时只写 character。
- `ye-pop`、`deviantart` 等 dataset tag 只在用户明确要求非纯 anime/欧美插画风格时使用；默认 Anima 生图不加入。
- 不穷尽 tag。
- 只保留身份、画面结构、服装、道具、动作、表情所需的关键 tag。
- 删除弱相关、重复、互相覆盖或只起解释作用的 tag。
- 同类外观 tag 保留最能识别角色的 2-4 个。
- 场景容器只写必要 tag；空间关系交给 nltags。

### Tag 和自然语言使用

- 稳定单 tag 优先用 tag。
- 复杂关系用 nltags 补清楚。
- 姿势 tag 只写已确认、能稳定表达的词，如 `sitting`, `standing`, `wariza`, `indian style`。
- 手部接触、道具归属、多人动作、视线、距离、遮挡，用 nltags。
- 不写长句自然语言。
- 不写剧情解释、心理活动、文学比喻。
- 精确姿势：tag 锚定基础姿势，nltags 只补位置、接触、归属和遮挡。

---

## 7. Tag vs nltags 分工

### Hard anchors（用 tag）

- 人数、角色、作品、画师
- 发色、瞳色、发型、体型
- 已确认的单 tag 服装、道具、姿势、表情

### nltags（用短英文）

- 空间位置（center/left/right/foreground/background）
- 多角色归属与间距
- 多角色动作归属
- 手和道具接触
- 视线方向
- 遮挡关系
- 构图层级（前景/中景/背景）
- 光源方向、补光、环境氛围
- 景深、虚化、清晰区域
- 脸部和主体可读性

**约束：**

- 同一语义只放一处。
- 稳定姿势优先 tag。
- 复杂动作、接触、归属、遮挡用 nltags。
- nltags 不写已在 tag 中出现的外观/服装。
- 查不到的复合概念改写成短 nltags，不伪造 Danbooru tag。
- nltags 控制在 2–4 句。

---

## 8. 冲突检查

组装前必须消解以下冲突，逐项通过后才输出 args：

| 冲突对                               | 规则                            |
| ------------------------------------ | ------------------------------- |
| `solo` vs 多人                       | 选一个，不共存                  |
| `close-up` vs `full body`            | 选一个景别                      |
| `from above` vs `from below`         | 选一个视角                      |
| `from front` vs `from behind`        | 选一个朝向                      |
| `closed eyes` vs `looking at viewer` | 选一个视线                      |
| 裸体 vs 服装                         | 选一个着装状态                  |
| 多角色属性归属                       | 发色/服装必须绑定具体角色，不串 |
| 室内光源 vs 室外背景                 | 光源和背景必须同空间            |
| 背光                                 | 必须补脸部补光或轮廓保护        |
| 宽景 vs 表情细节                     | wide shot 不要求表情细节        |

单人正面默认保护脸部：保留 `looking at viewer` 或 `facing viewer`，nltags 补一句脸部清晰。

多人必须绑定：`Place X on the front left, with [hair], [outfit], [action].`

tag 与 nltags 语义重复：同一概念只放一处。

---

## 9. 权重控制

- 默认不加权。
- 只在用户要求或某元素不稳定时，从 `(tag:2)` 级别开始。
- 不给角色名、画师名、安全标签、整段 nltags 默认加权。
- 同一 prompt 最多 1-3 个加权点。

---

## 10. nltags 句式

- 2–3 句，复杂构图最多 4 句。
- 每句 8–15 词。
- 每句控制一个画面要素。
- 使用 `Place / Use / Keep / Frame / Light / Blur`。
- 不重复已写入 tag 的姿势、动作、外观、服装。
- 允许写位置、接触、归属、遮挡、视线、主体可读性。
- 不写文学比喻、世界观解释、情绪长文。

**单人示例：**

```
Place the main subject slightly right of center.
Use soft window light from the left side.
Keep her face sharp and readable, with a softly blurred background.
```

**多人示例：**

```
Place Reimu on the front left, with brown hair and a red shrine outfit.
Place Marisa on the front right, with blonde hair and a black witch dress.
Keep their hands separated and both faces readable.
```

---

## 11. 批量规则

- 默认 1 张，`batch_size=1`。
- 同 prompt 多变体：一个 args，`batch_size=N`。
- 多 prompt：每张单独组装、单独 submit。
- 候选池筛选：先抽候选 → 筛 K 个 → 只研究选中的。

---

## 12. 参数输出

必须同时输出 `workflow_id` 和 `args`。

- `workflow_id` 通过命令行传 `run_workflow_args.js`，不写进 args 文件。
- args 文件写扁平 JSON，禁止 `{"args":{...}}` 嵌套。

### workflow_id

- 默认：`local/anima-txt2img-aesthetic-lora`
- Artist Mixer：`local/anima-txt2img-aesthetic-lora-artist-mixer`
- 裸模型/对比：`local/anima-txt2img-base`

### args 必含字段

- `prompt_11`：正向 prompt
- `prompt_12`：负向 prompt
- `width`、`height`
- `batch_size`
- `steps`：默认 30；高质量/复杂背景/多人/强光影用 40
- `seed`：可省略；省略时 `comfyui-manager/workspace/run_workflow_args.js` 会自动生成 1~4294967295 的随机整数并写回实际 args。用户指定则保留原值；重绘且未要求换 seed 时保留原 seed；用户要求固定复现时必须写入明确 seed。
- `rtx_vsr_quality`：默认 `ULTRA`
- `filename_prefix`：`anima/%year%-%month%-%day%/anima_base_v1_0-<artist|none>-<subject>`

采样器/调度器/CFG 由 workflow 提供，不在 args 中显式传。默认 workflow 使用 `dpmpp_2m_sde_gpu` + `beta57` + CFG `4.5`。

### 不传字段

- 不传高级节点参数：`fls_*`、`teacache_*`、`anima_booster_*`（除非用户明确要求调速/排障）
- 不传 `rtx_vsr_scale`
- 不把 LoRA 文件名写进 prompt

---

## 13. 调用 manager 前检查

逐项确认：

- [ ] 已有 `workflow_id`
- [ ] 已有完整 `args`（含 `prompt_11`、`prompt_12`、`width`、`height`、`batch_size`、`steps`、`rtx_vsr_quality`、`filename_prefix`）
- [ ] 视觉简报已完成（或用户已完整给出构图）
- [ ] tag 校验已完成（hard anchors 已确认）
- [ ] `tag_block` 与 `nltags_block` 已分离，nltags 位于 `prompt_11` 末尾
- [ ] 冲突检查已通过

全部通过后，执行：

```bash
node run_workflow_args.js submit <workflow_id> <args_json_file>
```

`submit` 非阻塞；用户要求看结果时才查状态。

---

## 14. 完整示例

**用户输入：** "生成天使心跳的立华奏，三无感，教室窗边柔光"

**分支：** 普通生图。

**视觉简报：** Kanade Tachibana / solo / 教室窗边 / upper body eye-level / 1152×1536 / 左侧窗光柔光 / nltags: `Place Kanade by the classroom window. Use soft window light from the left. Keep her face expressionless and readable with a softly blurred background.`

**Tag 校验：** character=kanade tachibana + series=angel beats! 批量查 → confirmed。外观锚点（热门角色，模型已知）：silver hair, yellow eyes, short hair, school uniform。

**负向判断：** 普通单人 → 追加全量：`bad anatomy, bad hands, bad feet, extra fingers, missing fingers, distorted face, blurry`。

**冲突检查：** solo ✓ / upper body 无冲突 ✓ / 窗光+教室同空间 ✓ / tag 与 nltags 不重复 ✓

**prompt_11:** `masterpiece, very aesthetic, best quality, score_9, score_8, highres, absurdres, newest, year 2025, nsfw, 1girl, kanade tachibana, angel beats!, silver hair, yellow eyes, short hair, school uniform, classroom, window, looking at viewer, Place Kanade by the classroom window. Use soft window light from the left. Keep her face expressionless and readable with a softly blurred background.`

**prompt_12:** `worst quality, low quality, score_1, score_2, score_3, blurry, bad anatomy, bad hands, bad feet, extra fingers, missing fingers, distorted face, text, watermark, logo`

**Args:** `{"prompt_11":"...","prompt_12":"...","width":1152,"height":1536,"batch_size":1,"steps":30,"rtx_vsr_quality":"ULTRA","filename_prefix":"anima/%year%-%month%-%day%/anima_base_v1_0-none-kanade_tachibana"}`（seed 省略时由 `run_workflow_args.js` 自动补随机整数）

**workflow_id:** `local/anima-txt2img-aesthetic-lora` → 执行 `comfyui-manager` submit。

---

## 按需参考

只在遇到对应情况时读取，不自动加载：

| 场景                                                                    | 读取                                  |
| ----------------------------------------------------------------------- | ------------------------------------- |
| 用户要求画师背景、画风特色、构图倾向、"查底细"                          | `references/artist-style-research.md` |
| 生图结果出现人脸变形、切线粘连、比例失调、肢体归属混乱等 Anima 特有失败 | `references/failure-patterns.md`      |
| 需要 tag 查询详细策略                                                   | `danbooru-tags/SKILL.md`              |
| 需要执行 workflow、排障、管理服务器                                     | `comfyui-manager/SKILL.md`            |
