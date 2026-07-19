import { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { StudentDashboard } from './components/StudentDashboard';
import { PracticeArena } from './components/PracticeArena';
import { SyncControlPanel } from './components/SyncControlPanel';
import { AlgorithmLab } from './components/AlgorithmLab';
import { offlineQueueService } from './services/offlineQueue';
import { networkService } from './services/api';

export function App() {
  const [activeTab, setActiveTab] = useState<'classroom' | 'practice' | 'sync_inspector' | 'algorithm_lab'>('classroom');
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [is2G, setIs2G] = useState<boolean>(false);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [selectedPracticeStudentId, setSelectedPracticeStudentId] = useState<string | undefined>(undefined);

  useEffect(() => {
    checkPendingQueue();
    const timer = setInterval(checkPendingQueue, 2000);

    const handleOnline = () => {
      setIsOffline(false);
      networkService.setSimulatedOffline(false);
      handleSyncNow();
    };
    const handleOffline = () => {
      setIsOffline(true);
      networkService.setSimulatedOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (!navigator.onLine) {
      handleOffline();
    }

    return () => {
      clearInterval(timer);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isSyncing]);

  const checkPendingQueue = async () => {
    const items = await offlineQueueService.getPendingSubmissions();
    setPendingCount(items.length);
  };

  const handleSyncNow = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const { errors } = await offlineQueueService.syncAll('http://localhost:8000');
      await checkPendingQueue();
      if (errors > 0) {
        alert(`Sync completed with ${errors} network errors. Check backend connectivity.`);
      }
    } catch (e) {
      alert('Sync failed due to network error or server offline. Data remains safely queued in IndexedDB.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSelectStudentForPractice = (student_id: string) => {
    setSelectedPracticeStudentId(student_id);
    setActiveTab('practice');
  };

  return (
    <div style={{ paddingBottom: '60px' }}>
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isOffline={isOffline}
        setIsOffline={setIsOffline}
        is2G={is2G}
        setIs2G={setIs2G}
        pendingCount={pendingCount}
        onSyncNow={handleSyncNow}
        isSyncing={isSyncing}
      />

      <main style={{ marginTop: '20px' }}>
        {activeTab === 'classroom' && (
          <StudentDashboard onSelectStudentForPractice={handleSelectStudentForPractice} />
        )}
        {activeTab === 'practice' && (
          <PracticeArena
            initialStudentId={selectedPracticeStudentId}
            onSubmissionQueued={checkPendingQueue}
          />
        )}
        {activeTab === 'sync_inspector' && (
          <SyncControlPanel
            onSyncTriggered={handleSyncNow}
            isSyncing={isSyncing}
          />
        )}
        {activeTab === 'algorithm_lab' && (
          <AlgorithmLab />
        )}
      </main>
    </div>
  );
}

export default App;
