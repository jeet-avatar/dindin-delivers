import { 
  BarChart as BarChartIcon,
  FileText, 
  ShoppingCart,
  /* Wallet,
  GitPullRequest,
  Globe, */
} from 'lucide-react';

export const DATE_FORMAT = "MM/DD/YYYY";

// Dashboard 
// System tabs configuration
export const systemTabs = [
  { id: 'consolidated', name: 'Consolidated View', icon: <BarChartIcon className="h-5 w-5" /> },
  { id: 'coupa', name: 'Coupa', icon: <ShoppingCart className="h-5 w-5" /> },
  { id: 'netsuite', name: 'NetSuite', icon: <FileText className="h-5 w-5" /> },
  /* { id: 'zip', name: 'ZIP', icon: <Wallet className="h-5 w-5" /> },
  { id: 'jira', name: 'JIRA', icon: <GitPullRequest className="h-5 w-5" /> },
  { id: 'process-unity', name: 'Process Unity', icon: <Shield className="h-5 w-5" /> },
  { id: 'netsuite-wolt', name: 'NetSuite Wolt', icon: <Globe className="h-5 w-5" /> } */
];

export const spendTrendData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [{
      label: 'Total Spend',
      data: [25000000, 28000000, 26000000, 29858986, 31000000, 33000000],
      borderColor: '#2563eb',
      backgroundColor: '#2563eb',
      tension: 0.4
    }]
};

export const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
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

export const dateRangeOptions= [
  { value: 'week', label: 'Last 7 days' },
  { value: 'month', label: 'Last 30 days' },
  { value: 'quarter', label: 'Last Quarter' },
  { value: 'year', label: 'Last Year' },
  { value: '2years', label: 'Last 2 Years' },
];

