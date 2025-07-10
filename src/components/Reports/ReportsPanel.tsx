import React from 'react';
import { FileText, Download, TrendingUp, BarChart3, PieChart } from 'lucide-react';
import { Asset, MaintenanceTicket, LifecycleAction } from '../../types';

interface ReportsPanelProps {
  assets: Asset[];
  tickets: MaintenanceTicket[];
  actions: LifecycleAction[];
}

const ReportsPanel: React.FC<ReportsPanelProps> = ({ assets, tickets, actions }) => {
  const reports = [
    {
      title: 'Asset Distribution Report',
      description: 'Distribution of assets across departments and locations',
      icon: PieChart,
      color: 'bg-blue-500'
    },
    {
      title: 'Maintenance Analytics',
      description: 'Analysis of maintenance requests and resolution times',
      icon: BarChart3,
      color: 'bg-green-500'
    },
    {
      title: 'Lifecycle Movement Report',
      description: 'Track asset movements and lifecycle changes',
      icon: TrendingUp,
      color: 'bg-purple-500'
    },
    {
      title: 'Audit Compliance Report',
      description: 'Comprehensive audit trail and compliance tracking',
      icon: FileText,
      color: 'bg-[#CC092F]'
    }
  ];

  const quickStats = [
    { label: 'Total Assets', value: assets.length.toLocaleString(), trend: '+12%' },
    { label: 'Active Deployments', value: assets.filter(a => a.status === 'Active').length.toLocaleString(), trend: '+8%' },
    { label: 'Maintenance Requests', value: tickets.filter(t => t.status !== 'Closed').length.toString(), trend: '-15%' },
    { label: 'Lifecycle Actions', value: actions.length.toString(), trend: '+5%' }
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-black mb-4">Quick Statistics</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickStats.map((stat, index) => (
            <div key={index} className="p-4 bg-[#F4F4F4] rounded-lg">
              <p className="text-sm font-medium text-gray-600">{stat.label}</p>
              <p className="text-2xl font-bold text-black">{stat.value}</p>
              <p className={`text-sm ${stat.trend.startsWith('+') ? 'text-green-600' : stat.trend.startsWith('-') ? 'text-red-600' : 'text-gray-600'}`}>
                {stat.trend} from last month
              </p>
            </div>
          ))}
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-black mb-6">Available Reports</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {reports.map((report, index) => {
            const Icon = report.icon;
            return (
              <div key={index} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-4">
                    <div className={`${report.color} rounded-lg p-3`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-lg font-medium text-black">{report.title}</h4>
                      <p className="text-sm text-gray-600 mt-1">{report.description}</p>
                    </div>
                  </div>
                  <button className="flex items-center space-x-1 px-3 py-1 text-sm text-[#CC092F] hover:text-[#AA0726] border border-[#CC092F] rounded-lg hover:bg-red-50">
                    <Download className="h-4 w-4" />
                    <span>Generate</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-black mb-4">Recent Reports</h3>
        <div className="space-y-4">
          {[
            { name: 'Monthly Asset Report - January 2024', date: '2024-01-31', status: 'Completed' },
            { name: 'Maintenance Analysis Q4 2023', date: '2024-01-15', status: 'Completed' },
            { name: 'Audit Compliance Report', date: '2024-01-10', status: 'In Progress' }
          ].map((report, index) => (
            <div key={index} className="flex items-center justify-between p-4 bg-[#F4F4F4] rounded-lg">
              <div>
                <p className="text-sm font-medium text-black">{report.name}</p>
                <p className="text-sm text-gray-600">Generated on {report.date}</p>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 text-xs rounded-full ${
                  report.status === 'Completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {report.status}
                </span>
                {report.status === 'Completed' && (
                  <button className="text-[#CC092F] hover:text-[#AA0726]">
                    <Download className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ReportsPanel;