import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart as BarChartIcon,
  Clock,
  Users,
  CheckCircle,
  Wallet
} from 'lucide-react';
import { Line } from 'react-chartjs-2';
import { Spin } from 'antd';
import Bridge from '../../../constants/Bridge';

import { spendTrendData,chartOptions } from '../../../constants/consts';

const Zip = () => {
    const [loading, setLoading] = useState(true);
    const [dashboardCount, setDashboardCount] = useState({});
    const [chartData, setChartData] = useState({});

    const navigate = useNavigate();

    useEffect(() => {
        getDashboardCountData();
    }, []);

    const getDashboardCountData =() => {
        setLoading(true)

        const zipMetrics = {
            activeVendors: 342,
            paymentSuccess: 45,
            processingTime: 12,
            newRequests: 12,
        }; 
        setDashboardCount(zipMetrics);
        setLoading(false)


        // Bridge.dashboard.zip.getCount().then((response: any) => {
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
        <Spin spinning={loading} tip="Loading...">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-card">
                <div className="flex items-center justify-between">
                    <div>
                    <p className="text-sm font-medium text-neutral-600">Active Vendors</p>
                    <p className="mt-2 text-2xl font-semibold text-neutral-900">{dashboardCount.activeVendors}</p>
                    </div>
                    <div className="p-3 bg-primary-50 rounded-full">
                    <Users className="h-6 w-6 text-primary-600" />
                    </div>
                </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-card">
                <div className="flex items-center justify-between">
                    <div>
                    <p className="text-sm font-medium text-neutral-600">Payment Success</p>
                    <p className="mt-2 text-2xl font-semibold text-success-600">{dashboardCount.paymentSuccess}</p>
                    </div>
                    <div className="p-3 bg-success-50 rounded-full">
                    <CheckCircle className="h-6 w-6 text-success-600" />
                    </div>
                </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-card">
                <div className="flex items-center justify-between">
                    <div>
                    <p className="text-sm font-medium text-neutral-600">Processing Time</p>
                    <p className="mt-2 text-2xl font-semibold text-neutral-900">{dashboardCount.processingTime}</p>
                    </div>
                    <div className="p-3 bg-warning-50 rounded-full">
                    <Clock className="h-6 w-6 text-warning-600" />
                    </div>
                </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-card">
                <div className="flex items-center justify-between">
                    <div>
                    <p className="text-sm font-medium text-neutral-600">New Requests</p>
                    <p className="mt-2 text-2xl font-semibold text-primary-600">{dashboardCount.newRequests}</p>
                    </div>
                    <div className="p-3 bg-primary-50 rounded-full">
                    <Wallet className="h-6 w-6 text-primary-600" />
                    </div>
                </div>
                </div>
            </div>
        </Spin>
      
        {chartData && chartData.datasets && (
            <div className="bg-white rounded-lg shadow-card p-6">
                <h2 className="text-lg font-medium text-neutral-900 mb-4">ZIP Payment Processing Trends</h2>
                <div className="h-80">
                <Line data={chartData} options={chartOptions} />
                </div>
            </div>
        )}
    </div>
    )
}
export default Zip;