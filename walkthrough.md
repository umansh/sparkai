# Walkthrough: Complete Full-Stack AI & Algorithm Lab (`algorithm_lab`) & Pedagogical Extensions

We have successfully implemented, extended, and verified the complete **SparkSchool AI & BKT Platform** across both backend and frontend, turning the system into an interactive, production-grade testbench for adaptive learning engineering.

---

## What We Built & Extended

### 1. Mathematical & Statistical Engine (`backend/app/core/multi_algorithm_engine.py`)
We implemented **6 distinct knowledge tracing algorithms** alongside our dynamic response-time modulated BKT:
- **Enhanced BKT (Response-Time Modulated)**: Explicit $P(G)$ and $P(S)$ separation with rapid-guessing heuristic penalties ($<1000\text{ms}$).
- **Item Response Theory (IRT 2PL/3PL)**: Psychometric logistic ability ($\theta$) estimation via gradient updates against item difficulty ($b$) and discrimination ($a$).
- **Deep Knowledge Tracing (KT-RNN Simulation)**: Recurrent hidden state vector updates capturing non-linear multi-skill memory dynamics and temporal attention discounts.
- **Elo Rating System (with Dynamic K-Factor)**: Pairwise competition between Student rating ($R_s$) vs. Question difficulty ($R_q$), scaling down $K$ during rapid guessing.
- **Performance Factors Analysis (PFA)**: Logistic regression cumulative model evaluating prior successes ($S$) versus failures ($F$).
- **Multi-Skill Joint Tracing (Bayesian Network DAG)**: Message passing across directed prerequisite dependencies ($\text{Arithmetic} \rightarrow \text{Algebra} \rightarrow \text{Geometry} \rightarrow \text{Word Problems}$) where solving downstream items backward-injects positive prior updates ($+0.12$) into foundational nodes.

### 2. State-of-the-Art Pedagogical & Algorithmic Extensions (`core/engine.py` & `routers/students.py`)
To make the platform capable of handling diverse real-world classroom scenarios, we implemented 4 advanced mathematical and behavioral extensions across the stack:
- **Unified IRT-BKT Hybrid Parameterization**: Item difficulty $b_q \in [-3.0, +3.0]$ dynamically calibrates item-specific guessing and slipping probabilities before Bayes updates:
  $$P(G)_{item} = \min(0.70, \max(0.05, P_{guess} \cdot [1 - 0.12 \cdot b_q])) \quad | \quad P(S)_{item} = \min(0.60, \max(0.02, P_{slip} \cdot [1 + 0.15 \cdot \max(0, b_q)]))$$
- **Instructional Hint Modulated Learning Rate**: When a student requests a pedagogical hint (`hint_used: True`), guessing noise is suppressed to $5\%$ and the transition learning rate accelerates by $+40\%$ ($1.40\times$) upon successful problem solving:
  $$\text{if } hint\_used == \text{True}: \quad P(G)_{hint} = \min(P_{guess}, 0.05), \quad P(T)_{hint} = \min(0.80, P_{learn} \cdot 1.40 \cdot q\_weight)$$
- **Cognitive Fatigue Detection & Break Protection**: If a student exhibits prolonged struggle ($>20\text{s}$ per attempt over cumulative errors or attempts $\ge 10$), our affective classifier identifies `fatigued` status and prescribes `action = break` ("Recommending a 5-minute brain refresh break") while bounding single-item posterior drops to protect historical mastery.
- **Multi-Skill Q-Matrix Proportional Credit Assignment**: Supports compound interdisciplinary problems (`q_matrix_weights: {'skill_word_problems_01': 0.6, 'skill_algebra_01': 0.4}`), applying full updates to primary skills while proportionally attributing transition gains ($P_{learn} \cdot q_i$) across all secondary competencies inside a single atomic database transaction.

### 3. API Endpoints & Schemas (`backend/app/routers/`)
- `GET/POST /algorithms/parameters`: Fetch or update active BKT and heuristic parameters in real-time ($P_{init}, P_{learn}, P_{guess}, P_{slip}$, and rapid guess thresholds).
- `POST /algorithms/compare`: Accepts classroom interaction sequences and runs all 6 algorithms side-by-side across hint usage, item difficulty ($b$), cognitive fatigue, and Q-matrix weights.
- `POST /algorithms/dag_propagate`: Simulates forward and backward Bayesian belief propagation across the curriculum tree.
- `GET /students/histogram`: Aggregates classroom estimates into 4 mastery tiers cross-classified by 5 cognitive states (`improving`, `learning`, `plateaued`, `guessing`, `fatigued`).

### 4. Interactive Frontend Application UI (`client/src/components/AlgorithmLab.tsx`)
The **AI & Algorithm Lab** tab (`activeTab === 'algorithm_lab'`) features 4 interactive sub-modules:
1. **Parameter Tuning Sandbox (`parameter_tuning`)**:
   - Interactive sliders for $P_{init}$, $P_{learn}$, $P_{guess}$, $P_{slip}$, and Rapid Guessing cutoffs.
   - **Interactive Live Derivation Controls**: Buttons to test **Item Difficulty (`Easy b=-1.2`, `Medium b=0.0`, `Hard b=+1.2`)** and **Instructional Hint (`Hint Used vs No Hint`)** directly inside the step-by-step Bayes derivation formulas.
   - **Apply to Backend** button to instantly override running engine parameters.
