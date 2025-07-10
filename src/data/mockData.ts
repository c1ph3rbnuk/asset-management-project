// This file is kept for reference but all data is now loaded from Supabase
// The mock data below is only used for initial development and testing

import { Asset, LifecycleAction, MaintenanceTicket, AuditLog, User, DashboardStats } from '../types';

// These are kept as fallback data only - not used in production
export const mockAssets: Asset[] = [];
export const mockLifecycleActions: LifecycleAction[] = [];
export const mockMaintenanceTickets: MaintenanceTicket[] = [];
export const mockAuditLogs: AuditLog[] = [];
export const mockUsers: User[] = [];

export const mockDashboardStats: DashboardStats = {
  totalAssets: 0,
  activeAssets: 0,
  inStore: 0,
  inMaintenance: 0,
  obsoleteAssets: 0,
  pcAssets: 0,
  vdiAssets: 0,
  recentActivities: []
};