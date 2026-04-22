export interface JobLead {
  id: number;
  title: string;
  companyName: string;
  companyLogo?: string;
  url: string;
  location: string;
  postedAt: string;
  stream: string;
  tags: string[];
  companyDomain?: string;
  companyEmail?: string;
  emailCandidates?: string[];
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'USER' | 'ADMIN';
  teamRole?: 'OWNER' | 'MEMBER';
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  title?: string;
  department?: string;
  companyId?: string;
  company?: Company;
  ownerId: string;
  owner: User;
  tags: Tag[];
  activities: Activity[];
  deals: Deal[];
  source?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Company {
  id: string;
  name: string;
  website?: string;
  industry?: string;
  size?: string;
  description?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  ownerId: string;
  owner: User;
  contacts: Contact[];
  deals: Deal[];
  tags: Tag[];
  activities: Activity[];
  createdAt: string;
  updatedAt: string;
}

export interface Deal {
  id: string;
  title: string;
  description?: string;
  value: number;
  stage: DealStage;
  probability: number;
  expectedCloseDate?: string;
  actualCloseDate?: string;
  contactId?: string;
  contact?: Contact;
  companyId?: string;
  company?: Company;
  ownerId: string;
  owner: User;
  activities: Activity[];
  tags: Tag[];
  createdAt: string;
  updatedAt: string;
}

export interface Activity {
  id: string;
  type: ActivityType;
  title: string;
  description?: string;
  dueDate?: string;
  completedAt?: string;
  status: ActivityStatus;
  priority: ActivityPriority;
  contactId?: string;
  contact?: Contact;
  companyId?: string;
  company?: Company;
  dealId?: string;
  deal?: Deal;
  ownerId: string;
  owner: User;
  createdAt: string;
  updatedAt: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface Campaign {
  id: string;
  name: string;
  description?: string;
  type: CampaignType;
  status: CampaignStatus;
  startDate?: string;
  endDate?: string;
  budget?: number;
  targetAudience?: string;
  ownerId: string;
  owner: User;
  emailTemplates: EmailTemplate[];
  activities: Activity[];
  createdAt: string;
  updatedAt: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  type: EmailTemplateType;
  isActive: boolean;
  campaignId?: string;
  campaign?: Campaign;
  ownerId: string;
  owner: User;
  createdAt: string;
  updatedAt: string;
}

// Enums
export type DealStage = 'LEAD' | 'QUALIFIED' | 'PROPOSAL' | 'NEGOTIATION' | 'CLOSED_WON' | 'CLOSED_LOST';

export type ActivityType = 'CALL' | 'EMAIL' | 'MEETING' | 'TASK' | 'NOTE' | 'FOLLOW_UP';

export type ActivityStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export type ActivityPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type CampaignType = 'EMAIL' | 'SOCIAL' | 'WEBINAR' | 'EVENT' | 'CONTENT' | 'PAID_ADS';

export type CampaignStatus = 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';

export type EmailTemplateType = 'WELCOME' | 'FOLLOW_UP' | 'PROMOTION' | 'NEWSLETTER' | 'ABANDONED_CART' | 'SURVEY';

// API Response types
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  message: string;
}