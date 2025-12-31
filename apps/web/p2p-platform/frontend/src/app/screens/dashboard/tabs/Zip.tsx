import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Clock,
  Users,
  CheckCircle,
  Wallet,
  AlertCircle
} from 'lucide-react';
import { Line } from 'react-chartjs-2';
import { Spin, message } from 'antd';
import Bridge from '../../../constants/Bridge';

import { chartOptions } from '../../../constants/consts';

interface ZipMetrics {
    activeVendors: number;
    paymentSuccess: number;
    processingTime: number;
    newRequests: number;
    totalVendors?: number;
    pendingApproval?: number;
}

interface ChartDataset {
    labels: string[];
    datasets: Array<{
        label: string;
        data: number[];
        borderColor: string;
        backgroundColor: string;
        tension: number;
    }>;
}

const Zip = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [dashboardCount, setDashboardCount] = useState<ZipMetrics>({
        activeVendors: 0,
        paymentSuccess: 0,
        processingTime: 0,
        newRequests: 0
    });
    const [chartData, setChartData] = useState<ChartDataset | null>(null);

    const navigate = useNavigate();

    useEffect(() => {
        getDashboardCountData();
    }, []);

    const getDashboardCountData = async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await Bridge.dashboard.zip.getCount();

            // Map API response to expected format
            const metrics: ZipMetrics = {
                activeVendors: response?.counts?.activeVendors || response?.metrics?.activeVendors || 0,
                paymentSuccess: response?.counts?.paymentSuccess || response?.metrics?.paymentSuccess || 0,
                processingTime: response?.counts?.processingTime || response?.metrics?.processingTime || 0,
                newRequests: response?.counts?.newRequests || response?.metrics?.newRequests || 0,
                totalVendors: response?.counts?.totalVendors || response?.metrics?.totalVendors || 0,
                pendingApproval: response?.counts?.pendingApproval || response?.metrics?.pendingApproval || 0
            };

            setDashboardCount(metrics);

            // Build chart data from API response
            if (response?.chartData) {
                const trendData = response.chartData;
                setChartData({
                    labels: trendData.map((d: { month: string }) => d.month),
                    datasets: [
                        {
                            label: 'Applications',
                            data: trendData.map((d: { applications: number }) => d.applications),
                            borderColor: '#3b82f6',
                            backgroundColor: '#3b82f6',
                            tension: 0.4
                        },
                        {
                            label: 'Approved',
                            data: trendData.map((d: { approved: number }) => d.approved),
                            borderColor: '#10b981',
                            backgroundColor: '#10b981',
                            tension: 0.4
                        }
                    ]
                });
            }
        } catch (err) {
            console.error('Failed to fetch ZIP dashboard data:', err);
            setError('Failed to load ZIP dashboard data');
            message.error('Failed to load ZIP dashboard data');
        } finally {
            setLoading(false);
        }
    };

    // Show error state
    if (error && !loading) {
        return (
            <div className="space-y-6">
                <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                    <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-red-800 mb-2">Failed to Load Dashboard</h3>
                    <p className="text-red-600 mb-4">{error}</p>
                    <button
                        onClick={getDashboardCountData}
                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
       <div className="space-y-6">
        <Spin spinning={loading} tip="Loading ZIP Dashboard...">
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
                            <p className="text-sm font-medium text-neutral-600">Approved Vendors</p>
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
                            <p className="text-sm font-medium text-neutral-600">Avg. Processing (days)</p>
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
                            <p className="text-sm font-medium text-neutral-600">Pending Requests</p>
                            <p className="mt-2 text-2xl font-semibold text-primary-600">{dashboardCount.newRequests}</p>
                        </div>
                        <div className="p-3 bg-primary-50 rounded-full">
                            <Wallet className="h-6 w-6 text-primary-600" />
                        </div>
                    </div>
                </div>
            </div>
        </Spin>

        {chartData && chartData.datasets && chartData.datasets.length > 0 && (
            <div className="bg-white rounded-lg shadow-card p-6">
                <h2 className="text-lg font-medium text-neutral-900 mb-4">Vendor Onboarding Trends</h2>
                <div className="h-80">
                    <Line data={chartData} options={chartOptions} />
                </div>
            </div>
        )}
    </div>
    );
};

export default Zip;