import React from 'react';
import { 
  BarChart as BarChartIcon,
  AlertCircle,
  Clock,
  Filter,
  GitPullRequest,
  ArrowUpRight,
  ArrowDownRight
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
  LineElement
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import Button from '../../components/ui/Button';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const JiraTickets: React.FC = () => {
  // Mock data for the stacked bar chart
  const barChartData = {
    labels: ['0-7', '7-14', '14-21', '21-30', '30+'],
    datasets: [
      {
        label: 'High Priority',
        data: [15, 12, 8, 6, 4],
        backgroundColor: '#ff4d37',
      },
      {
        label: 'Medium Priority',
        data: [20, 15, 10, 8, 5],
        backgroundColor: '#10b981',
      },
      {
        label: 'Low Priority',
        data: [12, 10, 6, 4, 2],
        backgroundColor: '#f59e0b',
      },
    ],
  };

  // Mock data for the line chart
  const lineChartData = {
    labels: ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr'],
    datasets: [
      {
        label: 'Ticket Volume',
        data: [25, 30, 28, 35, 32, 40],
        borderColor: '#2d50e6',
        backgroundColor: '#2d50e6',
        tension: 0.4,
      },
    ],
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
      x: {
        stacked: true,
        grid: {
          display: false,
        },
      },
      y: {
        stacked: true,
        beginAtZero: true,
        grid: {
          color: '#e5e7eb',
        },
      },
    },
  };

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: '#e5e7eb',
        },
      },
    },
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-semibold text-neutral-900">JIRA Ticket Management</h1>
        <div className="mt-4 md:mt-0">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Filter size={16} />}
          >
            Filter
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-600">JIRA Tickets Open</p>
              <p className="mt-2 text-3xl font-semibold text-primary-600">45</p>
            </div>
            <div className="p-3 bg-primary-50 rounded-full">
              <GitPullRequest className="h-6 w-6 text-primary-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-600">Requiring Action</p>
              <p className="mt-2 text-3xl font-semibold text-warning-600">15</p>
            </div>
            <div className="p-3 bg-warning-50 rounded-full">
              <AlertCircle className="h-6 w-6 text-warning-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-600">Out of SLA</p>
              <p className="mt-2 text-3xl font-semibold text-error-600">7</p>
            </div>
            <div className="p-3 bg-error-50 rounded-full">
              <Clock className="h-6 w-6 text-error-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-card">
          <h2 className="text-lg font-medium text-neutral-900 mb-4">JIRA Tickets by Age</h2>
          <div className="h-80">
            <Bar data={barChartData} options={chartOptions} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-neutral-900">Ticket Volume Trend</h2>
            <div className="flex space-x-2">
              <button className="px-3 py-1 text-sm font-medium rounded-md bg-secondary-100 text-secondary-700">
                MoM
              </button>
              <button className="px-3 py-1 text-sm font-medium rounded-md text-neutral-600 hover:bg-neutral-100">
                QoQ
              </button>
              <button className="px-3 py-1 text-sm font-medium rounded-md text-neutral-600 hover:bg-neutral-100">
                YoY
              </button>
            </div>
          </div>
          <div className="h-80">
            <Line data={lineChartData} options={lineChartOptions} />
          </div>
        </div>
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-card">
          <h2 className="text-lg font-medium text-neutral-900 mb-4">Performance Metrics</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg">
              <div>
                <p className="text-sm text-neutral-600">Average Resolution Time</p>
                <p className="mt-1 text-2xl font-semibold text-neutral-900">3.2 days</p>
              </div>
              <div className="flex items-center text-success-600">
                <ArrowDownRight className="h-4 w-4" />
                <span className="ml-1 text-sm font-medium">15%</span>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg">
              <div>
                <p className="text-sm text-neutral-600">First Response Time</p>
                <p className="mt-1 text-2xl font-semibold text-neutral-900">5.5 hours</p>
              </div>
              <div className="flex items-center text-success-600">
                <ArrowDownRight className="h-4 w-4" />
                <span className="ml-1 text-sm font-medium">10%</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-card">
          <h2 className="text-lg font-medium text-neutral-900 mb-4">Ticket Categories</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg">
              <div>
                <p className="text-sm text-neutral-600">Bug Fixes</p>
                <p className="mt-1 text-2xl font-semibold text-neutral-900">40%</p>
              </div>
              <div className="flex items-center text-error-600">
                <ArrowUpRight className="h-4 w-4" />
                <span className="ml-1 text-sm font-medium">8%</span>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg">
              <div>
                <p className="text-sm text-neutral-600">Feature Requests</p>
                <p className="mt-1 text-2xl font-semibold text-neutral-900">30%</p>
              </div>
              <div className="flex items-center text-success-600">
                <ArrowUpRight className="h-4 w-4" />
                <span className="ml-1 text-sm font-medium">5%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JiraTickets;