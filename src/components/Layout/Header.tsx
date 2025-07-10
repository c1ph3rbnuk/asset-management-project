import React from 'react';
import { Bell, User, LogOut, Shield } from 'lucide-react';

interface HeaderProps {
  currentUser?: string;
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ currentUser, onLogout }) => {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-black">Asset Management Dashboard</h2>
          <p className="text-sm text-gray-600 flex items-center">
            <Shield className="h-4 w-4 mr-1" />
            Kenya Revenue Authority - ICT Department
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <button className="p-2 text-gray-500 hover:text-black rounded-lg hover:bg-gray-100">
            <Bell className="h-5 w-5" />
          </button>
          
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-[#CC092F] rounded-full flex items-center justify-center">
              <User className="h-4 w-4 text-white" />
            </div>
            <div className="text-sm">
              <p className="font-medium text-black">{currentUser || 'ICT Officer'}</p>
              <p className="text-gray-600">Logged in</p>
            </div>
          </div>
          
          <button 
            onClick={onLogout}
            className="p-2 text-gray-500 hover:text-black rounded-lg hover:bg-gray-100"
            title="Sign Out"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;