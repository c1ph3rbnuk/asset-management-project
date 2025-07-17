import React from 'react';
import { 
  LayoutDashboard, 
  Package, 
  RefreshCw, 
  Wrench, 
  FileText, 
  Users, 
  Settings,
  Building2,
  ChevronLeft,
  Menu
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  activeTab, 
  onTabChange, 
  isCollapsed = false, 
  onToggleCollapse 
}) => {
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
    <div className={`${isCollapsed ? 'w-16' : 'w-64'} bg-white border-r border-gray-200 h-screen sticky top-0 transition-all duration-300`}>
      <div className={`${isCollapsed ? 'p-4' : 'p-6'} border-b border-gray-200 flex items-center justify-between`}>
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'}`}>
          <Building2 className="h-8 w-8 text-[#CC092F]" />
          {!isCollapsed && (
            <div>
              <h1 className="text-lg font-bold text-black">IT Asset Manager</h1>
              <p className="text-sm text-gray-600">Kenya Revenue Authority</p>
            </div>
          )}
        </div>
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="p-1 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-black"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <Menu className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </button>
        )}
      </div>
      
      <nav className="mt-6">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center ${isCollapsed ? 'px-4 justify-center' : 'px-6'} py-3 text-left hover:bg-gray-50 transition-colors ${
                activeTab === item.id
                  ? 'bg-[#CC092F] text-white hover:bg-[#CC092F]'
                  : 'text-gray-700 hover:text-black'
              }`}
              title={isCollapsed ? item.label : undefined}
            >
              <Icon className={`h-5 w-5 ${!isCollapsed ? 'mr-3' : ''}`} />
              {!isCollapsed && item.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default Sidebar;