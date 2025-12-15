import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart as BarChartIcon,
  Clock,
  Users,
  CheckCircle,
  Wallet,
  GitPullRequest,
  Shield
} from 'lucide-react';
import { Line } from 'react-chartjs-2';
import { Spin } from 'antd';
import Bridge from '../../../constants/Bridge';

import { spendTrendData,chartOptions } from '../../../constants/consts';

const Jira = () => {
    const [loading, setLoading] = useState(true);
    const [dashboardCount, setDashboardCount] = useState({});
    const [chartData, setChartData] = useState({});

    const navigate = useNavigate();

    useEffect(() => {
        getDashboardCountData();
    }, []);

    const getDashboardCountData =() => {
        setLoading(true)

        const metrics = {
            activeTickets: 342,
            resolution: 45,
            slaCompliance: 12,
            avgResolutionTime: 12,
        }; 
        setDashboardCount(metrics);
        setLoading(false)

        // Bridge.dashboard.jira.getCount().then((response: any) => {
        //     setDashboardCount(response.counts);
        //     setChartData(response.chartData);
        //     setLoading(false)
        // }).catch(error => {
        //     console.error(error);
        //     setLoading(false);
        // });
    }

    return (
       <div className="space-y-6">
            <Spin tip="Loading..." spinning={loading}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-white p-6 rounded-lg shadow-card">
                    <div className="flex items-center justify-between">
                        <div>
                        <p className="text-sm font-medium text-neutral-600">Active Tickets</p>
                        <p className="mt-2 text-2xl font-semibold text-neutral-900">{dashboardCount.activeTickets}</p>
                        </div>
                        <div className="p-3 bg-primary-50 rounded-full">
                        <GitPullRequest className="h-6 w-6 text-primary-600" />
                        </div>
                    </div>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow-card">
                    <div className="flex items-center justify-between">
                        <div>
                        <p className="text-sm font-medium text-neutral-600">Resolution Rate</p>
                        <p className="mt-2 text-2xl font-semibold text-success-600">{dashboardCount.resolution}</p>
                        </div>
                        <div className="p-3 bg-success-50 rounded-full">
                        <CheckCircle className="h-6 w-6 text-success-600" />
                        </div>
                    </div>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow-card">
                    <div className="flex items-center justify-between">
                        <div>
                        <p className="text-sm font-medium text-neutral-600">SLA Compliance</p>
                        <p className="mt-2 text-2xl font-semibold text-primary-600">{dashboardCount.slaCompliance}</p>
                        </div>
                        <div className="p-3 bg-primary-50 rounded-full">
                        <Shield className="h-6 w-6 text-primary-600" />
                        </div>
                    </div>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow-card">
                    <div className="flex items-center justify-between">
                        <div>
                        <p className="text-sm font-medium text-neutral-600">Avg Resolution</p>
                        <p className="mt-2 text-2xl font-semibold text-neutral-900">{dashboardCount.avgResolutionTime}</p>
                        </div>
                        <div className="p-3 bg-warning-50 rounded-full">
                        <Clock className="h-6 w-6 text-warning-600" />
                        </div>
                    </div>
                    </div>
                </div>
            </Spin>
            
            {chartData && chartData.datasets && (
                <div className="bg-white rounded-lg shadow-card p-6">
                    <h2 className="text-lg font-medium text-neutral-900 mb-4">JIRA Ticket Trends</h2>
                    <div className="h-80">
                    <Line data={chartData} options={chartOptions} />
                    </div>
                </div>
            )}
            </div>
    )
}
export default Jira;