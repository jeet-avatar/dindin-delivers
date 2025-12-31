import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, DollarSign, TrendingUp, BarChart } from 'lucide-react';
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

const TotalSpend: React.FC = () => {
  const navigate = useNavigate();

  const spendData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [{
      label: 'Total Spend',
      data: [298589, 310000, 325000, 298589865.3, 315000, 330000],
      borderColor: '#2563eb',
      backgroundColor: '#2563eb',
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
          <h1 className="text-2xl font-semibold text-neutral-900">Total Spend Analysis</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-600">Current Total Spend</p>
              <p className="mt-2 text-2xl font-semibold text-neutral-900">
                ${(298589865.3).toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-primary-50 rounded-full">
              <DollarSign className="h-6 w-6 text-primary-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-600">YoY Growth</p>
              <p className="mt-2 text-2xl font-semibold text-success-600">+15.2%</p>
            </div>
            <div className="p-3 bg-success-50 rounded-full">
              <TrendingUp className="h-6 w-6 text-success-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-600">Spend Forecast</p>
              <p className="mt-2 text-2xl font-semibold text-neutral-900">
                ${(320000000).toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-warning-50 rounded-full">
              <BarChart className="h-6 w-6 text-warning-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-card">
        <h2 className="text-lg font-medium text-neutral-900 mb-4">Spend Trends</h2>
        <div className="h-96">
          <Line data={spendData} options={chartOptions} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-card">
          <h2 className="text-lg font-medium text-neutral-900 mb-4">Top Spending Categories</h2>
          <div className="space-y-4">
            {[
              { category: 'IT Equipment', amount: 85000000 },
              { category: 'Professional Services', amount: 65000000 },
              { category: 'Marketing', amount: 45000000 },
              { category: 'Office Supplies', amount: 25000000 },
            ].map((item) => (
              <div key={item.category} className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg">
                <span className="text-sm font-medium text-neutral-700">{item.category}</span>
                <span className="text-sm text-neutral-900">${item.amount.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-card">
          <h2 className="text-lg font-medium text-neutral-900 mb-4">Spend by Department</h2>
          <div className="space-y-4">
            {[
              { department: 'Operations', amount: 95000000 },
              { department: 'IT', amount: 75000000 },
              { department: 'Marketing', amount: 55000000 },
              { department: 'Sales', amount: 35000000 },
            ].map((item) => (
              <div key={item.department} className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg">
                <span className="text-sm font-medium text-neutral-700">{item.department}</span>
                <span className="text-sm text-neutral-900">${item.amount.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TotalSpend;