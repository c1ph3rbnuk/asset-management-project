import React, { useState, useEffect } from 'react';
import { Edit, Trash2, Eye, Filter, Plus, Search } from 'lucide-react';
import { Asset, AuditLog } from '../../types';
import AssetModal from './AssetModal';
import { assetsService } from '../../lib/supabase';

interface AssetTableProps {
  assets: Asset[];
  onAssetUpdate: (assets: Asset[]) => void;
  onAuditLog: (log: Omit<AuditLog, 'id'>) => void;
  currentUser: string;
}

const AssetTable: React.FC<AssetTableProps> = ({ 
  assets, 
  onAssetUpdate, 
  onAuditLog, 
  currentUser 
}) => {
  const [filteredAssets, setFilteredAssets] = useState<Asset[]>(assets);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('');
  const [assetTypeFilter, setAssetTypeFilter] = useState<string>('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'view'>('add');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let filtered = assets;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(asset =>
        asset.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.assetType.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.department.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter) {
      filtered = filtered.filter(asset => asset.status === statusFilter);
    }

    if (departmentFilter) {
      filtered = filtered.filter(asset => asset.department === departmentFilter);
    }

    if (assetTypeFilter) {
      filtered = filtered.filter(asset => asset.assetType === assetTypeFilter);
    }

    setFilteredAssets(filtered);
  }, [assets, searchTerm, statusFilter, departmentFilter, assetTypeFilter]);

  const handleAddAsset = () => {
    setSelectedAsset(null);
    setModalMode('add');
    setModalOpen(true);
  };

  const handleEditAsset = (asset: Asset) => {
    setSelectedAsset(asset);
    setModalMode('edit');
    setModalOpen(true);
  };

  const handleViewAsset = (asset: Asset) => {
    setSelectedAsset(asset);
    setModalMode('view');
    setModalOpen(true);
  };

  const handleSaveAsset = async (assetData: Partial<Asset>) => {
    try {
      setLoading(true);
      
      if (modalMode === 'add') {
        const newAsset = await assetsService.create(assetData as Omit<Asset, 'id' | 'createdAt' | 'updatedAt'>);
        onAssetUpdate([newAsset, ...assets]);
        
        // Add audit log
        onAuditLog({
          assetSerial: newAsset.serialNumber,
          action: 'Asset Created',
          performedBy: currentUser,
          timestamp: new Date().toISOString(),
          details: `New ${newAsset.assetType} asset created: ${newAsset.brand} ${newAsset.model}`,
          newValues: { 
            status: newAsset.status, 
            location: newAsset.location,
            user: newAsset.user,
            department: newAsset.department
          }
        });
      } else if (modalMode === 'edit' && selectedAsset) {
        const updatedAsset = await assetsService.update(selectedAsset.id, assetData);
        const updatedAssets = assets.map(asset =>
          asset.id === selectedAsset.id ? updatedAsset : asset
        );
        onAssetUpdate(updatedAssets);
        
        // Add audit log
        onAuditLog({
          assetSerial: updatedAsset.serialNumber,
          action: 'Asset Updated',
          performedBy: currentUser,
          timestamp: new Date().toISOString(),
          details: `Asset ${updatedAsset.serialNumber} updated`,
          oldValues: {
            status: selectedAsset.status,
            location: selectedAsset.location,
            user: selectedAsset.user,
            department: selectedAsset.department
          },
          newValues: {
            status: updatedAsset.status,
            location: updatedAsset.location,
            user: updatedAsset.user,
            department: updatedAsset.department
          }
        });
      }
    } catch (err) {
      console.error('Error saving asset:', err);
      alert('Failed to save asset');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAsset = async (asset: Asset) => {
    if (window.confirm(`Are you sure you want to delete asset ${asset.serialNumber}?`)) {
      try {
        setLoading(true);
        await assetsService.delete(asset.id);
        const updatedAssets = assets.filter(a => a.id !== asset.id);
        onAssetUpdate(updatedAssets);
        
        // Add audit log
        onAuditLog({
          assetSerial: asset.serialNumber,
          action: 'Asset Deleted',
          performedBy: currentUser,
          timestamp: new Date().toISOString(),
          details: `Asset ${asset.serialNumber} deleted from system`,
          oldValues: {
            status: asset.status,
            location: asset.location,
            user: asset.user,
            department: asset.department
          }
        });
      } catch (err) {
        console.error('Error deleting asset:', err);
        alert('Failed to delete asset');
      } finally {
        setLoading(false);
      }
    }
  };

  const getUniqueValues = (key: keyof Asset) => {
    return Array.from(new Set(assets.map(asset => asset[key]).filter(Boolean)));
  };

  const assetTypes = getUniqueValues('assetType');
  const departments = getUniqueValues('department');
  const statuses = getUniqueValues('status');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-green-100 text-green-800';
      case 'In Store': return 'bg-blue-100 text-blue-800';
      case 'Under Maintenance': return 'bg-yellow-100 text-yellow-800';
      case 'Obsolete': return 'bg-red-100 text-red-800';
      case 'Disposed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-black">Asset Management</h3>
          <button 
            onClick={handleAddAsset}
            disabled={loading}
            className="bg-[#CC092F] text-white px-4 py-2 rounded-lg hover:bg-[#AA0726] flex items-center space-x-2 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            <span>Add Asset</span>
          </button>
        </div>
        
        <div className="flex items-center space-x-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by serial number, type, brand, model, user, location, or department..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#CC092F] focus:border-transparent"
            />
          </div>
          <select
            value={assetTypeFilter}
            onChange={(e) => setAssetTypeFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#CC092F] focus:border-transparent"
          >
            <option value="">All Asset Types</option>
            {assetTypes.map(type => (
              <option key={type} value={type}>
                {type} ({assets.filter(a => a.assetType === type).length})
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#CC092F] focus:border-transparent"
          >
            <option value="">All Statuses</option>
            {statuses.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#CC092F] focus:border-transparent"
          >
            <option value="">All Departments</option>
            {departments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#F4F4F4]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Asset Details</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Owner</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAssets.map((asset) => (
                <tr key={asset.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <p className="text-sm font-medium text-black">{asset.assetType}</p>
                      <p className="text-sm text-gray-600">S/N: {asset.serialNumber}</p>
                      <p className="text-sm text-gray-600">{asset.brand} {asset.model}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <p className="text-sm font-medium text-black">{asset.user}</p>
                      <p className="text-sm text-gray-600">{asset.department}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <p className="text-sm text-black">{asset.location}</p>
                      {asset.section && (
                        <p className="text-sm text-gray-600">{asset.section}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(asset.status)}`}>
                      {asset.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleViewAsset(asset)}
                        className="text-blue-600 hover:text-blue-800"
                        title="View Asset"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleEditAsset(asset)}
                        className="text-yellow-600 hover:text-yellow-800"
                        title="Edit Asset"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteAsset(asset)}
                        className="text-red-600 hover:text-red-800"
                        title="Delete Asset"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="px-6 py-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-700">
              Showing {filteredAssets.length} of {assets.length} assets
            </p>
            <div className="flex items-center space-x-2">
              <button className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50">
                Previous
              </button>
              <button className="px-3 py-1 bg-[#CC092F] text-white rounded text-sm">
                1
              </button>
              <button className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50">
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <AssetModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveAsset}
        asset={selectedAsset}
        mode={modalMode}
      />
    </div>
  );
};

export default AssetTable;