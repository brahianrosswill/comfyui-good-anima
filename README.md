# ComfyUI Good Anima 🎨

> 一套面向 AI 编程助手的 ComfyUI + Anima 二次元生图技能包。当前主线是 v2mini：去掉多层代理式路由，只保留 Anima 生图所需的核心约束、Danbooru tag 精确校验和 ComfyUI 执行链路，让 AI 和人类把更多注意力留给画面本身。
>
> v2mini 的新核心是“情境因果 → 三层 prompt → 精确执行”：先让模型根据角色、画师、场景和用户意图形成有故事感的画面瞬间，再拆成 `hard_tags`、`soft_phrases`、`nltags_block`，由 `danbooru-tags` 只确认真正的 Danbooru 硬锚点，最后交给 ComfyUI workflow 执行。
>
> 🌐 **[English Version](./README_EN.md)**

![Anima Base v1.0 预览图](./samples/anima_base_v1_0-rella-sea-margatroid_marisa_00001_.png)

---

## 主线设计目标

- **返璞归真**：v2mini 不再依赖 master / composition-director / random-gen 多层链路，默认从 `comfyui-animatool` 进入生图。
- **把创作权还给模型和用户**：skill 不替代审美、构图常识和角色理解；只保留 Anima 工作流中容易丢失或容易出错的硬边界。
- **情境因果优先**：先确定事件起因、角色反应、环境参与和可见后果，再补齐画面八维信息。
- **三层 prompt 组装**：`hard_tags` 放确认过的硬锚点，`soft_phrases` 放模型审美短语，`nltags_block` 放空间、动作归属、光影、景深和因果后果。
- **不可丢事实**：Anima prompt 顺序、三层分离、双 LoRA 质量前缀、负向动态组装、workflow args、seed 行为、`submit` 非阻塞和 PowerShell JSON 编码。
- **硬锚点精确校验**：角色、作品、画师、服装、道具等 hard anchors 由 `danbooru-tags` 先做 exact / prefix 验证；模糊结果只作候选，不冒充 confirmed tag。
- **执行层纯粹**：`comfyui-manager` 只执行准备好的 workflow 和 args，不写 prompt、不选画师、不决定构图。
- **按需参考**：失败模式、画师风格研究等内容留在 references，只有遇到对应问题才读取。

---

## 兼容的 AI 编程助手

本项目的 Skills 为 **AI 编程代理（AI Coding Agent）** 设计，任何能执行 Shell 命令的 AI 助手均可使用：

| 助手                 | 支持状态    | 说明                                              |
| -------------------- | ----------- | ------------------------------------------------- |
| **🟢 Snow**          | ✅ 完美支持 | **国内首选推荐** — 原生支持 Skills 系统，即开即用 |
| **🟢 Claude Code**   | ✅ 完美支持 | Anthropic 官方 CLI，支持 Shell 命令执行           |
| **🟢 Codex**         | ✅ 完美支持 | 全功能 AI 编程代理，完全兼容                      |
| **🟢 PI**            | ✅ 完美支持 | 轻量级 AI 编程代理，支持 Skills 系统              |
| **🟢 OpenClaw**      | ✅ 支持     | 支持 ComfyUI_Skill_CLI 集成的 Agents              |
| **🟡 其他 AI Agent** | ✅ 完美支持 | 只要能执行 PowerShell/Shell 命令即可              |

