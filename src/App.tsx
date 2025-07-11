import React, { useState, useEffect } from 'react';
import LoginForm from './components/Auth/LoginForm';
import Sidebar from './components/Layout/Sidebar';
import Header from './components/Layout/Header';
import DashboardStats from './components/Dashboard/DashboardStats';
import RecentActivities from './components/Dashboard/RecentActivities';
import AssetTable from './components/Assets/AssetTable';
import LifecycleManager from './components/Lifecycle/LifecycleManager';
import MaintenanceTickets from './components/Maintenance/MaintenanceTickets';
import ReportsPanel from './components/Reports/ReportsPanel';
import AuditTrail from './components/Audit/AuditTrail';
import AssetModal from './components/Assets/AssetModal';
import { Asset, LifecycleAction, MaintenanceTicket, AuditLog, User, DashboardStats as StatsType } from './types';
import { assetsService, lifecycleService, maintenanceService, auditService, usersService, assetStatusService } from './lib/supabase';
import { v4 as uuidv4 } from 'uuid';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [lifecycleActions, setLifecycleActions] = useState<LifecycleAction[]>([]);
  const [maintenanceTickets, setMaintenanceTickets] = useState<MaintenanceTicket[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [dashboardModalOpen, setDashboardModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load data when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadAllData();
    }
  }, [isAuthenticated]);

  const loadAllData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [assetsData, lifecycleData, maintenanceData, auditData] = await Promise.all([
        assetsService.getAll(),
        lifecycleService.getAll(),
        maintenanceService.getAll(),
        auditService.getAll()
      ]);

      setAssets(assetsData);
      setLifecycleActions(lifecycleData);
      setMaintenanceTickets(maintenanceData);
      setAuditLogs(auditData);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (personalNumber: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('App handleLogin called with:', { personalNumber, password: '***' });
      
      const user = await usersService.authenticate(personalNumber, password);
      console.log('Authentication result:', user);
      
      if (user) {
        console.log('Setting user and authenticated state');
        setCurrentUser(user);
        setIsAuthenticated(true);
      } else {
        console.log('Authentication failed - invalid credentials');
        setError('Invalid credentials');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    setActiveTab('dashboard');
    setAssets([]);
    setLifecycleActions([]);
    setMaintenanceTickets([]);
    setAuditLogs([]);
  };

  const handleDashboardAddAsset = () => {
    setDashboardModalOpen(true);
  };

  const handleDashboardSaveAsset = async (assetData: Partial<Asset>) => {
    try {
      setLoading(true);
      
      // Ensure new assets go to ICT Store with ICT Manager
      const newAssetData = {
        ...assetData,
        user: 'ICT Manager',
        location: 'ICT Store',
        department: 'ICT',
        status: 'In Store'
      };
      
      const newAsset = await assetsService.create(newAssetData as Omit<Asset, 'id' | 'createdAt' | 'updatedAt'>);
      setAssets([newAsset, ...assets]);
      
      // Add audit log
      const auditEntry: Omit<AuditLog, 'id'> = {
        assetId: newAsset.tag,
        action: 'Asset Created',
        performedBy: currentUser?.name || 'Unknown',
        timestamp: new Date().toISOString(),
        details: `New ${newAsset.assetType} asset created: ${newAsset.brand} ${newAsset.model} - Assigned to ICT Manager`,
        newValues: { 
          status: newAsset.status, 
          location: newAsset.location,
          user: newAsset.user,
          department: newAsset.department
        }
      };
      
      const savedAuditLog = await auditService.create(auditEntry);
      setAuditLogs([savedAuditLog, ...auditLogs]);
    } catch (err) {
      console.error('Error saving asset:', err);
      setError('Failed to save asset');
    } finally {
      setLoading(false);
    }
  };

  const handleAssetUpdate = async (updatedAssets: Asset[]) => {
    setAssets(updatedAssets);
    // Reload data to ensure all components are in sync
    await loadAllData();
  };

  const handleAuditLog = async (log: Omit<AuditLog, 'id'>) => {
    try {
      const savedLog = await auditService.create(log);
      setAuditLogs([savedLog, ...auditLogs]);
      // Reload assets to reflect any status changes
      const assetsData = await assetsService.getAll();
      setAssets(assetsData);
    } catch (err) {
      console.error('Error saving audit log:', err);
    }
  };

  const getDashboardStats = (): StatsType => {
    return {
      totalAssets: assets.length,
      activeAssets: assets.filter(a => a.status === 'Active').length,
      inStore: assets.filter(a => a.status === 'In Store').length,
      inMaintenance: assets.filter(a => a.status === 'Under Maintenance').length,
      obsoleteAssets: assets.filter(a => a.status === 'Obsolete').length,
      pcAssets: assets.filter(a => a.assetType === 'PC').length,
      vdiAssets: assets.filter(a => a.assetType === 'VDI').length,
      recentActivities: auditLogs.slice(0, 10)
    };
  };

  const renderContent = () => {
    if (loading && assets.length === 0) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#CC092F]"></div>
        </div>
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-black">Dashboard</h1>
                <p className="text-gray-600">Overview of your IT assets and activities</p>
              </div>
              <button 
                onClick={handleDashboardAddAsset}
                disabled={loading}
                className="bg-[#CC092F] text-white px-4 py-2 rounded-lg hover:bg-[#AA0726] flex items-center space-x-2 disabled:opacity-50"
              >
                <span>Quick Add Asset</span>
              </button>
            </div>
            <DashboardStats stats={getDashboardStats()} />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <AssetTable 
                  assets={assets}
                  onAssetUpdate={handleAssetUpdate}
                  onAuditLog={handleAuditLog}
                  currentUser={currentUser?.name || 'Unknown'}
                />
              </div>
              <div>
                <RecentActivities activities={auditLogs.slice(0, 10)} />
              </div>
            </div>
          </div>
        );
      case 'assets':
        return (
          <AssetTable 
            assets={assets}
            onAssetUpdate={handleAssetUpdate}
            onAuditLog={handleAuditLog}
            currentUser={currentUser?.name || 'Unknown'}
          />
        );
      case 'lifecycle':
        return <LifecycleManager 
          actions={lifecycleActions} 
          onActionUpdate={setLifecycleActions}
          onAuditLog={handleAuditLog}
          currentUser={currentUser?.name || 'Unknown'}
        />;
      case 'maintenance':
        return <MaintenanceTickets 
          tickets={maintenanceTickets} 
          onTicketUpdate={setMaintenanceTickets}
          onAuditLog={handleAuditLog}
          currentUser={currentUser?.name || 'Unknown'}
        />;
      case 'reports':
        return <ReportsPanel assets={assets} tickets={maintenanceTickets} actions={lifecycleActions} />;
      case 'audit':
        return <AuditTrail auditLogs={auditLogs} />;
      case 'settings':
        return (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-black mb-4">System Settings</h3>
            <p className="text-gray-600">Settings panel coming soon...</p>
          </div>
        );
      default:
        return null;
    }
  };

  if (!isAuthenticated) {
    return <LoginForm onLogin={handleLogin} loading={loading} error={error} />;
  }

  return (
    <div className="flex h-screen bg-[#F4F4F4]">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header currentUser={currentUser?.name} onLogout={handleLogout} />
        <main className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-700">{error}</p>
              <button 
                onClick={() => setError(null)}
                className="text-red-600 hover:text-red-800 text-sm mt-2"
              >
                Dismiss
              </button>
            </div>
          )}
          {renderContent()}
        </main>
      </div>
      
      <AssetModal
        isOpen={dashboardModalOpen}
        onClose={() => setDashboardModalOpen(false)}
        onSave={handleDashboardSaveAsset}
        asset={null}
        mode="add"
      />
    </div>
  );
}

export default App;