2. **Multi-Algorithm Comparison Arena (`algorithm_comparison`)**:
   - 8 realistic preset classroom scenarios: *Rapid Guessing Streak*, *Plateau Struggle*, *ZPD Growth*, *Careless Slip + Recovery*, *Pedagogical Hint (+40% Speedup)*, *IRT Hard vs Easy*, *Cognitive Fatigue Detection*, and *Q-Matrix Multi-Skill*.
   - Side-by-side comparison cards with progress bars, status badges (`guessing`, `plateaued`, `improving`, `fatigued`, `mastered`), and prescribed actions.
3. **Recommendation Engine Policy (`pedagogical_rules`)**:
   - Interactive policy rule tree displaying exact threshold boundaries (`scaffold`, `practice`, `advance`, and **`break` when `cognitive_status == "fatigued"`**).
   - Live testbench dropdown supporting all 5 cognitive classifications including `fatigued`.
4. **Edge Architecture & Multi-Skill DAG (`edge_and_dag`)**:
   - **CRDTs & SQLite WASM Section**: Explains embedded SQLite WASM and features an interactive peer-to-peer simulator with Teacher/Student tablets, divergent vector clocks, and one-click **CRDT Bluetooth/Wi-Fi Peer Sync** demonstrating LWW-element set convergence.
   - **Multi-Skill Joint Tracing Section**: Interactive DAG node tree showing live prior boost injection across prerequisite nodes.

### 5. Comprehensive Technical Word Documentation (`generate_docx.py`)
We built an end-to-end Python documentation generator (`generate_docx.py`) producing a 40+ KB, 9-section professional document (`SparkSchool_AI_and_BKT_Architecture_Guide.docx` / `_v2.docx`) featuring:
- Plain-text mathematical clarity (zero raw LaTeX `$` symbols, zero internal developer/management jargon).
- Complete Application User Guide & UI Walkthrough (`Section 2`) explaining exactly what each of the 4 tabs does right when a new user opens the app.
- Full step-by-step numerical derivation examples across all 6 algorithms and 4 hybrid extensions.

---

## Verification Results

### Automated Backend Verification Suite (`pytest`)
Ran comprehensive test suite verifying the core engine, parameter endpoints, multi-algorithm execution, DAG propagation, forgetting curve decay, adaptive priors, class histograms, IRT-BKT hybrid, hint modulation, cognitive fatigue, and Q-matrix credit assignment:
```bash
python -m pytest tests/ -v
```
**Output (`14 passed, 1 warning in 2.08s`)**:
```
============================= test session starts =============================
tests\test_algorithms.py::test_get_and_update_parameters PASSED          [  7%]
tests\test_algorithms.py::test_compare_algorithms PASSED                 [ 14%]
tests\test_algorithms.py::test_dag_propagate PASSED                      [ 21%]
tests\test_engine.py::test_biorhythm_engine_improving PASSED             [ 28%]
tests\test_engine.py::test_rapid_guessing_detection PASSED               [ 35%]
tests\test_engine.py::test_api_submit_and_idempotency PASSED             [ 42%]
tests\test_engine.py::test_get_student_estimate PASSED                   [ 50%]
tests\test_extensions.py::test_forgetting_curve_decay PASSED             [ 57%]
tests\test_extensions.py::test_adaptive_priors PASSED                    [ 64%]
tests\test_extensions.py::test_class_histogram_endpoint PASSED           [ 71%]
tests\test_extensions.py::test_irt_bkt_hybrid_item_difficulty PASSED     [ 78%]
tests\test_extensions.py::test_hint_scaffold_acceleration PASSED         [ 85%]
tests\test_extensions.py::test_cognitive_fatigue_detection PASSED        [ 92%]
tests\test_extensions.py::test_q_matrix_proportional_credit PASSED       [100%]
======================== 14 passed, 1 warning in 2.08s ========================
```

### Frontend Build Verification (`npm run build`)
Compiled TypeScript bundle and assets to confirm clean type definitions and zero errors:
```
vite v8.1.5 building client environment for production...
transforming...✓ 1783 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   0.45 kB │ gzip:  0.29 kB
dist/assets/index-xwoi6i3S.css    4.02 kB │ gzip:  1.48 kB
dist/assets/index-DEPy2-Dh.js   293.15 kB │ gzip: 83.20 kB
✓ built in 753ms
```

---

## How to Test & Explore Live
1. Start the backend (`http://localhost:8000`):
   ```bash
   cd backend && python -m uvicorn app.main:app --reload --port 8000
   ```
2. Start the frontend (`http://localhost:5173`):
   ```bash
   cd client && npm run dev
   ```
3. Open `http://localhost:5173` in your browser:
   - Explore **Tab 4 (AI & Algorithm Lab)** to tune sliders, toggle live Item Difficulty and Hints in Bayes' rule, run all 8 multi-algorithm presets, and simulate CRDT peer-to-peer sync.
   - Explore **Tab 2 (Teacher Dashboard)** to view the live **Class Mastery Histogram** and real-time intervention drilldowns.
4. Generate or open the complete Word document:
   ```bash
   python generate_docx.py
   ```
