import React from 'react';
import { Package, Activity, Wrench, Archive, TrendingUp, Monitor, Server } from 'lucide-react';
import { DashboardStats as StatsType } from '../../types';

interface DashboardStatsProps {
  stats: StatsType;
}

const DashboardStats: React.FC<DashboardStatsProps> = ({ stats }) => {
  const statCards = [
    {
      title: 'Total Assets',
      value: stats.totalAssets.toLocaleString(),
      icon: Package,
      color: 'bg-blue-500',
      trend: '+12%',
      subtitle: `${stats.pcAssets} PCs • ${stats.vdiAssets} VDIs`
    },
    {
      title: 'Active Assets',
      value: stats.activeAssets.toLocaleString(),
      icon: Activity,
      color: 'bg-green-500',
      trend: '+8%'
    },
    {
      title: 'In Store',
      value: stats.inStore.toString(),
      icon: Archive,
      color: 'bg-purple-500',
      trend: '+5%'
    },
    {
      title: 'Under Maintenance',
      value: stats.inMaintenance.toString(),
      icon: Wrench,
      color: 'bg-yellow-500',
      trend: '-3%'
    },
    {
      title: 'Obsolete Assets',
      value: stats.obsoleteAssets.toString(),
      icon: Archive,
      color: 'bg-[#CC092F]',
      trend: '+1%'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {statCards.map((card, index) => {
        const Icon = card.icon;
        return (
          <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{card.title}</p>
                <p className="text-2xl font-bold text-black mt-1">{card.value}</p>
                {card.subtitle && (
                  <p className="text-xs text-gray-500 mt-1">{card.subtitle}</p>
                )}
              </div>
              <div className={`${card.color} rounded-lg p-3`}>
                <Icon className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-sm text-green-500 font-medium">{card.trend}</span>
              <span className="text-sm text-gray-500 ml-1">from last month</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default DashboardStats;