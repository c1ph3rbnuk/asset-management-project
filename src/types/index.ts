// Core types for the IT Asset Management System
export interface Asset {
  id: string;
  assetType: 'PC' | 'Laptop' | 'VDI' | 'Printer' | 'Router' | 'Switch' | 'IP Phone';
  serialNumber: string;
  model: string;
  tag: string;
  brand: string;
  user: string;
  location: string;
  department: string;
  status: 'Active' | 'In Store' | 'Under Maintenance' | 'Obsolete' | 'Disposed';
  createdAt: string;
  updatedAt: string;
}

export interface LifecycleAction {
  id: string;
  assetId: string;
  actionType: 'New Deployment' | 'Redeployment' | 'Relocation' | 'Surrender' | 'Change of Ownership' | 'Exit';
  fromUser?: string;
  toUser: string;
  fromLocation?: string;
  toLocation: string;
  fromDepartment?: string;
  toDepartment: string;
  requestedBy: string;
  status: 'Pending' | 'Completed';
  requestDate: string;
  completionDate?: string;
  comments?: string;
  movementFormPath?: string;
}

export interface MaintenanceTicket {
  id: string;
  assetId: string;
  title: string;
  description: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'Open' | 'In Progress' | 'Resolved' | 'Closed';
  reportedBy: string;
  assignedTo: string;
  dateReceived: string;
  dateReturned?: string;
  resolution?: string;
  category: 'Hardware' | 'Software' | 'Network' | 'Replacement';
  cost?: number;
  obsoleteReason?: string;
  obsoleteDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  assetId: string;
  action: string;
  performedBy: string;
  timestamp: string;
  details: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'ICT Officer' | 'Department HOD' | 'End User';
  department: string;
  isActive: boolean;
  createdAt: string;
}

export interface DashboardStats {
  totalAssets: number;
  activeAssets: number;
  inStore: number;
  inMaintenance: number;
  obsoleteAssets: number;
  pcAssets: number;
  vdiAssets: number;
  recentActivities: AuditLog[];
}