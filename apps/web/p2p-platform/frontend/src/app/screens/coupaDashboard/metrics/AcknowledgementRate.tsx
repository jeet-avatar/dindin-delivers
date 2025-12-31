import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Clock, AlertCircle } from 'lucide-react';
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

const AcknowledgementRate: React.FC = () => {
  const navigate = useNavigate();

  const rateData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [{
      label: 'Acknowledgement Rate',
      data: [3.8, 4.0, 4.1, 4.32, 4.5, 4.7],
      borderColor: '#6366f1',
      backgroundColor: '#6366f1',
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
          <h1 className="text-2xl font-semibold text-neutral-900">Acknowledgement Rate Analysis</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-600">Current Rate</p>
              <p className="mt-2 text-2xl font-semibold text-neutral-900">4.32%</p>
            </div>
            <div className="p-3 bg-secondary-50 rounded-full">
              <CheckCircle className="h-6 w-6 text-secondary-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-600">Average Response Time</p>
              <p className="mt-2 text-2xl font-semibold text-neutral-900">2.5 hours</p>
            </div>
            <div className="p-3 bg-warning-50 rounded-full">
              <Clock className="h-6 w-6 text-warning-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-600">SLA Breaches</p>
              <p className="mt-2 text-2xl font-semibold text-error-600">12</p>
            </div>
            <div className="p-3 bg-error-50 rounded-full">
              <AlertCircle className="h-6 w-6 text-error-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-card">
        <h2 className="text-lg font-medium text-neutral-900 mb-4">Acknowledgement Rate Trends</h2>
        <div className="h-96">
          <Line data={rateData} options={chartOptions} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-card">
          <h2 className="text-lg font-medium text-neutral-900 mb-4">Response Time by Supplier</h2>
          <div className="space-y-4">
            {[
              { name: 'Tech Solutions Inc.', time: '1.5 hours', rate: 98 },
              { name: 'Office Supplies Co.', time: '2.2 hours', rate: 95 },
              { name: 'Global Services Ltd.', time: '3.1 hours', rate: 92 },
              { name: 'Equipment Pro', time: '3.8 hours', rate: 88 },
            ].map((item) => (
              <div key={item.name} className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg">
                <div>
                  <span className="text-sm font-medium text-neutral-700">{item.name}</span>
                  <span className="text-xs text-neutral-500 ml-2">({item.time})</span>
                </div>
                <span className="text-sm text-neutral-900">{item.rate}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-card">
          <h2 className="text-lg font-medium text-neutral-900 mb-4">SLA Performance</h2>
          <div className="space-y-4">
            {[
              { category: 'Within SLA', count: 1685, percentage: 93 },
              { category: 'Minor Breach', count: 85, percentage: 4.7 },
              { category: 'Major Breach', count: 35, percentage: 1.9 },
              { category: 'Critical Breach', count: 7, percentage: 0.4 },
            ].map((item) => (
              <div key={item.category} className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg">
                <div>
                  <span className="text-sm font-medium text-neutral-700">{item.category}</span>
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

export default AcknowledgementRate;