export const DUMMY_REQUISITIONS_DATA = [
    {
        id: 'REQ-2024-003',
        prNumber: 'PR-123456',
        requester: {
            name: 'John Doe',
            department: 'Operations'
        },
        description: 'Monthly food supply',
        category: 'Food',
        totalAmount: 60000,
        requestDate: '2024-02-01',
        status: 'pending_approval',
        approvers: 
        {
            name: 'Jane Doe',
            department: 'Finance',
            type: 'current',
            currentValue: Math.random() * 1000,
            historicalValue: Math.random() * 1000
        },
        linkedJiraTicket: <a href="https://jira.acmesupplier.com/browse/JIRA-12345">JIRA-12345</a>,
        costCenter: 'Warehouse A',
        dateRange: 'Created'
    },
    {
        id: 'REQ-2024-004',
        prNumber: 'PR-123457',
        requester: {
            name: 'Michael Brown',
            department: 'IT'
        },
        description: 'New laptops for IT department',
        category: 'IT',
        totalAmount: 200000,
        requestDate: '2024-02-05',
        status: 'approved',
        approvers: 
        {
            name: 'Jane Doe',
            department: 'Finance',
            type: 'historical',
            currentValue: Math.random() * 1000,
            historicalValue: Math.random() * 1000
        },
        linkedJiraTicket: <a href="https://jira.acmesupplier.com/browse/JIRA-12346">JIRA-12346</a>,
        costCenter: 'Distribution Center',
        dateRange: 'Approved'
    },
    {
        id: 'REQ-2024-005',
        prNumber: 'PR-123458',
        requester: {
            name: 'Sarah Lee',
            department: 'HR'
        },
        description: 'New office furniture',
        category: 'Office',
        totalAmount: 2000,
        requestDate: '2024-02-10',
        status: 'billed',
        approvers: 
        {
            name: 'Jane Doe',
            department: 'Finance',
            type: 'current',
            currentValue: Math.random() * 1000,
            historicalValue: Math.random() * 1000
        },
        linkedJiraTicket: <a href="https://jira.acmesupplier.com/browse/JIRA-12347">JIRA-12347</a>,
        costCenter: 'Warehouse A',
        dateRange: 'Modified'
    },
    {
        id: 'REQ-2024-006',
        prNumber: 'PR-123459',
        requester: {
            name: 'David Kim',
            department: 'Logistics'
        },
        description: 'Monthly food supply',
        category: 'Food',
        totalAmount: 5000,
        requestDate: '2024-02-15',
        status: 'paid',
        approvers: 
        {
            name: 'Jane Doe',
            department: 'Finance',
            type: 'historical',
            currentValue: Math.random() * 1000,
            historicalValue: Math.random() * 1000
        },
        linkedJiraTicket: <a href="https://jira.acmesupplier.com/browse/JIRA-12348">JIRA-12348</a>,
        costCenter: 'Distribution Center',
        dateRange: 'Approved'
    },
    {
        id: 'REQ-2024-007',
        prNumber: 'PR-123460',
        requester: {
            name: 'Emily Chen',
            department: 'Marketing'
        },
        description: 'New laptops for marketing department',
        category: 'IT',
        totalAmount: 10000,
        requestDate: '2024-02-20',
        status: 'pending_approval',
        approvers: 
        {
            name: 'Jane Doe',
            department: 'Finance',
            type: 'current',
            currentValue: Math.random() * 1000,
            historicalValue: Math.random() * 1000
        },
        linkedJiraTicket: <a href="https://jira.acmesupplier.com/browse/JIRA-12349">JIRA-12349</a>,
        costCenter: 'Warehouse A',
        dateRange: 'Modified'
    },
    {
        id: 'REQ-2024-008',
        prNumber: 'PR-123461',
        requester: {
            name: 'Kevin White',
            department: 'Sales'
        },
        description: 'New office furniture',
        category: 'Office',
        totalAmount: 2000,
        requestDate: '2024-02-25',
        status: 'approved',
        approvers: 
        {
            name: 'Jane Doe',
            department: 'Finance',
            type: 'historical',
            currentValue: Math.random() * 1000,
            historicalValue: Math.random() * 1000
        },
        linkedJiraTicket: <a href="https://jira.acmesupplier.com/browse/JIRA-12350">JIRA-12350</a>,
        costCenter: 'Distribution Center',
        dateRange: 'Modified'
    },
    {
        id: 'REQ-2024-009',
        prNumber: 'PR-123462',
        requester: {
            name: 'Lisa Nguyen',
            department: 'Finance'
        },
        description: 'Monthly food supply',
        category: 'Food',
        totalAmount: 5000,
        requestDate: '2024-03-01',
        status: 'billed',
        approvers: 
        {
            name: 'Jane Doe',
            department: 'Finance',
            type: 'current',
            currentValue: Math.random() * 1000,
            historicalValue: Math.random() * 1000
        },
        linkedJiraTicket: <a href="https://jira.acmesupplier.com/browse/JIRA-12351">JIRA-12351</a>,
        costCenter: 'Warehouse A',
        dateRange: 'Approved'
    },
    {
        id: 'REQ-2024-010',
        prNumber: 'PR-123463',
        requester: {
            name: 'Matthew Hall',
            department: 'IT'
        },
        description: 'New laptops for IT department',
        category: 'IT',
        totalAmount: 10000,
        requestDate: '2024-03-05',
        status: 'paid',
        approvers: 
        {
            name: 'Jane Doe',
            department: 'Finance',
            type: 'historical',
            currentValue: Math.random() * 1000,
            historicalValue: Math.random() * 1000
        },
        linkedJiraTicket: <a href="https://jira.acmesupplier.com/browse/JIRA-12352">JIRA-12352</a>,
        costCenter: 'Distribution Center',
        dateRange: 'Approved'
    },
    {
        id: 'REQ-2024-011',
        prNumber: 'PR-123464',
        requester: {
            name: 'Emily Chen',
            department: 'Marketing'
        },
        description: 'Monthly food supply',
        category: 'Food',
        totalAmount: 5000,
        requestDate: '2024-03-10',
        status: 'billed',
        approvers: 
        {
            name: 'Jane Doe',
            department: 'Finance',
            type: 'current',
            currentValue: Math.random() * 1000,
            historicalValue: Math.random() * 1000
        },
        linkedJiraTicket: <a href="https://jira.acmesupplier.com/browse/JIRA-12353">JIRA-12353</a>,
        costCenter: 'Warehouse A',
        dateRange: 'Modified'
    },
    {
        id: 'REQ-2024-012',
        prNumber: 'PR-123465',
        requester: {
            name: 'David Kim',
            department: 'Logistics'
        },
        description: 'New office furniture',
        category: 'Office',
        totalAmount: 2000,
        requestDate: '2024-03-15',
        status: 'approved',
        approvers: 
        {
            name: 'Jane Doe',
            department: 'Finance',
            type: 'historical',
            currentValue: Math.random() * 1000,
            historicalValue: Math.random() * 1000
        },
        linkedJiraTicket: <a href="https://jira.acmesupplier.com/browse/JIRA-12354">JIRA-12354</a>,
        costCenter: 'Distribution Center',
        dateRange: 'Approved'
    }
];

export const REQUISITION_STATUS_LIST=[
  {
    label:"Pending Approval",
    value:"pending_approval",
  },
  {
    label:"Approved",
    value:"approved",
  },
  {
    label:"Billed",
    value:"billed",
  },
  {
    label:"Paid",
    value:"paid",
  }
];