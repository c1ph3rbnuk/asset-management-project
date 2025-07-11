import React from 'react';
import { useState } from 'react';
import { Search, Filter, Plus, Edit, Trash2, Eye } from 'lucide-react';
import { Asset, AuditLog } from '../../types';
import AssetModal from './AssetModal';
import { assetsService } from '../../lib/supabase';


interface AssetTableProps {
  assets: Asset[];
  onAssetUpdate: (assets: Asset[]) => void;
  onAuditLog: (log: AuditLog) => void;
  currentUser: string;
}

const AssetTable: React.FC<AssetTableProps> = ({ assets, onAssetUpdate, onAuditLog, currentUser }) => {
  const [filteredAssets, setFilteredAssets] = useState(assets);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'view'>('add');
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    let filtered = assets;

    if (searchTerm) {
      filtered = filtered.filter(asset =>
        asset.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.tag.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.model.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterStatus) {
      filtered = filtered.filter(asset => asset.status === filterStatus);
    }

    if (filterDepartment) {
      filtered = filtered.filter(asset => asset.department === filterDepartment);
    }

    setFilteredAssets(filtered);
  }, [assets, searchTerm, filterStatus, filterDepartment]);

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


  const handleSaveAsset = (assetData: Partial<Asset>) => {
    const [loading, setLoading] = useState(false);
    if (modalMode === 'add') {
      handleCreateAsset(assetData);
    } else if (modalMode === 'edit' && selectedAsset) {
      handleUpdateAsset(selectedAsset.id, assetData);
    }
  };

  const handleCreateAsset = async (assetData: Partial<Asset>) => {
    const [loading, setLoading] = useState(false);
    try {
      setLoading(true);
      const newAsset = await assetsService.create(assetData as Omit<Asset, 'id' | 'createdAt' | 'updatedAt'>);
      onAssetUpdate([newAsset, ...assets]);
      
      // Add audit log
      onAuditLog({
        assetSerial: newAsset.serialNumber,
        action: 'Asset Created',
        performedBy: currentUser,
        timestamp: new Date().toISOString(),
        details: `New ${newAsset.assetType} asset created: ${newAsset.brand} ${newAsset.model} (S/N: ${newAsset.serialNumber})`,
        newValues: { status: newAsset.status, location: newAsset.location, user: newAsset.user }
      });
    } catch (err: any) {
      console.error('Error creating asset:', err);
      if (err.message && err.message.includes('already exists')) {
        alert(`Error: ${err.message}`);
      } else {
        alert('Failed to create asset');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAsset = async (id: string, assetData: Partial<Asset>) => {
    try {
      const oldValues = {
        status: selectedAsset?.status,
        location: selectedAsset?.location,
        user: selectedAsset?.user,
        department: selectedAsset?.department
      };
      
      const updatedAsset = await assetsService.update(id, assetData);
      const updatedAssets = assets.map(asset =>
        asset.id === id ? updatedAsset : asset
      );
      onAssetUpdate(updatedAssets);
      
      // Add audit log
      onAuditLog({
        assetSerial: updatedAsset.serialNumber,
        action: 'Asset Updated',
        performedBy: currentUser,
        timestamp: new Date().toISOString(),
        details: `Asset details updated`,
        oldValues,
        newValues: {
          status: assetData.status,
          location: assetData.location,
          user: assetData.user,
          department: assetData.department
        }
      });
      
      // Trigger a refresh to ensure all data is in sync
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err) {
      console.error('Error updating asset:', err);
      alert('Failed to update asset');
    }
  };

  const handleDeleteAsset = async (asset: Asset) => {
    if (confirm(`Are you sure you want to delete asset ${asset.tag}?`)) {
      try {
        await assetsService.delete(asset.id);
        const updatedAssets = assets.filter(a => a.id !== asset.id);
        onAssetUpdate(updatedAssets);
        
        // Add audit log
        onAuditLog({
          assetSerial: asset.serialNumber,
          action: 'Asset Deleted',
          performedBy: currentUser,
          timestamp: new Date().toISOString(),
          details: `Asset deleted: ${asset.brand} ${asset.model} (S/N: ${asset.serialNumber})`,
          oldValues: { status: asset.status, location: asset.location }
        });
      } catch (err) {
        console.error('Error deleting asset:', err);
        alert('Failed to delete asset');
      }
    }
  };

  // Import the service at the top of the file
 // const { assetsService } = require('../../lib/supabase');
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-green-100 text-green-800';
      case 'Under Maintenance': return 'bg-yellow-100 text-yellow-800';
      case 'Obsolete': return 'bg-red-100 text-red-800';
      case 'In Store': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Active': return '✓';
      case 'Under Maintenance': return '⚠';
      case 'Obsolete': return '✗';
      case 'In Store': return '📦';
      default: return '●';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-black">Asset Inventory</h3>
          <button 
            onClick={handleAddAsset}
            className="bg-[#CC092F] text-white px-4 py-2 rounded-lg hover:bg-[#AA0726] flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add Asset</span>
          </button>
        </div>
        
        <div className="mt-4 flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by tag, serial, location, user, brand, or model..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#CC092F] focus:border-transparent"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#CC092F] focus:border-transparent"
          >
            <option value="">All Status</option>
            <option value="Active">Active</option>
            <option value="In Store">In Store</option>
            <option value="Under Maintenance">Under Maintenance</option>
            <option value="Obsolete">Obsolete</option>
          </select>
          <select
            value={filterDepartment}
            onChange={(e) => setFilterDepartment(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#CC092F] focus:border-transparent"
          >
            <option value="">All Departments</option>
            <option value="ICT">ICT</option>
            <option value="Customs">Customs</option>
            <option value="Domestic Taxes">Domestic Taxes</option>
            <option value="Investigation & Enforcement">Investigation & Enforcement</option>
            <option value="Human Resources">Human Resources</option>
            <option value="Finance">Finance</option>
            <option value="Legal">Legal</option>
            <option value="Audit">Audit</option>
          </select>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-[#F4F4F4]">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Asset Details</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Serial Number</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
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
                    <p className="text-sm text-gray-600">{asset.brand} {asset.model}</p>
                    {asset.section && (
                      <p className="text-xs text-gray-500">Section: {asset.section}</p>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <p className="text-sm text-black font-mono">{asset.serialNumber}</p>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <p className="text-sm text-black">{asset.user}</p>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <p className="text-sm text-black">{asset.location}</p>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <p className="text-sm text-black">{asset.department}</p>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(asset.status)}`}>
                    <span className="mr-1">{getStatusIcon(asset.status)}</span>
                    {asset.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleViewAsset(asset)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleEditAsset(asset)}
                      className="text-yellow-600 hover:text-yellow-800"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteAsset(asset)}
                      className="text-red-600 hover:text-red-800"
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
            Showing 1 to {filteredAssets.length} of {filteredAssets.length} results
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