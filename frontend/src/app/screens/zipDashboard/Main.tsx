import React, { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.dollor.ai';
import { 
  Wallet,
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  DollarSign,
  Filter,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  CreditCard,
  Building
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement,
  ArcElement
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import Button from '../../components/ui/Button';
import Bridge from '../../constants/Bridge';
import { Spin, message } from 'antd';
import * as htmlToImage from "html-to-image";
import { saveAs } from 'file-saver';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const Main: React.FC = () => {
  const [dateRange, setDateRange] = useState('month');
  const [zipMetrics, setZipMetrics] = useState({});
  const [onboardingTrendData, setOnboardingTrendData] = useState({});
  const [vendorStatusData, setVendorStatusData] = useState({});
  const [onboardingStageData, setOnboardingStageData] = useState({});
  const [onboardingTimeData, setOnboardingTimeData] = useState({});
  const [recentActivities, setRecentActivities] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getZipMetrics();
    getOnboardingTrendData();
    getVendorStatusData();
    getOnboardingStageData();
    getOnboardingTimeData();
    getRecentActivities();
  }, []);

  const getZipMetrics = async () => {
    try {
      // Fetch real vendor data from backend API
      const response = await fetch(`${API_URL}/api/vendors`);
      const vendors = await response.json();
      
      // Calculate metrics from real data
      const activeVendors = vendors.filter(v => v.onboarding_status === 'approved').length;
      const pendingApprovalVendors = vendors.filter(v => v.onboarding_status === 'pending' || v.onboarding_status === 'in_review').length;
      const onboardingInProgress = vendors.filter(v => v.onboarding_phase !== 'not_started' && v.onboarding_phase !== 'completed').length;
      const completedOnboarding = vendors.filter(v => v.onboarding_phase === 'completed').length;
      const rejectedApplications = vendors.filter(v => v.onboarding_status === 'rejected').length;
      
      const zipMetrics = {
        activeVendors,
        pendingApprovalVendors,
        onboardingInProgress,
        avgOnboardingTime: 12, // TODO: Calculate from actual data
        completedOnboarding,
        rejectedApplications
      };
      setZipMetrics(zipMetrics);
    } catch (error) {
      console.error('Failed to fetch ZIP metrics:', error);
      // Fallback to mock data
      setZipMetrics({
        activeVendors: 0,
        pendingApprovalVendors: 0,
        onboardingInProgress: 0,
        avgOnboardingTime: 0,
        completedOnboarding: 0,
        rejectedApplications: 0
      });
    }
  }

  const getOnboardingTrendData = () => {
    const onboardingTrendData = {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      datasets: [{
        label: 'New Vendor Applications',
        data: [25, 32, 28, 35, 42, 38],
        borderColor: '#f59e0b',
        backgroundColor: '#f59e0b',
        tension: 0.4
      },
      {
        label: 'Completed Onboarding',
        data: [18, 28, 25, 32, 38, 35],
        borderColor: '#10b981',
        backgroundColor: '#10b981',
        tension: 0.4,
        yAxisID: 'y1'
      }]
    };
    setOnboardingTrendData(onboardingTrendData);
    // Bridge.zipDashboard.getOnboardingTrendData().then((response) => {
    //   setOnboardingTrendData(response);
    // });
  }

  const getVendorStatusData = () => {
    const vendorStatusData = {
      labels: ['Active', 'Pending Approval', 'In Onboarding', 'Rejected'],
      datasets: [{
        data: [342, 28, 45, 8],
        backgroundColor: ['#10b981', '#f59e0b', '#6366f1', '#ef4444'],
        borderWidth: 0
      }]
    };
    setVendorStatusData(vendorStatusData);
    // Bridge.zipDashboard.getVendorStatusData().then((response) => {
    //   setVendorStatusData(response);
    // });
  }

  const getOnboardingStageData = () => {
    const onboardingStageData = {
      labels: ['Registration', 'Document Review', 'Background Check', 'Final Approval'],
      datasets: [{
        label: 'Vendors in Stage',
        data: [15, 12, 8, 5],
        backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'],
      }]
    };
    setOnboardingStageData(onboardingStageData);
    // Bridge.zipDashboard.getOnboardingStageData().then((response) => {
    //   setOnboardingStageData(response);
    // });
  }

  const getOnboardingTimeData = () => {
     const onboardingTimeData = {
      labels: ['< 7 Days', '7-14 Days', '15-21 Days', '> 21 Days'],
      datasets: [{
        data: [25, 45, 20, 10],
        backgroundColor: ['#10b981', '#6366f1', '#f59e0b', '#ef4444'],
        borderWidth: 0
      }]
    };
    setOnboardingTimeData(onboardingTimeData);
    // Bridge.zipDashboard.getOnboardingTimeData().then((response) => {
    //   setOnboardingTimeData(response);
    // });
  }

  const getRecentActivities = () => {
    // Bridge.zipDashboard.getRecentActivities().then((response) => {
    //   setRecentActivities(response);
    // });
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: '#e5e7eb',
        },
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        grid: {
          drawOnChartArea: false,
        },
      },
      x: {
        grid: {
          display: false,
        },
      },
    },
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
      },
    },
  };

  const exportData = () => {
    setLoading(true);
    var node = document.getElementById("main-section");
    htmlToImage.toBlob(node).then((blob) => {
      saveAs(blob, "ZIp Dashboard.png");
      setLoading(false);
      message.success("Exported successfully.");
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">ZIP Dashboard</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Vendor onboarding and management insights
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <select
              className="rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
            >
              <option value="week">Last 7 days</option>
              <option value="month">Last 30 days</option>
              <option value="quarter">Last Quarter</option>
              <option value="year">Last Year</option>
            </select>
          </div>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Filter size={16} />}
          >
            Filters
          </Button>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Download size={16} />}
            onClick={()=>exportData()}
          >
            Export
          </Button>
        </div>
      </div>

      <div id="main-section">

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Active Vendors</p>
                <p className="mt-2 text-2xl font-semibold text-neutral-900">{zipMetrics.activeVendors}</p>
              </div>
              <div className="p-3 bg-primary-50 rounded-full">
                <Users className="h-6 w-6 text-primary-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Pending Approval</p>
                <p className="mt-2 text-2xl font-semibold text-warning-600">{zipMetrics.pendingApprovalVendors}</p>
              </div>
              <div className="p-3 bg-warning-50 rounded-full">
                <Clock className="h-6 w-6 text-warning-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">In Onboarding</p>
                <p className="mt-2 text-2xl font-semibold text-primary-600">{zipMetrics.onboardingInProgress}</p>
              </div>
              <div className="p-3 bg-primary-50 rounded-full">
                <Building className="h-6 w-6 text-primary-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Avg Onboarding Time</p>
                <p className="mt-2 text-2xl font-semibold text-neutral-900">{zipMetrics.avgOnboardingTime}d</p>
              </div>
              <div className="p-3 bg-primary-50 rounded-full">
                <Clock className="h-6 w-6 text-primary-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Completed Onboarding</p>
                <p className="mt-2 text-2xl font-semibold text-success-600">{zipMetrics.completedOnboarding}</p>
              </div>
              <div className="p-3 bg-success-50 rounded-full">
                <CheckCircle className="h-6 w-6 text-success-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Rejected Applications</p>
                <p className="mt-2 text-2xl font-semibold text-error-600">{zipMetrics.rejectedApplications}</p>
              </div>
              <div className="p-3 bg-error-50 rounded-full">
                <AlertCircle className="h-6 w-6 text-error-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-5">
          <div className="bg-white p-6 rounded-lg shadow-card">
            <h2 className="text-lg font-medium text-neutral-900 mb-4">Vendor Onboarding Trends</h2>
            <div className="h-80">
              {onboardingTrendData && onboardingTrendData.datasets && (
                <Line data={onboardingTrendData} options={chartOptions} />
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-card">
            <h2 className="text-lg font-medium text-neutral-900 mb-4">Vendor Status Distribution</h2>
            <div className="h-80">
              {vendorStatusData && vendorStatusData.datasets && (
                <Doughnut data={vendorStatusData} options={pieOptions} />
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-card">
            <h2 className="text-lg font-medium text-neutral-900 mb-4">Onboarding Stages</h2>
            <div className="h-80">
              {onboardingStageData && onboardingStageData.datasets && (
                <Bar data={onboardingStageData} options={chartOptions} />
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-card">
            <h2 className="text-lg font-medium text-neutral-900 mb-4">Onboarding Time Distribution</h2>
            <div className="h-80">
              {onboardingTimeData && onboardingTimeData.datasets && (
                <Doughnut data={onboardingTimeData} options={pieOptions} />
              )}
            </div>
          </div>
        </div>

        {/* Recent Onboarding Activities */}
        <div className="bg-white rounded-lg shadow-card overflow-hidden mt-5">
          <div className="px-6 py-4 border-b border-neutral-200">
            <h2 className="font-medium text-neutral-900">Recent Onboarding Activities</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-200">
              <thead className="bg-neutral-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Vendor
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Activity
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Stage
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Days in Stage
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-neutral-200">
                {recentActivities.length>0 && recentActivities.map((activity, index) => (
                  <tr key={index} className="hover:bg-neutral-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-900">
                      {activity.vendor}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">
                      {activity.activity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">
                      {activity.stage}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        activity.status === 'Completed' ? 'bg-success-100 text-success-700' :
                        activity.status === 'In Progress' ? 'bg-primary-100 text-primary-700' :
                        'bg-warning-100 text-warning-700'
                      }`}>
                        {activity.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">
                      {activity.daysInStage}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">
                      {activity.date}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Onboarding Performance */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-5">
          <div className="bg-white p-6 rounded-lg shadow-card">
            <h2 className="text-lg font-medium text-neutral-900 mb-4">Onboarding Performance</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg">
                <div>
                  <p className="text-sm text-neutral-600">Approval Rate</p>
                  <p className="mt-1 text-2xl font-semibold text-neutral-900">95.2%</p>
                </div>
                <div className="flex items-center text-success-600">
                  <ArrowUpRight className="h-4 w-4" />
                  <span className="ml-1 text-sm font-medium">2.1%</span>
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg">
                <div>
                  <p className="text-sm text-neutral-600">Average Review Time</p>
                  <p className="mt-1 text-2xl font-semibold text-neutral-900">8.5 days</p>
                </div>
                <div className="flex items-center text-success-600">
                  <ArrowDownRight className="h-4 w-4" />
                  <span className="ml-1 text-sm font-medium">15%</span>
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg">
                <div>
                  <p className="text-sm text-neutral-600">Document Completion Rate</p>
                  <p className="mt-1 text-2xl font-semibold text-neutral-900">88%</p>
                </div>
                <div className="flex items-center text-success-600">
                  <ArrowUpRight className="h-4 w-4" />
                  <span className="ml-1 text-sm font-medium">5%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-card">
            <h2 className="text-lg font-medium text-neutral-900 mb-4">Recent Vendor Approvals</h2>
            <div className="space-y-4">
              {[
                { name: 'Tech Solutions Inc.', approvalDate: '2024-03-16', onboardingTime: 12 },
                { name: 'Global Services Ltd.', approvalDate: '2024-03-15', onboardingTime: 8 },
                { name: 'Office Supplies Co.', approvalDate: '2024-03-14', onboardingTime: 15 },
                { name: 'Manufacturing Corp.', approvalDate: '2024-03-13', onboardingTime: 10 }
              ].map((vendor) => (
                <div key={vendor.name} className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-neutral-900">{vendor.name}</p>
                    <p className="text-xs text-neutral-500">
                      Approved: {vendor.approvalDate}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-neutral-900">
                      {vendor.onboardingTime} days
                    </p>
                    <p className="text-xs text-neutral-500">volume</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Vendor Onboarding Pipeline */}
        <div className="bg-white rounded-lg shadow-card p-6 mt-5">
          <h2 className="text-lg font-medium text-neutral-900 mb-4">Vendor Onboarding Pipeline</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              {
                stage: 'Application Submitted',
                count: 15,
                avgTime: '1 day',
                color: 'bg-primary-50 text-primary-700 border-primary-200'
              },
              {
                stage: 'Document Review',
                count: 12,
                avgTime: '3 days',
                color: 'bg-warning-50 text-warning-700 border-warning-200'
              },
              {
                stage: 'Background Check',
                count: 8,
                avgTime: '5 days',
                color: 'bg-secondary-50 text-secondary-700 border-secondary-200'
              },
              {
                stage: 'Final Approval',
                count: 5,
                avgTime: '2 days',
                color: 'bg-success-50 text-success-700 border-success-200'
              }
            ].map((stage) => (
              <div key={stage.stage} className={`border rounded-lg p-4 ${stage.color}`}>
                <div className="text-center">
                  <p className="text-2xl font-semibold">{stage.count}</p>
                  <p className="text-sm font-medium mt-1">{stage.stage}</p>
                  <p className="text-xs mt-2">Avg: {stage.avgTime}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>


    </div>
  );
};

export default Main;