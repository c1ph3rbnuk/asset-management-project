import React, { useState } from 'react';
import { X, Save, AlertTriangle, Plus } from 'lucide-react';
import { MaintenanceTicket } from '../../types';

interface MaintenanceResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (resolutionData: { 
    resolution: string; 
    isObsolete: boolean; 
    obsoleteReason?: string;
    requiresReplacement?: boolean;
    replacementDetails?: {
      assetType: string;
      brand: string;
      model: string;
      serialNumber: string;
    };
  }) => void;
  ticket: MaintenanceTicket | null;
}

const MaintenanceResolutionModal: React.FC<MaintenanceResolutionModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  ticket 
}) => {
  const [resolution, setResolution] = useState('');
  const [isObsolete, setIsObsolete] = useState(false);
  const [obsoleteReason, setObsoleteReason] = useState('');
  const [requiresReplacement, setRequiresReplacement] = useState(false);
  const [replacementDetails, setReplacementDetails] = useState({
    assetType: '',
    brand: '',
    model: '',
    serialNumber: ''
  });

  const [availableAssets, setAvailableAssets] = useState<any[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(false);

  // Load available assets for replacement when obsolete is checked
  useEffect(() => {
    if (isObsolete && ticket) {
      loadAvailableReplacementAssets();
    }
  }, [isObsolete, ticket]);

  const loadAvailableReplacementAssets = async () => {
    if (!ticket) return;
    
    try {
      setLoadingAssets(true);
      const { assetsService } = await import('../../lib/supabase');
      const allAssets = await assetsService.getAll();
      
      // Filter assets that are:
      // 1. Same type as the asset being replaced
      // 2. In Store status (available for deployment)
      // 3. Not the same asset being replaced
      const available = allAssets.filter(asset => 
        asset.assetType === ticket.assetType &&
        asset.status === 'In Store' &&
        asset.serialNumber !== ticket.assetSerial
      );
      
      setAvailableAssets(available);
    } catch (err) {
      console.error('Error loading available assets:', err);
    } finally {
      setLoadingAssets(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      resolution,
      isObsolete,
      obsoleteReason: isObsolete ? obsoleteReason : undefined,
      requiresReplacement: requiresReplacement && isObsolete,
      replacementDetails: requiresReplacement && isObsolete ? replacementDetails : undefined
    });
    onClose();
    resetForm();
  };

  const resetForm = () => {
    setResolution('');
    setIsObsolete(false);
    setObsoleteReason('');
    setRequiresReplacement(false);
    setReplacementDetails({
      assetType: '',
      brand: '',
      model: '',
      serialNumber: ''
    });
  };

  const handleReplacementChange = (field: string, value: string) => {
    setReplacementDetails(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (!isOpen || !ticket) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-black">Resolve Maintenance Ticket</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-black">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-black mb-2">Ticket Details</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600 mb-1"><strong>Asset Type:</strong> {ticket.assetType}</p>
                <p className="text-gray-600 mb-1"><strong>Serial Number:</strong> {ticket.assetSerial}</p>
              </div>
              <div>
                <p className="text-gray-600 mb-1"><strong>Issue:</strong> {ticket.title}</p>
                <p className="text-gray-600"><strong>Priority:</strong> {ticket.priority}</p>
              </div>
            </div>
            <p className="text-gray-600 mt-2"><strong>Description:</strong> {ticket.description}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Resolution Details</label>
              <textarea
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#CC092F] focus:border-transparent"
                required
                placeholder="Describe how the issue was resolved..."
              />
            </div>

            <div className="border-t border-gray-200 pt-6">
              <div className="flex items-center space-x-3 mb-4">
                <input
                  type="checkbox"
                  id="obsolete"
                  checked={isObsolete}
                  onChange={(e) => setIsObsolete(e.target.checked)}
                  className="h-4 w-4 text-[#CC092F] focus:ring-[#CC092F] border-gray-300 rounded"
                />
                <label htmlFor="obsolete" className="text-sm font-medium text-gray-700 flex items-center">
                  <AlertTriangle className="h-4 w-4 mr-1 text-red-500" />
                  Declare Asset as Obsolete
                </label>
              </div>

              {isObsolete && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-4">
                  <p className="text-sm text-red-700">
                    This asset will be marked as obsolete and moved to the obsolete store.
                  </p>
                  
                  <div>
                    <label className="block text-sm font-medium text-red-700 mb-2">
                      Reason for Obsolescence
                    </label>
                    <textarea
                      value={obsoleteReason}
                      onChange={(e) => setObsoleteReason(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      required={isObsolete}
                      placeholder="Explain why this asset is being declared obsolete..."
                    />
                  </div>

                  <div className="border-t border-red-200 pt-4">
                    <div className="flex items-center space-x-3 mb-4">
                      <input
                        type="checkbox"
                        id="replacement"
                        checked={requiresReplacement}
                        onChange={(e) => setRequiresReplacement(e.target.checked)}
                        className="h-4 w-4 text-[#CC092F] focus:ring-[#CC092F] border-gray-300 rounded"
                      />
                      <label htmlFor="replacement" className="text-sm font-medium text-red-700 flex items-center">
                        <Plus className="h-4 w-4 mr-1" />
                        Requires Replacement Asset
                      </label>
                    </div>

                    {requiresReplacement && (
                      <div className="bg-white border border-red-300 rounded-lg p-4 space-y-4">
                        <h4 className="text-sm font-medium text-red-800">Replacement Asset Details</h4>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Replacement Asset ({ticket.assetType})
                            </label>
                            {loadingAssets ? (
                              <div className="flex items-center justify-center py-4">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#CC092F]"></div>
                              </div>
                            ) : (
                              <select
                                value={replacementDetails.serialNumber}
                                onChange={(e) => {
                                  const selectedAsset = availableAssets.find(asset => asset.serialNumber === e.target.value);
                                  if (selectedAsset) {
                                    setReplacementDetails({
                                      assetType: selectedAsset.assetType,
                                      brand: selectedAsset.brand,
                                      model: selectedAsset.model,
                                      serialNumber: selectedAsset.serialNumber
                                    });
                                  }
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#CC092F] focus:border-transparent"
                                required={requiresReplacement}
                              >
                                <option value="">Select replacement asset</option>
                                {availableAssets.map(asset => (
                                  <option key={asset.id} value={asset.serialNumber}>
                                    {asset.serialNumber} - {asset.brand} {asset.model}
                                  </option>
                                ))}
                              </select>
                            )}
                            {availableAssets.length === 0 && !loadingAssets && (
                              <p className="mt-2 text-sm text-red-600">
                                No available {ticket.assetType} assets in store for replacement
                              </p>
                            )}
                          </div>

                          {replacementDetails.serialNumber && (
                            <div className="bg-gray-50 p-3 rounded-lg">
                              <h5 className="text-sm font-medium text-gray-800 mb-2">Selected Asset Details:</h5>
                              <div className="text-sm text-gray-600 space-y-1">
                                <p><strong>Type:</strong> {replacementDetails.assetType}</p>
                                <p><strong>Brand:</strong> {replacementDetails.brand}</p>
                                <p><strong>Model:</strong> {replacementDetails.model}</p>
                                <p><strong>Serial:</strong> {replacementDetails.serialNumber}</p>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded p-3">
                          <p className="text-sm text-blue-700">
                            <strong>Replacement Process:</strong>
                          </p>
                          <ul className="text-sm text-blue-700 mt-2 space-y-1">
                            <li>• The replacement asset will inherit the same owner and location</li>
                            <li>• The obsolete asset will be moved to obsolete store</li>
                            <li>• Only assets of the same type can be used as replacements</li>
                            <li>• Only assets currently "In Store" are available for replacement</li>
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
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
                <span>Resolve Ticket</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default MaintenanceResolutionModal;
                              value={replacementDetails.serialNumber}
                              onChange={(e) => handleReplacementChange('serialNumber', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#CC092F] focus:border-transparent"
                              required={requiresReplacement}
                              placeholder="Replacement asset serial number"
                            />
                          </div>
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded p-3">
                          <p className="text-sm text-blue-700">
                            <strong>Note:</strong> The replacement asset will be automatically added to the system 
                            and deployed to the same user and location as the obsolete asset.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
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
                <span>Resolve Ticket</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default MaintenanceResolutionModal;