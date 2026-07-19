import React, { useState, useEffect } from 'react';
import { PlayCircle, CheckCircle, XCircle, Zap, Clock, ShieldCheck } from 'lucide-react';
import type { SkillInfo, EstimateSnapshot, RecommendationDetail, StudentSummary } from '../types';
import { apiService } from '../services/api';
import { formatDateTimeDDMMYYYY } from '../utils/dateFormatter';

interface PracticeArenaProps {
  initialStudentId?: string;
  onSubmissionQueued: () => void;
}

export const PracticeArena: React.FC<PracticeArenaProps> = ({ initialStudentId, onSubmissionQueued }) => {
  const [studentId, setStudentId] = useState<string>(initialStudentId || 'student_001_improving');
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [skills, setSkills] = useState<SkillInfo[]>([]);
  const [selectedSkillId, setSelectedSkillId] = useState<string>('skill_arithmetic_01');
  
  const [currentSnapshot, setCurrentSnapshot] = useState<EstimateSnapshot | null>(null);
  const [lastRecommendation, setLastRecommendation] = useState<RecommendationDetail | null>(null);
  const [wasOffline, setWasOffline] = useState<boolean>(false);
  
  const [customTimeMs, setCustomTimeMs] = useState<number>(3500);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [historyLog, setHistoryLog] = useState<{ correct: number; time: number; p: number; action: string; offline: boolean }[]>([]);

  useEffect(() => {
    if (initialStudentId) setStudentId(initialStudentId);
  }, [initialStudentId]);

  useEffect(() => {
    loadSkillsAndSnapshot();
  }, [studentId, selectedSkillId]);

  const loadSkillsAndSnapshot = async () => {
    const [sks, stList] = await Promise.all([
      apiService.listSkills(),
      apiService.listStudents()
    ]);
    setSkills(sks);
    setStudents(stList);
    if (sks.length > 0 && !selectedSkillId) {
      setSelectedSkillId(sks[0].skill_id);
    }
    
    const estimate = await apiService.getStudentEstimate(studentId);
    if (estimate && estimate.skills[selectedSkillId]) {
      setCurrentSnapshot(estimate.skills[selectedSkillId]);
    } else {
      // Baseline initial snapshot
      setCurrentSnapshot({
        student_id: studentId,
        skill_id: selectedSkillId,
        p_mastery: 0.15,
        cognitive_status: 'learning',
        total_attempts: 0,
        consecutive_correct: 0,
        consecutive_quick_guesses: 0,
        recommended_action: 'practice',
        recommended_next_skill: selectedSkillId,
        last_updated: 'N/A'
      });
    }
  };

  const handleSimulatedSubmit = async (correct: number, timeMs: number, _presetName?: string) => {
    setIsSubmitting(true);
    const subId = 'client_sub_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
    
    try {
      const { result, wasOffline: offlineStatus } = await apiService.submitResponse(
        studentId,
        selectedSkillId,
        correct,
        timeMs,
        subId,
        currentSnapshot || undefined
      );

      setCurrentSnapshot(result.updated_estimate);
      setLastRecommendation(result.next_recommendation);
      setWasOffline(offlineStatus);

      setHistoryLog(prev => [
        {
          correct,
          time: timeMs,
          p: result.updated_estimate.p_mastery,
          action: result.next_recommendation.action,
          offline: offlineStatus
        },
        ...prev
      ].slice(0, 15));

      if (offlineStatus) {
        onSubmissionQueued();
      }
    } catch (err: any) {
      alert(`Submission failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'improving': return <span className="badge badge-improving">Improving</span>;
      case 'plateaued': return <span className="badge badge-plateaued">Plateaued</span>;
      case 'guessing': return <span className="badge badge-guessing">Rapid Guessing</span>;
      case 'mastered': return <span className="badge badge-mastered">Mastered</span>;
      default: return <span className="badge badge-learning">Learning</span>;
    }
  };

  return (
    <div className="container">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
        
        {/* Left Control Panel: Profile & Simulation Presets */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '1.4rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <PlayCircle color="var(--accent-primary)" /> Live Practice Arena Simulator
          </h2>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
            Test our dynamic AI estimation engine in real time. Notice how rapid guesses (`&lt; 1000ms`) and consecutive struggles trigger different pedagogical recommendations and cognitive status shifts.
          </p>

          {/* Student Profile Selector */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
              Target Student Profile:
            </label>
            <select
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                background: 'rgba(0,0,0,0.4)',
                border: '1px solid var(--border-glass)',
                borderRadius: '10px',
                color: 'white',
                fontFamily: 'Outfit, sans-serif',
                fontSize: '0.95rem'
              }}
            >
              {students.length > 0 ? (
                students.map((st) => {
                  let desc = `(${(st.overall_mastery * 100).toFixed(0)}% Mastery | ${st.status.toUpperCase()})`;
                  if (st.student_id === 'student_001_improving') desc = '(Starts struggling, then learns)';
                  if (st.student_id === 'student_002_plateaued') desc = '(Stuck around 45% accuracy)';
                  if (st.student_id === 'student_003_guessing') desc = '(Rapid speed clicks, ~35% hits)';
                  if (st.student_id === 'student_004_mastered') desc = '(High performer, fast & accuracy)';
                  return (
                    <option key={st.student_id} value={st.student_id}>
                      {st.student_id} {desc}
                    </option>
                  );
                })
              ) : (
                <>
                  <option value="student_001_improving">student_001_improving (Starts struggling, then learns)</option>
                  <option value="student_002_plateaued">student_002_plateaued (Stuck around 45% accuracy)</option>
                  <option value="student_003_guessing">student_003_guessing (Rapid speed clicks, ~35% hits)</option>
                  <option value="student_004_mastered">student_004_mastered (High performer, fast & accuracy)</option>
                </>
              )}
              <option value="custom_student_demo">custom_student_demo (Fresh slate testing profile)</option>
            </select>
          </div>

          {/* Skill Selector */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
              Target Skill / Concept:
            </label>
            <select
              value={selectedSkillId}
              onChange={(e) => setSelectedSkillId(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                background: 'rgba(0,0,0,0.4)',
                border: '1px solid var(--border-glass)',
                borderRadius: '10px',
                color: 'white',
                fontFamily: 'Outfit, sans-serif',
                fontSize: '0.95rem'
              }}
            >
              {skills.map(sk => (
                <option key={sk.skill_id} value={sk.skill_id}>
                  {sk.name} ({sk.difficulty}) {sk.prereq ? `[Prereq: ${sk.prereq.split('_')[1]}]` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Preset Simulation Action Buttons */}
          <h4 style={{ fontSize: '0.95rem', marginBottom: '12px', borderTop: '1px solid var(--border-glass)', paddingTop: '16px' }}>
            1-Click Behavioral Simulation Presets:
          </h4>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
            <button
              onClick={() => handleSimulatedSubmit(1, 4000, 'Thoughtful Correct')}
              disabled={isSubmitting}
              className="btn btn-success"
              style={{ padding: '14px', flexDirection: 'column', gap: '4px' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.95rem' }}>
                <CheckCircle size={18} /> Thoughtful Correct
              </div>
              <span style={{ fontSize: '0.75rem', opacity: 0.85 }}>4,000ms response time</span>
            </button>

            <button
              onClick={() => handleSimulatedSubmit(1, 480, 'Rapid Lucky Guess')}
              disabled={isSubmitting}
              className="btn"
              style={{ background: 'rgba(236, 72, 153, 0.2)', color: '#ec4899', border: '1px solid rgba(236, 72, 153, 0.4)', padding: '14px', flexDirection: 'column', gap: '4px' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.95rem' }}>
                <Zap size={18} /> Lucky Rapid Guess
              </div>
              <span style={{ fontSize: '0.75rem', opacity: 0.85 }}>480ms speed click (Correct)</span>
            </button>

            <button
              onClick={() => handleSimulatedSubmit(0, 520, 'Careless Rush Error')}
              disabled={isSubmitting}
              className="btn btn-danger"
              style={{ padding: '14px', flexDirection: 'column', gap: '4px' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.95rem' }}>
                <Zap size={18} /> Careless Rush Error
              </div>
              <span style={{ fontSize: '0.75rem', opacity: 0.85 }}>520ms speed click (Wrong)</span>
            </button>

            <button
              onClick={() => handleSimulatedSubmit(0, 38000, 'Long Struggle Error')}
              disabled={isSubmitting}
              className="btn"
              style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.4)', padding: '14px', flexDirection: 'column', gap: '4px' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.95rem' }}>
                <Clock size={18} /> Long Struggle Error
              </div>
              <span style={{ fontSize: '0.75rem', opacity: 0.85 }}>38,000ms duration (Wrong)</span>
            </button>
          </div>

          {/* Custom Response Controls */}
          <div style={{ background: 'rgba(0,0,0,0.25)', padding: '14px', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.85rem' }}>
              <span>Custom Response Duration:</span>
              <span style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>{(customTimeMs / 1000).toFixed(1)} seconds</span>
            </div>
            <input
              type="range"
              min="300"
              max="50000"
              step="100"
              value={customTimeMs}
              onChange={(e) => setCustomTimeMs(Number(e.target.value))}
              style={{ width: '100%', marginBottom: '12px', cursor: 'pointer' }}
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => handleSimulatedSubmit(1, customTimeMs, 'Custom Correct')}
                disabled={isSubmitting}
                className="btn btn-primary"
                style={{ flex: 1, padding: '10px' }}
              >
                Submit Custom Correct
              </button>
              <button
                onClick={() => handleSimulatedSubmit(0, customTimeMs, 'Custom Incorrect')}
                disabled={isSubmitting}
                className="btn btn-secondary"
                style={{ flex: 1, padding: '10px' }}
              >
                Submit Custom Incorrect
              </button>
            </div>
          </div>
        </div>

        {/* Right Output Panel: Real-Time AI Mastery Estimation & Recommendation */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Current Cognitive Status</span>
                <div style={{ marginTop: '6px' }}>
                  {currentSnapshot ? getStatusBadge(currentSnapshot.cognitive_status) : getStatusBadge('learning')}
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Estimated Concept Mastery</span>
                <div style={{ fontSize: '2.2rem', fontWeight: 700, color: 'white' }}>
                  {currentSnapshot ? `${(currentSnapshot.p_mastery * 100).toFixed(1)}%` : '15.0%'}
                </div>
                {currentSnapshot?.last_updated && currentSnapshot.last_updated !== 'N/A' && (
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Updated: {formatDateTimeDDMMYYYY(currentSnapshot.last_updated)}
                  </div>
                )}
              </div>
            </div>

            {/* Mastery Curve Progress Bar */}
            <div style={{ marginBottom: '24px' }}>
              <div className="progress-bg" style={{ height: '16px' }}>
                <div
                  className="progress-fill"
                  style={{ width: currentSnapshot ? `${currentSnapshot.p_mastery * 100}%` : '15%' }}
                ></div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                <span>0% (No Knowledge)</span>
                <span>40% (Scaffolding Bound)</span>
                <span>85% (Mastery Bound)</span>
                <span>100%</span>
              </div>
            </div>

            {/* Recommended Pedagogical Action Card */}
            {lastRecommendation ? (
              <div
                className="glass-card"
                style={{
                  background: lastRecommendation.action === 'scaffold'
                    ? 'rgba(245, 158, 11, 0.12)'
                    : lastRecommendation.action === 'advance'
                    ? 'rgba(6, 182, 212, 0.12)'
                    : 'rgba(99, 102, 241, 0.12)',
                  borderLeft: `4px solid ${
                    lastRecommendation.action === 'scaffold'
                      ? '#f59e0b'
                      : lastRecommendation.action === 'advance'
                      ? '#06b6d4'
                      : '#6366f1'
                  }`,
                  marginBottom: '24px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.05rem', fontWeight: 600, marginBottom: '6px' }}>
                  <ShieldCheck size={20} color={lastRecommendation.action === 'scaffold' ? '#f59e0b' : lastRecommendation.action === 'advance' ? '#06b6d4' : '#6366f1'} />
                  Prescribed Action: {lastRecommendation.action.toUpperCase()}
                  {wasOffline && (
                    <span style={{ fontSize: '0.72rem', background: '#ec4899', color: 'white', padding: '2px 8px', borderRadius: '12px' }}>
                      Offline Optimistic
                    </span>
                  )}
                </div>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', marginBottom: '8px', lineHeight: 1.4 }}>
                  {lastRecommendation.reason}
                </p>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Target Next Skill: <strong style={{ color: 'white' }}>{lastRecommendation.target_skill_id}</strong> ({lastRecommendation.difficulty_adjustment})
                </div>
              </div>
            ) : (
              <div className="glass-card" style={{ marginBottom: '24px', textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>
                Submit a response above to trigger dynamic AI probability updates and pedagogical recommendations.
              </div>
            )}

            {/* Interaction History Log Table */}
            <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '10px' }}>Recent Interaction Sequence Log:</h4>
            {historyLog.length === 0 ? (
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No interaction attempts yet in this session.</div>
            ) : (
              <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {historyLog.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.3)', padding: '8px 12px', borderRadius: '8px', fontSize: '0.82rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {item.correct === 1 ? <CheckCircle size={14} color="#10b981" /> : <XCircle size={14} color="#ef4444" />}
                      <span>{item.correct === 1 ? 'Correct' : 'Incorrect'} ({item.time}ms)</span>
                      {item.offline && <span style={{ color: '#ec4899', fontSize: '0.72rem' }}>[Queued Offline]</span>}
                    </div>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Action: `{item.action}`</span>
                      <strong style={{ color: 'var(--accent-primary)' }}>P(L) = {(item.p * 100).toFixed(1)}%</strong>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
