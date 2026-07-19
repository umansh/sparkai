import React, { useState, useEffect } from 'react';
import { Database, RefreshCw, Trash2, CheckCircle2, Radio, Zap, AlertCircle } from 'lucide-react';
import type { QueuedSubmission } from '../types';
import { offlineQueueService } from '../services/offlineQueue';
import { apiService } from '../services/api';
import { formatDateTimeDDMMYYYY } from '../utils/dateFormatter';

interface SyncControlPanelProps {
  onSyncTriggered: () => void;
  isSyncing: boolean;
}

export const SyncControlPanel: React.FC<SyncControlPanelProps> = ({ onSyncTriggered, isSyncing }) => {
  const [pendingItems, setPendingItems] = useState<QueuedSubmission[]>([]);
  const [logs, setLogs] = useState<{ timestamp: string; message: string; status: 'success' | 'warning' | 'error' }[]>([]);
  const [resetState, setResetState] = useState<'confirming' | 'resetting' | 'success' | null>(null);

  useEffect(() => {
    loadQueueAndLogs();
    const interval = setInterval(loadQueueAndLogs, 2000);
    return () => clearInterval(interval);
  }, []);

  const loadQueueAndLogs = async () => {
    const items = await offlineQueueService.getPendingSubmissions();
    const lgs = await offlineQueueService.getSyncLogs();
    setPendingItems(items);
    setLogs(lgs);
  };

  const handleClearQueue = async () => {
    await offlineQueueService.clearQueue();
    loadQueueAndLogs();
  };

  const handleInjectDuplicate = async () => {
    // Inject a duplicate submission item with a fixed ID or clone existing
    const dupId = 'submission_idempotency_demo_12345';
    const fakeSubmission: QueuedSubmission = {
      submission_id: dupId,
      student_id: 'student_001_improving',
      skill_id: 'skill_arithmetic_01',
      correct: 1,
      timestamp: new Date().toISOString(),
      response_time_ms: 3200,
      status: 'pending',
      retry_count: 0
    };
    await offlineQueueService.addSubmission(fakeSubmission);
    await offlineQueueService.logSync(`Injected test payload with ID: ${dupId} for idempotency verification.`, 'warning');
    loadQueueAndLogs();
  };

  const handleResetDB = () => {
    setResetState('confirming');
  };

  const executeResetDB = async () => {
    setResetState('resetting');
    try {
      await apiService.resetAndSeedDB();
      await offlineQueueService.logSync('Backend database reset and re-seeded from student_responses.csv.', 'success');
      loadQueueAndLogs();
      setResetState('success');
      setTimeout(() => {
        setResetState(prev => (prev === 'success' ? null : prev));
      }, 5000);
    } catch (err) {
      await offlineQueueService.logSync('Failed to reset SQLite database.', 'error');
      setResetState(null);
    }
  };

  return (
    <div className="container">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '24px' }}>
        
        {/* Left Box: IndexedDB Queue Management & Idempotency Testing */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '1.4rem', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Database color="var(--accent-primary)" /> IndexedDB Offline Queue Inspector
            </h2>
            <span style={{ background: pendingItems.length > 0 ? '#ec4899' : '#10b981', color: 'white', padding: '4px 12px', borderRadius: '20px', fontSize: '0.82rem', fontWeight: 600 }}>
              {pendingItems.length} Queued
            </span>
          </div>

          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '20px', lineHeight: 1.5 }}>
            When students answer questions while network is dropped or unstable (`Offline Mode`), payloads are stored securely in browser <strong>IndexedDB</strong>. Each item carries a client-generated UUID (`submission_id`) ensuring zero duplication during 2G/3G retry syncs.
          </p>

          {/* Action controls */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px' }}>
            <button
              onClick={onSyncTriggered}
              disabled={isSyncing || pendingItems.length === 0}
              className="btn btn-success"
              style={{ flex: 1, padding: '10px', fontSize: '0.88rem' }}
            >
              <RefreshCw size={16} className={isSyncing ? 'animate-pulse' : ''} />
              {isSyncing ? 'Syncing to Backend...' : 'Sync Pending Batch'}
            </button>

            <button
              onClick={handleInjectDuplicate}
              className="btn btn-secondary"
              style={{ flex: 1, padding: '10px', fontSize: '0.85rem' }}
              title="Inject identical ID payload twice to demonstrate server idempotency check"
            >
              <Zap size={16} color="#f59e0b" /> Test Idempotency (Duplicate ID)
            </button>

            <button
              onClick={handleClearQueue}
              disabled={pendingItems.length === 0}
              className="btn btn-danger"
              style={{ padding: '10px', fontSize: '0.85rem' }}
            >
              <Trash2 size={16} /> Clear Queue
            </button>
          </div>

          {/* Queued Items List */}
          <h4 style={{ fontSize: '0.95rem', marginBottom: '12px', color: 'var(--text-muted)' }}>Pending Queue Contents (`response_queue` store):</h4>
          {pendingItems.length === 0 ? (
            <div className="glass-card" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
              <CheckCircle2 size={32} color="#10b981" style={{ margin: '0 auto 10px' }} />
              <div>No pending submissions. All client responses are fully synchronized with SQLite database.</div>
            </div>
          ) : (
            <div style={{ maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {pendingItems.map((item) => (
                <div key={item.submission_id} className="glass-card" style={{ background: 'rgba(0,0,0,0.35)', padding: '12px 14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'white' }}>{item.student_id}</span>
                    <span style={{ fontSize: '0.75rem', background: item.correct === 1 ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)', color: item.correct === 1 ? '#10b981' : '#ef4444', padding: '2px 8px', borderRadius: '10px' }}>
                      {item.correct === 1 ? 'Correct' : 'Incorrect'} ({item.response_time_ms}ms)
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Skill: {item.skill_id}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Queued: <strong style={{ color: '#f59e0b' }}>{formatDateTimeDDMMYYYY(item.timestamp)}</strong>
                  </div>
                  <div style={{ fontSize: '0.75rem', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-muted)', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    UUID: {item.submission_id}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Demo Reset Helper:</span>
            <button onClick={handleResetDB} className="btn btn-secondary" style={{ padding: '6px 14px', fontSize: '0.8rem' }}>
              Reset SQLite from Seed CSV
            </button>
          </div>

          {resetState === 'confirming' && (
            <div className="glass-card" style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', padding: '16px', borderRadius: '12px', marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f87171', fontWeight: 600, fontSize: '0.95rem' }}>
                <AlertCircle size={18} /> Confirm Database Reset
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Are you sure you want to reset the SQLite database and reload fresh seed data from CSV? This will wipe recent live attempts and restore baseline student parameters.
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
                <button onClick={() => setResetState(null)} className="btn btn-secondary" style={{ padding: '6px 14px', fontSize: '0.82rem' }}>
                  Cancel
                </button>
                <button onClick={executeResetDB} className="btn btn-danger" style={{ padding: '6px 14px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Trash2 size={14} /> Yes, Reset & Re-Seed
                </button>
              </div>
            </div>
          )}

          {resetState === 'resetting' && (
            <div className="glass-card" style={{ background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.4)', padding: '14px 16px', borderRadius: '12px', marginTop: '16px', display: 'flex', alignItems: 'center', gap: '10px', color: '#f59e0b', fontSize: '0.88rem', fontWeight: 500 }}>
              <RefreshCw size={18} className="spin-animation" /> Resetting SQLite database and re-seeding from student_responses.csv...
            </div>
          )}

          {resetState === 'success' && (
            <div className="glass-card" style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.4)', padding: '14px 16px', borderRadius: '12px', marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#34d399', fontSize: '0.88rem', fontWeight: 500 }}>
                <CheckCircle2 size={18} /> SQLite database successfully reset and re-seeded from CSV!
              </div>
              <button onClick={() => setResetState(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem', padding: '0 4px' }}>
                ×
              </button>
            </div>
          )}
        </div>

        {/* Right Box: Sync Logs and Network Resiliency Explanation */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: '1.4rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Radio color="#10b981" /> Sync Transaction Logs & Audit Trail
            </h2>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Every offline queue state transition, sync batch dispatch, and server deduplication outcome is logged below for transparency and interview walkthrough.
            </p>

            <div style={{ maxHeight: '360px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8rem' }}>
              {logs.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', padding: '20px', textAlign: 'center' }}>No sync log events recorded yet.</div>
              ) : (
                logs.map((lg, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      background: lg.status === 'success'
                        ? 'rgba(16, 185, 129, 0.1)'
                        : lg.status === 'error'
                        ? 'rgba(239, 68, 68, 0.1)'
                        : 'rgba(245, 158, 11, 0.1)',
                      borderLeft: `3px solid ${
                        lg.status === 'success'
                          ? '#10b981'
                          : lg.status === 'error'
                          ? '#ef4444'
                          : '#f59e0b'
                      }`
                    }}
                  >
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '3px' }}>
                      {formatDateTimeDDMMYYYY(lg.timestamp)}
                    </div>
                    <div style={{ color: 'white', lineHeight: 1.4 }}>{lg.message}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
