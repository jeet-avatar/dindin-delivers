export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginationResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface FilterParams {
  search?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  [key: string]: any;
}

export interface ContactCreateInput {
  email?: string;
  firstName: string;
  lastName: string;
  phone?: string;
  title?: string;
  status?: string;
  source?: string;
  companyId?: string;
  customFields?: Record<string, any>;
  tags?: string[];
}

export interface CompanyCreateInput {
  name: string;
  domain?: string;
  industry?: string;
  size?: string;
  location?: string;
  website?: string;
  description?: string;
}

export interface DealCreateInput {
  title: string;
  value: number;
  stage?: string;
  probability?: number;
  expectedCloseDate?: string;
  contactId?: string;
  companyId?: string;
  description?: string;
  customFields?: Record<string, any>;
}

export interface CampaignCreateInput {
  name: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  templateId?: string;
  scheduledAt?: string;
  recipientListId?: string;
}

export interface AutomationCreateInput {
  name: string;
  description?: string;
  triggerType: string;
  triggerConfig: Record<string, any>;
  actions: Array<{
    type: string;
    config: Record<string, any>;
  }>;
}

export interface DashboardStats {
  contacts: {
    total: number;
    thisMonth: number;
    growth: number;
  };
  deals: {
    total: number;
    totalValue: number;
    thisMonth: number;
    averageValue: number;
  };
  campaigns: {
    total: number;
    active: number;
    thisMonth: number;
  };
  activities: {
    total: number;
    thisWeek: number;
    pending: number;
  };
}