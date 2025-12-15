import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart as BarChartIcon,
  DollarSign, 
  FileText, 
  Users,
  ShoppingCart,
  Clock,
  CheckCircle,
  AlertCircle,
  Wallet,
  GitPullRequest,
  Globe,
  Shield,
  Database
} from 'lucide-react';
import { Spin } from 'antd';
import ActivityFeed from '../../../components/dashboard/ActivityFeed';
import Bridge from '../../../constants/Bridge';


const ConsolidatedView = ({ setActiveTab, dateRange }) => {
    
    const [dashboardCount, setDashboardCount] = useState({});
    const [financialMetricsData, setFinancialMetricsData] = useState([]);
    const [recentActivityData, setRecentActivityData] = useState([]);
    const [loading, setLoading] = useState(false);
  const [financialMatricsLoading, setFinancialMatricsLoading] = useState(false);
  

   // hide these systems from the financial metrics
   const hiddenSystemIds = ['process-unity'];
   const hiddenSystemNames = ['Process Unity']; // fallback if objects use name
   const visibleFinancialMetrics = (financialMetricsData as any[]).filter(
     (s: any) => !(hiddenSystemIds.includes(s.id) || hiddenSystemNames.includes(s.name))
   );

    const navigate = useNavigate();

    const dateRangeMapping = {
      'week': 7,
      'month': 30,
      'quarter': 90,
      'year': 365,
      '2years': 800,
    };

    useEffect(() => {
        const days_back = dateRangeMapping[dateRange] || 30; // Default to 30 days
        getConsolidatedDashboardData(days_back);
    }, [dateRange]);


    const getConsolidatedDashboardData = (days_back: number) => {
        setLoading(true)
        setFinancialMatricsLoading(true)
        Bridge.dashboard.consolidatedView.getCount(days_back).then((response: any) => {
            setDashboardCount(response.counts);

            let financialDataList=[];
            for(let item of response.financialMetrics){
                if(item.name !== 'JIRA' && item.name !== "Process Unity"
                     && item.name !== "NetSuite Wolt" && item.name !== "ZIP"
                ){
                    financialDataList.push(item)
                }
            }

            setFinancialMetricsData(financialDataList);
            setRecentActivityData(response.recentActivity);
            setLoading(false)
            setFinancialMatricsLoading(false)
        }).catch(error => {
            console.error(error);
            setLoading(false);
            setFinancialMatricsLoading(false)
        });
    }

    return (
        <>
        {/* KPI Cards */}
        <Spin spinning={loading} size="large" tip="Loading...">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mt-2">
                <div 
                className="bg-white p-6 rounded-lg shadow-card cursor-pointer hover:shadow-card-hover transition-shadow duration-300"
                onClick={() => navigate('/transactions/coupa?type=purchase_order&dateRange=' + dateRange)}
                >
                <div className="flex items-center justify-between">
                    <div>
                    <p className="text-sm font-medium text-neutral-600">Open PO</p>
                    <p className="mt-2 text-2xl font-semibold text-neutral-900">{dashboardCount.openIpo}</p>
                    <p className="text-xs text-neutral-500">Across all systems</p>
                    </div>
                    <div className="p-3 bg-primary-50 rounded-full">
                    <ShoppingCart className="h-6 w-6 text-primary-600" />
                    </div>
                </div>
                </div>

                <div 
                className="bg-white p-6 rounded-lg shadow-card cursor-pointer hover:shadow-card-hover transition-shadow duration-300"
                onClick={() => navigate('/transactions/coupa?type=requisition&dateRange=' + dateRange)}
                >
                <div className="flex items-center justify-between">
                    <div>
                    <p className="text-sm font-medium text-neutral-600">Requisitions</p>
                    <p className="mt-2 text-2xl font-semibold text-neutral-900">{dashboardCount.requisition}</p>
                    <p className="text-xs text-neutral-500">Pending processing</p>
                    </div>
                    <div className="p-3 bg-secondary-50 rounded-full">
                    <FileText className="h-6 w-6 text-secondary-600" />
                    </div>
                </div>
                </div>

                <div 
                className="bg-white p-6 rounded-lg shadow-card cursor-pointer hover:shadow-card-hover transition-shadow duration-300"
                onClick={() => navigate('/transactions/coupa?type=pending-approval&dateRange=' + dateRange)}
                >
                <div className="flex items-center justify-between">
                    <div>
                    <p className="text-sm font-medium text-neutral-600">Pending Approvals</p>
                    <p className="mt-2 text-2xl font-semibold text-warning-600">{dashboardCount.pendingApprovals}</p>
                    <p className="text-xs text-neutral-500">Requires attention</p>
                    </div>
                    <div className="p-3 bg-warning-50 rounded-full">
                    <Clock className="h-6 w-6 text-warning-600" />
                    </div>
                </div>
                </div>

                <div 
                className="bg-white p-6 rounded-lg shadow-card cursor-pointer hover:shadow-card-hover transition-shadow duration-300"
                onClick={() => navigate('/transactions/coupa?type=no-action&dateRange=' + dateRange)}
                >
                <div className="flex items-center justify-between">
                    <div>
                    <p className="text-sm font-medium text-neutral-600">No Action</p>
                    <p className="mt-2 text-2xl font-semibold text-error-600">{dashboardCount.noAction}</p>
                    <p className="text-xs text-neutral-500">No action required</p>
                    </div>
                    <div className="p-3 bg-error-50 rounded-full">
                    <AlertCircle className="h-6 w-6 text-error-600" />
                    </div>
                </div>
                </div>

                <div 
                className="bg-white p-6 rounded-lg shadow-card cursor-pointer hover:shadow-card-hover transition-shadow duration-300"
                onClick={() => navigate('/transactions/coupa?type=invoices&dateRange=' + dateRange)}
                >
                <div className="flex items-center justify-between">
                    <div>
                    <p className="text-sm font-medium text-neutral-600">Open Bills</p>
                    <p className="mt-2 text-2xl font-semibold text-secondary-600">{dashboardCount.openBills}</p>
                    <p className="text-xs text-neutral-500">NetSuite systems</p>
                    </div>
                    <div className="p-3 bg-secondary-50 rounded-full">
                    <FileText className="h-6 w-6 text-secondary-600" />
                    </div>
                </div>
                </div>

                <div 
                className="bg-white p-6 rounded-lg shadow-card hover:shadow-card-hover transition-shadow duration-300"
                >
                <div className="flex items-center justify-between">
                    <div>
                    <p className="text-sm font-medium text-neutral-600">Total Amount</p>
                    <p className="mt-2 text-2xl font-semibold text-success-600">{dashboardCount.totalAmount}</p>
                    <p className="text-xs text-neutral-500">Combined value</p>
                    </div>
                    <div className="p-3 bg-success-50 rounded-full">
                    <DollarSign className="h-6 w-6 text-success-600" />
                    </div>
                </div>
                </div>

                {/* <div className="bg-white p-6 rounded-lg shadow-card">
                <div className="flex items-center justify-between">
                    <div>
                    <p className="text-sm font-medium text-neutral-600">Active Systems</p>
                    <p className="mt-2 text-2xl font-semibold text-primary-600">{dashboardCount.activeSystems}</p>
                    <p className="text-xs text-neutral-500">All connected</p>
                    </div>
                    <div className="p-3 bg-primary-50 rounded-full">
                    <Database className="h-6 w-6 text-primary-600" />
                    </div>
                </div>
                </div> */}
            </div>
        </Spin>

        {/* System Status Overview */}
        <Spin spinning={financialMatricsLoading} tip="Loading...">
            <div className="bg-white rounded-lg shadow-card p-6 mt-6">
                <h2 className="text-lg font-medium text-neutral-900 mb-4">Financial Metrics by System</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* {financialMetricsData && financialMetricsData.map((system) => ( */}
                {visibleFinancialMetrics && visibleFinancialMetrics.map((system) => (
                    <div key={system.name} className="border border-neutral-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                        <div className="p-2 bg-neutral-50 rounded-lg">
                            {system.icon}
                        </div>
                        <div>
                            <h3 className="font-medium text-neutral-900">{system.name}</h3>
                            <p className="text-sm text-success-600">
                                {/* last refreshed on */}
                            </p>
                        </div>
                        </div>
                        <CheckCircle className="h-5 w-5 text-success-500" />
                    </div>
                    <div className="space-y-2">
                        {Object.entries(system.metrics).map(([key, value]) => (
                        <div key={key} className="flex justify-between text-sm">
                            <span className="text-neutral-600">{key}</span>
                            <span className="font-medium text-neutral-900">{value}</span>
                        </div>
                        ))}
                    </div>
                    </div>
                ))}
                </div>
            </div>
        </Spin>

        {/* Charts Section */}
        {/* Activity Feed */}
        {/* {recentActivityData && (
            <div className="grid grid-cols-1 gap-6 mt-6">
                <ActivityFeed activities={recentActivityData} />
            </div>
        )} */}
        

        </>
    )

}

export default ConsolidatedView;