> 💡 **推荐使用 [Snow](https://snowcli.com/docs) — 目前国内体验最好的 AI 编程代理**。

---

## 架构设计

v2mini 采用三段式链路：

| 层级          | 组件                | 角色                                       | 加载时机             |
| ------------- | ------------------- | ------------------------------------------ | -------------------- |
| **L1 — 入口** | `comfyui-animatool` | 情境因果、八维补全、三层 prompt、冲突检查、args 输出 | Anima 生图触发时     |
| **L2 — 校验** | `danbooru-tags`     | exact / prefix 校验、批量验证、必要候选    | 需要 hard anchors 时 |
| **L3 — 执行** | `comfyui-manager`   | validate / submit / run / 排障 / 缓存输出  | args 准备完成后      |

这条链路不做多代理分工，不创建 route contract，不把用户需求拆成过度流程。模型先理解画面和故事因果，skill 只兜住 Anima、Danbooru 和 ComfyUI 的硬规则。

---

## 技能包结构

```
comfyui-good-anima/
├── README.md
├── README_EN.md
├── comfyui-animatool/
│   ├── SKILL.md                # Anima 生图唯一入口：情境因果、三层 prompt、args
│   └── references/
│       ├── artist-style-research.md # 只在研究画师风格时读取
│       └── failure-patterns.md      # 只在出图失败/畸形/归属混乱时读取
├── danbooru-tags/
│   ├── SKILL.md                # Danbooru tag 检索与校验
│   ├── bin/danbooru-tags.exe   # Rust CLI（预编译）
│   ├── anima-1.0.csv           # Anima 标签主索引
│   ├── Anima-preview.csv       # 预览版 tag 数据
│   ├── Anima-preview-alternate.csv
│   ├── tags_index.json         # JSON 索引
│   ├── tags_index.sqlite       # SQLite 高速索引
│   ├── *.py                    # 索引构建脚本
│   └── rust-cli/               # danbooru-tags Rust 源码
├── comfyui-manager/
│   ├── SKILL.md                # ComfyUI 执行与运维
│   ├── workspace/              # workflow JSON + 执行脚本
│   │   ├── config.json
│   │   ├── run_workflow_args.js
│   │   ├── cache_anima_outputs.js
│   │   └── data/               # 工作流定义 + local/ 导入映射
├── samples/                    # 示例图
├── legacy/v1/                  # V1 归档版本，仅历史参考，保留在 git
├── legacy/V3/                  # V3 本地封存版本，不纳入 git
└── LICENSE
```

### 版本归档规则

- 当前主线只维护 v2mini：`comfyui-animatool`、`danbooru-tags`、`comfyui-manager`。
- `legacy/v1/` 作为早期硬约束链路归档，可用于对照规则退化，不作为运行入口。
- `legacy/V3/` 作为本地封存版本保留，不提交到 git，不作为安装路径或技能根目录。
- 新规则优先进入三大核心 skill；失败排查和画师研究只放入 `comfyui-animatool/references/`。

---

## 🔍 danbooru-tags 是什么？

**danbooru-tags** 是本项目中最关键的检索基础设施。它是一个 Rust 编写的命令行工具，负责对 **Anima 官方标签索引（anima-1.0.csv）** 进行高速检索和锚点校验。

### 它解决的核心问题

Anima 模型是在 Danbooru 标签系统上训练的，想要精确控制生成内容，就必须使用 **Danbooru 体系内的有效标签**。但 Danbooru 有数百万个标签，人工记忆和拼写几乎不可能。danbooru-tags 解决了以下痛点：

| 痛点           | 没有 danbooru-tags 会怎样                                                                | 有 danbooru-tags 后                                                  |
| -------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| **画师校验**   | 用户说"用 rella 画风"，AI 不知道 `@rella` 是不是有效 tag，可能写出无效画师名导致模型忽略 | `--group artist --prefix "@rella"` 直接返回 confirmed 画师           |
| **角色确认**   | "立华奏"在 Danbooru 里叫 `kanade tachibana`，AI 可能猜错或漏掉                           | 批量查询 `--group character --keyword "kanade tachibana"` 精准命中   |
| **标签准确性** | 随便写的 `巫女服` 不是有效 Danbooru tag，模型不理解                                      | 拆解为 `miko`, `hakama`, `wide sleeves` 等多角度候选供筛选           |
| **随机抽卡**   | 无法在有效标签范围内做随机选择                                                           | `--random N --json` 给出候选；生图回填才用 `--random 5 --for-prompt` |
| **批量检索**   | 每查一个 tag 都要调一次，慢且低效                                                        | `--batch-file` 一次查 12-16 个 query，并发 8 线程                    |

### 工作方式

```
anima-1.0.csv (官方索引)
       ↓
 build_index.py + sqlite_index.py (构建索引)
       ↓
tags_index.sqlite (高速本地索引)
       ↓
 bin/danbooru-tags.exe (Rust CLI)
       ↓
 AI 助手用 --group / --random / --batch-file 检索
 获得 confirmed_tags / candidate_tags 用于 prompt 组装
```

> 没有 danbooru-tags，整个生图流程就变成了"盲写 prompt，撞大运出图"，完全失去了精确控制的能力。

---

## 🖼️ 案例展示

以下是由 ComfyUI Good Anima + Anima base v1.0 生成的示例图片（画师：rella）：

| 作品                                                                                            | 描述                                            |
| ----------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| ![小野塚小町×四季映姫](samples/anima_base_v1_0-rella-flw-onozuka_komachi_shiki_eiki_00001_.png) | 东方 project — 小野塚小町与四季映姫，花映塚主题 |
| ![宫古芳香×霍青蛾](samples/anima_base_v1_0-rella-inc-miyako_yoshika_kaku_seiga_00001_.png)      | 东方 project — 宫古芳香与霍青蛾，神灵庙主题     |
| ![八云紫×八云蓝](samples/anima_base_v1_0-rella-pcb-yakumo_yukari_ran_yakumo_00001_.png)         | 东方 project — 八云紫与八云蓝，妖妖梦主题       |

---

## 🖥️ 运行环境

| 依赖                  | 版本要求       | 说明                                                |
| --------------------- | -------------- | --------------------------------------------------- |
| **操作系统**          | Windows 10/11  | PowerShell 5.x+，本项目使用 Windows PowerShell 语法 |
| **ComfyUI**           | 最新版         | 图片生成后端                                        |
| **comfyui-skill-cli** | 最新版         | agent 代理与 ComfyUI 之间的桥梁                     |
| **Node.js**           | 18+            | 用于运行工作流执行脚本                              |
| **Python**            | 3.10+          | 仅标签索引初始化时需要，日常生图不需要              |
| **NVIDIA GPU**        | 8GB+ VRAM      | 推荐 12GB+，用于 Anima 推理和 RTX VSR 放大          |
| **CUDA**              | 12.8+          | GPU 加速必需                                        |
| **PyTorch**           | 兼容 CUDA 12.8 | 配合 xformers 0.0.3.0 使用                          |
| **xformers**          | 0.0.3.0        | 内存优化加速                                        |

### ComfyUI 启动推荐

使用 Sage Attention 模式启动可获得最佳性能（需 ANIMA_BOOSTER 节点支持）：

```powershell
python main.py --use-sage-attention
```

> **注意：** 默认采样器使用 `dpmpp_2m_sde_gpu` + `beta57` scheduler。`beta57` 调度器来自 [RES4LYF](https://github.com/ClownsharkBatwing/RES4LYF) 节点包，需额外安装。

---

## 模型安装

### 基础模型

| 文件                          | 放置路径                           | 大小     |
| ----------------------------- | ---------------------------------- | -------- |
| `anima-base-v1.0.safetensors` | `ComfyUI/models/diffusion_models/` | ~12.2 GB |

### CLIP & VAE

| 文件                          | 放置路径                        |
| ----------------------------- | ------------------------------- |
| `qwen_3_06b_base.safetensors` | `ComfyUI/models/text_encoders/` |
| `qwen_image_vae.safetensors`  | `ComfyUI/models/vae/`           |

### LoRA（双美学增强）

| 文件                                        | 放置路径                | 用途                                                                                                                                                                                                                          |
| ------------------------------------------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `anima-highres-aesthetic-boost.safetensors` | `ComfyUI/models/loras/` | 官方 LoRA — 主要为稳定高分辨率(1536-2048px)生图，美学提升较微妙 [CivitAI](https://civitai.red/models/2540444/anima-highresaesthetic-boost)                                                                                    |
| `anima-base-1-masterpiece-v51.safetensors`  | `ComfyUI/models/loras/` | 美学质量修饰器，触发词 `masterpiece` `very aesthetic` — 作者推荐结构: `masterpiece, best quality, very aesthetic` [CivitAI](https://civitai.red/models/929497/aesthetic-quality-modifiers-masterpiece?modelVersionId=2961717) |

> **模型来源**：[circlestone-labs/Anima](https://huggingface.co/circlestone-labs/Anima) — CircleStone Labs 与 Comfy Org 联合发布。训练数据截止 2025 年 9 月。

### 质量前缀

默认工作流使用双美学 LoRA，`masterpiece-v51` LoRA 基于 PonyV7 美学评分训练，**必须**使用以下前缀：

```text
masterpiece, very aesthetic, best quality, score_9, score_8, highres, absurdres, newest, year 2025, nsfw
```

**备选** — 裸模型（无 LoRA，仅对比测试）：

```text
masterpiece, best quality, score_7, safe
```

> ⚠️ 质量前缀与 LoRA 栈绑定。将 `score_7` 替换到 LoRA 工作流会降低 `masterpiece-v51` 效果。HuggingFace 页面描述的是裸模型，本项目使用的是增强工作流。

### 采样器与调度器

默认工作流依赖 FLSamplerV4 + RES4LYF 自定义节点：

| 组件          | 默认值             | 依赖               |
| ------------- | ------------------ | ------------------ |
| 采样器        | `dpmpp_2m_sde_gpu` | FLSamplerV4 节点   |
| 调度器        | `beta57`           | RES4LYF 节点       |
| 步数          | 30（高质量用 40）  | —                  |
| CFG           | 4.5（范围 4–5）    | —                  |
| SageAttention | 启用               | AnimaBoosterLoader |

若 RES4LYF 不可用，降级为 `beta` 或 `ddim_uniform`。裸模型使用 `er_sde` + `simple`（按官方文档）。

---

## 必需自定义节点

在 ComfyUI `custom_nodes/` 目录中安装：

| 节点                        | 用途                                                  | 安装地址                                                                                        |
| --------------------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| **AnimaBoosterLoader**      | Anima 模型加载器 + SageAttention(自动回退) + JIT 编译 | [BlackSnowSkill/ANIMA_BOOSTER](https://github.com/BlackSnowSkill/ANIMA_BOOSTER)                 |
| **FLS_SamplerV4**           | Foveated Latent Sampling 细节增强                     | [BlackSnowSkill/ComfyUI-BSS_FLSampler](https://github.com/BlackSnowSkill/ComfyUI-BSS_FLSampler) |
| **AnimaTeaCache**           | TeaCache 推理加速                                     | [ComfyUI-TeaCache](https://github.com/daraskme/comfy_anima_tea_cache)                           |
| **AnimaArtistPack**         | 画师多风格融合（仅 artist mixer）                     | 同 ANIMA_BOOSTER                                                                                |
| **AnimaArtistCrossAttn**    | 画师跨注意力混合（仅 artist mixer）                   | 同 ANIMA_BOOSTER                                                                                |
| **RES4LYF**                 | `beta57` 调度器                                       | [ClownsharkBatwing/RES4LYF](https://github.com/ClownsharkBatwing/RES4LYF)                       |
| **RTXVideoSuperResolution** | RTX VSR 2× 放大（仅 RTX 显卡）                        | [Comfy-Org/Nvidia_RTX_Nodes_ComfyUI](https://github.com/Comfy-Org/Nvidia_RTX_Nodes_ComfyUI)     |

**快速安装（PowerShell）：**

```powershell
cd ComfyUI/custom_nodes
git clone https://github.com/BlackSnowSkill/ANIMA_BOOSTER.git
git clone https://github.com/BlackSnowSkill/ComfyUI-BSS_FLSampler.git
git clone https://github.com/daraskme/comfy_anima_tea_cache.git
git clone https://github.com/ClownsharkBatwing/RES4LYF.git
git clone https://github.com/Comfy-Org/Nvidia_RTX_Nodes_ComfyUI.git
```

安装后重启 ComfyUI，验证：`comfyui-skill deps check local/anima-txt2img-aesthetic-lora`

---

## ⚡ 核心依赖：comfyui-skill CLI

**这是整个链路中最重要的组件。** 没有它，AI 编程助手（Snow / Codex）无法与本地 ComfyUI 通信和执行工作流。

| 项目        | 链接                                                                              |
| ----------- | --------------------------------------------------------------------------------- |
| GitHub 仓库 | [HuangYuChuh/ComfyUI_Skill_CLI](https://github.com/HuangYuChuh/ComfyUI_Skill_CLI) |
| PyPI 包     | [comfyui-skill-cli](https://pypi.org/project/comfyui-skill-cli/)                  |

```powershell
pip install comfyui-skill-cli
```

> 安装后，AI 助手可通过 `comfyui-skill` 命令查询模型列表、导入工作流、执行生图和管理队列。

---

## ⚙️ 快速开始

### 1. 安装 ComfyUI 和 comfyui-skill CLI

```powershell
git clone https://github.com/comfyanonymous/ComfyUI
cd ComfyUI
pip install comfyui-skill-cli
```

### 1b. 设置技能根目录（必需）

`COMFYUI_GOOD_ANIMA_SKILLS_DIR` 必须指向安装后的 skills 根目录，目录下应直接包含：

```text
comfyui-animatool/
danbooru-tags/
comfyui-manager/
```

```powershell
[System.Environment]::SetEnvironmentVariable(
    "COMFYUI_GOOD_ANIMA_SKILLS_DIR",
    "C:\Users\12971\skills",
    "User"
)
$env:COMFYUI_GOOD_ANIMA_SKILLS_DIR = "C:\Users\12971\skills"
```

如果你的 skills 安装在其他位置，把路径替换为自己的 skills 根目录。不要指向 `legacy/v1`、`legacy/V3` 或其他实验副本。

---

### 2. 放置模型和节点

按上方表格将模型文件放入对应目录，克隆自定义节点，然后启动 ComfyUI。

### 3. 导入工作流

```powershell
cd comfyui-good-anima/comfyui-manager/workspace
comfyui-skill workflow import data/anima-txt2img-aesthetic-lora.json --check-deps --json
comfyui-skill workflow import data/anima-txt2img-aesthetic-lora-artist-mixer.json --check-deps --json
comfyui-skill workflow import data/anima-txt2img-base.json --check-deps --json
```

### 4. 执行生图

AI 助手触发 `comfyui-animatool` 后会输出 `workflow_id` 和扁平 args JSON，再交给 `comfyui-manager`：

```powershell
cd comfyui-good-anima/comfyui-manager/workspace
node ./run_workflow_args.js submit local/anima-txt2img-aesthetic-lora ./args_anima.json
```

`run_workflow_args.js` 会通过 argv 安全传递 JSON args。省略 seed 时脚本会自动生成随机 seed 并写回 args。
`submit` 非阻塞返回 `prompt_id`；需要等图或查看结果时再显式查询状态。

### 5. 开始对话

直接描述你想生成什么：

```text
"生成天使心跳的立华奏"           → 标准生图链路
"来个随机画师出图"               → danbooru-tags 随机候选 → animatool 组装
"融合 wlop 和 sakimichan 的画风" → Artist Mixer workflow
"出 10 张不同姿势"               → 多 prompt 或 batch_size 变体
```

v2mini 不强迫用户先写完整提示词。用户说想法，AI 形成画面；skill 负责确保 tag、nltags、args 和 workflow 不跑偏。

---

## 生图流程

```
用户意图
    │
    ▼
comfyui-animatool
    │
    ├── 视觉简报
    │     └── 主体 / 场景容器 / 动作关系 / 镜头 / 画布 / 光影 / nltags
    │
    ├── danbooru-tags
    │     └── 角色 / 作品 / 画师 / 服装 / 道具 / 姿势 hard anchors 校验
    │
    ├── prompt 组装
    │     ├── tag_block：质量、年代、安全、角色、作品、画师、外观、道具
    │     ├── nltags_block：位置、关系、接触、视线、遮挡、光源、景深
    │     └── prompt_11 = tag_block + nltags_block
    │
    ├── 负向动态组装
    │     └── 按脸、手、脚、多人、透视、持物、动态动作风险追加
    │
    ▼
comfyui-manager
    │
    ├── validate
    ├── submit
    └── run / cache（仅用户要求时）
```

核心原则：不要把普通创作判断写死；只把会导致 Anima 或 workflow 明确失败的边界写死。

---

## 工作流说明

| 工作流 ID                                   | 用途                          | LoRA                                |
| ------------------------------------------- | ----------------------------- | ----------------------------------- |
| `anima-txt2img-aesthetic-lora`              | **默认生图**                  | 双美学 LoRA + TeaCache + RTX VSR 2x |
| `anima-txt2img-base`                        | 基础版（无 LoRA，对比测试用） | 无                                  |
| `anima-txt2img-aesthetic-lora-enhancer`     | 增强版                        | 美学 LoRA + 增强节点                |
| `anima-txt2img-aesthetic-lora-fixed`        | 固定参数版                    | 双美学 LoRA                         |
| `anima-txt2img-aesthetic-lora-artist-mixer` | **画师融合**                  | 双美学 LoRA + AnimaArtistMixer      |

## 工作流类型

| 类型             | 处理方式                                          | 说明                              |
| ---------------- | ------------------------------------------------- | --------------------------------- |
| 文生图           | `comfyui-animatool`                               | 默认入口，生成 prompt + args      |
| 文生图 + 双 LoRA | `local/anima-txt2img-aesthetic-lora`              | 当前默认工作流                    |
| 裸模型对比       | `local/anima-txt2img-base`                        | 用于排障或对比测试                |
| 画师融合         | `local/anima-txt2img-aesthetic-lora-artist-mixer` | 仅用户明确要求融合时使用          |
| 批量             | 单 prompt 用 `batch_size`，多 prompt 分 job       | 不把多个不同主题塞进同一个 prompt |
| 随机 / 抽卡      | `danbooru-tags --random`                          | 先抽候选，再由 animatool 组装     |
| 图生图           | 暂不混入默认链路                                  | 后续可独立 skill 化               |

---

## 🐍 Python 脚本说明

`danbooru-tags/` 目录中包含以下 Python 脚本，**仅用于首次初始化标签索引**，日常生图不需要运行：

| 脚本              | 作用                                            | 运行时机                 |
| ----------------- | ----------------------------------------------- | ------------------------ |
| `build_index.py`  | 读取 `anima-1.0.csv` 构建 `tags_index.json`     | 首次克隆后 or CSV 更新后 |
| `sqlite_index.py` | 读取 `tags_index.json` 构建 `tags_index.sqlite` | `build_index.py` 之后    |
| `tag_groups.py`   | 标签分组定义，被上述脚本引用                    | 无需单独运行             |

**首次初始化：**

```powershell
cd comfyui-good-anima/danbooru-tags
python build_index.py
python sqlite_index.py
```

> 仓库已包含预构建的 `tags_index.sqlite` 和 `tags_index.json`，大多数情况下跳过此步也可直接使用。

---

## 🦀 Rust CLI 说明

`danbooru-tags/bin/danbooru-tags.exe` 是本项目的核心标签检索工具，**已预编译为 Windows 可执行文件**，无需安装 Rust 或编译即可使用。

- ✅ **直接使用** — `.exe` 已包含在 `bin/` 目录，clone 后立即可用
- ✅ **源码已包含** — `danbooru-tags/rust-cli/` 包含 Rust 源码与 `Cargo.toml`
- ✅ **构建产物不提交** — `rust-cli/target/` 保持忽略，只提交源码、`Cargo.toml` 和 `Cargo.lock`

---

## ✅ 验证方式

提交前建议执行以下检查：

```powershell
# Rust CLI
Push-Location ".\danbooru-tags\rust-cli"
cargo test
Pop-Location

# Skill 元数据
$env:PYTHONUTF8="1"
python "C:\Users\12971\skills\.system\skill-creator\scripts\quick_validate.py" ".\comfyui-animatool"
python "C:\Users\12971\skills\.system\skill-creator\scripts\quick_validate.py" ".\danbooru-tags"
python "C:\Users\12971\skills\.system\skill-creator\scripts\quick_validate.py" ".\comfyui-manager"

# 工作流执行脚本语法
node --check ".\comfyui-manager\workspace\run_workflow_args.js"
```

`comfyui-skill-cli` 升级后，先执行：

```powershell
comfyui-skill deps check local/anima-txt2img-aesthetic-lora
node ".\comfyui-manager\workspace\run_workflow_args.js" validate local/anima-txt2img-aesthetic-lora ".\comfyui-manager\workspace\args_sample.json"
```

将 `args_sample.json` 替换为实际准备好的 args 文件。确认 validate / submit 行为正常后再进入正式生图。

---

## 参考链接

- **模型**：[circlestone-labs/Anima](https://huggingface.co/circlestone-labs/Anima) — 官方模型页
- **ComfyUI**：[comfyanonymous/ComfyUI](https://github.com/comfyanonymous/ComfyUI)
- **ComfyUI Manager**：[ltdrdata/ComfyUI-Manager](https://github.com/ltdrdata/ComfyUI-Manager)
- **ComfyUI Skill CLI**：[HuangYuChuh/ComfyUI_Skill_CLI](https://github.com/HuangYuChuh/ComfyUI_Skill_CLI) — `pip install comfyui-skill-cli` ([PyPI](https://pypi.org/project/comfyui-skill-cli/))
- **Danbooru**：[danbooru.donmai.us](https://danbooru.donmai.us/) — 标签系统

---

## 许可证

GPLv3 — 详见 [LICENSE](LICENSE) 文件。

---

## 致谢

### 核心组件

特别感谢 [**HuangYuChuh**](https://github.com/HuangYuChuh) 开发的 [ComfyUI_Skill_CLI](https://github.com/HuangYuChuh/ComfyUI_Skill_CLI)。

这个 CLI 工具是本项目能够运转的核心基石。它提供了一套优雅简洁的命令行接口，让 AI 编程助手无需直接处理 ComfyUI 的 HTTP API 调用、无需手动拼接 prompt JSON、无需操心队列管理和模型路径适配，就能像操作本地工具一样自然地与 ComfyUI 交互。没有这个项目，我们的 AI Agent Skills 就无法落地执行，整个工作流也就失去了最后一环。

### 节点与加速

感谢 [**BlackSnowSkill**](https://github.com/BlackSnowSkill) 开发的 [ANIMA_BOOSTER](https://github.com/BlackSnowSkill/ANIMA_BOOSTER) 和 [ComfyUI-BSS_FLSampler](https://github.com/BlackSnowSkill/ComfyUI-BSS_FLSampler)。ANIMA_BOOSTER 提供了 AnimaBoosterLoader 节点，让模型加载与 Sage Attention 加速成为可能；它的 AnimaArtistPack 和 AnimaArtistCrossAttn 节点更是画师多风格融合的关键。FLSampler 则为采样过程带来了 Foveated Latent Sampling 技术，在提升细节清晰度的同时对模型进行二次增噪和加速优化。没有这些节点，Anima 模型的潜力就无法被充分释放。

感谢 [**Comfy-Org**](https://github.com/Comfy-Org) 维护的 [Nvidia_RTX_Nodes_ComfyUI](https://github.com/Comfy-Org/Nvidia_RTX_Nodes_ComfyUI)（老黄的 RTX VSR 节点）。它让图片放大变得极快且高质量，在保持画质的同时大幅缩短了放大耗时，是出图流程中不可或缺的一环。

### 模型与 LoRA

感谢 [**KBlueLeaf**](https://huggingface.co/KBlueLeaf) 及 Anima 团队训练的 Anima base v1.0 模型。Anima 为二次元 AI 生图领域带来了一颗升起的新星，它在角色一致性、画风还原和构图理解上的出色表现，让本地 AI 绘图达到了前所未有的高度。

感谢 **CircleStone Labs & Comfy Org** 团队在 DiT 架构和 Danbooru 标签系统上的深耕，为社区提供了一个真正可用、可控、可本地部署的二次元生成模型。

感谢 [**CivitAI**](https://civitai.com) 社区贡献的 LoRA 模型作者们：

- [anima-highres-aesthetic-boost](https://civitai.red/models/2540444/anima-highresaesthetic-boost) — 高分辨率下的美学增强，让细节更加丰富自然
- [aesthetic-quality-modifiers-masterpiece](https://civitai.red/models/929497/aesthetic-quality-modifiers-masterpiece?modelVersionId=2961717) — 杰作品质修饰器，让整体画面完成度大幅提升

这两款美学 LoRA 是让 Anima 生图从"能看"走向"完善"的关键。

### 调度器

感谢 [**ClownsharkBatwing**](https://github.com/ClownsharkBatwing) 的 [RES4LYF](https://github.com/ClownsharkBatwing/RES4LYF) 节点包提供的 `beta57` 调度器，为本项目的默认采样配置提供了稳定且高质量的选择。

### 方法论

感谢 [**Perplexity Agents Team**](https://docs.perplexity.ai) — Skills 设计方法论参考。
感谢 [**NextLevelBuilder**](https://github.com/nextlevelbuilder/ui-ux-pro-max) — ui-ux-pro-max 蓝本参考。

衷心感谢以上所有开源作者和社区贡献者为 AI 创作生态做出的贡献。 ❤️
