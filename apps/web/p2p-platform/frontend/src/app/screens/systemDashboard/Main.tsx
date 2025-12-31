import React, { useState, useEffect } from 'react';
import { 
  BarChart as BarChartIcon,
  AlertCircle,
  Clock,
  Filter,
  FileText,
  CheckCircle2
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

const SeparateDashboard = () => {
  const [timeRange, setTimeRange] = useState('month');
  const [processUnityData, setProcessUnityData] = useState({ monthlyTrends: { labels: [], datasets: [] }, riskDistribution: { labels: [], datasets: [] } });
  const [netsuiteWoltData, setNetsuiteWoltData] = useState({ orderSyncTime: { labels: [], datasets: [] }, errorTypes: { labels: [], datasets: [] } });
  const [coupaData, setCoupaData] = useState({ topCategories: { labels: [], datasets: [] }, invoiceApprovalCycleTime: { labels: [], datasets: [] } });
  const [netsuiteData, setNetsuiteData] = useState({ revenueBySubsidiary: { labels: [], datasets: [] }, daysSalesOutstanding: { labels: [], datasets: [] } });
  const [zipData, setZipData] = useState({ requestApprovalTime: { labels: [], datasets: [] }, spendByCategory: { labels: [], datasets: [] } });
  const [jiraData, setJiraData] = useState({ ticketVolume: { labels: [], datasets: [] }, ticketsByStatus: { labels: [], datasets: [] } });

  useEffect(() => {
    getProcessUnityData();
    getNetsuiteWoltData();
    getCoupaData();
    getNetsuiteData();
    getZipData();
    getJiraData();
  }, []);

  const getProcessUnityData = () => {
    Bridge.systemDashboard.getProcessUnityData().then((response) => {
      setProcessUnityData(response);
    });
  }

  const getNetsuiteWoltData = () => {
    Bridge.systemDashboard.getNetsuiteWoltData().then((response) => {
      setNetsuiteWoltData(response);
    });
  }

  const getCoupaData = () => {
    Bridge.systemDashboard.getCoupaData().then((response) => {
      setCoupaData(response);
    });
  }

  const getNetsuiteData = () => {
    Bridge.systemDashboard.getNetsuiteData().then((response) => {
      setNetsuiteData(response);
    });
  }

  const getZipData = () => {
    Bridge.systemDashboard.getZipData().then((response) => {
      setZipData(response);
    });
  }

  const getJiraData = () => {
    Bridge.systemDashboard.getJiraData().then((response) => {
      setJiraData(response);
    });
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
      x: {
        grid: {
          display: false,
        },
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
      },
    },
  };

  const formatMetricName = (key: string): string => {
    const nameMap: { [key: string]: string } = {
      openPOs: 'Open POs',
      autoEscalatedPO: 'Auto Escalated PO',
      approvedPOs: 'Approved POs',
      invoices: 'Invoices',
      aging: 'Aging',
      invoiceApprovals: 'Invoice Approvals',
      journalApproval: 'Journal Approval',
      newRequests: 'New Requests',
      pendingApprovals: 'Pending Approvals',
      avgApprovalTime: 'AVG Approval Time',
      tprmPassRate: 'TPRM Pass Rate',
      openTickets: 'Open Tickets',
      poIssues: 'PO Issues',
      slaCompliance: 'SLA Compliance',
      avgResolutionTime: 'AVG Resolution Time',
      openAssessments: 'Open Assessments',
      pendingReviews: 'Pending Reviews',
      completedAssessments: 'Completed Assessments',
      riskScore: 'Risk Score',
      invoiceMatching: 'Invoice Matching'
    };

    return nameMap[key] || key.split(/(?=[A-Z])/).join(' ');
  };

  const renderSystemSection = (
    title: string,
    logo: string,
    data: any,
    trends: any,
    distribution: any
  ) => (
    <div className="bg-white rounded-lg shadow-card p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <img 
            src={logo} 
            alt={`${title} Logo`} 
            className="h-8 w-auto mr-3"
          />
          <h2 className="text-xl font-semibold text-neutral-900">{title}</h2>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Filter size={16} />}
          >
            Filter
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {Object.entries(data).filter(([, value]) => typeof value !== 'object').slice(0, 4).map(([key, value]) => (
          <div key={key} className="bg-neutral-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-600">
                  {formatMetricName(key)}
                </p>
                <p className="text-2xl font-semibold text-neutral-900">
                  {typeof value === 'number' ? 
                    (key.toLowerCase().includes('rate') || key.toLowerCase().includes('time') ? 
                      `${value}%` : value) 
                    : value}
                </p>
              </div>
              {getMetricIcon(key)}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-neutral-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-neutral-900 mb-4">Monthly Trends</h3>
          <div className="h-64">
            <Line data={applyChartStyles(trends, 'line')} options={chartOptions} />
          </div>
        </div>
        <div className="bg-neutral-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-neutral-900 mb-4">Distribution</h3>
          <div className="h-64">
            <Doughnut data={applyChartStyles(distribution, 'doughnut')} options={doughnutOptions} />
          </div>
        </div>
      </div>
    </div>
  );

  const getMetricIcon = (metric: string) => {
    const iconClass = "h-8 w-8";
    if (metric.toLowerCase().includes('time')) {
      return <Clock className={`${iconClass} text-primary-600`} />;
    } else if (metric.toLowerCase().includes('escalated') || metric.toLowerCase().includes('issues')) {
      return <AlertCircle className={`${iconClass} text-warning-600`} />;
    } else if (metric.toLowerCase().includes('approved') || metric.toLowerCase().includes('compliance')) {
      return <CheckCircle2 className={`${iconClass} text-success-600`} />;
    }
    return <FileText className={`${iconClass} text-primary-600`} />;
  };

  const applyChartStyles = (data: any, chartType: 'line' | 'doughnut') => {
    if (!data || !data.datasets) return data;
  
    const lineColors = ['#0ea5e9', '#2d50e6', '#ea580c', '#f97316', '#2563eb'];
    const doughnutColors = [
      ['#ef4444', '#f59e0b', '#10b981', '#6b7280'],
      ['#10b981', '#6174f0', '#f59e0b', '#ef4444'],
      ['#10b981', '#6174f0', '#f59e0b', '#ef4444'],
      ['#10b981', '#f59e0b', '#6174f0', '#ef4444'],
      ['#ef4444', '#f59e0b', '#6174f0', '#10b981']
    ];
  
    data.datasets.forEach((dataset: any, index: number) => {
      if (chartType === 'line') {
        dataset.borderColor = lineColors[index % lineColors.length];
        dataset.backgroundColor = lineColors[index % lineColors.length];
        dataset.tension = 0.4;
      } else if (chartType === 'doughnut') {
        dataset.backgroundColor = doughnutColors[index % doughnutColors.length];
      }
    });
  
    return data;
  };

  return (
    <div className="space-y-6">
      {/* Process Unity Dashboard */}
      {renderSystemSection(
        'Process Unity Dashboard',
        'https://www.corporatecomplianceinsights.com/wp-content/uploads/2020/02/process-unity-lg.jpg',
        processUnityData,
        processUnityData.monthlyTrends,
        processUnityData.riskDistribution
      )}
      
      {/* NetSuite Wolt Instance Dashboard */}
      {renderSystemSection(
        'NetSuite Wolt Instance',
        'https://i.pinimg.com/originals/d4/42/b8/d442b8bfd2cb39ff93d06b23d04da300.png',
        netsuiteWoltData,
        netsuiteWoltData.orderSyncTime,
        netsuiteWoltData.errorTypes
      )}
      
      {/* Keep existing dashboard sections */}
      {renderSystemSection(
        'Coupa Dashboard',
        'https://logowik.com/content/uploads/images/coupa7171.jpg',
        coupaData,
        coupaData.topCategories,
        coupaData.invoiceApprovalCycleTime
      )}
      
      {renderSystemSection(
        'NetSuite Dashboard',
        'https://i.pinimg.com/originals/d4/42/b8/d442b8bfd2cb39ff93d06b23d04da300.png',
        netsuiteData,
        netsuiteData.revenueBySubsidiary,
        netsuiteData.daysSalesOutstanding
      )}
      
      {renderSystemSection(
        'ZIP Dashboard',
        'https://th.bing.com/th/id/OIP.QcmSCcMsHNphyCWwkwPTGAHaDS?cb=iwp2&rs=1&pid=ImgDetMain',
        zipData,
        zipData.requestApprovalTime,
        zipData.spendByCategory
      )}
      
      {renderSystemSection(
        'JIRA Dashboard',
        'https://logos-world.net/wp-content/uploads/2021/02/Jira-Emblem.png',
        jiraData,
        jiraData.ticketVolume,
        jiraData.ticketsByStatus
      )}
    </div>
  );
};

export default SeparateDashboard;