import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart as BarChartIcon,
  FileText, 
  Clock,
  DollarSign,
} from 'lucide-react';
import { Line } from 'react-chartjs-2';
import { Spin } from 'antd';
import Bridge from '../../../constants/Bridge';

import { spendTrendData,chartOptions } from '../../../constants/consts';

const NetSuite = ({ dateRange }) => {
    const [loading, setLoading] = useState(true);
    const [dashboardCount, setDashboardCount] = useState({});
    const [chartData, setChartData] = useState({});

    const navigate = useNavigate();

    useEffect(() => {
        console.log("Netsuite mounted");
        getDashboardCountData();
        return () => {
            console.log("Netsuite unmounted");
        };
    }, []);

    const getDashboardCountData =() => {
        setLoading(true)
        Bridge.dashboard.netSuite.getCount().then((response: any) => {
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
            <Spin spinning={loading} tip="Loading..." >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* <div 
                    className="bg-white p-6 rounded-lg shadow-card cursor-pointer hover:shadow-card-hover transition-shadow duration-300"
                    onClick={() => navigate('/transactions/netsuite?type=requisition&dateRange='+dateRange)}
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
                    </div> */}
                    <div 
                    className="bg-white p-6 rounded-lg shadow-card cursor-pointer hover:shadow-card-hover transition-shadow duration-300"
                    onClick={() => navigate('/transactions/netsuite?type=po&dateRange='+dateRange)}
                    >
                    <div className="flex items-center justify-between">
                        <div>
                        <p className="text-sm font-medium text-neutral-600">Open PO</p>
                        <p className="mt-2 text-2xl font-semibold text-neutral-900">{dashboardCount.openIpo}</p>
                        </div>
                        <div className="p-3 bg-primary-50 rounded-full">
                        <FileText className="h-6 w-6 text-primary-600" />
                        </div>
                    </div>
                    </div>
                    <div 
                    className="bg-white p-6 rounded-lg shadow-card cursor-pointer hover:shadow-card-hover transition-shadow duration-300"
                    onClick={() => navigate('/transactions/netsuite?type=bill&dateRange='+dateRange)}
                    >
                    <div className="flex items-center justify-between">
                        <div>
                        <p className="text-sm font-medium text-neutral-600">Open Bills</p>
                        <p className="mt-2 text-2xl font-semibold text-warning-600">{dashboardCount.openBills}</p>
                        </div>
                        <div className="p-3 bg-warning-50 rounded-full">
                        <FileText className="h-6 w-6 text-warning-600" />
                        </div>
                    </div>
                    </div>
                    <div 
                    className="bg-white p-6 rounded-lg shadow-card cursor-pointer hover:shadow-card-hover transition-shadow duration-300"
                    onClick={() => navigate('/transactions/netsuite?type=pending-approval&dateRange='+dateRange)}
                    >
                    <div className="flex items-center justify-between">
                        <div>
                        <p className="text-sm font-medium text-neutral-600">Pending Approval PO</p>
                        <p className="mt-2 text-2xl font-semibold text-primary-600">{dashboardCount.pendingApprovals}</p>
                        </div>
                        <div className="p-3 bg-primary-50 rounded-full">
                        <Clock className="h-6 w-6 text-primary-600" />
                        </div>
                    </div>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow-card">
                    <div className="flex items-center justify-between">
                        <div>
                        <p className="text-sm font-medium text-neutral-600">Total Amount</p>
                        <p className="mt-2 text-2xl font-semibold text-neutral-900">{dashboardCount.totalAmount}</p>
                        </div>
                        <div className="p-3 bg-success-50 rounded-full">
                        <DollarSign className="h-6 w-6 text-success-600" />
                        </div>
                    </div>
                    </div>
                </div>
            </Spin>
            
            {chartData && chartData.datasets &&(
                <div className="bg-white rounded-lg shadow-card p-6">
                    <h2 className="text-lg font-medium text-neutral-900 mb-4">NetSuite Process Orders</h2>
                    <div className="h-80">
                    <Line data={chartData} options={chartOptions} />
                    </div>
                </div>
            )}
        </div>
    )
}
export default NetSuite;