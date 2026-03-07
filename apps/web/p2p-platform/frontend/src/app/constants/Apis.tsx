

const Apis = {
  login: "/me", // Using /api/me for now
  me: "/me",
  notifications: "/activity",

  dashboard: {
    stats: "/dashboard/stats",
    recentActivity: "/dashboard/recent-activity",
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


}

export default Apis;