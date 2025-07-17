import React from 'react';
import { FileText, Download, TrendingUp } from 'lucide-react';
import { Asset, MaintenanceTicket, LifecycleAction } from '../../types';

interface ReportsPanelProps {
  assets: Asset[];
  tickets: MaintenanceTicket[];
  actions: LifecycleAction[];
}

const ReportsPanel: React.FC<ReportsPanelProps> = ({ assets, tickets, actions }) => {
  const generateAllAssetsCSV = () => {
    // CSV headers
    const headers = ['Asset Type', 'Serial Number', 'Brand', 'Model', 'Location', 'Status'];
    
    // Convert assets to CSV rows
    const csvRows = assets.map(asset => [
      asset.assetType,
      asset.serialNumber,
      asset.brand,
      asset.model,
      asset.location,
      asset.status
    ]);
    
    // Combine headers and data
    const csvContent = [headers, ...csvRows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');
    
    // Create and download the file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `KRA_All_Assets_Report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
        <h3 className="text-lg font-semibold text-black mb-6">Asset Reports</h3>
        <div className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-[#CC092F] rounded-lg p-3">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <h4 className="text-lg font-medium text-black">All Assets Report</h4>
                <p className="text-sm text-gray-600 mt-1">
                  Complete list of all assets with their details including asset type, serial number, brand, model, location, and status
                </p>
                <div className="mt-2 text-xs text-gray-500">
                  <span className="font-medium">Includes:</span> Asset Type • Serial Number • Brand & Model • Location • Status
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  <span className="font-medium">Total Assets:</span> {assets.length.toLocaleString()} assets
                </div>
              </div>
            </div>
            <button 
              onClick={generateAllAssetsCSV}
              className="flex items-center space-x-1 px-4 py-2 text-sm text-white bg-[#CC092F] hover:bg-[#AA0726] rounded-lg transition-colors"
            >
              <Download className="h-4 w-4" />
              <span>Download CSV</span>
            </button>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-black mb-4">Recent Reports</h3>
        <div className="space-y-4">
          {[
            { name: 'All Assets Report - January 2024', date: '2024-01-31', status: 'Completed', count: '1,247 assets' },
            { name: 'All Assets Report - December 2023', date: '2023-12-31', status: 'Completed', count: '1,198 assets' },
            { name: 'All Assets Report - November 2023', date: '2023-11-30', status: 'Completed', count: '1,156 assets' }
          ].map((report, index) => (
            <div key={index} className="flex items-center justify-between p-4 bg-[#F4F4F4] rounded-lg">
              <div>
                <p className="text-sm font-medium text-black">{report.name}</p>
                <p className="text-sm text-gray-600">Generated on {report.date} • {report.count}</p>
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