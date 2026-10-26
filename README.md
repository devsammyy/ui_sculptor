# UI-Sculptor

Voice-driven UI development with AI-powered code synthesis. Sculpt your interface by speaking, clicking, and watching AI transform your intent into production-ready React components.

```
                                  +--------------------------------------------------------+
                                  |                    PRESENTATION LAYER                  |
                                  |  Atomic Design System (Atoms -> Molecules -> Organisms)|
                                  +--------------------------------------------------------+
                                                              |
                                                              v (Action Dispatches)

+-----------------------------------------------------------------------------------------------------------------------------------+
|                                                  HEXAGONAL CORE (APPLICATION DOMAIN)                                              |
|                                                                                                                                   |
|  +-----------------------+       +---------------------------+       +-----------------------+       +--------------------------+ |
|  |    Perception Port    | --->  |    AST Mutation Engine    | --->  |  Code Synthesis Port  | --->  |    Checkpoint / Undo     | |
|  | (Spatial Coord + Mic) |       | (Babel Visitor + ts-morph)|       |  (Strategy Pattern)   |       |    (Command Pattern)     | |
|  +-----------------------+       +---------------------------+       +-----------------------+       +--------------------------+ |
|                                                                                                                                   |
+-----------------------------------------------------------------------------------------------------------------------------------+
       | (Adapter)                         | (Adapter)                         | (Adapter)                         | (Adapter)
       v                                   v                                   v                                   v
+------------------------+         +------------------------+         +----------------------+         +------------------------+
|       SAM 3.1 &        |         |   Local File System    |         |  Open-Weight Engine  |         |    Sandpack Virtual    |
|   Muse Voice Driver    |         | (fs/promises Engine)   |         |   (vLLM / Glimmer)   |         |   State (Cloud Demo)   |
+------------------------+         +------------------------+         +----------------------+         +------------------------+
```

---

## 1. High-Level Architecture: Hexagonal (Ports & Adapters)

To ensure UI-Sculptor operates seamlessly in both local environments (modifying files directly on disk) and hosted cloud sandbox demos (zero disk writes) without altering core domain logic, the application is strictly partitioned into Inbound/Outbound Ports and pluggable Adapters:

### A. Inbound Ports (Driving Interfaces)
- **`PerceptionPort`**: Ingests viewport interaction coordinates (normalized $0.0-1.0$), audio stream buffers, and viewport dimensions to resolve concrete UI selection events.
- **`SculptCommandPort`**: Coordinates user intent, AST parsing, code synthesis strategies, and atomic patch commits.

### B. Outbound Ports (Driven Interfaces)
- **`CodeSynthesisStrategy` / `CodeGeneratorPort`**: Contract for generating code patches from spatial context and user intent.
- **`FileSystemPort`**: Decouples persistence (`DiskFileSystemAdapter` vs `MemoryFileSystemAdapter`).
- **`TelemetryPort`**: Emits real-time agent execution milestones to the UI and log drawers.

### C. Adapters
- **Storage Adapters**:
  - `DiskFileSystemAdapter`: Uses Node.js `fs/promises` for local file mutations.
  - `MemoryFileSystemAdapter`: In-memory virtual file tree for sandboxed cloud voting and demo sessions.
- **Model Adapters**:
  - `OpenWeightModelAdapter`: Interacts with local **Muse Spark Open 7B** instances via OpenAI-compatible endpoints (`/v1/chat/completions`) using vLLM or Ollama.
  - `HostedMetaApiAdapter`: Interacts with Meta Model APIs for **SAM 3.1**, **Muse Wonder 1.0**, and **Muse Voice**.
  - `ConsoleTelemetryAdapter`: Event pub-sub system broadcasting agent execution telemetry.

---

## 2. Applied Software Design Patterns (GoF)

### A. Strategy Pattern (Pluggable Model Execution)
Allows dynamic switching between verified local open-weight inference and hosted cloud models based on environment flags and verification checks:
- **`OpenWeightSparkStrategy`**: Meta Open-Weight Model (**Muse-Spark-Open-7B**) hosted on vLLM/Ollama for hackathon open-weight compliance.
- **`HostedMetaStrategy`**: Hosted multimodal endpoint (**Muse-Wonder-1.0**) for massive context synthesis.
- **`SAM31Strategy`**: Segment Anything Model 3.1 integration for zero-shot element mask extraction.
- **`MuseVoiceStrategy`**: Speech-to-intent transcription driver.

