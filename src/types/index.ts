// Core types for the IT Asset Management System
export interface Asset {
  id: string;
  assetType: 'PC' | 'Laptop' | 'VDI' | 'Printer' | 'Router' | 'Switch' | 'IP Phone' | 'Monitor' | 'CPU' | 'VDI Receiver';
  serialNumber: string;
  model: string;
  brand: string;
  user: string;
  location: string;
  department: string;
  section?: string;
  status: 'Active' | 'In Store' | 'Under Maintenance' | 'Obsolete' | 'Disposed';
  pairId?: string; // Links paired assets
  domainAccount?: string; // K12345678 or T12345678
  createdAt: string;
  updatedAt: string;
}

export interface AssetPair {
  id: string;
  primaryAssetId: string; // CPU or VDI Receiver
  secondaryAssetId: string; // Monitor
  pairType: 'PC' | 'VDI';
  isDeployed: boolean;
  currentUser?: string;
  currentLocation?: string;
  currentDepartment?: string;
  currentSection?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserDetails {
  id: string;
  fullName: string;
  domainAccount: string; // K12345678 or T12345678
  location: string;
  department: string;
  section: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LifecycleAction {
  id: string;
  actionType: 'New Deployment' | 'Redeployment' | 'Relocation' | 'Surrender' | 'Change of Ownership' | 'Exit';
  
  // Deployment type
  deploymentType: 'Pair' | 'Individual';
  
  // Asset Information
  primaryAssetSerial: string; // CPU or VDI Receiver
  secondaryAssetSerial: string; // Monitor
  assetPairType: 'PC' | 'VDI';
  individualAssetType?: string; // For individual assets
  
  // From User Details (for relocations, surrenders, change of ownership)
  fromUserFullName?: string;
  fromUserDomainAccount?: string;
  fromLocation?: string;
  fromDepartment?: string;
  fromSection?: string;
  
  // To User Details
  toUserFullName: string;
  toUserDomainAccount: string;
  toLocation: string;
  toDepartment: string;
  toSection: string;
  
  requestedBy: string;
  status: 'Pending' | 'Completed';
  requestDate: string;
  completionDate?: string;
  comments?: string;
  movementFormPath?: string;
}

export interface MaintenanceTicket {
  id: string;
  assetSerial: string;
  assetType: string;
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
  
  // Obsolete tracking
  isObsolete?: boolean;
  obsoleteReason?: string;
  obsoleteDate?: string;
  
  // Replacement tracking
  requiresReplacement?: boolean;
  replacementAssetSerial?: string;
  replacementAssetType?: string;
  replacementBrand?: string;
  replacementModel?: string;
  replacementStatus?: 'Pending' | 'Ordered' | 'Received' | 'Deployed';
  
  createdAt: string;
  updatedAt: string;
}

export interface AssetReplacement {
  id: string;
  originalAssetSerial: string;
  replacementAssetSerial: string;
  maintenanceTicketId: string;
  replacementReason: string;
  replacementDate: string;
  deployedToUser?: string;
  deployedLocation?: string;
  status: 'Pending' | 'Ordered' | 'Received' | 'Deployed';
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  assetSerial: string;
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
  personalNumber: string;
  password: string;
  role: 'Admin' | 'ICT Officer' | 'Department HOD' | 'End User';
  department: string;
  isActive: boolean;
  lastLogin?: string;
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
  totalPairs: number;
  deployedPairs: number;
  recentActivities: AuditLog[];
}