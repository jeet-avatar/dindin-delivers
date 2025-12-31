import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart as BarChartIcon,
  DollarSign, 
  FileText, 
  Filter,
  Download,
  ShoppingCart,
  Clock,
  AlertCircle,
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
import { Spin, message, Select, Button as AntButton } from 'antd';
import * as htmlToImage from "html-to-image";
import { saveAs } from 'file-saver';

import { dateRangeOptions } from '../../constants/consts';

const { Option } = Select;
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

const dateRangeToDaysBack: { [key: string]: number } = {
  'week': 7,
  'month': 30,
  'quarter': 90,
  'year': 365,
  '2years': 800,
};

const Main: React.FC = () => {
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState('2years');
  const [showFilters, setShowFilters] = useState(false);
  const [dashboardCount, setDashboardCount] = useState({
    openPOs: 0,
    openBills: 0,
    pendingApprovalPOs: 0,
    totalAmount: 0,
  });
  const [netsuiteData, setNetsuiteData] = useState({ revenueBySubsidiary: { labels: [], datasets: [] }, daysSalesOutstanding: { labels: [], datasets: [] } });
  const [chartData, setChartData] = useState({
    monthlyTrends: {
      labels: [],
      datasets: []
    },
    statusDistribution: {
      labels: [],
      datasets: []
    },
    spendByDepartment: {
      labels: [],
      datasets: []
    },
    typeDistribution: {
      labels: [],
      datasets: []
    }
  });
  const [loading, setLoading] = useState(false);
  const [chartLoading, setChartLoading] = useState(false);
  const [selectedSubsidieries, setSelectedSubsidieries] = useState('');
  const [selectedCostCenters, setSelectedCostCenters] = useState('');
  const [selectedTransactionType, setSelectedTransactionType] = useState('');

  const getDashboardCounts = (daysBack: number) => {
    return Bridge.netSuiteDashboard.getCounts(daysBack).then((response) => {
      console.log("Raw API Response object:", response);
      console.log("API Response data (parsed JSON):", response);
      setDashboardCount(response);
      console.log("Updated dashboardCount state:", response);
      return response;
    });
  };

  const getChartData = (daysBack: number) => {
    const monthlyTrendsPromise = Bridge.netSuiteDashboard.getMonthlyTrends(daysBack).then((response) => {
      setChartData(prev => ({ ...prev, monthlyTrends: response.chartData }));
      return response;
    });
    const statusDistributionPromise = Bridge.netSuiteDashboard.getStatusDistribution(daysBack).then((response) => {
      setChartData(prev => ({ ...prev, statusDistribution: response.chartData }));
      return response;
    });
    const spendByDepartmentPromise = Bridge.netSuiteDashboard.getSpendByDepartment(daysBack).then((response) => {
      setChartData(prev => ({ ...prev, spendByDepartment: response.chartData }));
      return response;
    });
    const typeDistributionPromise = Bridge.netSuiteDashboard.getTypeDistribution(daysBack).then((response) => {
      setChartData(prev => ({ ...prev, typeDistribution: response.chartData }));
      return response;
    });

    return Promise.all([monthlyTrendsPromise, statusDistributionPromise, spendByDepartmentPromise, typeDistributionPromise]);
  };
  
  const getNetsuiteData = () => {
    return Bridge.systemDashboard.getNetsuiteData().then((response) => {
      setNetsuiteData(response);
      return response;
    });
  }

  useEffect(() => {
    getNetsuiteData();
  }, []);

  useEffect(() => {
    console.log('NetSuiteDashboard Main.tsx - dateRange in useEffect:', dateRange);
    const daysBack = dateRangeToDaysBack[dateRange];
    console.log({ dateRange, daysBack });

    if (daysBack) {
      setLoading(true);
      setChartLoading(true);

      Promise.all([
        getDashboardCounts(daysBack),
        getChartData(daysBack),
      ])
        .then(() => {
          setLoading(false);
          setChartLoading(false);
        })
        .catch((error) => {
          console.error("Error fetching NetSuite dashboard data:", error);
          setLoading(false);
          setChartLoading(false);
        });
    }
  }, [dateRange]);

 
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

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
      },
    },
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const exportData = () => {
    setLoading(true);
    const node = document.getElementById("main-section");
    htmlToImage.toBlob(node).then((blob) => {
      saveAs(blob, "NetSuite Dashboard.png");
      setLoading(false);
      message.success("Exported successfully.");
    });
  }

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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-semibold text-neutral-900">NetSuite Dashboard</h1>
        <div className="mt-4 md:mt-0 flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <Select
              className="rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              value={dateRange}
              onChange={(value) => setDateRange(value)}
            >
              {dateRangeOptions.map((option) => (
                <Option key={option.value} value={option.value}>
                  {option.label}
                </Option>
              ))}
            </Select>
          </div>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Filter size={16} />}
            onClick={() => setShowFilters(!showFilters)}
          >
            Filters
          </Button>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Download size={16} />}
            onClick={()=> exportData()}
          >
            Export
          </Button>
        </div>
      </div>

      {showFilters && (
        <div className="bg-white p-4 rounded-lg shadow-card space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Subsidiary
              </label>
              <Select 
                className="w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                value={selectedSubsidieries}
                onChange={(value)=>setSelectedSubsidieries(value)}
              >
                <Option value="">All Subsidiaries</Option>
                <Option value="subsidiary1">Subsidiary 1</Option>
                <Option value="subsidiary2">Subsidiary 2</Option>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Cost Center
              </label>
              <Select 
              className="w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              value={selectedCostCenters}
                onChange={(value)=>setSelectedCostCenters(value)}
              >
                <Option value="">All Cost Centers</Option>
                <Option value="it">IT</Option>
                <Option value="operations">Operations</Option>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Transaction Type
              </label>
              <Select 
                className="w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                value={selectedTransactionType}
                onChange={(value)=>setSelectedTransactionType(value)}
              >
                <Option value="">All Types</Option>
                <Option value="po">Purchase Orders</Option>
                <Option value="invoice">Invoices</Option>
              </Select>
            </div>
            <div
            className='mt-6'
            >
              <AntButton type="primary" style={{background: "#ea580c"}}>Submit</AntButton>
            </div>
            
          </div>
        </div>
      )}

      <div id="main-section">
        <Spin spinning={loading} tip="Loading...">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div 
              className="bg-white p-6 rounded-lg shadow-card cursor-pointer hover:shadow-card-hover transition-shadow duration-300"
              onClick={() => navigate('/transactions')}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-neutral-600">Open PO</p>
                  <p className="mt-2 text-2xl font-semibold text-neutral-900">
                    {dashboardCount.openPOs}
                  </p>
                </div>
                <div className="p-3 bg-primary-50 rounded-full">
                  <ShoppingCart className="h-6 w-6 text-primary-600" />
                </div>
              </div>
            </div>

            <div 
              className="bg-white p-6 rounded-lg shadow-card cursor-pointer hover:shadow-card-hover transition-shadow duration-300"
              onClick={() => navigate('/transactions')}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-neutral-600">Open Bills</p>
                  <p className="mt-2 text-2xl font-semibold text-neutral-900">
                    {dashboardCount.openBills}
                  </p>
                </div>
                <div className="p-3 bg-warning-50 rounded-full">
                  <FileText className="h-6 w-6 text-warning-600" />
                </div>
              </div>
            </div>

            <div 
              className="bg-white p-6 rounded-lg shadow-card cursor-pointer hover:shadow-card-hover transition-shadow duration-300"
              onClick={() => navigate('/transactions')}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-neutral-600">Pending Approval PO</p>
                  <p className="mt-2 text-2xl font-semibold text-neutral-900">
                    {dashboardCount.pendingApprovalPOs}
                  </p>
                </div>
                <div className="p-3 bg-primary-50 rounded-full">
                  <Clock className="h-6 w-6 text-primary-600" />
                </div>
              </div>
            </div>

            {/* <div 
              className="bg-white p-6 rounded-lg shadow-card cursor-pointer hover:shadow-card-hover transition-shadow duration-300"
              onClick={() => navigate('/transactions')}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-neutral-600">No Action</p>
                  <p className="mt-2 text-2xl font-semibold text-error-600">
                    {dashboardCount.noAction}
                  </p>
                  <p className="text-xs text-neutral-500 mt-1">No action required</p>
                </div>
                <div className="p-3 bg-error-50 rounded-full">
                  <AlertCircle className="h-6 w-6 text-error-600" />
                </div>
              </div>
            </div> */}

            <div className="bg-white p-6 rounded-lg shadow-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-neutral-600">Total Amount</p>
                  <p className="mt-2 text-2xl font-semibold text-neutral-900">
                    {dashboardCount.totalAmount}
                  </p>
                </div>
                <div className="p-3 bg-success-50 rounded-full">
                  <DollarSign className="h-6 w-6 text-success-600" />
                </div>
              </div>
            </div>
          </div>
        </Spin>

        <Spin spinning={chartLoading} tip="Loading...">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-5">
            {chartData.monthlyTrends && chartData.monthlyTrends.datasets.length>0 && (
              <div className="bg-white p-6 rounded-lg shadow-card">
                <h3 className="text-lg font-medium text-neutral-900 mb-4">Monthly Trends</h3>
                <div className="h-80">
                    <Line data={chartData.monthlyTrends} options={chartOptions} />
                </div>
              </div>
            )}

            {chartData.typeDistribution && chartData.typeDistribution.datasets.length>0 && (
              <div className="bg-white p-6 rounded-lg shadow-card">
                <h3 className="text-lg font-medium text-neutral-900 mb-4">Distribution By Type</h3>
                <div className="h-80">
                    <Doughnut data={chartData.typeDistribution} options={doughnutOptions} />
                </div>
              </div>
            )}
            
            {chartData.statusDistribution && chartData.statusDistribution.datasets.length>0 && (
              <div className="bg-white p-6 rounded-lg shadow-card">
                <h2 className="text-lg font-medium text-neutral-900 mb-4">Transaction Status Distribution</h2>
                <div className="h-80">
                    <Doughnut data={chartData.statusDistribution} options={pieOptions} />
                </div>
              </div>
            )}

            {chartData.spendByDepartment && chartData.spendByDepartment.datasets.length>0 && (
              <div className="bg-white p-6 rounded-lg shadow-card">
                <h2 className="text-lg font-medium text-neutral-900 mb-4">Spend by Department</h2>
                <div className="h-80">
                  <Bar data={chartData.spendByDepartment} options={chartOptions} />
                </div>
              </div>
            )}

            {/* {chartData.spendTrendData && chartData.spendTrendData.datasets.length>0 && (
              <div className="bg-white p-6 rounded-lg shadow-card">
                <h2 className="text-lg 
                font-medium text-neutral-900 mb-4">NetSuite Transaction Trends</h2>
                <div className="h-80">
                  <Line data={chartData.spendTrendData} options={chartOptions} />
                </div>
              </div>
            )} */}
          </div>
        </Spin>

        <br/>
{/* 
        {renderSystemSection(
          'NetSuite Dashboard',
          'https://i.pinimg.com/originals/d4/42/b8/d442b8bfd2cb39ff93d06b23d04da300.png',
          netsuiteData,
          netsuiteData.revenueBySubsidiary,
          netsuiteData.daysSalesOutstanding
        )} */}
      </div>
    </div>
  );
};

export default Main;