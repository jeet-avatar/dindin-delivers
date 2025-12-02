import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart as BarChartIcon,
  FileText, 
  ShoppingCart,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { Line } from 'react-chartjs-2';
import { Spin } from 'antd';
import Bridge from '../../../constants/Bridge';

import { spendTrendData,chartOptions } from '../../../constants/consts';
import { getDaysInMonth } from 'date-fns';

const Cupa = ({dateRange}) => {
    const [loading, setLoading] = useState(true);
    const [dashboardCount, setDashboardCount] = useState({});
    const [chartData, setChartData] = useState({});

    const navigate = useNavigate();

    useEffect(() => {
        getDashboardCountData();
    }, []);

    const getDashboardCountData =() => {
        console.log("Fetching data for Coupa tab...");
        setLoading(true)
        Bridge.dashboard.cupa.getCount().then((response: any) => {
            setDashboardCount(response.counts);
            setChartData(response.chartData);
            setLoading(false)
        }).catch(error => {
            console.error(error);
            setLoading(false);
        });
    }

    return (
        <div className="space-y-6">
            <Spin 
                spinning={loading}
                tip="Loading..."
            >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                    <div 
                    className="bg-white p-6 rounded-lg shadow-card cursor-pointer hover:shadow-card-hover transition-shadow duration-300"
                    onClick={() => navigate('/transactions/coupa?type=po&dateRange='+dateRange)}
                    >
                    <div className="flex items-center justify-between">
                        <div>
                        <p className="text-sm font-medium text-neutral-600">Open PO</p>
                        <p className="mt-2 text-2xl font-semibold text-neutral-900">{dashboardCount.openIpo}</p>
                        </div>
                        <div className="p-3 bg-primary-50 rounded-full">
                        <ShoppingCart className="h-6 w-6 text-primary-600" />
                        </div>
                    </div>
                    </div>
                    <div 
                    className="bg-white p-6 rounded-lg shadow-card cursor-pointer hover:shadow-card-hover transition-shadow duration-300"
                    onClick={() => navigate('/transactions/coupa?type=requisition&dateRange='+dateRange)}
                    >
                    <div className="flex items-center justify-between">
                        <div>
                        <p className="text-sm font-medium text-neutral-600">Requisitions</p>
                        <p className="mt-2 text-2xl font-semibold text-neutral-900">{dashboardCount.requisition}</p>
                        </div>
                        <div className="p-3 bg-secondary-50 rounded-full">
                        <FileText className="h-6 w-6 text-secondary-600" />
                        </div>
                    </div>
                    </div>
                    <div 
                    className="bg-white p-6 rounded-lg shadow-card cursor-pointer hover:shadow-card-hover transition-shadow duration-300"
                    onClick={() => navigate('/transactions/coupa?type=pending-approval&dateRange='+dateRange)}
                    >
                    <div className="flex items-center justify-between">
                        <div>
                        <p className="text-sm font-medium text-neutral-600">Pending Approval</p>
                        <p className="mt-2 text-2xl font-semibold text-warning-600">{dashboardCount.pendingApprovals}</p>
                        </div>
                        <div className="p-3 bg-warning-50 rounded-full">
                        <Clock className="h-6 w-6 text-warning-600" />
                        </div>
                    </div>
                    </div>
                    <div 
                    className="bg-white p-6 rounded-lg shadow-card cursor-pointer hover:shadow-card-hover transition-shadow duration-300"
                    onClick={() => navigate('/transactions/coupa?type=no-action&dateRange='+dateRange)}
                    >
                    <div className="flex items-center justify-between">
                        <div>
                        <p className="text-sm font-medium text-neutral-600">No Action</p>
                        <p className="mt-2 text-2xl font-semibold text-error-600">{dashboardCount.noAction}</p>
                        <p className="text-xs text-neutral-500 mt-1">No action required</p>
                        </div>
                        <div className="p-3 bg-error-50 rounded-full">
                        <AlertCircle className="h-6 w-6 text-error-600" />
                        </div>
                    </div>
                    </div>
                    <div 
                    className="bg-white p-6 rounded-lg shadow-card hover:shadow-card-hover transition-shadow duration-300"
                    >
                    <div className="flex items-center justify-between">
                        <div>
                        <p className="text-sm font-medium text-neutral-600">Requisitions Total</p>
                        <p className="mt-2 text-2xl font-semibold text-success-600">{dashboardCount.requisitionTotal}</p>
                        <p className="text-xs text-neutral-500 mt-1">Total requisition value</p>
                        </div>
                        <div className="p-3 bg-secondary-50 rounded-full">
                        <FileText className="h-6 w-6 text-secondary-600" />
                        </div>
                    </div>
                    </div>
                </div>
            </Spin>
            
            {chartData && chartData.datasets &&(
                <div className="bg-white rounded-lg shadow-card p-6">
                    <h2 className="text-lg font-medium text-neutral-900 mb-4">Coupa Purchase Order Trends</h2>
                    <div className="h-80">
                        <Line data={chartData} options={chartOptions} />
                    </div>
                </div>
            )}
            </div>
    )
}
export default Cupa;