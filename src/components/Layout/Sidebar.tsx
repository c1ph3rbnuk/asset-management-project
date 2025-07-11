import React from 'react';
import { 
  LayoutDashboard, 
  Package, 
  RefreshCw, 
  Wrench, 
  FileText, 
  Users, 
  Settings,
  Building2
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange }) => {
  const menuItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'assets', icon: Package, label: 'Assets' },
    { id: 'lifecycle', icon: RefreshCw, label: 'Lifecycle' },
    { id: 'maintenance', icon: Wrench, label: 'Maintenance' },
    { id: 'reports', icon: FileText, label: 'Reports' },
    { id: 'audit', icon: FileText, label: 'Audit Trail' },
    { id: 'settings', icon: Settings, label: 'Settings' }
  ];

  return (
    <div className="w-64 bg-white border-r border-gray-200 h-screen sticky top-0">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <Building2 className="h-8 w-8 text-[#CC092F]" />
          <div>
            <h1 className="text-lg font-bold text-black">IT Asset Manager</h1>
            <p className="text-sm text-gray-600">Kenya Revenue Authority</p>
          </div>
        </div>
      </div>
      
      <nav className="mt-6">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center px-6 py-3 text-left hover:bg-blue-50 transition-colors ${
                activeTab === item.id
                  ? 'bg-[#CC092F] text-white hover:bg-[#CC092F]'
                  : 'text-gray-700 hover:text-black'
              }`}
            >
              <Icon className="h-5 w-5 mr-3" />
              {item.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default Sidebar;