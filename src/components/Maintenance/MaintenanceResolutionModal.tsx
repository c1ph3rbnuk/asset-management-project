import React, { useState } from 'react';
import { X, Save, AlertTriangle } from 'lucide-react';
import { MaintenanceTicket } from '../../types';

interface MaintenanceResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (resolutionData: { resolution: string; isObsolete: boolean; obsoleteReason?: string }) => void;
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      resolution,
      isObsolete,
      obsoleteReason: isObsolete ? obsoleteReason : undefined
    });
    onClose();
    setResolution('');
    setIsObsolete(false);
    setObsoleteReason('');
  };

  if (!isOpen || !ticket) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-black">Resolve Maintenance Ticket</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-black">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-black mb-2">Ticket Details</h3>
            <p className="text-sm text-gray-600 mb-1"><strong>Asset:</strong> {ticket.assetId}</p>
            <p className="text-sm text-gray-600 mb-1"><strong>Issue:</strong> {ticket.title}</p>
            <p className="text-sm text-gray-600"><strong>Description:</strong> {ticket.description}</p>
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
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-700 mb-3">
                    This asset will be marked as obsolete and moved to the obsolete store.
                  </p>
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