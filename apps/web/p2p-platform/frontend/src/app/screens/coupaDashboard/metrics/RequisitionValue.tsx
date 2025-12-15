import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, TrendingUp, Users } from 'lucide-react';
import Button from '../../../components/ui/Button';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const RequisitionValue: React.FC = () => {
  const navigate = useNavigate();

  const requisitionData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [{
      label: 'Requisition Value',
      data: [220000000, 225000000, 230000000, 237185433.4, 240000000, 245000000],
      borderColor: '#10b981',
      backgroundColor: '#10b981',
      tension: 0.4
    }]
  };

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<ArrowLeft size={16} />}
            onClick={() => navigate('/coupa-dashboard')}
          >
            Back to Dashboard
          </Button>
          <h1 className="text-2xl font-semibold text-neutral-900">Requisition Value Analysis</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-600">Total Requisition Value</p>
              <p className="mt-2 text-2xl font-semibold text-neutral-900">
                ${(237185433.4).toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-success-50 rounded-full">
              <FileText className="h-6 w-6 text-success-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-600">Monthly Growth</p>
              <p className="mt-2 text-2xl font-semibold text-success-600">+8.5%</p>
            </div>
            <div className="p-3 bg-success-50 rounded-full">
              <TrendingUp className="h-6 w-6 text-success-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-600">Active Requesters</p>
              <p className="mt-2 text-2xl font-semibold text-neutral-900">245</p>
            </div>
            <div className="p-3 bg-primary-50 rounded-full">
              <Users className="h-6 w-6 text-primary-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-card">
        <h2 className="text-lg font-medium text-neutral-900 mb-4">Requisition Value Trends</h2>
        <div className="h-96">
          <Line data={requisitionData} options={chartOptions} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-card">
          <h2 className="text-lg font-medium text-neutral-900 mb-4">Top Requesters</h2>
          <div className="space-y-4">
            {[
              { name: 'John Smith', count: 45, value: 12500000 },
              { name: 'Sarah Johnson', count: 38, value: 9800000 },
              { name: 'Mike Brown', count: 32, value: 8500000 },
              { name: 'Emily Davis', count: 28, value: 7200000 },
            ].map((item) => (
              <div key={item.name} className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg">
                <div>
                  <span className="text-sm font-medium text-neutral-700">{item.name}</span>
                  <span className="text-xs text-neutral-500 ml-2">({item.count} requests)</span>
                </div>
                <span className="text-sm text-neutral-900">${item.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-card">
          <h2 className="text-lg font-medium text-neutral-900 mb-4">Requisition Status</h2>
          <div className="space-y-4">
            {[
              { status: 'Approved', count: 185, percentage: 75 },
              { status: 'Pending', count: 42, percentage: 17 },
              { status: 'Rejected', count: 12, percentage: 5 },
              { status: 'Draft', count: 6, percentage: 3 },
            ].map((item) => (
              <div key={item.status} className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg">
                <div>
                  <span className="text-sm font-medium text-neutral-700">{item.status}</span>
                  <span className="text-xs text-neutral-500 ml-2">({item.count})</span>
                </div>
                <span className="text-sm text-neutral-900">{item.percentage}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RequisitionValue;