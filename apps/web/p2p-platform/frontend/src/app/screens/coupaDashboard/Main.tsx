import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart as BarChartIcon,
  DollarSign, 
  FileText, 
  Filter,
  Download,
  ShoppingCart,
  AlertCircle,
  Clock,
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
import { Bar, Line, Pie, Doughnut } from 'react-chartjs-2';
import Button from '../../components/ui/Button';
import { dateRangeOptions } from '../../constants/consts';
import Bridge from '../../constants/Bridge';
import { Spin, message, Select, Button as AntButton } from 'antd';
import * as htmlToImage from "html-to-image";
import { saveAs } from 'file-saver';
import { set } from 'date-fns';

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

const Main: React.FC = () => {
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState('2years');
  const [showFilters, setShowFilters] = useState(false);

  const [dashboardCount, setDashboardCount] = useState({
    totalSpend: 0,
    requisitionValue: 0,
    reqCount: 0,
    poCount: 0
  });
  
  const [monthlyTrends, setMonthlyTrends] = useState(false);
  const [distribution, setDistribution] = useState(false);

  const [budgetOverview, setBudgetOverview] = useState(false);
  const [costCenterDistribution, setCostCenterDistribution] = useState(false);
  const [spendByDepartment, setSpendByDepartment] = useState(false);
  const [commodityDistribution, setCommodityDistribution] = useState(false);
  const [loading, setLoading] = useState(true);
  const [chartDataLoading, setChartDataLoading] = useState(true);
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [selectedCostCenter, setSelectedCostCenter] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  const [coupaData, setCoupaData] = useState({ topCategories: { labels: [], datasets: [] }, invoiceApprovalCycleTime: { labels: [], datasets: [] } });

  const getCoupaData = () => {
    Bridge.systemDashboard.getCoupaData().then((response) => {
      setCoupaData(response);
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

  const dateRangeToDaysBack: { [key: string]: number } = {
    'week': 7,
    'month': 30,
    'quarter': 90,
    'year': 365,
    '2years': 800,
  };

  const getDashboardCount = (daysBack: number) => {
    return Bridge.coupaDashboard.getCount(daysBack).then((response) => {
      setDashboardCount(response.counts);
      return response; // Return response for Promise.all
    });
  };

  const getMonthlyTrendsData = (daysBack: number) => {
    return Bridge.coupaDashboard.budgetOverview.getChartData(daysBack).then((response) => {
      setMonthlyTrends(response.chartData);
      return response;
    });
  };

  const getDistributionData =  (daysBack: number) => {
    return Bridge.coupaDashboard.statusDistribution.getChartData(daysBack).then((response) => {
      setDistribution(response.chartData);
      return response;
    });
  };

  const getBudgetOverviewData = (daysBack: number) => {
    return Bridge.coupaDashboard.budgetOverview.getChartData(daysBack).then((response) => {
      setBudgetOverview(response.chartData);
      return response;
    });
  };

  const getCostCenterDistributionData =  (daysBack: number) => {
    return Bridge.coupaDashboard.costCenterDistribution.getChartData(daysBack).then((response) => {
      setCostCenterDistribution(response.chartData);
      return response;
    });
  };

  const getSpendByDepartmentData =  (daysBack: number) => {
    return Bridge.coupaDashboard.spendByDepartment.getChartData(daysBack).then((response) => {
     setSpendByDepartment(response.chartData);
     return response;
   });
  };

  const getCommodityDistributionData =  (daysBack: number) => {
    return Bridge.coupaDashboard.commodityDistribution.getChartData(daysBack).then((response) => {
     setCommodityDistribution(response.chartData);
     return response;
   });
  };

  useEffect(() => {
    getCoupaData();
  }, []);

  useEffect(() => {
    console.log('CoupaDashboard Main.tsx - dateRange in useEffect:', dateRange);
    const daysBack = dateRangeToDaysBack[dateRange];
    console.log({ dateRange, daysBack });

    if (daysBack) {
      setLoading(true); // Start loading for all
      setChartDataLoading(true); // Start chart loading

      Promise.all([
        getDashboardCount(daysBack),
        getMonthlyTrendsData(daysBack),
        getDistributionData(daysBack),
        getBudgetOverviewData(daysBack),
        getCostCenterDistributionData(daysBack),
        getSpendByDepartmentData(daysBack),
        getCommodityDistributionData(daysBack),
      ])
        .then(() => {
          setLoading(false);
          setChartDataLoading(false);
        })
        .catch((error) => {
          console.error("Error fetching Coupa dashboard data:", error);
          setLoading(false);
          setChartDataLoading(false);
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
      saveAs(blob, "Coupa Dashboard.png");
      setLoading(false);
      message.success("Exported successfully.");
    });
  }

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-semibold text-neutral-900">Coupa Dashboard</h1>
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
              <label htmlFor="supplier" className="block text-sm font-medium text-neutral-700 mb-1">
                Supplier
              </label>
              <Select 
              id="supplier" 
              className="w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              value={selectedSupplier}
              onChange={(value)=> setSelectedSupplier(value)}
              >
                <Option value="">All Suppliers</Option>
                <Option value="supplier1">Supplier 1</Option>
                <Option value="supplier2">Supplier 2</Option>
              </Select>
            </div>
            <div>
              <label 
              htmlFor="costCenterSelect" 
              className="block text-sm font-medium text-neutral-700 mb-1"
              >
                Cost Center
              </label>
              <Select 
                id="costCenterSelect" 
                className="w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                value={selectedCostCenter}
                onChange={(value)=> setSelectedCostCenter(value)}
              >
                <Option value="">All Cost Centers</Option>
                <Option value="it">IT</Option>
                <Option value="operations">Operations</Option>
              </Select>
            </div>
            <div>
              <label htmlFor="statusSelect" className="block text-sm font-medium text-neutral-700 mb-1">
                Status
              </label>
              <Select 
                id="statusSelect" 
                className="w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                value={selectedStatus}
                onChange={(value)=> setSelectedStatus(value)}
              >
                <Option value="">All Statuses</Option>
                <Option value="Pending Receipt">Pending Receipt</Option>
                <Option value="Partially Received">Partially Received</Option>
                <Option value="Complete">Complete</Option>
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
              onClick={() => navigate('/total-spend')}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-neutral-600">Total Spend</p>
                  <p className="mt-2 text-2xl font-semibold text-neutral-900">
                    {formatCurrency(dashboardCount ? dashboardCount.totalSpend : 0)}
                  </p>
                </div>
                <div className="p-3 bg-primary-50 rounded-full">
                  <DollarSign className="h-6 w-6 text-primary-600" />
                </div>
              </div>
            </div>

            <div 
              className="bg-white p-6 rounded-lg shadow-card cursor-pointer hover:shadow-card-hover transition-shadow duration-300"
              onClick={() => navigate('/requisition-value')}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-neutral-600">Requisition Value</p>
                  <p className="mt-2 text-2xl font-semibold text-neutral-900">
                    {formatCurrency(dashboardCount ? dashboardCount.requisitionValue : 0)}
                  </p>
                </div>
                <div className="p-3 bg-success-50 rounded-full">
                  <FileText className="h-6 w-6 text-success-600" />
                </div>
              </div>
            </div>

            <div 
              className="bg-white p-6 rounded-lg shadow-card cursor-pointer hover:shadow-card-hover transition-shadow duration-300"
              onClick={() => navigate('/purchase-orders')}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-neutral-600">Purchase Orders</p>
                  <p className="mt-2 text-2xl font-semibold text-neutral-900">
                    {dashboardCount ? dashboardCount.poCount : 0}
                  </p>
                </div>
                <div className="p-3 bg-warning-50 rounded-full">
                  <ShoppingCart className="h-6 w-6 text-warning-600" />
                </div>
              </div>
            </div>

            <div 
              className="bg-white p-6 rounded-lg shadow-card cursor-pointer hover:shadow-card-hover transition-shadow duration-300"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-neutral-600">Requisitions</p>
                  <p className="mt-2 text-2xl font-semibold text-neutral-900">
                    {dashboardCount ? dashboardCount.reqCount : 0}
                  </p>
                </div>
                <div className="p-3 bg-warning-50 rounded-full">
                  <FileText className="h-6 w-6 text-warning-600" />
                </div>
              </div>
            </div>
          </div>
        </Spin>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-3">
          <Spin spinning={loading}>
            {monthlyTrends && monthlyTrends.datasets.length>0 && (
              <div className="bg-white p-6 rounded-lg shadow-card">
                <h3 className="text-lg font-medium text-neutral-900 mb-4">Monthly Trends</h3>
                <div className="h-80">
                  <Line data={monthlyTrends} options={chartOptions} />
                </div>
              </div>
            )}
          </Spin>

          <Spin spinning={loading}>
            {distribution && distribution.datasets.length>0 && (
              <div className="bg-white p-6 rounded-lg shadow-card">
                <h3 className="text-lg font-medium text-neutral-900 mb-4">Status Distribution</h3>
                <div className="h-80">
                    <Doughnut data={distribution} options={doughnutOptions} />
                </div>
              </div>
            )}
          </Spin>

          {/* <Spin spinning={loading}> 
            {budgetOverview && budgetOverview.datasets.length>0 && (
              <div className="bg-white p-6 rounded-lg shadow-card">
                <h2 className="text-lg font-medium text-neutral-900 mb-4">Budget Overview</h2>
                <div className="h-80">
                    <Line data={budgetOverview} options={chartOptions} />
                </div>
              </div>
            )}
          </Spin> */}

          <Spin spinning={loading}>
            {costCenterDistribution && costCenterDistribution.datasets.length>0 && (
              <div className="bg-white p-6 rounded-lg shadow-card">
                <h2 className="text-lg font-medium text-neutral-900 mb-4">Cost Center Distribution</h2>
                <div className="h-80">
                  <Doughnut data={costCenterDistribution} options={pieOptions} />
                </div>
              </div>
            )}
          </Spin>

          <Spin spinning={loading}>
            {spendByDepartment && spendByDepartment.datasets.length>0 && (
              <div className="bg-white p-6 rounded-lg shadow-card">
                <h2 className="text-lg font-medium text-neutral-900 mb-4">Spend by Department</h2>
                <div className="h-80">
                  <Bar data={spendByDepartment} options={chartOptions} />
                </div>
              </div>
            )}
          </Spin>

          {/* <Spin spinning={loading}>  
            {commodityDistribution && commodityDistribution.datasets.length>0 && (
              <div className="bg-white p-6 rounded-lg shadow-card">
                <h2 className="text-lg font-medium text-neutral-900 mb-4">Commodity Distribution</h2>
                <div className="h-80">
                  <Pie data={commodityDistribution} options={pieOptions} />
                </div>
              </div>
            )}
          </Spin> */}
        </div>

        <br/>

        {/* {renderSystemSection(
          'Coupa Dashboard',
          'https://logowik.com/content/uploads/images/coupa7171.jpg',
          coupaData,
          coupaData.topCategories,
          coupaData.invoiceApprovalCycleTime
        )} */}
        
      </div>
    </div>
  );
};

export default Main;