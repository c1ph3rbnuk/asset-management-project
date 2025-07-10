import React, { useState, useEffect } from 'react';
import { RefreshCw, Clock, CheckCircle, Plus, Download, FileText } from 'lucide-react';
import { LifecycleAction, AuditLog } from '../../types';
import LifecycleModal from './LifecycleModal';
import { lifecycleService, assetStatusService } from '../../lib/supabase';
import { v4 as uuidv4 } from 'uuid';

interface LifecycleManagerProps {
  actions: LifecycleAction[];
  onActionUpdate: (actions: LifecycleAction[]) => void;
  onAuditLog: (log: AuditLog) => void;
  currentUser: string;
}

const LifecycleManager: React.FC<LifecycleManagerProps> = ({ 
  actions, 
  onActionUpdate, 
  onAuditLog, 
  currentUser 
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedActionType, setSelectedActionType] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load actions from database on component mount
  useEffect(() => {
    loadActions();
  }, []);

  const loadActions = async () => {
    try {
      setLoading(true);
      const data = await lifecycleService.getAll();
      onActionUpdate(data);
    } catch (err) {
      console.error('Error loading lifecycle actions:', err);
      setError('Failed to load lifecycle actions');
    } finally {
      setLoading(false);
    }
  };

  const handleActionTypeClick = (actionType: string) => {
    setSelectedActionType(actionType);
    setModalOpen(true);
  };

  const handleSaveAction = async (actionData: Partial<LifecycleAction>, movementForm?: File) => {
    try {
      setLoading(true);
      setError(null);

      // Validate required fields
      if (!actionData.actionType) {
        throw new Error('Action type is required');
      }
      if (!actionData.assetId) {
        throw new Error('Asset ID is required');
      }
      if (!actionData.toUser) {
        throw new Error('To User is required');
      }
      if (!actionData.toLocation) {
        throw new Error('To Location is required');
      }
      if (!actionData.toDepartment) {
        throw new Error('To Department is required');
      }

      const newAction = {
        ...actionData,
        actionType: actionData.actionType,
        requestDate: new Date().toISOString(),
        requestedBy: currentUser
      };

      // Save to database
      const savedAction = await lifecycleService.create(newAction as Omit<LifecycleAction, 'id'>);

      // Upload movement form if provided
      if (movementForm) {
        const filePath = await lifecycleService.uploadMovementForm(movementForm, savedAction.id);
        savedAction.movementFormPath = filePath;
      }

      // Update asset status based on action type
      await updateAssetStatusForAction(savedAction);

      // Update local state
      onActionUpdate([savedAction, ...actions]);

      // Add audit log
      onAuditLog({
        assetId: savedAction.assetId,
        action: `${savedAction.actionType} Request Created`,
        performedBy: currentUser,
        timestamp: new Date().toISOString(),
        details: `${savedAction.actionType} request created for asset ${savedAction.assetId}`,
        newValues: {
          fromUser: savedAction.fromUser,
          toUser: savedAction.toUser,
          fromLocation: savedAction.fromLocation,
          toLocation: savedAction.toLocation,
          status: savedAction.status
        }
      });

    } catch (err) {
      console.error('Error saving lifecycle action:', err);
      setError('Failed to save lifecycle action');
    } finally {
      setLoading(false);
    }
  };

  const updateAssetStatusForAction = async (action: LifecycleAction) => {
    try {
      let newStatus: Asset['status'] | null = null;
      let shouldUpdateOwnership = false;
      
      switch (action.actionType) {
        case 'New Deployment':
        case 'Redeployment':
          newStatus = 'Active';
          shouldUpdateOwnership = true;
          break;
        case 'Surrender':
          newStatus = 'In Store';
          shouldUpdateOwnership = true;
          break;
        case 'Relocation':
        case 'Change of Ownership':
          // Keep current status but update ownership
          shouldUpdateOwnership = true;
          break;
        case 'Exit':
          newStatus = 'In Store';
          shouldUpdateOwnership = true;
          break;
      }
      
      if (shouldUpdateOwnership) {
        // Determine the new owner based on action type
        let newUser = action.toUser;
        let newLocation = action.toLocation;
        let newDepartment = action.toDepartment;
        
        // For surrender and exit, asset goes back to ICT Manager
        if (action.actionType === 'Surrender' || action.actionType === 'Exit') {
          newUser = 'ICT Manager';
          newLocation = 'ICT Store';
          newDepartment = 'ICT';
        }
        
        await assetStatusService.updateAssetOwnership(
          action.assetId,
          newUser,
          newLocation,
          newDepartment,
          newStatus || undefined
        );
      } else if (newStatus) {
        await assetStatusService.updateAssetStatus(action.assetId, newStatus);
      }
    } catch (err) {
      console.error('Error updating asset status:', err);
      // Don't throw error to prevent blocking the main action
    }
  };

  const handleApproveAction = async (actionId: string) => {
    try {
      setLoading(true);
      const updates = {
        status: 'Completed',
        completionDate: new Date().toISOString()
      };

      await lifecycleService.update(actionId, updates);

      const updatedActions = actions.map(action =>
        action.id === actionId ? { ...action, ...updates } : action
      );
      onActionUpdate(updatedActions);

      const action = actions.find(a => a.id === actionId);
      if (action) {
        // Update asset status when action is completed
        await updateAssetStatusForAction(action);
        
        onAuditLog({
          assetId: action.assetId,
          action: `${action.actionType} Completed`,
          performedBy: currentUser,
          timestamp: new Date().toISOString(),
          details: `${action.actionType} request completed for asset ${action.assetId}`,
          oldValues: { 
            status: 'Pending',
            ...(action.fromUser && { user: action.fromUser }),
            ...(action.fromLocation && { location: action.fromLocation }),
            ...(action.fromDepartment && { department: action.fromDepartment })
          },
          newValues: { 
            status: 'Completed',
            user: action.actionType === 'Surrender' || action.actionType === 'Exit' ? 'ICT Manager' : action.toUser,
            location: action.actionType === 'Surrender' || action.actionType === 'Exit' ? 'ICT Store' : action.toLocation,
            department: action.actionType === 'Surrender' || action.actionType === 'Exit' ? 'ICT' : action.toDepartment
          }
        });
      }
    } catch (err) {
      console.error('Error updating lifecycle action:', err);
      setError('Failed to update lifecycle action');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadMovementForm = async (action: LifecycleAction) => {
    if (!action.movementFormPath) return;

    try {
      const url = await lifecycleService.getMovementFormUrl(action.movementFormPath);
      if (url) {
        window.open(url, '_blank');
      }
    } catch (err) {
      console.error('Error downloading movement form:', err);
      setError('Failed to download movement form');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Completed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'Pending': return <Clock className="h-4 w-4 text-yellow-500" />;
      default: return <RefreshCw className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'bg-green-100 text-green-800';
      case 'Pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getActionTypeColor = (actionType: string) => {
    switch (actionType) {
      case 'New Deployment': return 'bg-blue-100 text-blue-700';
      case 'Redeployment': return 'bg-green-100 text-green-700';
      case 'Relocation': return 'bg-purple-100 text-purple-700';
      case 'Surrender': return 'bg-orange-100 text-orange-700';
      case 'Change of Ownership': return 'bg-indigo-100 text-indigo-700';
      case 'Exit': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading && actions.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#CC092F]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
          <button 
            onClick={() => setError(null)}
            className="text-red-600 hover:text-red-800 text-sm mt-2"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-black">Lifecycle Management</h3>
          <div className="text-sm text-gray-600">
            ICT Officer Actions - No approvals required
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {['New Deployment', 'Redeployment', 'Relocation', 'Surrender', 'Change of Ownership', 'Exit'].map((actionType) => (
            <button
              key={actionType}
              onClick={() => handleActionTypeClick(actionType)}
              disabled={loading}
              className={`p-4 rounded-lg border-2 border-dashed border-gray-300 hover:border-[#CC092F] hover:bg-gray-50 text-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${getActionTypeColor(actionType)}`}
            >
              <RefreshCw className="h-6 w-6 mx-auto mb-2" />
              <p className="text-sm font-medium">{actionType}</p>
              {actionType === 'Redeployment' && (
                <p className="text-xs text-gray-600 mt-1">From ICT Store</p>
              )}
              {actionType === 'Surrender' && (
                <p className="text-xs text-gray-600 mt-1">To ICT Store</p>
              )}
            </button>
          ))}
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-black">Recent Actions</h3>
            <button 
              onClick={loadActions}
              disabled={loading}
              className="text-[#CC092F] hover:text-[#AA0726] text-sm flex items-center space-x-1 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#F4F4F4]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Asset</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">From/To</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ICT Officer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Movement Form</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {actions.map((action) => (
                <tr key={action.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getActionTypeColor(action.actionType)}`}>
                      {action.actionType}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <p className="text-sm text-black">{action.assetId}</p>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm">
                      <p className="text-black">{action.fromUser || action.fromLocation || 'N/A'} →</p>
                      <p className="text-black">{action.toUser || action.toLocation}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <p className="text-sm text-black">{action.requestedBy}</p>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(action.status)}`}>
                      {getStatusIcon(action.status)}
                      <span className="ml-1">{action.status}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <p className="text-sm text-black">{new Date(action.requestDate).toLocaleDateString()}</p>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {action.movementFormPath ? (
                      <button
                        onClick={() => handleDownloadMovementForm(action)}
                        className="flex items-center space-x-1 text-[#CC092F] hover:text-[#AA0726] text-sm"
                      >
                        <FileText className="h-4 w-4" />
                        <span>Download</span>
                      </button>
                    ) : (
                      <span className="text-gray-400 text-sm">No form</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex items-center space-x-2">
                      {action.status === 'Pending' && (
                        <button
                          onClick={() => handleApproveAction(action.id)}
                          disabled={loading}
                          className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs hover:bg-green-200 disabled:opacity-50"
                        >
                          Complete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      <LifecycleModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveAction}
        actionType={selectedActionType}
      />
    </div>
  );
};

export default LifecycleManager;