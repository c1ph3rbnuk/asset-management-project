import React, { useState, useEffect } from 'react';
import { RefreshCw, Clock, CheckCircle, Plus, Download, FileText } from 'lucide-react';
import { LifecycleAction, AuditLog, AssetPair } from '../../types';
import LifecycleModal from './LifecycleModal';
import { lifecycleService, assetStatusService, assetPairsService, assetsService } from '../../lib/supabase';
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
      if (!actionData.primaryAssetSerial) {
        throw new Error('Primary asset serial number is required');
      }
      if (!actionData.secondaryAssetSerial) {
        throw new Error('Secondary asset serial number is required');
      }
      if (!actionData.toUserFullName && actionData.actionType !== 'Surrender') {
        throw new Error('User full name is required');
      }
      if (!actionData.toLocation && actionData.actionType !== 'Surrender') {
        throw new Error('Location is required');
      }
      if (!actionData.toDepartment && actionData.actionType !== 'Surrender') {
        throw new Error('Department is required');
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

      // Handle asset pair creation/updates based on action type
      await handleAssetPairAction(savedAction);

      // Update local state
      onActionUpdate([savedAction, ...actions]);

      // Add audit log
      onAuditLog({
        assetSerial: savedAction.primaryAssetSerial,
        action: `${savedAction.actionType} Request Created`,
        performedBy: currentUser,
        timestamp: new Date().toISOString(),
        details: `${savedAction.actionType} request created for asset pair ${savedAction.primaryAssetSerial} + ${savedAction.secondaryAssetSerial}`,
        newValues: {
          fromUser: savedAction.fromUserFullName,
          toUser: savedAction.toUserFullName,
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

  const handleAssetPairAction = async (action: LifecycleAction) => {
    try {
      // Get the assets
      const primaryAsset = await assetsService.getBySerial(action.primaryAssetSerial);
      
      if (!primaryAsset) {
        throw new Error('Primary asset not found');
      }
      
      // For individual assets, we don't need a secondary asset
      let secondaryAsset = null;
      if (action.deploymentType === 'Pair' && action.secondaryAssetSerial) {
        secondaryAsset = await assetsService.getBySerial(action.secondaryAssetSerial);
        if (!secondaryAsset) {
          throw new Error('Secondary asset not found');
        }
      }
      
      let assetPair: AssetPair | null = null;
      
      // For pair deployments, check if asset pair already exists
      if (action.deploymentType === 'Pair') {
        assetPair = await assetPairsService.getByAssetSerial(action.primaryAssetSerial);
      }
      
      switch (action.actionType) {
        case 'New Deployment':
          if (action.deploymentType === 'Pair' && secondaryAsset) {
            // Create new asset pair
            if (!assetPair) {
              assetPair = await assetPairsService.create({
                primaryAssetId: primaryAsset.id,
                secondaryAssetId: secondaryAsset.id,
                pairType: action.assetPairType!,
                isDeployed: false
              });
            }
            
            // Mark as deployed with user details
            await assetPairsService.updateDeploymentStatus(assetPair.id, true, {
              fullName: action.toUserFullName,
              location: action.toLocation,
              department: action.toDepartment,
              section: action.toSection
            });
            
            // Update both assets to Active status
            await assetsService.updateBySerial(action.primaryAssetSerial, { 
              status: 'Active',
              user: action.toUserFullName,
              location: action.toLocation,
              department: action.toDepartment,
              section: action.toSection,
              domainAccount: action.toUserDomainAccount
            });
            await assetsService.updateBySerial(action.secondaryAssetSerial, { 
              status: 'Active',
              user: action.toUserFullName,
              location: action.toLocation,
              department: action.toDepartment,
              section: action.toSection,
              domainAccount: action.toUserDomainAccount
            });
          } else {
            // Individual asset deployment
            await assetsService.updateBySerial(action.primaryAssetSerial, { 
              status: 'Active',
              user: action.toUserFullName,
              location: action.toLocation,
              department: action.toDepartment,
              section: action.toSection,
              domainAccount: action.toUserDomainAccount
            });
          }
          break;
          
        case 'Redeployment':
          if (action.deploymentType === 'Pair' && assetPair && secondaryAsset) {
            // Update deployment with new user details
            await assetPairsService.updateDeploymentStatus(assetPair.id, true, {
              fullName: action.toUserFullName,
              location: action.toLocation,
              department: action.toDepartment,
              section: action.toSection
            });
            
            // Update both assets to Active status
            await assetsService.updateBySerial(action.primaryAssetSerial, { 
              status: 'Active',
              user: action.toUserFullName,
              location: action.toLocation,
              department: action.toDepartment,
              section: action.toSection,
              domainAccount: action.toUserDomainAccount
            });
            await assetsService.updateBySerial(action.secondaryAssetSerial, { 
              status: 'Active',
              user: action.toUserFullName,
              location: action.toLocation,
              department: action.toDepartment,
              section: action.toSection,
              domainAccount: action.toUserDomainAccount
            });
          } else {
            // Individual asset redeployment
            await assetsService.updateBySerial(action.primaryAssetSerial, { 
              status: 'Active',
              user: action.toUserFullName,
              location: action.toLocation,
              department: action.toDepartment,
              section: action.toSection,
              domainAccount: action.toUserDomainAccount
            });
          }
          break;
          
        case 'Relocation':
        case 'Change of Ownership':
          if (action.deploymentType === 'Pair' && assetPair && secondaryAsset) {
            // Update deployment with new user details
            await assetPairsService.updateDeploymentStatus(assetPair.id, true, {
              fullName: action.toUserFullName,
              location: action.toLocation,
              department: action.toDepartment,
              section: action.toSection
            });
            
            // Update both assets
            await assetsService.updateBySerial(action.primaryAssetSerial, { 
              user: action.toUserFullName,
              location: action.toLocation,
              department: action.toDepartment,
              section: action.toSection,
              domainAccount: action.toUserDomainAccount
            });
            await assetsService.updateBySerial(action.secondaryAssetSerial, { 
              user: action.toUserFullName,
              location: action.toLocation,
              department: action.toDepartment,
              section: action.toSection,
              domainAccount: action.toUserDomainAccount
            });
          } else {
            // Individual asset relocation/change of ownership
            await assetsService.updateBySerial(action.primaryAssetSerial, { 
              user: action.toUserFullName,
              location: action.toLocation,
              department: action.toDepartment,
              section: action.toSection,
              domainAccount: action.toUserDomainAccount
            });
          }
          break;
          
        case 'Surrender':
          if (action.deploymentType === 'Pair' && assetPair && secondaryAsset) {
            // Mark as not deployed and return to ICT
            await assetPairsService.updateDeploymentStatus(assetPair.id, false, {
              fullName: 'ICT Manager',
              location: 'ICT Store',
              department: 'ICT',
              section: 'Asset Management'
            });
            
            // Update both assets
            await assetsService.updateBySerial(action.primaryAssetSerial, { 
              status: 'In Store',
              user: 'ICT Manager',
              location: 'ICT Store',
              department: 'ICT',
              section: 'Asset Management',
              domainAccount: 'ICT001'
            });
            await assetsService.updateBySerial(action.secondaryAssetSerial, { 
              status: 'In Store',
              user: 'ICT Manager',
              location: 'ICT Store',
              department: 'ICT',
              section: 'Asset Management',
              domainAccount: 'ICT001'
            });
          } else {
            // Individual asset surrender
            await assetsService.updateBySerial(action.primaryAssetSerial, { 
              status: 'In Store',
              user: 'ICT Manager',
              location: 'ICT Store',
              department: 'ICT',
              section: 'Asset Management',
              domainAccount: 'ICT001'
            });
          }
          break;
        }
    } catch (err) {
      console.error('Error handling asset pair action:', err);
      throw err; // Re-throw to show error to user
    }
  };

  const handleAssetPairActionOld = async (action: LifecycleAction) => {
    try {
      // Get the assets
      const primaryAsset = await assetsService.getBySerial(action.primaryAssetSerial);
      const secondaryAsset = await assetsService.getBySerial(action.secondaryAssetSerial);
      
      if (!primaryAsset || !secondaryAsset) {
        throw new Error('Assets not found');
      }
      
      let assetPair: AssetPair | null = null;
      
      // Check if asset pair already exists
      assetPair = await assetPairsService.getByAssetSerial(action.primaryAssetSerial);
      
      switch (action.actionType) {
        case 'New Deployment':
          // Create new asset pair
          if (!assetPair) {
            assetPair = await assetPairsService.create({
              primaryAssetId: primaryAsset.id,
              secondaryAssetId: secondaryAsset.id,
              pairType: action.assetPairType!,
              isDeployed: false
            });
          }
          
          // Mark as deployed with user details
          await assetPairsService.updateDeploymentStatus(assetPair.id, true, {
            fullName: action.toUserFullName,
            location: action.toLocation,
            department: action.toDepartment,
            section: action.toSection
          });
          
          // Update individual asset statuses
          await assetsService.updateBySerial(action.primaryAssetSerial, { 
            status: 'Active',
            user: action.toUserFullName,
            location: action.toLocation,
            department: action.toDepartment,
            section: action.toSection,
            domainAccount: action.toUserDomainAccount
          });
          await assetsService.updateBySerial(action.secondaryAssetSerial, { 
            status: 'Active',
            user: action.toUserFullName,
            location: action.toLocation,
            department: action.toDepartment,
            section: action.toSection,
            domainAccount: action.toUserDomainAccount
          });
          break;
          
        case 'Redeployment':
          if (assetPair) {
            // Update deployment with new user details
            await assetPairsService.updateDeploymentStatus(assetPair.id, true, {
              fullName: action.toUserFullName,
              location: action.toLocation,
              department: action.toDepartment,
              section: action.toSection
            });
            
            // Update individual asset statuses
            await assetsService.updateBySerial(action.primaryAssetSerial, { 
              status: 'Active',
              user: action.toUserFullName,
              location: action.toLocation,
              department: action.toDepartment,
              section: action.toSection,
              domainAccount: action.toUserDomainAccount
            });
            await assetsService.updateBySerial(action.secondaryAssetSerial, { 
              status: 'Active',
              user: action.toUserFullName,
              location: action.toLocation,
              department: action.toDepartment,
              section: action.toSection,
              domainAccount: action.toUserDomainAccount
            });
          }
          break;
          
        case 'Relocation':
        case 'Change of Ownership':
          if (assetPair) {
            // Update deployment with new user details
            await assetPairsService.updateDeploymentStatus(assetPair.id, true, {
              fullName: action.toUserFullName,
              location: action.toLocation,
              department: action.toDepartment,
              section: action.toSection
            });
            
            // Update individual asset statuses
            await assetsService.updateBySerial(action.primaryAssetSerial, { 
              user: action.toUserFullName,
              location: action.toLocation,
              department: action.toDepartment,
              section: action.toSection,
              domainAccount: action.toUserDomainAccount
            });
            await assetsService.updateBySerial(action.secondaryAssetSerial, { 
              user: action.toUserFullName,
              location: action.toLocation,
              department: action.toDepartment,
              section: action.toSection,
              domainAccount: action.toUserDomainAccount
            });
          }
          break;
          
        case 'Surrender':
          if (assetPair) {
            // Mark as not deployed and return to ICT
            await assetPairsService.updateDeploymentStatus(assetPair.id, false, {
              fullName: 'ICT Manager',
              location: 'ICT Store',
              department: 'ICT',
              section: 'Asset Management'
            });
            
            // Update individual asset statuses
            await assetsService.updateBySerial(action.primaryAssetSerial, { 
              status: 'In Store',
              user: 'ICT Manager',
              location: 'ICT Store',
              department: 'ICT',
              section: 'Asset Management',
              domainAccount: 'ICT001'
            });
            await assetsService.updateBySerial(action.secondaryAssetSerial, { 
              status: 'In Store',
              user: 'ICT Manager',
              location: 'ICT Store',
              department: 'ICT',
              section: 'Asset Management',
              domainAccount: 'ICT001'
            });
          }
          break;
        }
    } catch (err) {
      console.error('Error handling asset pair action:', err);
      throw err; // Re-throw to show error to user
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
        // Handle asset pair updates when action is completed
        await handleAssetPairAction(action);
        
        onAuditLog({
          assetSerial: action.primaryAssetSerial,
          action: `${action.actionType} Completed`,
          performedBy: currentUser,
          timestamp: new Date().toISOString(),
          details: `${action.actionType} request completed for asset pair ${action.primaryAssetSerial} + ${action.secondaryAssetSerial}`,
          oldValues: { 
            status: 'Pending',
            ...(action.fromUserFullName && { user: action.fromUserFullName }),
            ...(action.fromLocation && { location: action.fromLocation }),
            ...(action.fromDepartment && { department: action.fromDepartment })
          },
          newValues: { 
            status: 'Completed',
            user: action.actionType === 'Surrender' ? 'ICT Manager' : action.toUserFullName,
            location: action.actionType === 'Surrender' ? 'ICT Store' : action.toLocation,
            department: action.actionType === 'Surrender' ? 'ICT' : action.toDepartment
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Asset Pair</th>
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
                    <div className="text-sm">
                      <p className="text-black font-medium">{action.assetPairType} Pair</p>
                      <p className="text-gray-600 text-xs">{action.primaryAssetSerial}</p>
                      <p className="text-gray-600 text-xs">{action.secondaryAssetSerial}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm">
                      <p className="text-black">{action.fromUserFullName || action.fromLocation || 'ICT Store'} →</p>
                      <p className="text-black">{action.toUserFullName || action.toLocation || 'ICT Store'}</p>
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