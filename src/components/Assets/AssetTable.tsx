import React, { useState, useEffect } from 'react';
import { Edit, Trash2, Eye, Filter } from 'lucide-react';
import { Asset } from '../../types';
import { assetsService } from '../../lib/supabase';

interface AssetTableProps {
  assets: Asset[];
  onEdit: (asset: Asset) => void;
  onDelete: (id: string) => void;
  onView: (asset: Asset) => void;
  onRefresh: () => void;
}

const AssetTable: React.FC<AssetTableProps> = ({ assets, onEdit, onDelete, onView, onRefresh }) => {
  const [filteredAssets, setFilteredAssets] = useState<Asset[]>(assets);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('');
  const [assetTypeFilter, setAssetTypeFilter] = useState<string>('');

  useEffect(() => {
    let filtered = assets;

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
  }, [assets, statusFilter, departmentFilter, assetTypeFilter]);

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this asset?')) {
      try {
        await assetsService.delete(id);
        onRefresh();
      } catch (error) {
        console.error('Error deleting asset:', error);
        alert('Failed to delete asset');
      }
    }
  };

  const getUniqueValues = (key: keyof Asset) => {
    return Array.from(new Set(assets.map(asset => asset[key]).filter(Boolean)));
  };

  const assetTypes = getUniqueValues('assetType');
  const departments = getUniqueValues('department');
  const statuses = getUniqueValues('status');

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center space-x-2 mb-3">
          <Filter className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Filters</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Asset Type</label>
            <select
              value={assetTypeFilter}
              onChange={(e) => setAssetTypeFilter(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#CC092F] focus:border-transparent"
            >
              <option value="">All Types ({assets.length})</option>
              {assetTypes.map(type => (
                <option key={type} value={type}>
                  {type} ({assets.filter(a => a.assetType === type).length})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#CC092F] focus:border-transparent"
            >
              <option value="">All Statuses</option>
              {statuses.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Department</label>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#CC092F] focus:border-transparent"
            >
              <option value="">All Departments</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>
        </div>
        {(statusFilter || departmentFilter || assetTypeFilter) && (
          <div className="mt-3 flex items-center justify-between">
            <span className="text-sm text-gray-600">
              Showing {filteredAssets.length} of {assets.length} assets
            </span>
            <button
              onClick={() => {
                setStatusFilter('');
                setDepartmentFilter('');
                setAssetTypeFilter('');
              }}
              className="text-sm text-[#CC092F] hover:text-[#AA0726]"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Asset Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Owner
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAssets.map((asset) => (
                <tr key={asset.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {asset.assetType}
                      </div>
                      <div className="text-sm text-gray-500">
                        S/N: {asset.serialNumber}
                      </div>
                      <div className="text-sm text-gray-500">
                        {asset.brand} {asset.model}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{asset.userName}</div>
                    <div className="text-sm text-gray-500">{asset.department}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{asset.location}</div>
                    <div className="text-sm text-gray-500">{asset.section}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      asset.status === 'Active' 
                        ? 'bg-green-100 text-green-800'
                        : asset.status === 'In Store'
                        ? 'bg-blue-100 text-blue-800'
                        : asset.status === 'Under Maintenance'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {asset.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => onView(asset)}
                        className="text-blue-600 hover:text-blue-900"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => onEdit(asset)}
                        className="text-indigo-600 hover:text-indigo-900"
                        title="Edit Asset"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(asset.id)}
                        className="text-red-600 hover:text-red-900"
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
        
        {filteredAssets.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">No assets found matching the current filters.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AssetTable;