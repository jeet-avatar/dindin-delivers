export type UserRole = 'admin' | 'finance' | 'compliance' | 'support' | 'sales';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

export type DocumentStatus = 'valid' | 'expiring' | 'expired' | 'missing';

export interface Document {
  id: string;
  name: string;
  type: string;
  uploadDate: string;
  expiryDate: string;
  status: DocumentStatus;
  fileUrl: string;
}

export type TransactionType = 'invoice' | 'purchase_order' | 'shipment' | 'return' | 'payment';

export type TransactionStatus = 
  | 'draft' 
  | 'submitted' 
  | 'pending_approval' 
  | 'approved' 
  | 'rejected' 
  | 'paid'
  | 'shipped'
  | 'delivered'
  | 'returned'
  | 'billed'
  | 'Open'
  | 'Closed'
  | 'Fully Received'
  | 'Partially Received'
  | 'Pending Approval'
  | 'Paid'
  | 'Overdue'
  | 'On Hold'
  | 'Approved'
  | 'Rejected'
  | 'Cancelled'
  | 'Delivered'
  | 'Shipped';

export interface CoupaTransaction {
  "Coupa ID": number;
  "Number": string;
  "Type": string;
  "Supplier": string;
  "DEPARTMENT_NAME": string | null;
  "Amount": string;
  "Status": string;
  "Date": string;
  "Due Date": string | null;
  "HEADER_MEMO": string;
  "For_Employee": string;
  // netsuite fields
  "NetSuite ID"?: number;
  "Subsidiary"?: string;
  "Location"?: string;
  "Vendor"?: string;
}

export interface ActivityItem {
  id: string;
  type: 'document' | 'transaction' | 'profile' | 'system';
  action: string;
  date: string;
  user: string;
  description: string;
  status?: string;
  entityId?: string;
}

export interface KPI {
  id: string;
  title: string;
  value: string | number;
  change?: number;
  trend?: 'up' | 'down' | 'neutral';
  period?: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  date: string;
  read: boolean;
  type: 'info' | 'warning' | 'error' | 'success';
  actionUrl?: string;
}