import React, { useState } from 'react';
import { X, Save, Upload, FileText } from 'lucide-react';
import { LifecycleAction } from '../../types';

interface LifecycleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (action: Partial<LifecycleAction>, movementForm?: File) => void;
  actionType: string;
}

const LifecycleModal: React.FC<LifecycleModalProps> = ({ isOpen, onClose, onSave, actionType }) => {
  const [formData, setFormData] = useState<Partial<LifecycleAction>>({
    actionType: actionType as LifecycleAction['actionType'],
    assetId: '',
    toUser: '',
    toLocation: '',
    toDepartment: '',
    requestedBy: 'David Mwangi',
    status: 'Pending'
  });
  const [movementForm, setMovementForm] = useState<File | null>(null);

  // Update form data when actionType prop changes
  React.useEffect(() => {
    setFormData(prev => ({
      ...prev,
      actionType: actionType as LifecycleAction['actionType']
    }));
  }, [actionType]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Ensure actionType is always set
    if (!formData.actionType || !actionType) {
      alert('Action type is required');
      return;
    }

    // Set default values for redeployment and surrender
    let finalFormData = { ...formData };
    
    // Ensure actionType is properly set
    finalFormData.actionType = actionType as LifecycleAction['actionType'];
    
    if (actionType === 'Redeployment') {
      finalFormData = {
        ...finalFormData,
        actionType: 'Redeployment',
        fromUser: 'ICT Store',
        fromLocation: 'ICT Store',
        fromDepartment: 'ICT'
      };
    } else if (actionType === 'Surrender') {
      finalFormData = {
        ...finalFormData,
        actionType: 'Surrender',
        toUser: 'ICT Store',
        toLocation: 'ICT Store',
        toDepartment: 'ICT'
      };
    }
    
    onSave({
      ...finalFormData,
      actionType: actionType as LifecycleAction['actionType'],
      requestDate: new Date().toISOString()
    }, movementForm || undefined);
    
    onClose();
    setFormData({
      actionType: actionType as LifecycleAction['actionType'],
      assetId: '',
      toUser: '',
      toLocation: '',
      toDepartment: '',
      requestedBy: 'David Mwangi',
      status: 'Pending'
    });
    setMovementForm(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setMovementForm(file);
    } else {
      alert('Please select a PDF file');
      e.target.value = '';
    }
  };

  if (!isOpen) return null;

  const requiresFromFields = ['Relocation', 'Change of Ownership', 'Exit'].includes(actionType);
  const isRedeployment = actionType === 'Redeployment';
  const isSurrender = actionType === 'Surrender';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-black">{actionType} Request</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-black">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Asset ID/Tag</label>
              <input
                type="text"
                name="assetId"
                value={formData.assetId}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#CC092F] focus:border-transparent"
                required
                placeholder="Enter asset tag (e.g., KRA-LAP-001)"
              />
            </div>

            {requiresFromFields && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">From User</label>
                  <input
                    type="text"
                    name="fromUser"
                    value={formData.fromUser || ''}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#CC092F] focus:border-transparent"
                    placeholder="Current user"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">From Location</label>
                  <input
                    type="text"
                    name="fromLocation"
                    value={formData.fromLocation || ''}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#CC092F] focus:border-transparent"
                    placeholder="Current location"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">From Department</label>
                  <select
                    name="fromDepartment"
                    value={formData.fromDepartment || ''}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#CC092F] focus:border-transparent"
                  >
                    <option value="">Select Department</option>
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
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {isSurrender ? 'Return to ICT Store' : 
                 isRedeployment ? 'Deploy to User' : 'To User'}
              </label>
              <input
                type="text"
                name="toUser"
                value={isSurrender ? 'ICT Store' : formData.toUser}
                onChange={handleChange}
                disabled={isSurrender}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#CC092F] focus:border-transparent disabled:bg-gray-100"
                required
                placeholder={isSurrender ? 'ICT Store' : 
                           isRedeployment ? 'User to deploy to' : 'New user name'}
              />
              {(isRedeployment || actionType === 'New Deployment') && (
                <p className="mt-1 text-sm text-gray-500">
                  Asset ownership will be transferred to this user
                </p>
              )}
              {actionType === 'Change of Ownership' && (
                <p className="mt-1 text-sm text-gray-500">
                  Asset ownership will be changed to this user
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">To Location</label>
              <input
                type="text"
                name="toLocation"
                value={isSurrender ? 'ICT Store' : formData.toLocation}
                onChange={handleChange}
                disabled={isSurrender}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#CC092F] focus:border-transparent disabled:bg-gray-100"
                required
                placeholder={isSurrender ? 'ICT Store' : 
                           isRedeployment ? 'Deployment location' : 'Destination location'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">To Department</label>
              <select
                name="toDepartment"
                value={isSurrender ? 'ICT' : formData.toDepartment}
                onChange={handleChange}
                disabled={isSurrender}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#CC092F] focus:border-transparent disabled:bg-gray-100"
                required
              >
                <option value="">Select Department</option>
                <option value="ICT">ICT</option>
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
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Asset Movement Form (PDF)
                <span className="text-red-500 ml-1">*</span>
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                <div className="text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="mt-4">
                    <label htmlFor="movement-form" className="cursor-pointer">
                      <span className="mt-2 block text-sm font-medium text-gray-900">
                        Upload Asset Movement Form
                      </span>
                      <span className="mt-1 block text-sm text-gray-500">
                        PDF files only, max 10MB
                      </span>
                    </label>
                    <input
                      id="movement-form"
                      name="movement-form"
                      type="file"
                      accept=".pdf"
                      onChange={handleFileChange}
                      className="sr-only"
                      required
                    />
                  </div>
                </div>
                {movementForm && (
                  <div className="mt-4 flex items-center justify-center">
                    <div className="flex items-center space-x-2 bg-green-50 text-green-700 px-3 py-2 rounded-lg">
                      <FileText className="h-4 w-4" />
                      <span className="text-sm font-medium">{movementForm.name}</span>
                    </div>
                  </div>
                )}
              </div>
              <p className="mt-2 text-sm text-gray-500">
                Please attach the signed asset movement form as required by KRA policy.
              </p>
            </div>
          </div>

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
              <span>Submit Request</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LifecycleModal;