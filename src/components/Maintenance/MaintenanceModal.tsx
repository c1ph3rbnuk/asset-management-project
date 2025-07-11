import React, { useState } from 'react';
import { X, Save } from 'lucide-react';
import { MaintenanceTicket } from '../../types';

interface MaintenanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (ticket: Partial<MaintenanceTicket>) => void;
}

const MaintenanceModal: React.FC<MaintenanceModalProps> = ({ isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState<Partial<MaintenanceTicket>>({
    assetSerial: '',
    assetType: '',
    title: '',
    description: '',
    priority: 'Medium',
    status: 'Open',
    reportedBy: '',
    assignedTo: 'David Mwangi',
    category: 'Hardware'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      dateReceived: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    onClose();
    setFormData({
      assetSerial: '',
      assetType: '',
      title: '',
      description: '',
      priority: 'Medium',
      status: 'Open',
      reportedBy: '',
      assignedTo: 'David Mwangi',
      category: 'Hardware'
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-black">Create Maintenance Ticket</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-black">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Asset Serial Number</label>
              <input
                type="text"
                name="assetSerial"
                value={formData.assetSerial}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#CC092F] focus:border-transparent"
                required
                placeholder="Enter asset serial number"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Asset Type</label>
              <select
                name="assetType"
                value={formData.assetType}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#CC092F] focus:border-transparent"
                required
              >
                <option value="">Select Asset Type</option>
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
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Reported By</label>
              <input
                type="text"
                name="reportedBy"
                value={formData.reportedBy}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#CC092F] focus:border-transparent"
                required
                placeholder="Name of person reporting issue"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Issue Title</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#CC092F] focus:border-transparent"
                required
                placeholder="Brief description of the issue"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#CC092F] focus:border-transparent"
                required
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#CC092F] focus:border-transparent"
                required
              >
                <option value="Hardware">Hardware</option>
                <option value="Software">Software</option>
                <option value="Network">Network</option>
                <option value="Replacement">Replacement</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Assigned To</label>
              <select
                name="assignedTo"
                value={formData.assignedTo}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#CC092F] focus:border-transparent"
                required
              >
                <option value="Peter">Peter</option>
                <option value="Hilary">Hilary</option>
                <option value="Pricila">Pricila</option>
                <option value="Charles">Charles</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#CC092F] focus:border-transparent"
                required
              >
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
                <option value="Closed">Closed</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Problem Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#CC092F] focus:border-transparent"
                required
                placeholder="Detailed description of the problem..."
              />
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
              <span>Create Ticket</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MaintenanceModal;