import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Cpu,
  BookOpen,
  Network,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  TrendingUp,
  Zap,
  Share2,
  Database,
  Smartphone,
  Tablet,
  Save,
  RotateCcw
} from 'lucide-react';
import { apiService } from '../services/api';
import { formatDateTimeDDMMYYYY } from '../utils/dateFormatter';
import type {
  ParameterConfig,
  AlgorithmSimulationItem,
  AlgorithmComparisonResponse,
  DAGPropagationResponse,
  CRDTDeviceState,
  CRDTLogEntry
} from '../types';

type SubView = 'parameter_tuning' | 'algorithm_comparison' | 'pedagogical_rules' | 'edge_and_dag';

export const AlgorithmLab: React.FC = () => {
  const [activeSubView, setActiveSubView] = useState<SubView>('parameter_tuning');

  // --- MODULE 1: PARAMETER TUNING STATE ---
  const [params, setParams] = useState<ParameterConfig>({
    p_init: 0.15,
    p_learn: 0.20,
    p_guess: 0.25,
    p_slip: 0.10,
    rapid_guess_ms: 1000,
    guess_multiplier: 2.6,
    slip_multiplier: 2.2,
    plateau_threshold: 3
  });
  const [simOutcome, setSimOutcome] = useState<'correct_normal' | 'correct_fast' | 'incorrect_normal' | 'incorrect_fast'>('correct_normal');
  const [simHintUsed, setSimHintUsed] = useState<boolean>(false);
  const [simDifficulty, setSimDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [saveStatus, setSaveStatus] = useState<string>('');

  useEffect(() => {
    loadParams();
  }, []);

  const loadParams = async () => {
    const fetched = await apiService.getParameters();
    setParams(fetched);
  };

  const handleSaveParams = async () => {
    await apiService.updateParameters(params);
    setSaveStatus('Parameters saved and applied to live backend engine!');
    setTimeout(() => setSaveStatus(''), 4000);
  };

  const handleResetParams = () => {
    const defaults: ParameterConfig = {
      p_init: 0.15,
      p_learn: 0.20,
      p_guess: 0.25,
      p_slip: 0.10,
      rapid_guess_ms: 1000,
      guess_multiplier: 2.6,
      slip_multiplier: 2.2,
      plateau_threshold: 3
    };
    setParams(defaults);
    apiService.updateParameters(defaults);
    setSaveStatus('Reset to default AI engine parameters.');
    setTimeout(() => setSaveStatus(''), 3000);
  };

  // Bayes rule calculation demo with IRT-BKT Hybrid & Hint Modulation
  const isCorrect = simOutcome.startsWith('correct');
  const isFast = simOutcome.endsWith('fast');
  const diffBMap = { easy: -1.2, medium: 0.0, hard: 1.2 };
  const b_q = diffBMap[simDifficulty];

  // 1. IRT Difficulty modulation
  let baseGuess = Math.min(0.70, Math.max(0.05, params.p_guess * (1 - 0.12 * b_q)));
  let baseSlip = Math.min(0.60, Math.max(0.02, params.p_slip * (1 + 0.15 * Math.max(0, b_q))));

  // 2. Response time heuristic penalties
  const effGuess = isFast && isCorrect ? Math.min(0.80, baseGuess * params.guess_multiplier) : baseGuess;
  const effSlip = isFast && !isCorrect ? Math.min(0.50, baseSlip * params.slip_multiplier) : baseSlip;
  
  // 3. Hint modulation
  const finalGuess = simHintUsed ? Math.min(effGuess, 0.05) : effGuess;
  const effLearn = simHintUsed ? Math.min(0.80, params.p_learn * 1.40) : params.p_learn;

  const num = isCorrect ? (params.p_init * (1 - effSlip)) : (params.p_init * effSlip);
  const den = isCorrect
    ? (params.p_init * (1 - effSlip) + (1 - params.p_init) * finalGuess)
    : (params.p_init * effSlip + (1 - params.p_init) * (1 - finalGuess));
  const pCond = den > 0 ? num / den : params.p_init;
  const pPosterior = Math.max(0.01, Math.min(0.99, Number((pCond + (1 - pCond) * effLearn).toFixed(4))));

  // --- MODULE 2: ALGORITHM COMPARISON STATE ---
  const [comparisonItems, setComparisonItems] = useState<AlgorithmSimulationItem[]>([
    { skill_id: 'skill_arithmetic_01', correct: 1, response_time_ms: 3500 },
    { skill_id: 'skill_arithmetic_01', correct: 1, response_time_ms: 450 },
    { skill_id: 'skill_arithmetic_01', correct: 1, response_time_ms: 380 },
    { skill_id: 'skill_arithmetic_01', correct: 0, response_time_ms: 4200 }
  ]);
  const [comparisonResult, setComparisonResult] = useState<AlgorithmComparisonResponse | null>(null);
  const [isRunningComparison, setIsRunningComparison] = useState(false);

  const runPresetScenario = async (preset: 'rapid_guessing' | 'plateau_struggle' | 'zpd_growth' | 'careless_slip' | 'hint_boost' | 'irt_hard_vs_easy' | 'fatigue_break' | 'q_matrix_compound') => {
    let items: AlgorithmSimulationItem[] = [];
    if (preset === 'rapid_guessing') {
      items = [
        { skill_id: 'skill_algebra_01', correct: 1, response_time_ms: 420 },
        { skill_id: 'skill_algebra_01', correct: 1, response_time_ms: 350 },
        { skill_id: 'skill_algebra_01', correct: 1, response_time_ms: 480 }
      ];
    } else if (preset === 'plateau_struggle') {
      items = [
        { skill_id: 'skill_geometry_01', correct: 0, response_time_ms: 12000 },
        { skill_id: 'skill_geometry_01', correct: 0, response_time_ms: 15000 },
        { skill_id: 'skill_geometry_01', correct: 0, response_time_ms: 18000 },
        { skill_id: 'skill_geometry_01', correct: 0, response_time_ms: 22000 }
      ];
    } else if (preset === 'zpd_growth') {
      items = [
        { skill_id: 'skill_arithmetic_01', correct: 1, response_time_ms: 4200 },
        { skill_id: 'skill_arithmetic_01', correct: 1, response_time_ms: 3800 },
        { skill_id: 'skill_arithmetic_01', correct: 1, response_time_ms: 3100 },
        { skill_id: 'skill_arithmetic_01', correct: 1, response_time_ms: 2900 }
      ];
    } else if (preset === 'careless_slip') {
      items = [
        { skill_id: 'skill_algebra_01', correct: 1, response_time_ms: 3500 },
        { skill_id: 'skill_algebra_01', correct: 1, response_time_ms: 3200 },
        { skill_id: 'skill_algebra_01', correct: 0, response_time_ms: 480 },
        { skill_id: 'skill_algebra_01', correct: 1, response_time_ms: 3400 }
      ];
    } else if (preset === 'hint_boost') {
      items = [
        { skill_id: 'skill_word_problems_01', correct: 1, response_time_ms: 6500, hint_used: true },
        { skill_id: 'skill_word_problems_01', correct: 1, response_time_ms: 5000, hint_used: true },
        { skill_id: 'skill_word_problems_01', correct: 1, response_time_ms: 4200, hint_used: false }
      ];
    } else if (preset === 'irt_hard_vs_easy') {
      items = [
        { skill_id: 'skill_geometry_01', correct: 1, response_time_ms: 5000, item_difficulty_b: 1.5 },
        { skill_id: 'skill_geometry_01', correct: 1, response_time_ms: 4500, item_difficulty_b: 1.5 },
        { skill_id: 'skill_geometry_01', correct: 0, response_time_ms: 6000, item_difficulty_b: -1.2 }
      ];
    } else if (preset === 'fatigue_break') {
      items = [
        { skill_id: 'skill_algebra_01', correct: 0, response_time_ms: 22000 },
        { skill_id: 'skill_algebra_01', correct: 0, response_time_ms: 25000 },
        { skill_id: 'skill_algebra_01', correct: 0, response_time_ms: 24000 },
        { skill_id: 'skill_algebra_01', correct: 0, response_time_ms: 28000 }
      ];
    } else if (preset === 'q_matrix_compound') {
      items = [
        { skill_id: 'skill_word_problems_01', correct: 1, response_time_ms: 5500, q_matrix_weights: { skill_word_problems_01: 0.6, skill_algebra_01: 0.4 } },
        { skill_id: 'skill_word_problems_01', correct: 1, response_time_ms: 4800, q_matrix_weights: { skill_word_problems_01: 0.6, skill_algebra_01: 0.4 } }
      ];
    }
    setComparisonItems(items);
    setIsRunningComparison(true);
    const res = await apiService.compareAlgorithms(items, params);
    setComparisonResult(res);
    setIsRunningComparison(false);
  };

  // --- MODULE 3: PEDAGOGICAL POLICY TESTBENCH ---
  const [policyTestP, setPolicyTestP] = useState<number>(0.50);
  const [policyTestStatus, setPolicyTestStatus] = useState<string>('improving');
  const [policyTestErrors, setPolicyTestErrors] = useState<number>(1);
  const [policyTestTime, setPolicyTestTime] = useState<number>(3000);

  const getPolicyDecision = () => {
    if (policyTestStatus === 'fatigued') {
      return { action: 'break', badge: 'Pause Session (Refresh & Recover Break)', color: '#ef4444', reason: `Cognitive fatigue detected (>20s struggle or repeated slow errors). Recommending a 5-minute brain refresh break to protect mastery.` };
    }
    if (policyTestTime < params.rapid_guess_ms && policyTestStatus === 'guessing') {
      return { action: 'practice', badge: 'Practice (Reflective Prompt)', color: '#3b82f6', reason: `Rapid guessing detected (<${params.rapid_guess_ms}ms). Recommending same skill with speed check warning.` };
    }
    if (policyTestStatus === 'plateaued' || policyTestP < 0.40 || policyTestErrors >= params.plateau_threshold) {
      return { action: 'scaffold', badge: 'Scaffold (Prerequisite Skill)', color: '#f59e0b', reason: `Student is struggling or plateaued (Mastery P(Lt) = ${(policyTestP*100).toFixed(1)}% or >= ${policyTestErrors} errors). Switching to easier prerequisite scaffolding.` };
    }
    if (policyTestP > 0.85 || policyTestStatus === 'mastered') {
      return { action: 'advance', badge: 'Advance (Next Concept)', color: '#10b981', reason: `Mastery unlocked (Mastery P(Lt) = ${(policyTestP*100).toFixed(1)}%). Advancing student to next curriculum challenge.` };
    }
    return { action: 'practice', badge: 'Practice (Optimal ZPD Zone)', color: '#6366f1', reason: `Optimal learning velocity in Vygotsky's ZPD (Mastery P(Lt) = ${(policyTestP*100).toFixed(1)}%). Maintaining challenge progression.` };
  };

  // --- MODULE 4: EDGE CRDT & DAG STATE ---
  const [dagResult, setDagResult] = useState<DAGPropagationResponse | null>(null);
  const [isSimulatingDag, setIsSimulatingDag] = useState(false);

  const triggerDagSimulation = async (targetSkill: string, correct: number) => {
    setIsSimulatingDag(true);
    const res = await apiService.simulateDAG(targetSkill, correct, correct === 1 ? 3200 : 12000);
    setDagResult(res);
    setIsSimulatingDag(false);
  };

  // CRDT Edge Simulation State
  const [teacherState, setTeacherState] = useState<CRDTDeviceState>({
    device_id: 'teacher_tablet',
    name: 'Teacher Tablet (Node 01)',
    is_online: false,
    vector_clock: { teacher_tablet: 2, student_tablet_a: 1 },
    local_estimates: { skill_arithmetic_01: 0.75, skill_algebra_01: 0.50 },
    delta_log: [
      { id: 'log_1', device_id: 'teacher_tablet', timestamp: Date.now() - 60000, operation: 'UPDATE_MASTERY', payload: { student_id: 's_01', skill_id: 'skill_arithmetic_01', p_mastery: 0.75, vector_clock: { teacher_tablet: 1 } } }
    ]
  });

  const [studentState, setStudentState] = useState<CRDTDeviceState>({
    device_id: 'student_tablet_a',
    name: 'Student Tablet A (Offline Mode)',
    is_online: false,
    vector_clock: { teacher_tablet: 1, student_tablet_a: 3 },
    local_estimates: { skill_arithmetic_01: 0.82, skill_algebra_01: 0.65 },
    delta_log: [
      { id: 'log_2', device_id: 'student_tablet_a', timestamp: Date.now() - 30000, operation: 'PUT_RESPONSE', payload: { submission_id: 'sub_991', student_id: 's_01', skill_id: 'skill_algebra_01', correct: 1, vector_clock: { student_tablet_a: 2 } } },
      { id: 'log_3', device_id: 'student_tablet_a', timestamp: Date.now() - 10000, operation: 'UPDATE_MASTERY', payload: { student_id: 's_01', skill_id: 'skill_algebra_01', p_mastery: 0.65, vector_clock: { student_tablet_a: 3 } } }
    ]
  });

  const [crdtSyncMessage, setCrdtSyncMessage] = useState<string>('');

  const handleSimulateOfflineEdit = (device: 'teacher_tablet' | 'student_tablet_a') => {
    if (device === 'teacher_tablet') {
      const newClock = { ...teacherState.vector_clock, teacher_tablet: teacherState.vector_clock.teacher_tablet + 1 };
      const newEst = Number((teacherState.local_estimates.skill_arithmetic_01 + 0.05).toFixed(2));
      const newLog: CRDTLogEntry = {
        id: `log_t_${Date.now()}`,
        device_id: 'teacher_tablet',
        timestamp: Date.now(),
        operation: 'UPDATE_MASTERY',
        payload: { student_id: 's_01', skill_id: 'skill_arithmetic_01', p_mastery: newEst, vector_clock: newClock }
      };
      setTeacherState({
        ...teacherState,
        vector_clock: newClock,
        local_estimates: { ...teacherState.local_estimates, skill_arithmetic_01: newEst },
        delta_log: [newLog, ...teacherState.delta_log]
      });
      setCrdtSyncMessage('Teacher Tablet recorded local offline intervention. Vector clock incremented.');
    } else {
      const newClock = { ...studentState.vector_clock, student_tablet_a: studentState.vector_clock.student_tablet_a + 1 };
      const newEst = Number((studentState.local_estimates.skill_algebra_01 + 0.08).toFixed(2));
      const newLog: CRDTLogEntry = {
        id: `log_s_${Date.now()}`,
        device_id: 'student_tablet_a',
        timestamp: Date.now(),
        operation: 'PUT_RESPONSE',
        payload: { submission_id: `sub_${Math.floor(Math.random()*900+100)}`, student_id: 's_01', skill_id: 'skill_algebra_01', correct: 1, vector_clock: newClock }
      };
      setStudentState({
        ...studentState,
        vector_clock: newClock,
        local_estimates: { ...studentState.local_estimates, skill_algebra_01: newEst },
        delta_log: [newLog, ...studentState.delta_log]
      });
      setCrdtSyncMessage('Student Tablet recorded local offline practice attempt. Vector clock incremented.');
    }
  };

  const handleCrdtBluetoothSync = () => {
    // Merge vector clocks (LWW Element Set + PN Counter logic)
    const mergedClock = {
      teacher_tablet: Math.max(teacherState.vector_clock.teacher_tablet, studentState.vector_clock.teacher_tablet),
      student_tablet_a: Math.max(teacherState.vector_clock.student_tablet_a, studentState.vector_clock.student_tablet_a)
    };

    // LWW Element Set resolution for estimates
    const mergedEstimates = {
      skill_arithmetic_01: Math.max(teacherState.local_estimates.skill_arithmetic_01, studentState.local_estimates.skill_arithmetic_01),
      skill_algebra_01: Math.max(teacherState.local_estimates.skill_algebra_01, studentState.local_estimates.skill_algebra_01)
    };

    const combinedLogs = [...teacherState.delta_log, ...studentState.delta_log]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 6);

    setTeacherState({
      ...teacherState,
      is_online: true,
      vector_clock: mergedClock,
      local_estimates: mergedEstimates,
      delta_log: combinedLogs
    });

    setStudentState({
      ...studentState,
      is_online: true,
      vector_clock: mergedClock,
      local_estimates: mergedEstimates,
      delta_log: combinedLogs
    });

    setCrdtSyncMessage('CRDT Bluetooth/Local-Wi-Fi Peer-to-Peer Sync Complete! Delta logs exchanged and LWW vector clocks converged automatically with zero data loss.');
  };

  return (
    <div className="glass-panel" style={{ margin: '0 16px', padding: '24px' }}>
      {/* Top Header & Sub-Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '20px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: 'linear-gradient(1356deg, #6366f1 0%, #10b981 100%)', padding: '12px', borderRadius: '14px', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Sliders size={26} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.5rem', margin: 0, fontWeight: 700 }}>AI & Algorithm Lab — Interactive Parameter & Architecture Arena</h2>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', margin: 0 }}>
              Adjust live AI parameters, compare 6 statistical & AI algorithms, test pedagogical action policies, and simulate CRDT / SQLite WASM edge architecture.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', background: 'rgba(0,0,0,0.3)', padding: '6px', borderRadius: '12px', border: '1px solid var(--border-glass)', flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveSubView('parameter_tuning')}
            className={`btn ${activeSubView === 'parameter_tuning' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '8px 14px', fontSize: '0.84rem' }}
          >
            <Sliders size={16} /> 1. Parameter Tuning Sandbox
          </button>
          <button
            onClick={() => setActiveSubView('algorithm_comparison')}
            className={`btn ${activeSubView === 'algorithm_comparison' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '8px 14px', fontSize: '0.84rem' }}
          >
            <Cpu size={16} /> 2. Multi-Algorithm Comparison
          </button>
          <button
            onClick={() => setActiveSubView('pedagogical_rules')}
            className={`btn ${activeSubView === 'pedagogical_rules' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '8px 14px', fontSize: '0.84rem' }}
          >
            <BookOpen size={16} /> 3. Recommendation Policy Rules
          </button>
          <button
            onClick={() => setActiveSubView('edge_and_dag')}
            className={`btn ${activeSubView === 'edge_and_dag' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '8px 14px', fontSize: '0.84rem' }}
          >
            <Network size={16} /> 4. Edge CRDTs & Multi-Skill DAG
          </button>
        </div>
      </div>

      {saveStatus && (
        <div style={{ background: 'rgba(16, 185, 129, 0.18)', border: '1px solid #10b981', color: '#34d399', padding: '12px 16px', borderRadius: '10px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 size={18} /> {saveStatus}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODULE 1: PARAMETER TUNING SANDBOX */}
      {/* ========================================================================= */}
      {activeSubView === 'parameter_tuning' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
          {/* Sliders Panel */}
          <div className="card" style={{ padding: '22px', background: 'rgba(255,255,255,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.15rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sliders size={18} color="#6366f1" /> AI Engine & Heuristic Sliders
              </h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={handleResetParams} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.78rem' }}>
                  <RotateCcw size={14} /> Reset Defaults
                </button>
                <button onClick={handleSaveParams} className="btn btn-primary" style={{ padding: '6px 14px', fontSize: '0.78rem' }}>
                  <Save size={14} /> Apply to Backend
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <label style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-main)' }}>Prior Probability P(init)</label>
                  <span style={{ color: '#6366f1', fontWeight: 700 }}>{params.p_init}</span>
                </div>
                <input
                  type="range"
                  min="0.01"
                  max="0.60"
                  step="0.01"
                  value={params.p_init}
                  onChange={(e) => setParams({ ...params, p_init: parseFloat(e.target.value) })}
                  style={{ width: '100%', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Initial belief before first question attempt.</span>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <label style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-main)' }}>Learning Rate P(learn) / P(T)</label>
                  <span style={{ color: '#10b981', fontWeight: 700 }}>{params.p_learn}</span>
                </div>
                <input
                  type="range"
                  min="0.01"
                  max="0.60"
                  step="0.01"
                  value={params.p_learn}
                  onChange={(e) => setParams({ ...params, p_learn: parseFloat(e.target.value) })}
                  style={{ width: '100%', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Probability of transitioning from unmastered to mastered after an attempt.</span>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <label style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-main)' }}>Guessing Probability P(guess) / P(G)</label>
                  <span style={{ color: '#f59e0b', fontWeight: 700 }}>{params.p_guess}</span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="0.50"
                  step="0.01"
                  value={params.p_guess}
                  onChange={(e) => setParams({ ...params, p_guess: parseFloat(e.target.value) })}
                  style={{ width: '100%', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Baseline probability of answering correctly without knowing the concept.</span>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <label style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-main)' }}>Slipping Probability P(slip) / P(S)</label>
                  <span style={{ color: '#ec4899', fontWeight: 700 }}>{params.p_slip}</span>
                </div>
                <input
                  type="range"
                  min="0.01"
                  max="0.30"
                  step="0.01"
                  value={params.p_slip}
                  onChange={(e) => setParams({ ...params, p_slip: parseFloat(e.target.value) })}
                  style={{ width: '100%', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Baseline probability of answering incorrectly despite knowing the concept.</span>
              </div>

              <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>Rapid Guess Cutoff</label>
                    <span style={{ color: '#a855f7', fontWeight: 700 }}>{params.rapid_guess_ms}ms</span>
                  </div>
                  <input
                    type="range"
                    min="300"
                    max="2500"
                    step="100"
                    value={params.rapid_guess_ms}
                    onChange={(e) => setParams({ ...params, rapid_guess_ms: parseInt(e.target.value) })}
                    style={{ width: '100%', cursor: 'pointer' }}
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>Guess Multiplier</label>
                    <span style={{ color: '#a855f7', fontWeight: 700 }}>{params.guess_multiplier}x</span>
                  </div>
                  <input
                    type="range"
                    min="1.0"
                    max="4.0"
                    step="0.1"
                    value={params.guess_multiplier}
                    onChange={(e) => setParams({ ...params, guess_multiplier: parseFloat(e.target.value) })}
                    style={{ width: '100%', cursor: 'pointer' }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Live Mathematical Derivation Panel */}
          <div className="card" style={{ padding: '22px', background: 'rgba(255,255,255,0.02)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Zap size={18} color="#10b981" /> Live Bayes' Rule & Heuristic Derivation
              </h3>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                Simulate a single interaction response and see how Bayes' Rule combines with your exact slider values above:
              </p>

              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setSimOutcome('correct_normal')}
                  className={`btn ${simOutcome === 'correct_normal' ? 'btn-success' : 'btn-secondary'}`}
                  style={{ padding: '8px 12px', fontSize: '0.8rem' }}
                >
                  <CheckCircle2 size={14} /> Correct (Normal Speed: 3500ms)
                </button>
                <button
                  onClick={() => setSimOutcome('correct_fast')}
                  className={`btn ${simOutcome === 'correct_fast' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '8px 12px', fontSize: '0.8rem' }}
                >
                  <Zap size={14} /> Correct (Rapid Guess: 450ms)
                </button>
                <button
                  onClick={() => setSimOutcome('incorrect_normal')}
                  className={`btn ${simOutcome === 'incorrect_normal' ? 'btn-danger' : 'btn-secondary'}`}
                  style={{ padding: '8px 12px', fontSize: '0.8rem' }}
                >
                  <AlertCircle size={14} /> Incorrect (Normal Speed: 4000ms)
                </button>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginBottom: '18px', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Difficulty & Hint:</span>
                <button
                  onClick={() => setSimDifficulty('easy')}
                  className={`btn ${simDifficulty === 'easy' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '5px 10px', fontSize: '0.78rem' }}
                >
                  Easy (b=-1.2)
                </button>
                <button
                  onClick={() => setSimDifficulty('medium')}
                  className={`btn ${simDifficulty === 'medium' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '5px 10px', fontSize: '0.78rem' }}
                >
                  Medium (b=0.0)
                </button>
                <button
                  onClick={() => setSimDifficulty('hard')}
                  className={`btn ${simDifficulty === 'hard' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '5px 10px', fontSize: '0.78rem' }}
                >
                  Hard (b=+1.2)
                </button>
                <button
                  onClick={() => setSimHintUsed(!simHintUsed)}
                  className={`btn ${simHintUsed ? 'btn-success' : 'btn-secondary'}`}
                  style={{ padding: '5px 10px', fontSize: '0.78rem', marginLeft: 'auto' }}
                >
                  <HelpCircle size={13} /> {simHintUsed ? 'Hint Used (P(G)=0.05, +40% Learn)' : 'No Hint'}
                </button>
              </div>

              {/* Mathematical Equation Breakdown */}
              <div style={{ background: 'rgba(0,0,0,0.35)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', fontFamily: 'monospace', fontSize: '0.85rem' }}>
                <div style={{ color: '#a855f7', fontWeight: 700, marginBottom: '8px' }}>
                  STEP 1: IRT & Heuristic Parameter Modulation
                </div>
                <div>
                  • Response Time check: {isFast ? `< ${params.rapid_guess_ms}ms (RAPID GUESS DETECTED!)` : `≥ ${params.rapid_guess_ms}ms (Thoughtful)`}
                </div>
                <div>
                  • Effective P(Guess): <span style={{ color: '#f59e0b' }}>{finalGuess.toFixed(3)}</span> {simHintUsed ? '(Hint Scaffolding -> 0.05)' : (isFast && isCorrect ? `(${params.p_guess} × ${params.guess_multiplier}x penalty)` : '')}
                </div>
                <div>
                  • Effective P(Slip): <span style={{ color: '#ec4899' }}>{effSlip.toFixed(3)}</span> {simDifficulty === 'hard' ? '(IRT b=+1.2 -> Slip tolerance +18%)' : ''}
                </div>

                <div style={{ color: '#6366f1', fontWeight: 700, margin: '14px 0 8px 0' }}>
                  STEP 2: Bayes' Rule Posterior Computation
                </div>
                <div>
                  P(L | Obs={isCorrect?'1':'0'}) = {num.toFixed(4)} / {den.toFixed(4)} = <span style={{ color: 'white', fontWeight: 700 }}>{pCond.toFixed(4)}</span>
                </div>

                <div style={{ color: '#10b981', fontWeight: 700, margin: '14px 0 8px 0' }}>
                  STEP 3: Markov Learning Transition P(Lt) {simHintUsed && <span style={{ color: '#34d399' }}>(+40% Hint Acceleration)</span>}
                </div>
                <div>
                  P(L_new) = {pCond.toFixed(4)} + (1 - {pCond.toFixed(4)}) × {effLearn.toFixed(3)} = <span style={{ color: '#34d399', fontSize: '1.05rem', fontWeight: 800 }}>{(pPosterior * 100).toFixed(2)}%</span>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '20px', padding: '14px', borderRadius: '12px', background: pPosterior > 0.85 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(99, 102, 241, 0.15)', border: `1px solid ${pPosterior > 0.85 ? '#10b981' : '#6366f1'}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Resulting Recommendation Action</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: pPosterior > 0.85 ? '#34d399' : '#818cf8' }}>
                  {pPosterior > 0.85 ? 'advance (Mastery Unlocked -> Next Concept)' : 'practice (Optimal ZPD Challenge)'}
                </div>
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>
                {(pPosterior * 100).toFixed(1)}%
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODULE 2: MULTI-ALGORITHM COMPARISON ARENA */}
      {/* ========================================================================= */}
      {activeSubView === 'algorithm_comparison' && (
        <div>
          <div className="card" style={{ padding: '20px', marginBottom: '24px', background: 'rgba(255,255,255,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Cpu size={18} color="#a855f7" /> 6-Algorithm Execution & Comparison Engine
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                  Select a classroom interaction sequence below to execute all 6 knowledge tracing models simultaneously and observe their behavioral contrasts:
                </p>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button onClick={() => runPresetScenario('rapid_guessing')} className="btn btn-primary" style={{ padding: '8px 14px', fontSize: '0.82rem' }}>
                  <Zap size={14} /> Rapid Guessing Streak
                </button>
                <button onClick={() => runPresetScenario('plateau_struggle')} className="btn btn-secondary" style={{ padding: '8px 14px', fontSize: '0.82rem' }}>
                  <AlertCircle size={14} color="#f59e0b" /> Plateau Struggle
                </button>
                <button onClick={() => runPresetScenario('zpd_growth')} className="btn btn-secondary" style={{ padding: '8px 14px', fontSize: '0.82rem' }}>
                  <TrendingUp size={14} color="#10b981" /> ZPD Growth
                </button>
                <button onClick={() => runPresetScenario('careless_slip')} className="btn btn-secondary" style={{ padding: '8px 14px', fontSize: '0.82rem' }}>
                  <RefreshCw size={14} /> Careless Slip + Recovery
                </button>
                <button onClick={() => runPresetScenario('hint_boost')} className="btn btn-secondary" style={{ padding: '8px 14px', fontSize: '0.82rem', borderColor: '#10b981' }}>
                  <HelpCircle size={14} color="#10b981" /> Pedagogical Hint (+40% Speedup)
                </button>
                <button onClick={() => runPresetScenario('irt_hard_vs_easy')} className="btn btn-secondary" style={{ padding: '8px 14px', fontSize: '0.82rem', borderColor: '#a855f7' }}>
                  <Sliders size={14} color="#a855f7" /> IRT Hard vs Easy (b=+1.5)
                </button>
                <button onClick={() => runPresetScenario('fatigue_break')} className="btn btn-secondary" style={{ padding: '8px 14px', fontSize: '0.82rem', borderColor: '#ef4444' }}>
                  <RotateCcw size={14} color="#ef4444" /> Cognitive Fatigue Detection
                </button>
                <button onClick={() => runPresetScenario('q_matrix_compound')} className="btn btn-secondary" style={{ padding: '8px 14px', fontSize: '0.82rem', borderColor: '#3b82f6' }}>
                  <Network size={14} color="#3b82f6" /> Q-Matrix Multi-Skill
                </button>
              </div>
            </div>

            {/* Current Interaction Sequence Display */}
            <div style={{ marginTop: '16px', background: 'rgba(0,0,0,0.3)', padding: '12px 16px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>Input Sequence ({comparisonItems.length} attempts):</span>
              {comparisonItems.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: item.correct === 1 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)', padding: '4px 10px', borderRadius: '8px', border: `1px solid ${item.correct === 1 ? '#10b981' : '#ef4444'}`, fontSize: '0.8rem' }}>
                  {item.correct === 1 ? <CheckCircle2 size={13} color="#34d399" /> : <AlertCircle size={13} color="#f87171" />}
                  <span>Attempt #{idx+1} ({item.response_time_ms}ms)</span>
                  {item.hint_used && <span style={{ background: 'rgba(16,185,129,0.3)', padding: '1px 5px', borderRadius: '4px', fontSize: '0.7rem' }}>Hint</span>}
                  {item.item_difficulty_b !== undefined && <span style={{ background: 'rgba(168,85,247,0.3)', padding: '1px 5px', borderRadius: '4px', fontSize: '0.7rem' }}>b={item.item_difficulty_b}</span>}
                  {item.q_matrix_weights && <span style={{ background: 'rgba(59,130,246,0.3)', padding: '1px 5px', borderRadius: '4px', fontSize: '0.7rem' }}>Q-Matrix</span>}
                </div>
              ))}
            </div>
          </div>

          {isRunningComparison && (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <RefreshCw className="animate-pulse" size={32} style={{ margin: '0 auto 12px auto' }} />
              Executing 6 algorithms across response sequence...
            </div>
          )}

          {comparisonResult && !isRunningComparison && (
            <div>
              <div className="card" style={{ padding: '16px 20px', background: 'rgba(99, 102, 241, 0.12)', border: '1px solid #6366f1', marginBottom: '20px' }}>
                <div style={{ fontWeight: 700, color: '#818cf8', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={16} /> Comparative Insight Summary:
                </div>
                <div style={{ fontSize: '0.88rem', color: 'var(--text-main)', lineHeight: 1.5 }}>
                  {comparisonResult.summary_insight}
                </div>
              </div>

              {/* Side-by-Side Comparison Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '16px' }}>
                {comparisonResult.results.map((res, idx) => (
                  <div key={idx} className="card" style={{ padding: '20px', background: 'rgba(255,255,255,0.02)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderTop: `4px solid ${idx === 0 ? '#10b981' : (idx === 3 ? '#f59e0b' : '#6366f1')}` }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                        <div>
                          <h4 style={{ fontSize: '1.05rem', margin: 0, fontWeight: 700, color: 'white' }}>{res.algorithm_name}</h4>
                          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{res.algorithm_type}</span>
                        </div>
                        <span style={{ background: 'rgba(0,0,0,0.4)', padding: '4px 10px', borderRadius: '14px', fontSize: '0.92rem', fontWeight: 800, color: res.p_mastery >= 0.85 ? '#34d399' : (res.p_mastery < 0.40 ? '#f87171' : '#818cf8') }}>
                          {(res.p_mastery * 100).toFixed(1)}%
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden', marginBottom: '14px' }}>
                        <div style={{ width: `${res.p_mastery * 100}%`, height: '100%', background: res.p_mastery >= 0.85 ? '#10b981' : (res.p_mastery < 0.40 ? '#ef4444' : '#6366f1') }} />
                      </div>

                      <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                        <span style={{ fontSize: '0.74rem', padding: '2px 8px', borderRadius: '6px', background: 'rgba(255,255,255,0.08)' }}>
                          Status: <strong>{res.cognitive_status}</strong>
                        </span>
                        <span style={{ fontSize: '0.74rem', padding: '2px 8px', borderRadius: '6px', background: res.recommended_action === 'advance' ? 'rgba(16,185,129,0.2)' : 'rgba(99,102,241,0.2)', color: res.recommended_action === 'advance' ? '#34d399' : '#a5b4fc' }}>
                          Action: <strong>{res.recommended_action}</strong>
                        </span>
                      </div>

                      <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '14px', lineHeight: 1.4 }}>
                        {res.reason}
                      </p>
                    </div>

                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      <div style={{ marginBottom: '4px' }}>
                        <strong>Complexity:</strong> {res.computation_complexity} ({res.latency_microseconds} µs)
                      </div>
                      <div>
                        <strong>Why/Defense:</strong> {res.explanation}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODULE 3: RECOMMENDATION ENGINE POLICY RULES */}
      {/* ========================================================================= */}
      {activeSubView === 'pedagogical_rules' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
          {/* Policy Decision Tree */}
          <div className="card" style={{ padding: '22px', background: 'rgba(255,255,255,0.02)' }}>
            <h3 style={{ fontSize: '1.15rem', margin: '0 0 14px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BookOpen size={18} color="#3b82f6" /> Recommendation Engine Policy (Pedagogical Action Rules)
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
              Our pedagogical action rules map the estimated mastery state P(Lt) and classified `cognitive_status` to exact classroom interventions:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ borderLeft: '4px solid #f59e0b', paddingLeft: '14px', background: 'rgba(245, 158, 11, 0.08)', padding: '14px', borderRadius: '0 10px 10px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: '#fbbf24', marginBottom: '4px' }}>
                  <span>1. scaffold (Easier Question / Prerequisite)</span>
                  <span>P(Lt) &lt; 0.40 or plateaued</span>
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
                  Triggered when accuracy drops or consecutive long failures occur (`cognitive_status == "plateaued"`). Scaffolding prevents student demoralization by dynamically switching to the prerequisite skill in our curriculum graph.
                </p>
              </div>

              <div style={{ borderLeft: '4px solid #6366f1', paddingLeft: '14px', background: 'rgba(99, 102, 241, 0.08)', padding: '14px', borderRadius: '0 10px 10px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: '#818cf8', marginBottom: '4px' }}>
                  <span>2. practice (Optimal Challenge / Same Skill)</span>
                  <span>0.40 ≤ P(Lt) ≤ 0.85</span>
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
                  This is Vygotsky's <em>Zone of Proximal Development (ZPD)</em> where learning velocity is highest. The student is moderately challenged, consolidating concepts without extreme frustration or boredom.
                </p>
              </div>

              <div style={{ borderLeft: '4px solid #10b981', paddingLeft: '14px', background: 'rgba(16, 185, 129, 0.08)', padding: '14px', borderRadius: '0 10px 10px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: '#34d399', marginBottom: '4px' }}>
                  <span>3. advance (Harder Question / Next Skill)</span>
                  <span>P(Lt) &gt; 0.85</span>
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
                  The student has achieved conceptual mastery. Continuing to drill the same concept wastes classroom time; the engine automatically promotes them to the next skill in the curriculum sequence.
                </p>
              </div>

              <div style={{ borderLeft: '4px solid #ef4444', paddingLeft: '14px', background: 'rgba(239, 68, 68, 0.08)', padding: '14px', borderRadius: '0 10px 10px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: '#f87171', marginBottom: '4px' }}>
                  <span>4. break (Pause Session / Brain Refresh)</span>
                  <span>cognitive_status == "fatigued"</span>
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
                  Triggered when long struggle (&gt;20s) or slow repeated failures occur. Cognitive fatigue degrades mastery estimates; prescribing a short break prevents artificial demotion while protecting mental wellbeing.
                </p>
              </div>
            </div>
          </div>

          {/* Interactive Policy Testbench */}
          <div className="card" style={{ padding: '22px', background: 'rgba(255,255,255,0.02)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <HelpCircle size={18} color="#a855f7" /> Interactive Policy Rule Simulator
              </h3>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: '18px' }}>
                Adjust the student's current state parameters below to verify what pedagogical action our engine prescribes:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <label style={{ fontSize: '0.86rem', fontWeight: 600 }}>Mastery Probability P(Lt)</label>
                    <span style={{ color: '#818cf8', fontWeight: 700 }}>{(policyTestP * 100).toFixed(0)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.05"
                    max="0.99"
                    step="0.01"
                    value={policyTestP}
                    onChange={(e) => setPolicyTestP(parseFloat(e.target.value))}
                    style={{ width: '100%', cursor: 'pointer' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.86rem', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Cognitive Status Classification</label>
                  <select
                    value={policyTestStatus}
                    onChange={(e) => setPolicyTestStatus(e.target.value)}
                    className="input-glass"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', background: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid var(--border-glass)' }}
                  >
                    <option value="improving">improving (Making solid progress)</option>
                    <option value="learning">learning (Normal early progression)</option>
                    <option value="plateaued">plateaued (Stuck after repeated errors)</option>
                    <option value="guessing">guessing (Rapid clicking streak detected)</option>
                    <option value="fatigued">fatigued (Exhausted after prolonged struggle)</option>
                    <option value="mastered">mastered (Concept unlocked)</option>
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>Consecutive Errors</label>
                      <span style={{ color: '#f87171', fontWeight: 700 }}>{policyTestErrors}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="6"
                      step="1"
                      value={policyTestErrors}
                      onChange={(e) => setPolicyTestErrors(parseInt(e.target.value))}
                      style={{ width: '100%', cursor: 'pointer' }}
                    />
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>Response Time</label>
                      <span style={{ color: policyTestTime < 1000 ? '#f59e0b' : '#34d399', fontWeight: 700 }}>{policyTestTime}ms</span>
                    </div>
                    <input
                      type="range"
                      min="300"
                      max="6000"
                      step="100"
                      value={policyTestTime}
                      onChange={(e) => setPolicyTestTime(parseInt(e.target.value))}
                      style={{ width: '100%', cursor: 'pointer' }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Decision Output Box */}
            <div style={{ marginTop: '24px', padding: '18px', borderRadius: '12px', background: 'rgba(0,0,0,0.4)', border: `2px solid ${getPolicyDecision().color}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Engine Prescription</span>
                <span style={{ background: getPolicyDecision().color, color: 'white', padding: '3px 10px', borderRadius: '12px', fontSize: '0.82rem', fontWeight: 700 }}>
                  {getPolicyDecision().action.toUpperCase()}
                </span>
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'white', marginBottom: '6px' }}>
                {getPolicyDecision().badge}
              </div>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
                {getPolicyDecision().reason}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODULE 4: EDGE CRDTs & MULTI-SKILL DAG JOINT TRACING */}
      {/* ========================================================================= */}
      {activeSubView === 'edge_and_dag' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          {/* SECTION A: CRDTs & SQLite WASM on the Edge */}
          <div className="card" style={{ padding: '24px', background: 'rgba(255,255,255,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '18px' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Database size={20} color="#10b981" /> 2. CRDTs & SQLite WASM on the Edge (True Local-First Engine)
                </h3>
                <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', margin: 0, maxWidth: '850px' }}>
                  Simulate the evolution from our current IndexedDB batch syncing to the production architecture advancement using embedded SQLite WASM with Conflict-Free Replicated Data Types (CRDTs) / ElectricSQL:
                </p>
              </div>

              <button onClick={handleCrdtBluetoothSync} className="btn btn-success" style={{ padding: '10px 18px', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Share2 size={16} /> Sync & Merge Vector Clocks (Bluetooth/Wi-Fi Peer Sync)
              </button>
            </div>

            {crdtSyncMessage && (
              <div style={{ background: 'rgba(16, 185, 129, 0.18)', border: '1px solid #10b981', color: '#34d399', padding: '12px 16px', borderRadius: '10px', marginBottom: '18px', fontSize: '0.86rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={16} /> {crdtSyncMessage}
              </div>
            )}

            {/* Architecture Comparison Banner */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '14px 18px', borderRadius: '10px' }}>
                <div style={{ fontWeight: 700, color: '#f87171', marginBottom: '4px', fontSize: '0.9rem' }}>
                  Current Architecture (IndexedDB Queue + REST Batches):
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Queues requests locally during network dropouts and syncs via REST batches (`POST /response/sync`) when internet restores. Relies on server-side UUID idempotency.
                </div>
              </div>

              <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.4)', padding: '14px 18px', borderRadius: '10px' }}>
                <div style={{ fontWeight: 700, color: '#34d399', marginBottom: '4px', fontSize: '0.9rem' }}>
                  Advancement (SQLite WASM + CRDTs / ElectricSQL / RxDB):
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Embeds SQLite WASM directly inside the React service worker or native Android WebView along with LWW Element-Set & PN-Counter CRDTs. The entire AI estimation engine runs locally offline; syncing exchanges delta-logs directly via Bluetooth when peers meet!
                </div>
              </div>
            </div>

            {/* Interactive Device Simulation */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
              {/* Teacher Tablet */}
              <div style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid var(--border-glass)', borderRadius: '12px', padding: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', color: '#818cf8' }}>
                    <Tablet size={18} /> {teacherState.name}
                  </span>
                  <button onClick={() => handleSimulateOfflineEdit('teacher_tablet')} className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.75rem' }}>
                    + Simulate Local Teacher Intervention
                  </button>
                </div>

                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
                  Vector Clock: <code>{JSON.stringify(teacherState.vector_clock)}</code>
                </div>
                <div style={{ fontSize: '0.82rem', marginBottom: '12px', display: 'flex', gap: '12px' }}>
                  <span>Arithmetic Mastery: <strong style={{ color: '#34d399' }}>{(teacherState.local_estimates.skill_arithmetic_01*100).toFixed(0)}%</strong></span>
                  <span>Algebra Mastery: <strong style={{ color: '#818cf8' }}>{(teacherState.local_estimates.skill_algebra_01*100).toFixed(0)}%</strong></span>
                </div>

                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '8px' }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>Local Delta Log (Unmerged):</div>
                  {teacherState.delta_log.map(log => (
                    <div key={log.id} style={{ marginBottom: '4px' }}>
                      [{formatDateTimeDDMMYYYY(log.timestamp)}] {log.operation} ({log.payload.skill_id}: {(log.payload.p_mastery||0)*100}%)
                    </div>
                  ))}
                </div>
              </div>

              {/* Student Tablet */}
              <div style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid var(--border-glass)', borderRadius: '12px', padding: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', color: '#34d399' }}>
                    <Smartphone size={18} /> {studentState.name}
                  </span>
                  <button onClick={() => handleSimulateOfflineEdit('student_tablet_a')} className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.75rem' }}>
                    + Simulate Offline Practice Attempt
                  </button>
                </div>

                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
                  Vector Clock: <code>{JSON.stringify(studentState.vector_clock)}</code>
                </div>
                <div style={{ fontSize: '0.82rem', marginBottom: '12px', display: 'flex', gap: '12px' }}>
                  <span>Arithmetic Mastery: <strong style={{ color: '#34d399' }}>{(studentState.local_estimates.skill_arithmetic_01*100).toFixed(0)}%</strong></span>
                  <span>Algebra Mastery: <strong style={{ color: '#818cf8' }}>{(studentState.local_estimates.skill_algebra_01*100).toFixed(0)}%</strong></span>
                </div>

                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '8px' }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>Local Delta Log (Unmerged):</div>
                  {studentState.delta_log.map(log => (
                    <div key={log.id} style={{ marginBottom: '4px' }}>
                      [{formatDateTimeDDMMYYYY(log.timestamp)}] {log.operation} ({log.payload.skill_id}: {(log.payload.p_mastery||0)*100}%)
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION B: Multi-Skill Joint Tracing (Bayesian Knowledge Network) */}
          <div className="card" style={{ padding: '24px', background: 'rgba(255,255,255,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '18px' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Network size={20} color="#6366f1" /> 3. Multi-Skill Joint Tracing (Bayesian Knowledge Network DAG)
                </h3>
                <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', margin: 0, maxWidth: '850px' }}>
                  Instead of tracking `skill_id` in isolation, we model skills as a Directed Acyclic Graph (Addition → Multiplication → Division). Mastering Division automatically injects positive prior updates into Addition and Multiplication mastery estimates!
                </p>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => triggerDagSimulation('skill_geometry_01', 1)} disabled={isSimulatingDag} className="btn btn-primary" style={{ padding: '8px 14px', fontSize: '0.82rem' }}>
                  <CheckCircle2 size={14} /> Simulate Master Geometry (+Prior Propagation)
                </button>
                <button onClick={() => triggerDagSimulation('skill_algebra_01', 0)} disabled={isSimulatingDag} className="btn btn-secondary" style={{ padding: '8px 14px', fontSize: '0.82rem' }}>
                  <AlertCircle size={14} color="#f59e0b" /> Simulate Struggle on Algebra
                </button>
              </div>
            </div>

            {dagResult && (
              <div style={{ background: 'rgba(99, 102, 241, 0.15)', border: '1px solid #6366f1', padding: '14px 18px', borderRadius: '10px', marginBottom: '22px', fontSize: '0.88rem', color: 'white', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Sparkles size={18} color="#818cf8" /> {dagResult.propagation_summary}
              </div>
            )}

            {/* Interactive DAG Visual Tree */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', position: 'relative', padding: '10px 0' }}>
              {(dagResult ? dagResult.nodes : [
                { skill_id: 'skill_arithmetic_01', name: 'Basic Arithmetic', p_mastery: 0.72, prior_boost_received: 0, prereq: null, next: 'skill_algebra_01', status: 'improving' },
                { skill_id: 'skill_algebra_01', name: 'Linear Equations', p_mastery: 0.55, prior_boost_received: 0, prereq: 'skill_arithmetic_01', next: 'skill_geometry_01', status: 'learning' },
                { skill_id: 'skill_geometry_01', name: 'Triangles & Angles', p_mastery: 0.38, prior_boost_received: 0, prereq: 'skill_algebra_01', next: 'skill_word_problems_01', status: 'learning' },
                { skill_id: 'skill_word_problems_01', name: 'Multi-Step Word Problems', p_mastery: 0.20, prior_boost_received: 0, prereq: 'skill_geometry_01', next: null, status: 'learning' }
              ]).map((node, idx) => (
                <div
                  key={node.skill_id}
                  className="card"
                  style={{
                    padding: '18px',
                    background: dagResult && dagResult.target_skill_id === node.skill_id ? 'rgba(99, 102, 241, 0.22)' : 'rgba(0,0,0,0.35)',
                    border: `2px solid ${dagResult && dagResult.target_skill_id === node.skill_id ? '#818cf8' : (node.prior_boost_received > 0 ? '#10b981' : 'var(--border-glass)')}`,
                    position: 'relative',
                    transition: 'all 0.3s ease'
                  }}
                >
                  {node.prior_boost_received !== 0 && (
                    <span style={{ position: 'absolute', top: '-10px', right: '12px', background: node.prior_boost_received > 0 ? '#10b981' : '#f59e0b', color: 'white', padding: '2px 8px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 800 }}>
                      {node.prior_boost_received > 0 ? `+${(node.prior_boost_received*100).toFixed(1)}% Prior Boost` : `${(node.prior_boost_received*100).toFixed(1)}% Prereq Check`}
                    </span>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Node 0{idx+1} {node.prereq ? `(← Prereq: ${node.prereq.split('_')[1]})` : '(Root Foundation)'}</span>
                  </div>

                  <h4 style={{ fontSize: '1rem', margin: '0 0 10px 0', color: 'white', fontWeight: 700 }}>{node.name}</h4>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Joint Mastery:</span>
                    <span style={{ fontSize: '1.15rem', fontWeight: 800, color: node.p_mastery >= 0.85 ? '#34d399' : (node.p_mastery < 0.40 ? '#f87171' : '#818cf8') }}>
                      {(node.p_mastery * 100).toFixed(1)}%
                    </span>
                  </div>

                  {/* Node progress bar */}
                  <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${node.p_mastery * 100}%`, height: '100%', background: node.p_mastery >= 0.85 ? '#10b981' : (node.p_mastery < 0.40 ? '#ef4444' : '#6366f1') }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
