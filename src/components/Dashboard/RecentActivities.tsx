import React from 'react';
import { Clock, User, Package } from 'lucide-react';
import { AuditLog } from '../../types';

interface RecentActivitiesProps {
  activities: AuditLog[];
}

const RecentActivities: React.FC<RecentActivitiesProps> = ({ activities }) => {
  const getActionIcon = (action: string) => {
    if (action.includes('Relocated')) return Package;
    if (action.includes('Maintenance')) return Clock;
    return User;
  };

  const getActionColor = (action: string) => {
    if (action.includes('Relocated')) return 'bg-blue-100 text-blue-700';
    if (action.includes('Maintenance')) return 'bg-yellow-100 text-yellow-700';
    return 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-black mb-4">Recent Activities</h3>
      <div className="space-y-4">
        {activities.map((activity) => {
          const Icon = getActionIcon(activity.action);
          const colorClass = getActionColor(activity.action);
          
          return (
            <div key={activity.id} className="flex items-start space-x-4">
              <div className={`rounded-full p-2 ${colorClass}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-black">{activity.action}</p>
                <p className="text-sm text-gray-600">{activity.details}</p>
                <p className="text-xs text-gray-500 mt-1">
                  By {activity.performedBy} • {new Date(activity.timestamp).toLocaleDateString()}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      <button className="w-full mt-4 text-sm text-[#CC092F] hover:text-[#AA0726] font-medium">
        View all activities
      </button>
    </div>
  );
};

export default RecentActivities;