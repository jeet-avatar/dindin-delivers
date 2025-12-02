import React, { useState, useEffect } from 'react';
import { 
  GitPullRequest,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  TrendingUp,
  Users,
  Filter,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  BarChart as BarChartIcon
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
  LineElement,
  ArcElement
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import Button from '../../components/ui/Button';
import Bridge from '../../constants/Bridge';
import { Spin, message } from 'antd';
import * as htmlToImage from "html-to-image";
import { saveAs } from 'file-saver';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const Main: React.FC = () => {
  const [dateRange, setDateRange] = useState('month');
  const [jiraMetrics, setJiraMetrics] = useState({});
  const [ticketTrendData, setTicketTrendData] = useState({});
  const [priorityDistributionData, setPriorityDistributionData] = useState({});
  const [resolutionTimeData, setResolutionTimeData] = useState({});
  const [teamPerformanceData, setTeamPerformanceData] = useState({});
  const [recentTickets, setRecentTickets] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getJiraMetrics();
    getTicketTrendData();
    getPriorityDistributionData();
    getResolutionTimeData();
    getTeamPerformanceData();
    getRecentTickets();
  }, []);

  const getJiraMetrics = () => {
    const jiraMetrics = {
      activeTickets: 89,
      resolvedTickets: 156,
      avgResolutionTime: 1.2,
      slaCompliance: 97,
      highPriorityTickets: 15,
      overdueTickets: 7
    };
    setJiraMetrics(jiraMetrics);
    // Bridge.jiraDashboard.getJiraMetrics().then((response) => {
    //   setJiraMetrics(response);
    // });
  }

  const getTicketTrendData = () => {
    const ticketTrendData = {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      datasets: [{
        label: 'Created Tickets',
        data: [85, 92, 88, 95, 102, 98],
        borderColor: '#2563eb',
        backgroundColor: '#2563eb',
        tension: 0.4
      },
      {
        label: 'Resolved Tickets',
        data: [78, 85, 82, 89, 96, 92],
        borderColor: '#10b981',
        backgroundColor: '#10b981',
        tension: 0.4
      }]
    };
    setTicketTrendData(ticketTrendData);
    // Bridge.jiraDashboard.getTicketTrendData().then((response) => {
    //   setTicketTrendData(response);
    // });
  }

  const getPriorityDistributionData = () => {
    const priorityDistributionData = {
      labels: ['P0 - Critical', 'P1 - High', 'P2 - Medium', 'P3 - Low'],
      datasets: [{
        data: [5, 15, 40, 40],
        backgroundColor: ['#ef4444', '#f59e0b', '#6366f1', '#10b981'],
        borderWidth: 0
      }]
    };
    setPriorityDistributionData(priorityDistributionData);
    // Bridge.jiraDashboard.getPriorityDistributionData().then((response) => {
    //   setPriorityDistributionData(response);
    // });
  }

  const getResolutionTimeData = () => {
    const resolutionTimeData = {
      labels: ['Bug', 'Feature', 'Task', 'Story', 'Epic'],
      datasets: [{
        label: 'Avg Resolution Time (days)',
        data: [0.8, 3.2, 1.5, 2.1, 8.5],
        backgroundColor: '#6366f1',
      }]
    };
    setResolutionTimeData(resolutionTimeData);
    // Bridge.jiraDashboard.getResolutionTimeData().then((response) => {
    //   setResolutionTimeData(response);
    // });
  }

  const getTeamPerformanceData = () => {
    const teamPerformanceData = {
      labels: ['Team A', 'Team B', 'Team C', 'Team D'],
      datasets: [{
        data: [25, 30, 20, 25],
        backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'],
        borderWidth: 0
      }]
    };
    setTeamPerformanceData(teamPerformanceData);
    // Bridge.jiraDashboard.getTeamPerformanceData().then((response) => {
    //   setTeamPerformanceData(response);
    // });
  }

  const getRecentTickets = () => {
    
    // Bridge.jiraDashboard.getRecentTickets().then((response) => {
    //   setRecentTickets(response);
    // });
  }

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

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
      },
    },
  };

  const exportData = () => {
    setLoading(true);
    var node = document.getElementById("main-section");
    htmlToImage.toBlob(node).then((blob) => {
      saveAs(blob, "Jira Dashboard.png");
      setLoading(false);
      message.success("Exported successfully.");
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">JIRA Dashboard</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Issue tracking and project management insights
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <select
              className="rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
            >
              <option value="week">Last 7 days</option>
              <option value="month">Last 30 days</option>
              <option value="quarter">Last Quarter</option>
              <option value="year">Last Year</option>
            </select>
          </div>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Filter size={16} />}
          >
            Filters
          </Button>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Download size={16} />}
            onClick={()=> exportData()}
          >
            Export
          </Button>
        </div>
      </div>

      <div id="main-section">

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Active Tickets</p>
                <p className="mt-2 text-2xl font-semibold text-neutral-900">{jiraMetrics.activeTickets}</p>
              </div>
              <div className="p-3 bg-primary-50 rounded-full">
                <GitPullRequest className="h-6 w-6 text-primary-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Resolved This Month</p>
                <p className="mt-2 text-2xl font-semibold text-success-600">{jiraMetrics.resolvedTickets}</p>
              </div>
              <div className="p-3 bg-success-50 rounded-full">
                <CheckCircle className="h-6 w-6 text-success-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Avg Resolution Time</p>
                <p className="mt-2 text-2xl font-semibold text-neutral-900">{jiraMetrics.avgResolutionTime}d</p>
              </div>
              <div className="p-3 bg-warning-50 rounded-full">
                <Clock className="h-6 w-6 text-warning-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">SLA Compliance</p>
                <p className="mt-2 text-2xl font-semibold text-primary-600">{jiraMetrics.slaCompliance}%</p>
              </div>
              <div className="p-3 bg-primary-50 rounded-full">
                <TrendingUp className="h-6 w-6 text-primary-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">High Priority</p>
                <p className="mt-2 text-2xl font-semibold text-error-600">{jiraMetrics.highPriorityTickets}</p>
              </div>
              <div className="p-3 bg-error-50 rounded-full">
                <AlertCircle className="h-6 w-6 text-error-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Overdue Tickets</p>
                <p className="mt-2 text-2xl font-semibold text-error-600">{jiraMetrics.overdueTickets}</p>
              </div>
              <div className="p-3 bg-error-50 rounded-full">
                <XCircle className="h-6 w-6 text-error-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-5">
          <div className="bg-white p-6 rounded-lg shadow-card">
            <h2 className="text-lg font-medium text-neutral-900 mb-4">Ticket Trends</h2>
            <div className="h-80">
              {ticketTrendData && ticketTrendData.datasets && (
                <Line data={ticketTrendData} options={chartOptions} />
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-card">
            <h2 className="text-lg font-medium text-neutral-900 mb-4">Priority Distribution</h2>
            <div className="h-80">
              {priorityDistributionData &&  priorityDistributionData.datasets && (
                <Doughnut data={priorityDistributionData} options={pieOptions} />
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-card">
            <h2 className="text-lg font-medium text-neutral-900 mb-4">Resolution Time by Type</h2>
            <div className="h-80">
              {resolutionTimeData && resolutionTimeData.datasets && (
                <Bar data={resolutionTimeData} options={chartOptions} />
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-card">
            <h2 className="text-lg font-medium text-neutral-900 mb-4">Team Performance</h2>
            <div className="h-80">
              {teamPerformanceData && teamPerformanceData.datasets && (
                <Doughnut data={teamPerformanceData} options={pieOptions} />
              )}
            </div>
          </div>
        </div>

        {/* Recent Tickets */}
        <div className="bg-white rounded-lg shadow-card overflow-hidden mt-5">
          <div className="px-6 py-4 border-b border-neutral-200">
            <h2 className="font-medium text-neutral-900">Recent Tickets</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-200">
              <thead className="bg-neutral-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Ticket ID
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Title
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Priority
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Assignee
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Updated
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-neutral-200">
                {recentTickets.length>0 && recentTickets.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-neutral-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary-600">
                      {ticket.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">
                      {ticket.title}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        ticket.priority === 'High' ? 'bg-error-100 text-error-700' :
                        ticket.priority === 'Medium' ? 'bg-warning-100 text-warning-700' :
                        'bg-success-100 text-success-700'
                      }`}>
                        {ticket.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        ticket.status === 'Open' ? 'bg-warning-100 text-warning-700' :
                        ticket.status === 'In Progress' ? 'bg-primary-100 text-primary-700' :
                        'bg-success-100 text-success-700'
                      }`}>
                        {ticket.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">
                      {ticket.assignee}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">
                      {ticket.created}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">
                      {ticket.updated}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-5">
          <div className="bg-white p-6 rounded-lg shadow-card">
            <h2 className="text-lg font-medium text-neutral-900 mb-4">Performance Metrics</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg">
                <div>
                  <p className="text-sm text-neutral-600">Average Resolution Time</p>
                  <p className="mt-1 text-2xl font-semibold text-neutral-900">1.2 days</p>
                </div>
                <div className="flex items-center text-success-600">
                  <ArrowDownRight className="h-4 w-4" />
                  <span className="ml-1 text-sm font-medium">15%</span>
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg">
                <div>
                  <p className="text-sm text-neutral-600">First Response Time</p>
                  <p className="mt-1 text-2xl font-semibold text-neutral-900">2.5 hours</p>
                </div>
                <div className="flex items-center text-success-600">
                  <ArrowDownRight className="h-4 w-4" />
                  <span className="ml-1 text-sm font-medium">10%</span>
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg">
                <div>
                  <p className="text-sm text-neutral-600">Customer Satisfaction</p>
                  <p className="mt-1 text-2xl font-semibold text-neutral-900">4.8/5</p>
                </div>
                <div className="flex items-center text-success-600">
                  <ArrowUpRight className="h-4 w-4" />
                  <span className="ml-1 text-sm font-medium">5%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-card">
            <h2 className="text-lg font-medium text-neutral-900 mb-4">Team Workload</h2>
            <div className="space-y-4">
              {[
                { name: 'John Doe', assigned: 12, completed: 8, efficiency: 92 },
                { name: 'Jane Smith', assigned: 15, completed: 11, efficiency: 88 },
                { name: 'Mike Johnson', assigned: 8, completed: 7, efficiency: 95 },
                { name: 'Sarah Wilson', assigned: 10, completed: 6, efficiency: 85 }
              ].map((member) => (
                <div key={member.name} className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-neutral-900">{member.name}</p>
                    <p className="text-xs text-neutral-500">
                      {member.assigned} assigned • {member.completed} completed
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-neutral-900">{member.efficiency}%</p>
                    <p className="text-xs text-neutral-500">efficiency</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>


    </div>
  );
};

export default Main;