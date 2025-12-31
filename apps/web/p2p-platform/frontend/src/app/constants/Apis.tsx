

const Apis = {
  login: "/me", // Using /api/me for now
  me: "/me",
  notifications: "/activity",

  dashboard: {
    consolidatedView:{
      getCount: "/dashboard/consolidated",
      getFinancialMatricsData: "/dashboard/consolidated",
      getRecentActivityData: "/dashboard/consolidated"
    },
    cupa: {
      getCount: "/dashboard/cupa-tab",
      getChartData: "/dashboard/cupa-tab"
    },
    netSuite: {
      getCount: "/dashboard/netsuite-tab",
      getChartData: "/dashboard/netsuite-tab"
    },

    zip: {
      getCount: "/dashboard/zip-tab",
      getChartData: "/dashboard/zip"
    },

    jira: {
      getCount: "/dashboard/jira-tab",
      getChartData: "/dashboard/jira-tab",
    },

    processUtility: {
      getCount: "/dashboard/process-unity-tab",
      getChartData: "/dashboard/process-unity-tab",
    },

    netSuiteWolt: {
      getCount: "/dashboard/netsuite-wolt-tab",
      getChartData: "/dashboard/netsuite-wolt-tab"
    },
    
  },

  systemDashboard:{
      getData: "/dashboard/systemDashboard/get_data",
      getProcessUnityData: "/system-dashboard/process-unity",
      getNetsuiteWoltData: "/system-dashboard/netsuite-wolt",
      getCoupaData: "/system-dashboard/coupa",
      getNetsuiteData: "/system-dashboard/netsuite",
      getZipData: "/system-dashboard/zip",
      getJiraData: "/system-dashboard/jira",
  },

  coupaDashboard: {
    getCount : "/dashboard/coupa",
    budgetOverview : {
      getChartData: "/dashboard/coupa/budget-overview"
    },
    costCenterDistribution : {
      getChartData: "/dashboard/coupa/cost-center-distribution"
    },
    statusDistribution: {
      getChartData: "/dashboard/coupa/status-distribution"
    },
    spendByDepartment: {
      getChartData: "/dashboard/coupa/spend-by-department"
    },
    commodityDistribution: {
      getChartData: "/dashboard/coupa/commodity-distribution"
    },
    filters: {
      suppliers: "/dashboard/coupa/filters/suppliers",
      costCenters: "/dashboard/coupa/filters/cost-centers",
      departments: "/dashboard/coupa/filters/departments",
      statuses: "/dashboard/coupa/filters/statuses"
    }
  },

  netSuiteDashboard:{
    getCounts: "/dashboard/netsuite/metrics",
    getChartData: "/dashboard/netsuite/monthly-trends",
    getMetrics: "/dashboard/netsuite/metrics",
    getMonthlyTrends: "/dashboard/netsuite/monthly-trends",
    getStatusDistribution: "/dashboard/netsuite/status-distribution",
    getSpendByDepartment: "/dashboard/netsuite/spend-by-department",
    getTypeDistribution: "/dashboard/netsuite/type-distribution"
  },

  jiraDashboard: {
    getData: "/dashboard/jira/get",
    getJiraMetrics: "/dashboard/jira",
    getTicketTrendData: "/dashboard/jira",
    getPriorityDistributionData: "/dashboard/jira",
    getResolutionTimeData: "/dashboard/jira",
    getTeamPerformanceData: "/dashboard/jira",
    getRecentTickets: "/dashboard/jira",
  },

  zipDashboard: {
    getData: "/dashboard/zip",
    getZipMetrics: "/dashboard/zip",
    getOnboardingTrendData: "/dashboard/zip",
    getVendorStatusData: "/dashboard/zip",
    getOnboardingStageData: "/dashboard/zip",
    getOnboardingTimeData: "/dashboard/zip",
    getRecentActivities: "/dashboard/zip",
  },

  venderManagement: {
    getCounts: "/vendors/analytics",
    getVendorList: "/vendors",
    aiGeneratedInsights: "/vendors/analytics"
  },

  transactions:{
    getCounts: "/transactions/counts",
    getCoupaTransactions: "/transactions/coupa",
    getNetsuiteTransactions: "/transactions/netsuite",
    getNetsuiteFilters: "/transactions/netsuite/filters",
  },

}

export default Apis;