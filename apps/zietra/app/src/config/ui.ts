/**
 * UI Configuration
 *
 * This file contains UI component configurations, text labels, and layout settings.
 * Modify these values to customize the application without touching component code.
 */

/**
 * Application Branding
 */
export const branding = {
  appName: 'Zietra CRM',
  companyName: 'Zietra',
  tagline: 'Elevate Your Brand, Amplify Your Growth',
  version: '1.0.0',
};

/**
 * Sidebar Navigation
 * Customize the navigation menu items
 */
export const navigation = {
  items: [
    { name: 'Dashboard', path: '/', icon: 'HomeIcon' },
    { name: 'Contacts', path: '/contacts', icon: 'UserGroupIcon' },
    { name: 'Companies', path: '/companies', icon: 'BuildingOfficeIcon' },
    { name: 'Deals', path: '/deals', icon: 'CurrencyDollarIcon' },
    { name: 'Activities', path: '/activities', icon: 'ClockIcon' },
    { name: 'Campaigns', path: '/campaigns', icon: 'MegaphoneIcon' },
    { name: 'Analytics', path: '/analytics', icon: 'ChartBarIcon' },
    { name: 'Tags', path: '/tags', icon: 'TagIcon' },
    { name: 'Settings', path: '/settings', icon: 'CogIcon' },
  ],
};

/**
 * Button Styles
 * Reusable button class configurations
 *
 * CSS Classes Available (defined in index.css):
 * - btn-primary: Orange-rose gradient button with black text and black border
 * - btn-secondary: White button with gray border and text
 * - btn-ghost: Transparent button
 * - btn-sm: Small button size modifier
 *
 * Gradient Button Classes (for custom use):
 */
export const buttonStyles = {
  // Simple CSS class-based buttons (recommended)
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  primarySmall: 'btn-primary btn-sm',
  secondarySmall: 'btn-secondary btn-sm',

  // Gradient buttons (for special cases)
  gradient: {
    primary: 'px-4 py-2.5 bg-gradient-to-r from-orange-400 to-rose-500 text-white font-bold rounded-xl hover:from-orange-500 hover:to-rose-600 active:scale-95 transition-all shadow-lg tracking-wide',
    success: 'px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white border-2 border-green-500 rounded-xl font-semibold hover:from-green-700 hover:to-emerald-700 transition-all shadow-md active:scale-95',
    danger: 'px-6 py-3 bg-gradient-to-r from-red-600 to-orange-600 text-white border-2 border-red-500 rounded-xl font-semibold hover:from-red-700 hover:to-orange-700 transition-all shadow-md active:scale-95',
    apollo: 'px-6 py-3 bg-gradient-to-r from-orange-600 to-rose-600 text-white border-2 border-orange-500 rounded-xl font-semibold hover:from-orange-700 hover:to-rose-700 transition-all shadow-md active:scale-95',
    socialFlow: 'px-5 py-2.5 bg-sky-300 hover:bg-sky-400 text-white text-sm font-semibold rounded-lg transition-all shadow-md hover:shadow-lg active:scale-95 flex items-center gap-2',
  },
};

/**
 * Card/Container Styles
 */
export const cardStyles = {
  default: 'border-2 border-gray-200 rounded-2xl bg-white shadow-sm overflow-hidden',
  header: 'p-8 border-b-2 border-gray-200 bg-gradient-to-r from-gray-50 to-white',
  body: 'p-6',
};

/**
 * Table Configuration
 */
export const tableConfig = {
  pagination: {
    defaultPageSize: 10,
    pageSizeOptions: [10, 25, 50, 100],
  },

  styles: {
    header: 'px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider',
    cell: 'px-6 py-4 whitespace-nowrap text-sm text-gray-900',
    row: 'hover:bg-gray-50 cursor-pointer',
  },
};

/**
 * Form Configuration
 */
export const formConfig = {
  inputClasses: 'w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 transition-all',

  labelClasses: 'block text-sm font-semibold text-gray-700 mb-2',

  errorClasses: 'text-red-600 text-sm mt-1',

  requiredIndicator: '*',
};

/**
 * Modal Configuration
 */
export const modalConfig = {
  overlay: 'fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4',

  container: 'bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col',

  sizes: {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
  },
};

/**
 * CSV Import Configuration
 */
export const csvImportConfig = {
  maxFiles: 10,
  maxFileSize: 10 * 1024 * 1024, // 10MB in bytes
  acceptedFormats: ['.csv', 'text/csv'],

  modal: {
    title: 'AI CSV Import',
    subtitle: 'Intelligently import contacts from CSV files with automatic field mapping',
    stepLabels: ['Select Files', 'Importing', 'Complete'],
  },
};

/**
 * Duplicate Detection Configuration
 */
export const duplicateDetectionConfig = {
  modal: {
    title: 'Remove Duplicates',
    subtitle: 'Find and remove duplicate contacts from your database',
    stepLabels: ['Detecting', 'Review', 'Removing', 'Complete'],
  },

  detectionCriteria: [
    { type: 'email', label: 'Email Address', priority: 1 },
    { type: 'phone', label: 'Phone Number', priority: 2 },
    { type: 'name_company', label: 'Name + Company', priority: 3 },
  ],
};

/**
 * Dashboard Widgets Configuration
 */
export const dashboardConfig = {
  widgets: {
    stats: {
      enabled: true,
      order: 1,
    },
    recentActivities: {
      enabled: true,
      order: 2,
      limit: 10,
    },
    upcomingTasks: {
      enabled: true,
      order: 3,
      limit: 5,
    },
    dealPipeline: {
      enabled: true,
      order: 4,
    },
  },
};

/**
 * Contact List Configuration
 */
export const contactListConfig = {
  columns: [
    { key: 'name', label: 'Contact', sortable: true },
    { key: 'role', label: 'Role', sortable: true },
    { key: 'company', label: 'Company', sortable: true },
    { key: 'status', label: 'Status', sortable: true },
    { key: 'phone', label: 'Phone', sortable: false },
    { key: 'actions', label: 'Actions', sortable: false },
  ],

  statusOptions: [
    'LEAD',
    'PROSPECT',
    'CUSTOMER',
    'COLD',
    'WARM',
    'HOT',
    'CLOSED_WON',
    'CLOSED_LOST',
  ],

  defaultStatus: 'LEAD',
};

/**
 * Company List Configuration
 */
export const companyListConfig = {
  columns: [
    { key: 'name', label: 'Company', sortable: true },
    { key: 'industry', label: 'Industry', sortable: true },
    { key: 'location', label: 'Headquarters', sortable: true },
    { key: 'size', label: 'Employees', sortable: true },
    { key: 'contacts', label: 'Contacts', sortable: true },
    { key: 'dataSource', label: 'Data Source', sortable: true },
    { key: 'actions', label: 'Actions', sortable: false },
  ],
};

/**
 * Notification Messages
 */
export const messages = {
  success: {
    contactCreated: 'Contact created successfully',
    contactUpdated: 'Contact updated successfully',
    contactDeleted: 'Contact deleted successfully',
    csvImported: 'CSV imported successfully',
    duplicatesRemoved: 'Duplicates removed successfully',
  },

  error: {
    generic: 'Something went wrong. Please try again.',
    networkError: 'Network error. Please check your connection.',
    unauthorized: 'You are not authorized to perform this action.',
    notFound: 'Resource not found.',
  },

  confirmation: {
    deleteContact: 'Are you sure you want to delete this contact?',
    deleteCompany: 'Are you sure you want to delete this company?',
    removeDuplicates: 'Are you sure you want to remove the selected duplicates?',
  },
};

export default {
  branding,
  navigation,
  buttonStyles,
  cardStyles,
  tableConfig,
  formConfig,
  modalConfig,
  csvImportConfig,
  duplicateDetectionConfig,
  dashboardConfig,
  contactListConfig,
  companyListConfig,
  messages,
};
