import React from 'react';
import { useState } from 'react';
import { Wrench, Plus, Clock, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { MaintenanceTicket } from '../../types';
import MaintenanceModal from './MaintenanceModal';
import MaintenanceResolutionModal from './MaintenanceResolutionModal';
import { maintenanceService, assetStatusService } from '../../lib/supabase';

interface MaintenanceTicketsProps {
  tickets: MaintenanceTicket[];
  onTicketUpdate: (tickets: MaintenanceTicket[]) => void;
  onAuditLog: (log: any) => void;
  currentUser: string;
}

const MaintenanceTickets: React.FC<MaintenanceTicketsProps> = ({ 
  tickets, 
  onTicketUpdate, 
  onAuditLog, 
  currentUser 
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [resolutionModalOpen, setResolutionModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<MaintenanceTicket | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAddTicket = () => {
    setModalOpen(true);
  };

  const handleSaveTicket = async (ticketData: Partial<MaintenanceTicket>) => {
    try {
      setLoading(true);
      const newTicket = await maintenanceService.create(ticketData as Omit<MaintenanceTicket, 'id' | 'createdAt' | 'updatedAt'>);
      onTicketUpdate([newTicket, ...tickets]);
      
      // Update asset status to "Under Maintenance"
      if (newTicket.assetSerial) {
        await assetStatusService.updateAssetStatus(newTicket.assetSerial, 'Under Maintenance');
      }
      
      // Add audit log
      onAuditLog({
        assetSerial: newTicket.assetSerial,
        action: 'Maintenance Ticket Created',
        performedBy: currentUser,
        timestamp: new Date().toISOString(),
        details: `Maintenance ticket created: ${newTicket.title}`,
        newValues: { 
          ticketStatus: newTicket.status, 
          priority: newTicket.priority,
          assetStatus: 'Under Maintenance'
        }
      });
    } catch (err) {
      console.error('Error creating ticket:', err);
      alert('Failed to create maintenance ticket');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTicketStatus = async (ticketId: string, newStatus: string) => {
    try {
      setLoading(true);
      const updates = {
        status: newStatus as any,
        ...(newStatus === 'Resolved' && { dateReturned: new Date().toISOString() })
      };
      
      const updatedTicket = await maintenanceService.update(ticketId, updates);
      const updatedTickets = tickets.map(ticket =>
        ticket.id === ticketId ? updatedTicket : ticket
      );
      onTicketUpdate(updatedTickets);
      
      // Update asset status based on ticket status
      const ticket = tickets.find(t => t.id === ticketId);
      if (ticket && newStatus === 'Resolved') {
        // Asset goes back to Active when maintenance is resolved (unless declared obsolete)
        await assetStatusService.updateAssetStatus(ticket.assetSerial, 'Active');
      }
      
      // Add audit log
      if (ticket) {
        onAuditLog({
          assetSerial: ticket.assetSerial,
          action: 'Maintenance Status Updated',
          performedBy: currentUser,
          timestamp: new Date().toISOString(),
          details: `Maintenance ticket status changed to ${newStatus}`,
          oldValues: { status: ticket.status },
          newValues: { 
            ticketStatus: newStatus,
            ...(newStatus === 'Resolved' && { assetStatus: 'Active' })
          }
        });
      }
    } catch (err) {
      console.error('Error updating ticket:', err);
      alert('Failed to update maintenance ticket');
    } finally {
      setLoading(false);
    }
  };

  const handleResolveTicket = (ticket: MaintenanceTicket) => {
    setSelectedTicket(ticket);
    setResolutionModalOpen(true);
  };

  const handleSaveResolution = async (resolutionData: { 
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
  }) => {
    if (!selectedTicket) return;
    
    try {
      setLoading(true);
      const updates = {
        status: 'Resolved' as any,
        resolution: resolutionData.resolution,
        dateReturned: new Date().toISOString(),
        ...(resolutionData.isObsolete && {
          obsoleteReason: resolutionData.obsoleteReason,
          obsoleteDate: new Date().toISOString()
        })
      };
      
      const updatedTicket = await maintenanceService.update(selectedTicket.id, updates);
      const updatedTickets = tickets.map(ticket =>
        ticket.id === selectedTicket.id ? updatedTicket : ticket
      );
      onTicketUpdate(updatedTickets);
      
      // Update asset status based on resolution
      if (resolutionData.isObsolete) {
        await assetStatusService.updateAssetStatus(selectedTicket.assetSerial, 'Obsolete');
        
        // Handle replacement asset if specified
        if (resolutionData.requiresReplacement && resolutionData.replacementDetails) {
          try {
            // Get the original asset details to inherit owner information
            const originalAsset = await assetStatusService.getAssetBySerial(selectedTicket.assetSerial);
            
            if (originalAsset && originalAsset.status === 'Active') {
              // Update replacement asset with original asset's owner details
              await assetStatusService.updateAssetOwnership(
                resolutionData.replacementDetails.serialNumber,
                {
                  fullName: originalAsset.user,
                  location: originalAsset.location,
                  department: originalAsset.department,
                  section: originalAsset.section,
                  domainAccount: originalAsset.domainAccount
                },
                'Active'
              );
              
              // Create replacement record
              const { assetReplacementsService } = await import('../../lib/supabase');
              await assetReplacementsService.create({
                originalAssetSerial: selectedTicket.assetSerial,
                replacementAssetSerial: resolutionData.replacementDetails.serialNumber,
                maintenanceTicketId: selectedTicket.id,
                replacementReason: resolutionData.obsoleteReason || 'Asset obsolete',
                replacementDate: new Date().toISOString(),
                deployedToUser: originalAsset.user,
                deployedLocation: originalAsset.location,
                status: 'Deployed'
              });
              
              // Add audit log for replacement
              onAuditLog({
                assetSerial: resolutionData.replacementDetails.serialNumber,
                action: 'Asset Replacement Deployed',
                performedBy: currentUser,
                timestamp: new Date().toISOString(),
                details: `Replacement asset deployed for obsolete asset ${selectedTicket.assetSerial}`,
                newValues: { 
                  status: 'Active',
                  user: originalAsset.user,
                  location: originalAsset.location,
                  replacedAsset: selectedTicket.assetSerial
                }
              });
            }
          } catch (replacementError) {
            console.error('Error handling replacement asset:', replacementError);
            // Continue with obsolete marking even if replacement fails
          }
        }
      } else {
        await assetStatusService.updateAssetStatus(selectedTicket.assetSerial, 'Active');
      }
      
      // Add audit log
      onAuditLog({
        assetSerial: selectedTicket.assetSerial,
        action: resolutionData.isObsolete ? 'Asset Declared Obsolete' : 'Maintenance Resolved',
        performedBy: currentUser,
        timestamp: new Date().toISOString(),
        details: resolutionData.isObsolete 
          ? `Asset declared obsolete: ${resolutionData.obsoleteReason}`
          : `Maintenance resolved: ${resolutionData.resolution}`,
        oldValues: { status: 'In Progress' },
        newValues: { 
          ticketStatus: 'Resolved',
          assetStatus: resolutionData.isObsolete ? 'Obsolete' : 'Active'
        }
      });
    } catch (err) {
      console.error('Error resolving ticket:', err);
      alert('Failed to resolve maintenance ticket');
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'High': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Resolved': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'In Progress': return <Wrench className="h-4 w-4 text-blue-500" />;
      case 'Open': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'Closed': return <CheckCircle className="h-4 w-4 text-gray-500" />;
      default: return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Resolved': return 'bg-green-100 text-green-800';
      case 'In Progress': return 'bg-blue-100 text-blue-800';
      case 'Open': return 'bg-yellow-100 text-yellow-800';
      case 'Closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { title: 'Open Tickets', count: 15, color: 'bg-yellow-500' },
          { title: 'In Progress', count: 8, color: 'bg-blue-500' },
          { title: 'Resolved', count: 23, color: 'bg-green-500' },
          { title: 'Critical', count: 2, color: 'bg-red-500' }
        ].map((stat, index) => (
          <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className="text-2xl font-bold text-black">{stat.count}</p>
              </div>
              <div className={`${stat.color} rounded-lg p-3`}>
                <Wrench className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-black">Maintenance Tickets</h3>
            <button 
              onClick={handleAddTicket}
              className="bg-[#CC092F] text-white px-4 py-2 rounded-lg hover:bg-[#AA0726] flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>New Ticket</span>
            </button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#F4F4F4]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ticket</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Asset</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned To</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Resolution</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tickets.map((ticket) => (
                <tr key={ticket.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm font-medium text-black">{ticket.title}</p>
                      <p className="text-sm text-gray-600 truncate max-w-xs">{ticket.description}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm">
                      <p className="text-black font-medium">{ticket.assetType}</p>
                      <p className="text-gray-600">{ticket.assetSerial}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(ticket.priority)}`}>
                      {ticket.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
                      {getStatusIcon(ticket.status)}
                      <span className="ml-1">{ticket.status}</span>
                    </span>
                    {ticket.obsoleteDate && (
                      <div className="mt-1">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                          <XCircle className="h-3 w-3 mr-1" />
                          Obsolete
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <p className="text-sm text-black">{ticket.assignedTo}</p>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <p className="text-sm text-black">{new Date(ticket.dateReceived).toLocaleDateString()}</p>
                    {ticket.dateReturned && (
                      <p className="text-xs text-gray-500">
                        Returned: {new Date(ticket.dateReturned).toLocaleDateString()}
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="max-w-xs">
                      {ticket.resolution && (
                        <p className="text-sm text-gray-600 truncate">{ticket.resolution}</p>
                      )}
                      {ticket.obsoleteReason && (
                        <p className="text-xs text-red-600 mt-1">
                          Obsolete: {ticket.obsoleteReason}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex items-center space-x-2">
                      {ticket.status === 'Open' && (
                        <button
                          onClick={() => handleUpdateTicketStatus(ticket.id, 'In Progress')}
                          className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs hover:bg-blue-200"
                        >
                          Start Work
                        </button>
                      )}
                      {ticket.status === 'In Progress' && (
                        <button
                          onClick={() => handleResolveTicket(ticket)}
                          className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs hover:bg-green-200"
                        >
                          Resolve
                        </button>
                      )}
                      {ticket.status === 'Resolved' && (
                        <button
                          onClick={() => handleUpdateTicketStatus(ticket.id, 'Closed')}
                          className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs hover:bg-gray-200"
                        >
                          Close
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
      
      <MaintenanceResolutionModal
        isOpen={resolutionModalOpen}
        onClose={() => setResolutionModalOpen(false)}
        onSave={handleSaveResolution}
        ticket={selectedTicket}
      />
      <MaintenanceModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveTicket}
      />
    </div>
  );
};

export default MaintenanceTickets;