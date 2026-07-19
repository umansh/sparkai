import React from 'react';
import { Sparkles, Wifi, WifiOff, Radio, RefreshCw, LayoutDashboard, PlayCircle, Database, Sliders } from 'lucide-react';
import { networkService } from '../services/api';

interface NavbarProps {
  activeTab: 'classroom' | 'practice' | 'sync_inspector' | 'algorithm_lab';
  setActiveTab: (tab: 'classroom' | 'practice' | 'sync_inspector' | 'algorithm_lab') => void;
  isOffline: boolean;
  setIsOffline: (val: boolean) => void;
  is2G: boolean;
  setIs2G: (val: boolean) => void;
  pendingCount: number;
  onSyncNow: () => void;
  isSyncing: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  isOffline,
  setIsOffline,
  is2G,
  setIs2G,
  pendingCount,
  onSyncNow,
  isSyncing
}) => {
  const toggleOffline = () => {
    const newVal = !isOffline;
    setIsOffline(newVal);
    networkService.setSimulatedOffline(newVal);
    if (!newVal && pendingCount > 0) {
      onSyncNow();
    }
  };

  const toggle2G = () => {
    const newVal = !is2G;
    setIs2G(newVal);
    networkService.set2GSimulation(newVal);
  };

  return (
    <nav className="glass-panel" style={{ margin: '16px', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ background: 'var(--accent-gradient)', padding: '10px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Sparkles size={24} color="white" />
        </div>
        <div>
          <h1 className="header-title" style={{ fontSize: '1.4rem', margin: 0 }}>SparkSchool AI</h1>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>Adaptive Knowledge Tracing & Offline-First Engine</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', background: 'rgba(0,0,0,0.25)', padding: '6px', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
        <button
          onClick={() => setActiveTab('classroom')}
          className={`btn ${activeTab === 'classroom' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '8px 16px', fontSize: '0.88rem' }}
        >
          <LayoutDashboard size={16} /> Classroom Dashboard
        </button>
        <button
          onClick={() => setActiveTab('practice')}
          className={`btn ${activeTab === 'practice' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '8px 16px', fontSize: '0.88rem' }}
        >
          <PlayCircle size={16} /> Live Practice Arena
        </button>
        <button
          onClick={() => setActiveTab('sync_inspector')}
          className={`btn ${activeTab === 'sync_inspector' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '8px 16px', fontSize: '0.88rem' }}
        >
          <Database size={16} /> Sync & Network Inspector
          {pendingCount > 0 && (
            <span style={{ background: '#ec4899', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem' }}>
              {pendingCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('algorithm_lab')}
          className={`btn ${activeTab === 'algorithm_lab' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '8px 16px', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Sliders size={16} /> AI & Algorithm Lab
          <span style={{ background: '#10b981', color: 'white', padding: '1px 6px', borderRadius: '10px', fontSize: '0.68rem', fontWeight: 600 }}>NEW</span>
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={toggleOffline}
            className={`btn ${isOffline ? 'btn-danger' : 'btn-secondary'}`}
            style={{ padding: '8px 14px', fontSize: '0.82rem', border: isOffline ? '1px solid #ef4444' : undefined }}
            title="Simulate network dropout / offline classroom"
          >
            {isOffline ? <WifiOff size={16} /> : <Wifi size={16} color="#10b981" />}
            {isOffline ? 'Offline Mode' : 'Online'}
          </button>

          <button
            onClick={toggle2G}
            disabled={isOffline}
            className={`btn ${is2G ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '8px 14px', fontSize: '0.82rem' }}
            title="Simulate slow 2G/3G government school network delay"
          >
            <Radio size={16} />
            {is2G ? '2G/3G Sim Active (Lag)' : 'Normal Speed'}
          </button>
        </div>

        {pendingCount > 0 && (
          <button
            onClick={onSyncNow}
            disabled={isOffline || isSyncing}
            className="btn btn-success"
            style={{ padding: '8px 16px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={16} className={isSyncing ? 'animate-pulse' : ''} />
            {isSyncing ? 'Syncing...' : `Sync (${pendingCount} queued)`}
          </button>
        )}
      </div>
    </nav>
  );
};
