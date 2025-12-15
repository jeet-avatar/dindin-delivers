import { 
  User, 
  Document, 
  Transaction, 
  ActivityItem, 
  KPI, 
  Notification
} from './types';
import { addDays, subDays, format } from 'date-fns';

// Add missing import for addDays function
import { addDays as addDaysImport } from 'date-fns';

// Use the imported function
const addDays = addDaysImport;

// Current user
export const currentUser: User = {
  id: 'user-1',
  name: 'Jithesh M',
  email: 'jithesh.m@acmesupplier.com',
  role: 'admin',
  avatar: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=300'
};

// Sample documents
export const documents: Document[] = [
  {
    id: 'doc-1',
    name: 'W-9 Tax Form',
    type: 'tax',
    uploadDate: format(subDays(new Date(), 120), 'yyyy-MM-dd'),
    expiryDate: format(addDays(new Date(), 245), 'yyyy-MM-dd'),
    status: 'valid',
    fileUrl: '#'
  },
  {
    id: 'doc-2',
    name: 'Liability Insurance',
    type: 'compliance',
    uploadDate: format(subDays(new Date(), 45), 'yyyy-MM-dd'),
    expiryDate: format(addDays(new Date(), 15), 'yyyy-MM-dd'),
    status: 'expiring',
    fileUrl: '#'
  },
  {
    id: 'doc-3',
    name: 'Security Certificate',
    type: 'security',
    uploadDate: format(subDays(new Date(), 320), 'yyyy-MM-dd'),
    expiryDate: format(subDays(new Date(), 5), 'yyyy-MM-dd'),
    status: 'expired',
    fileUrl: '#'
  },
  {
    id: 'doc-4',
    name: 'Supplier Agreement',
    type: 'legal',
    uploadDate: format(subDays(new Date(), 190), 'yyyy-MM-dd'),
    expiryDate: format(addDays(new Date(), 175), 'yyyy-MM-dd'),
    status: 'valid',
    fileUrl: '#'
  }
];

// Sample transactions
export const transactions: Transaction[] = [
  {
    id: 'trx-1',
    type: 'invoice',
    number: 'INV-2023-0042',
    date: format(subDays(new Date(), 5), 'yyyy-MM-dd'),
    dueDate: format(addDays(new Date(), 25), 'yyyy-MM-dd'),
    amount: 12450.75,
    status: 'pending_approval',
    description: 'Monthly food supply - April'
  },
  {
    id: 'trx-2',
    type: 'purchase_order',
    number: 'PO-2023-0089',
    date: format(subDays(new Date(), 12), 'yyyy-MM-dd'),
    amount: 8750.00,
    status: 'approved',
    description: 'Packaging materials - Q2'
  },
  {
    id: 'trx-3',
    type: 'payment',
    number: 'PMT-2023-0036',
    date: format(subDays(new Date(), 20), 'yyyy-MM-dd'),
    amount: 9875.50,
    status: 'paid',
    description: 'Payment for INV-2023-0039',
    relatedTo: 'INV-2023-0039'
  },
  {
    id: 'trx-4',
    type: 'invoice',
    number: 'INV-2023-0041',
    date: format(subDays(new Date(), 8), 'yyyy-MM-dd'),
    dueDate: format(addDays(new Date(), 22), 'yyyy-MM-dd'),
    amount: 5680.25,
    status: 'submitted',
    description: 'Equipment maintenance - March'
  },
  {
    id: 'trx-5',
    type: 'shipment',
    number: 'SHP-2023-0056',
    date: format(subDays(new Date(), 3), 'yyyy-MM-dd'),
    amount: 0, // No amount for shipment
    status: 'shipped',
    description: 'Delivery for PO-2023-0085',
    relatedTo: 'PO-2023-0085'
  }
];

// Sample activity feed
export const activityItems: ActivityItem[] = [
  {
    id: 'act-1',
    type: 'transaction',
    action: 'created',
    date: format(subDays(new Date(), 1), 'yyyy-MM-dd HH:mm'),
    user: 'Jithesh M',
    description: 'Created invoice INV-2023-0042',
    status: 'pending_approval',
    entityId: 'trx-1'
  },
  {
    id: 'act-2',
    type: 'document',
    action: 'uploaded',
    date: format(subDays(new Date(), 2), 'yyyy-MM-dd HH:mm'),
    user: 'Sarah Miller',
    description: 'Uploaded new Security Policy',
    entityId: 'doc-3'
  },
  {
    id: 'act-3',
    type: 'transaction',
    action: 'approved',
    date: format(subDays(new Date(), 3), 'yyyy-MM-dd HH:mm'),
    user: 'Michael Chen',
    description: 'Approved purchase order PO-2023-0089',
    status: 'approved',
    entityId: 'trx-2'
  },
  {
    id: 'act-4',
    type: 'profile',
    action: 'updated',
    date: format(subDays(new Date(), 5), 'yyyy-MM-dd HH:mm'),
    user: 'Jithesh M',
    description: 'Updated company address information'
  },
  {
    id: 'act-5',
    type: 'transaction',
    action: 'received',
    date: format(subDays(new Date(), 7), 'yyyy-MM-dd HH:mm'),
    user: 'System',
    description: 'Payment received for invoice INV-2023-0039',
    status: 'paid',
    entityId: 'trx-3'
  }
];

// Sample KPIs
export const kpis: KPI[] = [
  {
    id: 'kpi-1',
    title: 'Invoices Pending',
    value: 3,
    change: 1,
    trend: 'up',
    period: 'vs last month'
  },
  {
    id: 'kpi-2',
    title: 'POs Received',
    value: 12,
    change: 4,
    trend: 'up',
    period: 'vs last month'
  },
  {
    id: 'kpi-3',
    title: 'Payments Received',
    value: '$45,820',
    change: 12.5,
    trend: 'up',
    period: 'vs last month'
  },
  {
    id: 'kpi-4',
    title: 'Documents Expiring',
    value: 2,
    trend: 'neutral',
    period: 'next 30 days'
  }
];

// Sample notifications
export const notifications: Notification[] = [
  {
    id: 'notif-1',
    title: 'Document Expiring Soon',
    message: 'Your Liability Insurance will expire in 15 days. Please renew it.',
    date: format(subDays(new Date(), 2), 'yyyy-MM-dd HH:mm'),
    read: false,
    type: 'warning',
    actionUrl: '/profile/documents'
  },
  {
    id: 'notif-2',
    title: 'New PO Received',
    message: 'You have received a new purchase order PO-2023-0091.',
    date: format(subDays(new Date(), 1), 'yyyy-MM-dd HH:mm'),
    read: false,
    type: 'info',
    actionUrl: '/transactions?filter=purchase_orders'
  },
  {
    id: 'notif-3',
    title: 'Invoice Approved',
    message: 'Your invoice INV-2023-0040 has been approved.',
    date: format(subDays(new Date(), 3), 'yyyy-MM-dd HH:mm'),
    read: true,
    type: 'success',
    actionUrl: '/transactions?filter=invoices'
  },
  {
    id: 'notif-4',
    title: 'Payment Processed',
    message: 'A payment of $9,875.50 for invoice INV-2023-0039 has been processed.',
    date: format(subDays(new Date(), 4), 'yyyy-MM-dd HH:mm'),
    read: true,
    type: 'success',
    actionUrl: '/transactions?filter=payments'
  }
];