import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShoppingCart, TrendingUp, Building, ExternalLink, X } from 'lucide-react';
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

interface PurchaseOrder {
  id: string;
  number: string;
  supplier: string;
  amount: number;
  requestedBy: string;
  department: string;
  date: string;
  status: string;
  description: string;
}

const PurchaseOrders: React.FC = () => {
  const navigate = useNavigate();
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Mock data for different PO statuses
  const poData = {
    'Closed': [
      {
        id: 'po-001',
        number: 'PO-2024-001',
        supplier: 'Tech Solutions Inc.',
        amount: 12500.00,
        requestedBy: 'John Smith',
        department: 'IT',
        date: '2024-03-15',
        status: 'Closed',
        description: 'Server Hardware Purchase'
      },
      {
        id: 'po-002',
        number: 'PO-2024-002',
        supplier: 'Office Supplies Co.',
        amount: 5800.00,
        requestedBy: 'Sarah Johnson',
        department: 'Operations',
        date: '2024-03-14',
        status: 'Closed',
        description: 'Office Furniture and Supplies'
      },
      {
        id: 'po-003',
        number: 'PO-2024-003',
        supplier: 'Global Electronics Ltd',
        amount: 18750.00,
        requestedBy: 'Michael Chen',
        department: 'Engineering',
        date: '2024-03-13',
        status: 'Closed',
        description: 'Testing Equipment'
      },
      {
        id: 'po-004',
        number: 'PO-2024-004',
        supplier: 'Industrial Supplies Inc',
        amount: 9200.00,
        requestedBy: 'Emma Wilson',
        department: 'Manufacturing',
        date: '2024-03-12',
        status: 'Closed',
        description: 'Raw Materials'
      },
      {
        id: 'po-005',
        number: 'PO-2024-005',
        supplier: 'Quality Parts Co',
        amount: 15300.00,
        requestedBy: 'David Brown',
        department: 'Operations',
        date: '2024-03-11',
        status: 'Closed',
        description: 'Machinery Parts'
      }
    ],
    'Pending Approval': [
      {
        id: 'po-101',
        number: 'PO-2024-101',
        supplier: 'Software Solutions Ltd',
        amount: 22000.00,
        requestedBy: 'Lisa Anderson',
        department: 'IT',
        date: '2024-03-16',
        status: 'Pending Approval',
        description: 'Software Licenses'
      },
      {
        id: 'po-102',
        number: 'PO-2024-102',
        supplier: 'Marketing Pros Inc',
        amount: 8500.00,
        requestedBy: 'James Wilson',
        department: 'Marketing',
        date: '2024-03-15',
        status: 'Pending Approval',
        description: 'Marketing Materials'
      },
      {
        id: 'po-103',
        number: 'PO-2024-103',
        supplier: 'Research Equipment Co',
        amount: 31000.00,
        requestedBy: 'Rachel Green',
        department: 'R&D',
        date: '2024-03-14',
        status: 'Pending Approval',
        description: 'Research Equipment'
      }
    ],
    'Soft Close': [
      {
        id: 'po-201',
        number: 'PO-2024-201',
        supplier: 'Global Tech Solutions',
        amount: 18750.00,
        requestedBy: 'Michael Chen',
        department: 'Engineering',
        date: '2024-03-13',
        status: 'Soft Close',
        description: 'Network Equipment - Pending Invoice Reconciliation'
      },
      {
        id: 'po-202',
        number: 'PO-2024-202',
        supplier: 'Industrial Supplies Ltd',
        amount: 9200.00,
        requestedBy: 'Emma Wilson',
        department: 'Manufacturing',
        date: '2024-03-12',
        status: 'Soft Close',
        description: 'Manufacturing Supplies - Receipt Verification'
      }
    ],
    'Issued': [
      {
        id: 'po-301',
        number: 'PO-2024-301',
        supplier: 'Electronics Wholesale Inc',
        amount: 24500.00,
        requestedBy: 'Alex Thompson',
        department: 'IT',
        date: '2024-03-16',
        status: 'Issued',
        description: 'Computer Hardware - Awaiting Delivery'
      },
      {
        id: 'po-302',
        number: 'PO-2024-302',
        supplier: 'Office Essentials Co',
        amount: 8900.00,
        requestedBy: 'Jessica Lee',
        department: 'Admin',
        date: '2024-03-15',
        status: 'Issued',
        description: 'Office Equipment - In Transit'
      }
    ]
  };

  const chartData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [{
      label: 'Purchase Orders',
      data: [1500, 1600, 1700, 1812, 1900, 2000],
      borderColor: '#f97316',
      backgroundColor: '#f97316',
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

  const handleStatusClick = (status: string) => {
    setSelectedStatus(status);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedStatus(null);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Closed':
        return 'bg-success-100 text-success-800';
      case 'Pending Approval':
        return 'bg-warning-100 text-warning-800';
      case 'Soft Close':
        return 'bg-secondary-100 text-secondary-800';
      case 'Issued':
        return 'bg-primary-100 text-primary-800';
      default:
        return 'bg-neutral-100 text-neutral-800';
    }
  };

  const currentPOs = selectedStatus ? poData[selectedStatus as keyof typeof poData] || [] : [];

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
          <h1 className="text-2xl font-semibold text-neutral-900">Purchase Orders Analysis</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-600">Total POs</p>
              <p className="mt-2 text-2xl font-semibold text-neutral-900">1,812</p>
            </div>
            <div className="p-3 bg-warning-50 rounded-full">
              <ShoppingCart className="h-6 w-6 text-warning-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-600">Monthly Growth</p>
              <p className="mt-2 text-2xl font-semibold text-success-600">+12.3%</p>
            </div>
            <div className="p-3 bg-success-50 rounded-full">
              <TrendingUp className="h-6 w-6 text-success-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-600">Active Suppliers</p>
              <p className="mt-2 text-2xl font-semibold text-neutral-900">156</p>
            </div>
            <div className="p-3 bg-primary-50 rounded-full">
              <Building className="h-6 w-6 text-primary-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-card">
        <h2 className="text-lg font-medium text-neutral-900 mb-4">Purchase Order Trends</h2>
        <div className="h-96">
          <Line data={chartData} options={chartOptions} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-card">
          <h2 className="text-lg font-medium text-neutral-900 mb-4">Top Suppliers by PO Count</h2>
          <div className="space-y-4">
            {[
              { name: 'Tech Solutions Inc.', count: 245, value: 15800000 },
              { name: 'Office Supplies Co.', count: 198, value: 12500000 },
              { name: 'Global Services Ltd.', count: 156, value: 9800000 },
              { name: 'Equipment Pro', count: 134, value: 8500000 },
            ].map((item) => (
              <div key={item.name} className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg">
                <div>
                  <span className="text-sm font-medium text-neutral-700">{item.name}</span>
                  <span className="text-xs text-neutral-500 ml-2">({item.count} POs)</span>
                </div>
                <span className="text-sm text-neutral-900">${item.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-card">
          <h2 className="text-lg font-medium text-neutral-900 mb-4">PO Status Distribution</h2>
          <div className="space-y-4">
            {[
              { status: 'Closed', count: 1547, percentage: 85.4 },
              { status: 'Pending Approval', count: 100, percentage: 5.5 },
              { status: 'Soft Close', count: 99, percentage: 5.5 },
              { status: 'Issued', count: 65, percentage: 3.6 },
            ].map((item) => (
              <div 
                key={item.status} 
                className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg cursor-pointer hover:bg-neutral-100 transition-colors duration-150"
                onClick={() => handleStatusClick(item.status)}
              >
                <div>
                  <span className="text-sm font-medium text-neutral-700">{item.status}</span>
                  <span className="text-xs text-neutral-500 ml-2">({item.count})</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-neutral-900">{item.percentage}%</span>
                  <ExternalLink className="h-4 w-4 text-neutral-400" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal for PO Details */}
      {showModal && selectedStatus && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-neutral-900 bg-opacity-50 transition-opacity" onClick={closeModal} />
            
            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between p-6 border-b border-neutral-200">
                <h2 className="text-xl font-semibold text-neutral-900">
                  Purchase Orders - {selectedStatus}
                </h2>
                <button onClick={closeModal} className="text-neutral-400 hover:text-neutral-500">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-neutral-200">
                    <thead className="bg-neutral-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                          PO Number
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                          Supplier
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                          Amount
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                          Requested By
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                          Department
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                          Description
                        </th>
                        <th scope="col" className="relative px-6 py-3">
                          <span className="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-neutral-200">
                      {currentPOs.map((po) => (
                        <tr key={po.id} className="hover:bg-neutral-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary-600">
                            {po.number}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">
                            {po.supplier}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">
                            {formatCurrency(po.amount)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">
                            {po.requestedBy}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">
                            {po.department}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">
                            {formatDate(po.date)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(po.status)}`}>
                              {po.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-neutral-600 max-w-xs">
                            <div className="truncate" title={po.description}>
                              {po.description}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <Button
                              variant="outline"
                              size="sm"
                              rightIcon={<ExternalLink size={16} />}
                              onClick={() => window.open('https://coupa.com', '_blank')}
                            >
                              View in Coupa
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {currentPOs.length === 0 && (
                  <div className="text-center py-8 text-neutral-500">
                    No purchase orders found for this status.
                  </div>
                )}
              </div>

              <div className="px-6 py-4 border-t border-neutral-200 bg-neutral-50">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-neutral-500">
                    Showing <span className="font-medium">{currentPOs.length}</span> purchase orders
                  </div>
                  <Button variant="outline" onClick={closeModal}>
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseOrders;