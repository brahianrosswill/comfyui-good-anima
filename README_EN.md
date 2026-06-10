# ComfyUI Good Anima 🎨

> A collection of AI Agent Skills for ComfyUI + Anima anime-style image generation. The active mainline is v2mini: it removes multi-agent-style routing and keeps only the core Anima constraints, Danbooru tag validation, and ComfyUI execution chain, leaving more creative space to the user and the AI model.

---

🌐 **[中文版](./README.md)**

![Anima Base v1.0 preview](./samples/anima_base_v1_0-rella-sea-margatroid_marisa_00001_.png)

---

## Mainline Features

- **Back to basics**: v2mini no longer depends on master / composition-director / random-gen multi-layer routing. Anima generation enters through `comfyui-animatool`.
- **Creative space stays with the user and model**: Skills do not replace taste, composition sense, or character understanding. They only guard the hard boundaries that often fail in Anima workflows.
- **Must-keep facts**: Anima prompt order, tag/nltags separation, dual-LoRA quality prefix, dynamic negative prompts, workflow args, seed behavior, non-blocking `submit`, and PowerShell JSON encoding.
- **Hard-anchor validation**: Characters, series, artists, outfits, props, and other anchors are validated with `danbooru-tags` instead of guessed from memory.
- **Pure execution layer**: `comfyui-manager` only executes prepared workflows and args. It never writes prompts, chooses artists, or decides composition.
- **On-demand references**: Failure patterns and artist-style research stay in references and are loaded only when needed.

---

## Architecture

v2mini uses a three-part chain:

| Tier | Component | Role | Load Timing |
| --- | --- | --- | --- |
| **L1 — Entry** | `comfyui-animatool` | Visual brief, prompt assembly, conflict checks, args output | On Anima generation |
| **L2 — Validation** | `danbooru-tags` | Tag lookup, canonical validation, random candidates | When hard anchors are needed |
| **L3 — Execution** | `comfyui-manager` | validate / submit / run / troubleshooting / output caching | After args are ready |

The chain does not create route contracts or split user intent into excessive workflow layers. The model understands the image first; skills keep Anima and ComfyUI rules stable.

---

## Skill Structure

```
comfyui-good-anima/
├── README.md
├── README_EN.md
├── comfyui-animatool/
│   ├── SKILL.md                # Single Anima entry: visual brief, tag/nltags split, prompt + args
│   └── references/
│       ├── artist-style-research.md # Loaded only for artist style research
│       └── failure-patterns.md      # Loaded only for failed outputs / anatomy / attribution issues
├── danbooru-tags/
│   ├── SKILL.md                # Danbooru tag lookup and validation
│   ├── bin/danbooru-tags.exe   # Prebuilt Rust CLI
│   ├── anima-1.0.csv           # Main Anima tag index
│   ├── Anima-preview.csv
│   ├── Anima-preview-alternate.csv
│   ├── tags_index.json
│   ├── tags_index.sqlite
│   ├── *.py                    # Index build scripts
│   └── rust-cli/               # danbooru-tags Rust source
├── comfyui-manager/
│   ├── SKILL.md                # ComfyUI execution and operations
│   ├── workspace/              # workflow JSON + execution scripts
│   │   ├── config.json
│   │   ├── run_workflow_args.js
│   │   ├── cache_anima_outputs.js
│   │   └── data/
├── samples/
├── legacy/v1/                  # V1 archive, tracked for historical reference
├── legacy/V3/                  # V3 local sealed archive, not committed
└── LICENSE
```

### Version Archive Rules

- The active mainline is v2mini only: `comfyui-animatool`, `danbooru-tags`, and `comfyui-manager`.
- `legacy/v1/` is an early hard-constraint chain archive, kept for regression comparison, not used as the runtime entry.
- `legacy/V3/` is a local sealed archive. Do not commit it and do not use it as the skills root.
- New core rules go into the three main skills first; failure handling and artist research stay in `comfyui-animatool/references/`.

---

## Compatible AI Assistants

These Skills are designed for **AI Coding Agents** that can execute shell commands:

| Assistant              | Status          | Notes                                                                         |
| ---------------------- | --------------- | ----------------------------------------------------------------------------- |
| **🟢 Snow**            | ✅ Full Support | **Recommended for Chinese users** — native Skills system support, plug & play |
| **🟢 Claude Code**     | ✅ Full Support | Anthropic official CLI with shell execution                                   |
| **🟢 Codex**           | ✅ Full Support | Full-featured AI coding agent, fully compatible                               |
| **🟢 PI**              | ✅ Full Support | Lightweight AI coding agent, Skills system support                            |
| **🟢 OpenClaw**        | ✅ Supported    | Works with ComfyUI_Skill_CLI integrated agents                                |
| **🟡 Other AI Agents** | ✅ Full Support | Any agent capable of PowerShell/Shell commands                                |

> 💡 **Recommended: [Snow](https://snowcli.com/docs) — the best AI coding agent experience in China**, with native Skills system support, ComfyUI integration, and Chinese language optimization.

---

## 🔍 What is danbooru-tags and why is it needed?

**danbooru-tags** is the core retrieval infrastructure of this project. It's a Rust CLI tool that performs high-speed searches and anchor validation against the **official Anima tag index (anima-1.0.csv)**.

### Problems it solves

Anima is trained on the Danbooru tagging system — precise control requires using **valid Danbooru tags**. With millions of tags, manual memorization is impossible. danbooru-tags solves:

| Problem               | Without danbooru-tags                                             | With danbooru-tags                                                                     |
| --------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| **Artist validation** | "Use rella style" → AI doesn't know if `@rella` is valid          | `--group artist --prefix "@rella"` returns confirmed artist                            |
| **Character lookup**  | "立华奏" in Danbooru is `kanade tachibana` — AI might guess wrong | `--group character --keyword "kanade tachibana"` hits precisely                        |
| **Tag accuracy**      | "巫女服" is not a valid Danbooru tag                              | Decompose into `miko`, `hakama`, `wide sleeves` candidates                             |
| **Random selection**  | Can't randomly pick from valid tags                               | `--random N --json` returns candidates; generation fill uses `--random 5 --for-prompt` |
| **Batch queries**     | One query per tag, slow and inefficient                           | `--batch-file` handles 12-16 queries at once, 8 threads                                |

### How it works

```
anima-1.0.csv (official index)
       ↓
 build_index.py + sqlite_index.py (build index)
       ↓
tags_index.sqlite (fast local index)
       ↓
 bin/danbooru-tags.exe (Rust CLI)
       ↓
 AI agent queries via --group / --random / --batch-file
 obtains confirmed_tags / candidate_tags for prompt assembly
```

### Is it essential?

**Yes.** Without danbooru-tags, the AI agent cannot verify artist names, check character tag spelling, or ensure randomly selected tags are within Anima's comprehension. The entire generation pipeline becomes "blind prompting, gambling on outputs" — losing all precision control.

---

## 🖼️ Sample Gallery

Example images generated with ComfyUI Good Anima + Anima base v1.0 (artist: rella):

| Image                                                                                      | Description                                                               |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| ![Komachi & Eiki](samples/anima_base_v1_0-rella-flw-onozuka_komachi_shiki_eiki_00001_.png) | Touhou Project — Onozuka Komachi & Shiki Eiki, Flower Viewing theme       |
| ![Yoshika & Seiga](samples/anima_base_v1_0-rella-inc-miyako_yoshika_kaku_seiga_00001_.png) | Touhou Project — Miyako Yoshika & Kaku Seiga, Ten Desires theme           |
| ![Yukari & Ran](samples/anima_base_v1_0-rella-pcb-yakumo_yukari_ran_yakumo_00001_.png)     | Touhou Project — Yakumo Yukari & Yakumo Ran, Perfect Cherry Blossom theme |

---

## 🖥️ System Requirements

| Dependency            | Version              | Notes                                                        |
| --------------------- | -------------------- | ------------------------------------------------------------ |
| **OS**                | Windows 10/11        | PowerShell 5.x+, uses Windows PowerShell syntax              |
| **ComfyUI**           | Latest               | Image generation backend                                     |
| **comfyui-skill-cli** | Latest               | ⚠️ **Core dependency — bridge between AI agent and ComfyUI** |
| **Node.js**           | 18+                  | For workflow execution scripts                               |
| **Python**            | 3.10+                | Only for tag index initialization, not needed for daily use  |
| **NVIDIA GPU**        | 8GB+ VRAM            | 12GB+ recommended, for Anima inference and RTX VSR upscaling |
| **CUDA**              | 12.8+                | GPU acceleration required                                    |
| **PyTorch**           | CUDA 12.8 compatible | Use with xformers 0.0.3.0                                    |
| **xformers**          | 0.0.3.0              | Memory optimization                                          |

### ComfyUI Startup Recommendation

Enable Sage Attention mode for best performance (requires ANIMA_BOOSTER):

```powershell
python main.py --use-sage-attention
```

Or add `--use-sage-attention` to ComfyUI startup parameters. The AnimaBoosterLoader node can also set `sage_attention` to `enabled`.

> **Note:** Default sampler uses `dpmpp_2m_sde_gpu` + `beta57` scheduler. `beta57` comes from the [RES4LYF](https://github.com/ClownsharkBatwing/RES4LYF) node pack — install it separately. Alternatives: `beta` or `ddim_uniform`.

---

## ⚡ Core Dependency: comfyui-skill CLI

**The most important component in the entire pipeline.** Without it, AI coding assistants (Snow / Codex) cannot communicate with local ComfyUI or execute workflows.

| Project      | Link                                                                              |
| ------------ | --------------------------------------------------------------------------------- |
| GitHub Repo  | [HuangYuChuh/ComfyUI_Skill_CLI](https://github.com/HuangYuChuh/ComfyUI_Skill_CLI) |
| PyPI Package | [comfyui-skill-cli](https://pypi.org/project/comfyui-skill-cli/)                  |

```powershell
pip install comfyui-skill-cli
```

> After installation, the AI agent can use the `comfyui-skill` command to list models, import workflows, generate images, and manage queues. **It's not limited to Anima — any ComfyUI workflow (Guanghui, SDXL, FLUX, image editing, video generation, etc.) can be orchestrated through it.**

---

## 📦 Model Installation

Place the following model files in ComfyUI's `models/` directory:

### Base Model (UNet)

| File                          | Location                           | Size     | Source                                                                  |
| ----------------------------- | ---------------------------------- | -------- | ----------------------------------------------------------------------- |
| `anima-base-v1.0.safetensors` | `ComfyUI/models/diffusion_models/` | ~12.2 GB | [circlestone-labs/Anima](https://huggingface.co/circlestone-labs/Anima) |

### CLIP (Text Encoder) & VAE

| File                          | Location                        |
| ----------------------------- | ------------------------------- |
| `qwen_3_06b_base.safetensors` | `ComfyUI/models/text_encoders/` |
| `qwen_image_vae.safetensors`  | `ComfyUI/models/vae/`           |

### LoRAs (Dual Aesthetic Enhancement)

| File                                        | Location                | Purpose                                                                                                                                                                                                                                                             |
| ------------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `anima-highres-aesthetic-boost.safetensors` | `ComfyUI/models/loras/` | Official LoRA — primarily for stable high-resolution (1536-2048px) generation, aesthetic boost is subtle. [CivitAI](https://civitai.red/models/2540444/anima-highresaesthetic-boost)                                                                                |
| `anima-base-1-masterpiece-v51.safetensors`  | `ComfyUI/models/loras/` | Aesthetic quality modifier, trigger words: `masterpiece` `very aesthetic`. Author's recommended structure: `masterpiece, best quality, very aesthetic`. [CivitAI](https://civitai.red/models/929497/aesthetic-quality-modifiers-masterpiece?modelVersionId=2961717) |

> **Model Source**: [circlestone-labs/Anima](https://huggingface.co/circlestone-labs/Anima) — jointly released by CircleStone Labs and Comfy Org. Training data cut-off: September 2025.

### Quality Prefix

The default workflow uses dual aesthetic LoRAs. The `masterpiece-v51` LoRA is trained on PonyV7 aesthetic scoring and **must** use the following prefix:

```text
masterpiece, very aesthetic, best quality, score_9, score_8, highres, absurdres, newest, year 2025, nsfw
```

**Alternative** — bare model (no LoRA, comparison testing only):

```text
masterpiece, best quality, score_7, safe
```

> ⚠️ The quality prefix is bound to the LoRA stack. Substituting `score_7` into the LoRA workflow will degrade `masterpiece-v51` effectiveness. The HuggingFace page describes the bare model; this project uses the enhanced workflow.

### Sampler & Scheduler

Default workflows depend on FLSamplerV4 + RES4LYF custom nodes:

| Component     | Default                  | Dependency         |
| ------------- | ------------------------ | ------------------ |
| Sampler       | `dpmpp_2m_sde_gpu`       | FLSamplerV4 node   |
| Scheduler     | `beta57`                 | RES4LYF node       |
| Steps         | 30 (40 for high quality) | —                  |
| CFG           | 4.5 (range 4–5)          | —                  |
| SageAttention | Enabled                  | AnimaBoosterLoader |

If RES4LYF is unavailable, fall back to `beta` or `ddim_uniform`. The bare model uses `er_sde` + `simple` (per official documentation).

---

## 🔌 Required Custom Nodes

Install the following nodes in ComfyUI's `custom_nodes/` directory:

| Node                        | Purpose                                                                 | Install Location                                                                                |
| --------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| **AnimaBoosterLoader**      | Anima model loader + SageAttention (auto-fallback) + JIT compilation    | [BlackSnowSkill/ANIMA_BOOSTER](https://github.com/BlackSnowSkill/ANIMA_BOOSTER)                 |
| **FLS_SamplerV4**           | Foveated Latent Sampling for enhanced detail                            | [BlackSnowSkill/ComfyUI-BSS_FLSampler](https://github.com/BlackSnowSkill/ComfyUI-BSS_FLSampler) |
| **AnimaTeaCache**           | TeaCache acceleration                                                   | [ComfyUI-TeaCache](https://github.com/daraskme/comfy_anima_tea_cache)                           |
| **AnimaArtistPack**         | Multi-artist fusion (artist mixer only)                                 | Included in ANIMA_BOOSTER                                                                       |
| **AnimaArtistCrossAttn**    | Cross-attention artist mixing (artist mixer only)                       | Included in ANIMA_BOOSTER                                                                       |
| **RES4LYF**                 | ⚠️ **Required — provides `beta57` scheduler, used by default workflow** | [ClownsharkBatwing/RES4LYF](https://github.com/ClownsharkBatwing/RES4LYF)                       |
| **RTXVideoSuperResolution** | NVIDIA RTX VSR 2× upscaling (NVIDIA GPUs only)                          | [Comfy-Org/Nvidia_RTX_Nodes_ComfyUI](https://github.com/Comfy-Org/Nvidia_RTX_Nodes_ComfyUI)     |

**Quick Install (PowerShell):**

```powershell
cd ComfyUI/custom_nodes
git clone https://github.com/BlackSnowSkill/ANIMA_BOOSTER.git
git clone https://github.com/BlackSnowSkill/ComfyUI-BSS_FLSampler.git
git clone https://github.com/daraskme/comfy_anima_tea_cache.git
git clone https://github.com/ClownsharkBatwing/RES4LYF.git
git clone https://github.com/Comfy-Org/Nvidia_RTX_Nodes_ComfyUI.git
```

After installation, restart ComfyUI and verify: `comfyui-skill deps check local/anima-txt2img-aesthetic-lora`

---

## ⚙️ Quick Start

### 1. Install models

Download model files according to the tables above and place them in the correct ComfyUI `models/` directories.

### 2. Install custom nodes

Install the custom nodes listed above through ComfyUI Manager or manual clone.

### 3. Load the skill pack

Place this repository in your AI assistant skills directory, or make sure the skills root directly contains:

```text
comfyui-animatool/
danbooru-tags/
comfyui-manager/
```

### 3b. Set the skills root (required)

`COMFYUI_GOOD_ANIMA_SKILLS_DIR` must point to the installed skills root.

```powershell
[System.Environment]::SetEnvironmentVariable(
    "COMFYUI_GOOD_ANIMA_SKILLS_DIR",
    "C:\Users\12971\skills",
    "User"
)
$env:COMFYUI_GOOD_ANIMA_SKILLS_DIR = "C:\Users\12971\skills"
```

Do not point it to `legacy/v1`, `legacy/V3`, or experimental copies.

### 4. Import workflows

```powershell
cd comfyui-good-anima/comfyui-manager/workspace
comfyui-skill workflow import data/anima-txt2img-aesthetic-lora.json --check-deps --json
comfyui-skill workflow import data/anima-txt2img-aesthetic-lora-artist-mixer.json --check-deps --json
comfyui-skill workflow import data/anima-txt2img-base.json --check-deps --json
```

### 5. Start a conversation

Simply describe what you want to generate:

```text
"Generate Kanade Tachibana from Angel Beats!"   → standard generation
"Give me a random artist image"                 → danbooru-tags random candidates → animatool assembly
"Fuse wlop and sakimichan art styles"           → Artist Mixer workflow
"Generate 10 different poses"                   → multiple prompts or batch_size variants
```

v2mini does not force the user to pre-write a complete prompt. The user gives the idea, the AI forms the image, and the skills keep tags, nltags, args, and workflows stable.

---

## 🧠 Generation Flow

```
User Intent
    │
    ▼
comfyui-animatool
    │
    ├── Visual brief
    │     └── subject / scene container / relation / camera / canvas / light / nltags
    │
    ├── danbooru-tags
    │     └── character / series / artist / outfit / prop / pose hard-anchor validation
    │
    ├── Prompt assembly
    │     ├── tag_block: quality, year, safety, character, series, artist, appearance, props
    │     ├── nltags_block: position, relation, contact, gaze, occlusion, light, depth
    │     └── prompt_11 = tag_block + nltags_block
    │
    ├── Dynamic negative prompt
    │     └── face, hands, feet, multi-character, perspective, held props, action risks
    │
    ▼
comfyui-manager
    │
    ├── validate
    ├── submit
    └── run / cache only when requested
```

Core principle: do not hard-code ordinary creative judgment; hard-code only boundaries that clearly break Anima or the workflow.

---

## 🔧 Available Workflows

| Workflow ID                                       | Purpose                         | LoRA                                        |
| ------------------------------------------------- | ------------------------------- | ------------------------------------------- |
| `local/anima-txt2img-aesthetic-lora`              | **Default generation**          | Dual aesthetic LoRA + TeaCache + RTX VSR 2× |
| `local/anima-txt2img-base`                        | Base version (no LoRA, testing) | None                                        |
| `local/anima-txt2img-aesthetic-lora-enhancer`     | Enhanced                        | Aesthetic LoRA + enhancer nodes             |
| `local/anima-txt2img-aesthetic-lora-fixed`        | Fixed parameters                | Dual aesthetic LoRA                         |
| `local/anima-txt2img-aesthetic-lora-artist-mixer` | **Artist fusion**               | Dual aesthetic LoRA + AnimaArtistMixer      |

---

## 🐍 Python Scripts (danbooru-tags)

These scripts in `danbooru-tags/` are **only needed for initial tag index setup**, not for daily use:

| Script            | Purpose                                            | When to Run                 |
| ----------------- | -------------------------------------------------- | --------------------------- |
| `build_index.py`  | Read `anima-1.0.csv` → build `tags_index.json`     | After cloning or CSV update |
| `sqlite_index.py` | Read `tags_index.json` → build `tags_index.sqlite` | After build_index.py        |
| `tag_groups.py`   | Tag group definitions (imported by above scripts)  | No manual run needed        |

**First-time initialization:**

```powershell
cd comfyui-good-anima/danbooru-tags
python build_index.py
python sqlite_index.py
```

> Pre-built `tags_index.sqlite` and `tags_index.json` are included in the repo. Most users can skip this step.

---

## 🦀 Rust CLI (danbooru-tags)

The `danbooru-tags/bin/danbooru-tags.exe` is the core tag retrieval tool, **pre-compiled for Windows** — no Rust installation or compilation needed.

- ✅ **Ready to use** — `.exe` included in `bin/`, works immediately after clone
- ✅ **Source included** — `danbooru-tags/rust-cli/` contains the Rust source and `Cargo.toml`
- ✅ **Build outputs excluded** — `rust-cli/target/` stays ignored; commit source, `Cargo.toml`, and `Cargo.lock`

---

## 📚 References

- **Model**: [circlestone-labs/Anima](https://huggingface.co/circlestone-labs/Anima) — official model page
- **ComfyUI**: [comfyanonymous/ComfyUI](https://github.com/comfyanonymous/ComfyUI)
- **ComfyUI Manager**: [ltdrdata/ComfyUI-Manager](https://github.com/ltdrdata/ComfyUI-Manager)
- **ComfyUI Skill CLI**: [HuangYuChuh/ComfyUI_Skill_CLI](https://github.com/HuangYuChuh/ComfyUI_Skill_CLI) — `pip install comfyui-skill-cli` ([PyPI](https://pypi.org/project/comfyui-skill-cli/))
- **Danbooru**: [danbooru.donmai.us](https://danbooru.donmai.us/) — tag system
- **ANIMA_BOOSTER**: [BlackSnowSkill/ANIMA_BOOSTER](https://github.com/BlackSnowSkill/ANIMA_BOOSTER)
- **FLSamplerV4**: [BlackSnowSkill/ComfyUI-BSS_FLSampler](https://github.com/BlackSnowSkill/ComfyUI-BSS_FLSampler)
- **TeaCache**: [ComfyUI-TeaCache](https://github.com/daraskme/comfy_anima_tea_cache)
- **RES4LYF**: [ClownsharkBatwing/RES4LYF](https://github.com/ClownsharkBatwing/RES4LYF) — `beta57` scheduler
- **RTX Nodes**: [Comfy-Org/Nvidia_RTX_Nodes_ComfyUI](https://github.com/Comfy-Org/Nvidia_RTX_Nodes_ComfyUI)

---

## 📄 License

GNU General Public License v3.0

This project is open-sourced under GPLv3. Anyone may freely use, modify, and distribute the code, but **modified versions must also be open-sourced under GPLv3** — closed-source commercial use is not permitted. See [LICENSE](./LICENSE) for details.

---

## 🙏 Acknowledgments

### Core Component

Special thanks to [**HuangYuChuh**](https://github.com/HuangYuChuh) for [ComfyUI_Skill_CLI](https://github.com/HuangYuChuh/ComfyUI_Skill_CLI). This CLI is the foundation of the entire pipeline — it provides an elegant command-line interface that lets AI coding assistants interact with ComfyUI naturally, without dealing with HTTP API calls, manual prompt JSON construction, queue management, or model path configuration. Without this project, our AI Agent Skills would not be executable.

### Nodes & Acceleration

Thanks to [**BlackSnowSkill**](https://github.com/BlackSnowSkill) for [ANIMA_BOOSTER](https://github.com/BlackSnowSkill/ANIMA_BOOSTER) and [ComfyUI-BSS_FLSampler](https://github.com/BlackSnowSkill/ComfyUI-BSS_FLSampler). ANIMA_BOOSTER provides the AnimaBoosterLoader for model loading and Sage Attention acceleration, plus AnimaArtistPack/AnimaArtistCrossAttn for multi-artist fusion. FLSampler brings Foveated Latent Sampling for enhanced detail with noise injection and acceleration. Without these nodes, Anima's potential cannot be fully realized.

Thanks to [**Comfy-Org**](https://github.com/Comfy-Org) for [Nvidia_RTX_Nodes_ComfyUI](https://github.com/Comfy-Org/Nvidia_RTX_Nodes_ComfyUI) (the RTX VSR node). It makes image upscaling extremely fast while maintaining quality — an indispensable part of the generation pipeline.

### Model & LoRAs

Thanks to [**CircleStone Labs**](https://huggingface.co/circlestone-labs) and **Comfy Org** for the Anima model research and release. Anima is a rising star in the AI anime image generation landscape — its outstanding performance in character consistency, art style fidelity, and composition understanding has brought local AI illustration to an unprecedented level. Without this model, the entire ComfyUI anime generation ecosystem would be missing its most important piece.

Thanks to [**KBlueLeaf**](https://huggingface.co/KBlueLeaf) for early Anima research and release that laid the foundation.

Thanks to the [**CivitAI**](https://civitai.com) community LoRA authors:

- [anima-highres-aesthetic-boost](https://civitai.red/models/2540444/anima-highresaesthetic-boost) — High-resolution aesthetic enhancement
- [aesthetic-quality-modifiers-masterpiece](https://civitai.red/models/929497/aesthetic-quality-modifiers-masterpiece?modelVersionId=2961717) — Masterpiece quality modifier

These two aesthetic LoRAs are the key to elevating Anima outputs from "passable" to "polished" — without them, image quality and completion would be significantly diminished.

### Scheduler

Thanks to [**ClownsharkBatwing**](https://github.com/ClownsharkBatwing) for the [RES4LYF](https://github.com/ClownsharkBatwing/RES4LYF) node pack providing the `beta57` scheduler, which offers a stable, high-quality default sampling configuration for this project.

### Architecture & Design

Thanks to the [**Perplexity Agents Team**](https://www.perplexity.ai) for the Skills design methodology and progressive disclosure architecture. Thanks to **NextLevelBuilder** for the ui-ux-pro-max blueprint.

❤️ Heartfelt thanks to all open-source authors and community contributors for their contributions to the AI creative ecosystem.