### B. Command Pattern (Undo/Redo & Rollback Engine)
Every visual modification is encapsulated as a reversible Command object:
- **`MutateComponentCommand`**: Preserves exact before/after file snapshots for non-destructive code mutations.
- **`CreateFileCommand` / `DeleteFileCommand`**: Manages file lifecycle reversibly.
- **`CompositeCommand`**: Transactional batch execution where rollback traverses in reverse order without array mutation.
- **`CommandHistory`**: Ring-buffer checkpoint engine (configurable capacity) with complete undo/redo capabilities.

### C. Pipeline & Chain of Responsibility (Autonomous Self-Healing Loop)
Code generation flows through a deterministic validation chain before touching disk:
1. **`SyntaxValidator`**: Babel-powered TypeScript & TSX parsing and location pinpointing.
2. **`SecurityValidator`**: Rejects dangerous imports (`fs`, `child_process`, `net`, `crypto`) and blocks `eval()`, `new Function()`, or inline `<script>` tags.
3. **`ExportIntegrityValidator`**: Guarantees named and default component exports are preserved across mutations.
4. **`TypeValidator`**: Validates React/TypeScript type safety.
5. **Self-Healing Loop**: If errors occur, structured diagnostic telemetry feeds back to the synthesis strategy up to 3 times before graceful degradation.

### D. State Management (CQRS + Optimistic UI)
Built with **Zustand** adhering to Command-Query Responsibility Segregation:
- **Commands**: Dispatches click targets, triggers voice capture, applies AST patches, and rolls back checkpoints.
- **Queries**: Read-only selectors for normalized coordinates, active SAM 3.1 mask polygons, agent logs, and diff states.

---

## 3. Frontend Architecture: Atomic Design

Structured according to Brad Frost's Atomic Design methodology:

```
src/components/
├── atoms/                       # Stateless visual primitives
│   ├── AudioWaveformIndicator.tsx
│   ├── CoordinateBadge.tsx
│   ├── DiffGutter.tsx
│   ├── MaskCanvasPin.tsx
│   └── ModelBadge.tsx
│
├── molecules/                   # Interactive 2-3 atom compositions
│   ├── PresetPromptChip.tsx
│   ├── PushToTalkTrigger.tsx
│   ├── TargetSelectorCrosshair.tsx
│   └── VerificationPill.tsx
│
├── organisms/                   # Complex panels bound to domain state
│   ├── AgentLogDrawer.tsx
│   ├── AstDiffViewer.tsx
│   ├── QuickActionRibbon.tsx
│   ├── Scene3DTarget.tsx
│   └── ViewportOverlay.tsx
│
├── templates/                   # Structural page layouts
│   └── StudioLayout.tsx
│
└── pages/                       # Route entry points
    └── StudioPage.tsx
```

---

## 4. Meta Model Stack & Hackathon Compliance

UI-Sculptor satisfies open-weight compliance requirements:

| Component | Model / Engine | Deployment | Role |
| :--- | :--- | :--- | :--- |
| **Code Synthesis** | **Muse-Spark-Open-7B** | Local (vLLM / Ollama) | AST-aware React component synthesis |
| **Multimodal Synthesis** | **Muse-Wonder-1.0** | Hosted Meta API | Extended context synthesis fallback |
| **Spatial Segmentation** | **SAM 3.1** | Local / Hosted Meta API | Viewport coordinate to UI element bounding box |
| **Speech Transcription** | **Muse-Voice-1.0** | Local / Hosted Meta API | Push-to-talk audio streaming to user intent |

### Verifying Model Infrastructure
Inspect model readiness by querying the built-in health endpoint:
```bash
curl http://localhost:3000/api/verify-model
```
Returns availability status and registered models for vLLM and Ollama.

---

## 5. Getting Started

### Prerequisites
- Node.js 20+
- pnpm (recommended)

### Installation
```bash
# Clone and install dependencies
git clone <repo-url>
cd ui-sculptor
pnpm install

# Configure environment
cp .env.example .env

# Start development server
pnpm dev
```

### Verification & Testing
Run the complete suite of tests and type checks:

```bash
# Type check (strict TypeScript)
pnpm type-check

# Run 48 unit and integration tests across 8 test suites
pnpm test

# Generate code coverage report
pnpm test:coverage

# Build optimized production bundle
pnpm build
```

---

## 6. API Route Contracts

- **`GET /api/verify-model`**: Probes local vLLM / Ollama endpoints to verify open-weight model availability.
- **`POST /api/perceive`**: Ingests viewport click/touch coordinates, screenshots, and optional microphone audio; returns SAM 3.1 element segmentation and transcribed intent.
- **`POST /api/sculpt`**: Full orchestration pipeline: coordinates perception -> AST synthesis -> self-healing validation -> atomic command commit.
- **`POST /api/rollback`**: Pops and reverts the last $N$ mutations from the command history.

---

## License
MIT
