import React, { useState } from 'react';
import { X, Save } from 'lucide-react';
import { Asset } from '../../types';

interface AssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (asset: Partial<Asset>) => void;
  asset?: Asset | null;
  mode: 'add' | 'edit' | 'view';
}

const AssetModal: React.FC<AssetModalProps> = ({ isOpen, onClose, onSave, asset, mode }) => {
  const [formData, setFormData] = useState<Partial<Asset>>({
    assetType: asset?.assetType || 'PC',
    serialNumber: asset?.serialNumber || '',
    model: asset?.model || '',
    brand: asset?.brand || '',
    user: asset?.user || 'ICT Manager',
    location: asset?.location || 'ICT Store',
    department: asset?.department || 'ICT',
    section: asset?.section || '',
    status: asset?.status || 'In Store'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // For new assets, ensure they go to ICT Store with ICT Manager
    if (mode === 'add') {
      const newAssetData = {
        ...formData,
        user: 'ICT Manager',
        location: 'ICT Store',
        department: 'ICT',
        status: 'In Store'
      };
      onSave(newAssetData);
    } else {
      onSave(formData);
    }
    onClose();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  if (!isOpen) return null;

  const isReadOnly = mode === 'view';
  const title = mode === 'add' ? 'Add New Asset' : mode === 'edit' ? 'Edit Asset' : 'Asset Details';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-black">{title}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-black">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Asset Type</label>
              <select
                name="assetType"
                value={formData.assetType}
                onChange={handleChange}
                disabled={isReadOnly}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#CC092F] focus:border-transparent disabled:bg-gray-100"
                required
              >
                <option value="PC">PC</option>
                <option value="Laptop">Laptop</option>
                <option value="VDI">VDI</option>
                <option value="Monitor">Monitor</option>
                <option value="CPU">CPU</option>
                <option value="VDI Receiver">VDI Receiver</option>
                <option value="Printer">Printer</option>
                <option value="Router">Router</option>
                <option value="Switch">Switch</option>
                <option value="IP Phone">IP Phone</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Serial Number
                <span className="text-red-500 ml-1">*</span>
              </label>
              <input
                type="text"
                name="serialNumber"
                value={formData.serialNumber}
                onChange={handleChange}
                disabled={isReadOnly}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#CC092F] focus:border-transparent disabled:bg-gray-100"
                required
                placeholder="Enter unique serial number"
              />
              <p className="mt-1 text-sm text-gray-500">
                Serial number must be unique across all assets
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Brand</label>
              <input
                type="text"
                name="brand"
                value={formData.brand}
                onChange={handleChange}
                disabled={isReadOnly}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#CC092F] focus:border-transparent disabled:bg-gray-100"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Model</label>
              <input
                type="text"
                name="model"
                value={formData.model}
                onChange={handleChange}
                disabled={isReadOnly}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#CC092F] focus:border-transparent disabled:bg-gray-100"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {mode === 'add' ? 'Assigned Manager' : 'Current User'}
              </label>
              <input
                type="text"
                name="user"
                value={formData.user}
                onChange={handleChange}
                disabled={isReadOnly || mode === 'add'}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#CC092F] focus:border-transparent disabled:bg-gray-100"
                placeholder={mode === 'add' ? 'ICT Manager' : 'Current user name'}
              />
              {mode === 'add' && (
                <p className="mt-1 text-sm text-gray-500">
                  New assets are automatically assigned to ICT Manager
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
              <input
                type="text"
                name="location"
                value={mode === 'add' ? 'ICT Store' : formData.location}
                onChange={handleChange}
                disabled={isReadOnly || mode === 'add'}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#CC092F] focus:border-transparent disabled:bg-gray-100"
                placeholder={mode === 'add' ? 'ICT Store' : 'Asset location'}
                required
              />
              {mode === 'add' && (
                <p className="mt-1 text-sm text-gray-500">
                  New assets go directly to ICT Store
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
              <select
                name="department"
                value={formData.department}
                onChange={handleChange}
                disabled={isReadOnly || mode === 'add'}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#CC092F] focus:border-transparent disabled:bg-gray-100"
                required
              >
                <option value="">Select Department</option>
                <option value="ICT" selected={mode === 'add'}>ICT</option>
                <option value="Customs">Customs</option>
                <option value="Domestic Taxes">Domestic Taxes</option>
                <option value="Investigation & Enforcement">Investigation & Enforcement</option>
                <option value="Human Resources">Human Resources</option>
                <option value="Finance">Finance</option>
                <option value="Legal">Legal</option>
                <option value="Audit">Audit</option>
                <option value="Strategy & Planning">Strategy & Planning</option>
                <option value="Commissioner General">Commissioner General</option>
              </select>
              {mode === 'add' && (
                <p className="mt-1 text-sm text-gray-500">
                  New assets are assigned to ICT Department
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Section</label>
              <input
                type="text"
                name="section"
                value={formData.section}
                onChange={handleChange}
                disabled={isReadOnly}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#CC092F] focus:border-transparent disabled:bg-gray-100"
                placeholder="Section within department"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                disabled={isReadOnly || mode === 'add'}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#CC092F] focus:border-transparent disabled:bg-gray-100"
                required
              >
                <option value="Active">Active</option>
                <option value="In Store">In Store</option>
                <option value="Under Maintenance">Under Maintenance</option>
                <option value="Obsolete">Obsolete</option>
                <option value="Disposed">Disposed</option>
              </select>
              {mode === 'add' && (
                <p className="mt-1 text-sm text-gray-500">
                  New assets start with "In Store" status
                </p>
              )}
            </div>
          </div>

          {!isReadOnly && (
            <div className="flex justify-end space-x-4 mt-6 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-[#CC092F] text-white rounded-lg hover:bg-[#AA0726] flex items-center space-x-2"
              >
                <Save className="h-4 w-4" />
                <span>{mode === 'add' ? 'Add Asset' : 'Save Changes'}</span>
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default AssetModal;