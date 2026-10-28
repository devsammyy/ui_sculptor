# UI-Sculptor ⚡

> **Autonomous Multimodal Frontend Engineering Studio for React & 3D Web**  
> *Meta Global AI Developer Hackathon 2026 Submission*  
> **Tracks:** *Build for Your World* & *Push the Frontier*

[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14.2-black.svg)](https://nextjs.org/)
[![React Three Fiber](https://img.shields.io/badge/Three.js-R3F_9.0-purple.svg)](https://docs.pmnd.rs/react-three-fiber/)
[![Meta Model API](https://img.shields.io/badge/Meta_Model_API-Muse_Wonder_1.0_|_SAM_3.1_|_Muse_Voice-blueviolet.svg)](https://dev.meta.ai/)
[![Tests](https://img.shields.io/badge/Tests-49%2F49_Passed-brightgreen.svg)]()
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## Executive Summary

Frontend engineers spend over 40% of their day translating visual ideas into CSS, hunting down JSX hierarchies, and re-wiring component states. Traditional AI code generators (like V0 or Bolt) operate as "greenfield sandboxes" — they cannot connect to an existing local repository or surgically modify production files on disk without blowing away custom types, hooks, or styles.

**UI-Sculptor** is an autonomous, multimodal visual development studio. By unifying **Meta SAM 3.1** (visual element segmentation), **Meta Muse Voice Transcribe** (real-time push-to-talk speech perception), and **Meta Muse Wonder 1.0** (surgical AST code synthesis), UI-Sculptor allows developers to click any element, speak naturally, and mutate their codebase with verified, non-destructive AST diffs.

Furthermore, UI-Sculptor pushes the frontier beyond flat 2D rectangles with a **3D Spatial Studio** that raycasts directly into Three.js WebGL scenes, transforming geometries, materials, and cybernetic lighting rigs hands-free.

---

## Hackathon Problem Statements

### 1. Build for Your World
* **The Problem:** Frontend engineering workflows are fragmented between design tools (Figma), browser previews, and code editors. Making visual adjustments, tuning design tokens, and fixing color contrast requires tedious context switching.
* **Our Solution:** UI-Sculptor brings Meta’s multimodal models directly into the developer's everyday environment. Point at any live UI component on canvas, hold Spacebar to speak intent (*"Make this a high-contrast dark card with a 4-column KPI grid"*), and watch surgical AST mutations write directly to the local repository with instant rollback capabilities.

### 2. Push the Frontier
* **The Problem:** Web development is rapidly transitioning into spatial computing and 3D web experiences, but AI coding assistants remain trapped in flat text and 2D HTML.
* **Our Solution:** UI-Sculptor introduces the **3D Spatial WebGL Studio**. Developers interact with live Three.js 3D scenes via camera angle presets (Perspective, Front, Isometric, Top-down) and ground-plane raycasting. Meta's models understand 3D scene ASTs, synthesizing real WebGL meshes, metallic/translucent physical materials, and point-light rigs in real time.

---

## Meta Model Stack & Integration Architecture

UI-Sculptor directly consumes Meta's hosted Model API with zero dummy fallbacks in production paths:

| Capability | Model | Protocol / API Contract | Role in UI-Sculptor |
| :--- | :--- | :--- | :--- |
| **Visual Element Perception** | **SAM 3.1** | `POST https://api.meta.ai/v1/segment` | Resolves viewport $(x, y)$ coordinates to high-confidence bounding boxes & masks |
| **Real-time Voice Perception** | **Muse Voice Transcribe 1.0** | `POST https://api.meta.ai/v1/asr/transcribe` | Ingests 16kHz mono WAV audio chunks to extract natural language user intent |
| **AST Code Synthesis** | **Muse Wonder 1.0** | `POST https://api.meta.ai/v1/chat/completions` | Generates verified AST code patches for both 2D React and 3D Three.js components |
| **Open-Weight Compliance** | **Muse Spark Open 7B** | Local vLLM / Ollama (`/v1/chat/completions`) | Pluggable open-weight engine for air-gapped or local hackathon compliance |

```
                       ┌────────────────────────────────────────┐
                       │          MULTIMODAL PERCEPTION         │
                       │    Viewport Click (x, y) + Push-to-Talk│
                       └───────────────────┬────────────────────┘
                                           │
                    ┌──────────────────────┴──────────────────────┐
                    ▼                                             ▼
       ┌────────────────────────┐                    ┌────────────────────────┐
       │   Meta SAM 3.1 API     │                    │ Meta Muse Voice API    │
       │ Visual Segmentation    │                    │ 16kHz WAV Transcription│
       └────────────┬───────────┘                    └────────────┬───────────┘
                    │                                             │
                    └──────────────────────┬──────────────────────┘
                                           ▼
                       ┌────────────────────────────────────────┐
                       │    HEXAGONAL SYNTHESIS ORCHESTRATOR    │
                       │          (Babel AST Traversal)         │
                       └───────────────────┬────────────────────┘
                                           │
                                           ▼
                       ┌────────────────────────────────────────┐
                       │         Meta Muse Wonder 1.0           │
                       │      Surgical AST Code Generation      │
                       └───────────────────┬────────────────────┘
                                           │
                                           ▼
                       ┌────────────────────────────────────────┐
                       │       VALIDATION PIPELINE (GUARD)      │
                       │   Syntax + Security + Export Integrity │
                       └───────────────────┬────────────────────┘
                                           │
                          ┌────────────────┴────────────────┐
                          ▼                                 ▼
              [PASS: Atomic Disk Write]         [FAIL: Abort & Rollback]
              - MutateComponentCommand           - Return 422 Diagnostic
              - Update History JSON              - Keep Codebase Pristine
              - Hot-Reload Studio Canvas
```

---

## Core System Architecture

UI-Sculptor is engineered with **Hexagonal Architecture (Ports and Adapters)**, strict **Atomic Design**, and **GoF Behavioral Patterns**:

### 1. Hexagonal Domain & Pluggable Adapters
* **`PerceptionPort`**: Ingests normalized coordinates ($0.0 - 1.0$), audio buffers, and viewport dimensions.
* **`CodeSynthesisStrategy`**: Implements the Strategy Pattern between `HostedMetaStrategy` (Muse Wonder 1.0) and `OpenWeightSparkStrategy` (Muse Spark Open 7B).
* **`FileSystemPort`**: Decouples persistence into `DiskFileSystemAdapter` (local Node `fs/promises`) and `MemoryFileSystemAdapter` (sandboxed in-memory tree for cloud demos).

### 2. Autonomous Validation Pipeline (Self-Healing Gate)
Before any synthesized code touches disk, it must pass through the `ValidationPipeline`:
* **`SyntaxValidator`**: Full Babel parser pass ensuring zero unclosed tags, truncated expressions, or syntax errors.
* **`SecurityValidator`**: Blocks forbidden Node modules (`fs`, `child_process`, `net`) and rejects dangerous dynamic evaluations (`eval()`, `new Function()`).
* **`ExportIntegrityValidator`**: Enforces that default and named component exports remain intact across mutations.
* **`TypeValidator`**: Verifies TypeScript interface compatibility.

### 3. Reversible CQRS Command History (Undo/Redo Engine)
Every visual modification is an executable `MutateComponentCommand` implementing the Command Pattern:
* Preserves complete before/after snapshots of source code.
* Persists to `.ui-sculptor/history.json` for persistent multi-session rollbacks.
* Instant one-click rollback with zero build latency.

### 4. Interactive 3D Spatial Canvas
* Pure **Three.js** and **React Three Fiber** WebGL environment.
* Dynamic central geometry engine (Torus Knots, Cubes, Spheres, and faceted refractive Crystal Octahedrons).
* Ground-plane raycasting with interactive 3D coordinate target pins and laser beams.
* Multi-point cybernetic lighting rigs and orbiting data satellites.

### 5. Viewport-Clamped Design Tokens Engine
* **`TokenColorPicker`**: Portal-rendered color picker popover clamped within viewport bounds (`[16px, innerWidth - 260px]`).
* Curated 21-color design matrix (Primary Blues, Cyans, Emeralds, Ambers, Roses, and Obsidian Dark tones) with direct two-way hex binding.

---

## Component Structure (Atomic Design)

```
src/components/
├── atoms/                       # Stateless visual primitives
│   ├── AudioWaveformIndicator.tsx
│   ├── CoordinateBadge.tsx
│   ├── DiffGutter.tsx
│   └── ModelBadge.tsx
│
├── molecules/                   # Interactive compositions
│   ├── PushToTalkTrigger.tsx    # Hold-to-talk & click-to-toggle audio capture
│   ├── TargetSelectorCrosshair.tsx
│   └── TokenColorPicker.tsx     # Viewport-aware clamped color popover
│
├── organisms/                   # Complex panels bound to domain state
│   ├── AgentLogDrawer.tsx       # Live perception & reasoning milestones
│   ├── AstDiffViewer.tsx        # Unified & split syntax diff viewer
│   ├── QuickActionRibbon.tsx    # 1-click mutation presets (2D & 3D)
│   ├── Scene3DTarget.tsx        # Pure Three.js WebGL Spatial Studio
│   └── ViewportOverlay.tsx      # Precision click-to-coordinate layer
│
├── templates/                   # Structural page layouts
│   └── StudioLayout.tsx         # 3-pane responsive visual engineering studio
│
└── pages/                       # Route entry points
    └── StudioPage.tsx           # Live state rehydration & component switching
```

---

## Real-World Packaging Roadmap (`@ui-sculptor/*`)

UI-Sculptor is architected from day one to be consumed in existing commercial React applications:

```
packages/
├── @ui-sculptor/core     # AST parser, ValidationPipeline, Meta Model adapters
├── @ui-sculptor/react    # Embeddable <UISculptorStudio /> dev-overlay widget
└── @ui-sculptor/next     # Zero-config Next.js plugin (withUISculptor)
```

### Usage in an Existing React/Next.js Project
```tsx
// app/layout.tsx
import { UISculptorStudio } from "@ui-sculptor/react";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        {children}
        {process.env.NODE_ENV === "development" && (
          <UISculptorStudio endpoint="/api/sculptor" />
        )}
      </body>
    </html>
  );
}
```

---

## Quickstart & Installation

### Prerequisites
* **Node.js**: v20+
* **npm** or **pnpm**
* **Meta Model API Key**: Set in `.env` as `META_API_KEY`

### Setup
```bash
# 1. Clone repository
git clone https://github.com/babatundeadb/ui_sculptor.git
cd ui_sculptor

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Add your META_API_KEY=your_key_here

# 4. Start UI-Sculptor Studio
npm run dev
```
Open **`http://localhost:3000`** in your browser.

---

## Verification & Test Suite

UI-Sculptor includes comprehensive unit and integration test suites covering the perception layer, AST parser, validation pipeline, and audio conversion:

```bash
# Type check (strict TypeScript)
npm run type-check

# Run complete Jest test suite (49/49 passing across 9 suites)
npm test

# Production build check
npm run build
```

```
PASS src/__tests__/infrastructure/audio-converter.test.ts
PASS src/__tests__/core/code-synthesis.test.ts
PASS src/__tests__/infrastructure/babel-ast-parser.test.ts
PASS src/__tests__/infrastructure/file-system-adapters.test.ts
PASS src/__tests__/core/validation-pipeline.test.ts
PASS src/__tests__/core/perception.test.ts
PASS src/__tests__/hooks/sculpt-store.test.ts
PASS src/__tests__/core/strategies.test.ts
PASS src/__tests__/core/commands.test.ts

Test Suites: 9 passed, 9 total
Tests:       49 passed, 49 total
Snapshots:   0 total
Time:        4.82 s
```

---

## Submission Artifacts

- **Flagship Demo Video Script:** [`DEMO_VIDEO_SCRIPT.md`](./DEMO_VIDEO_SCRIPT.md) — 120-second walkthrough covering 2D sculpting, AST diff verification, and 3D WebGL spatial engineering.
- **Problem Statement Alignment:** Documented in [Section 2](#hackathon-problem-statements).
- **Core Engine Verification:** Strict AST validation guarantees zero file corruptions during AI synthesis.

---

## License

MIT License © 2026 Babatunde Adebayo. All rights reserved.
