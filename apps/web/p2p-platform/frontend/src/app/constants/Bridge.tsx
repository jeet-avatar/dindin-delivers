import URLs from "./Apis";
import api from "../api/api";

const config = {
  headers: {
    "Content-Type": "application/json",
  },
};

export default {
    login: () =>
      api.post(URLs.login).then((response) => {
        return response.data;
      }),
    me: () =>
      api.get(URLs.me).then((response) => {
        return response.data;
      }),
    notifications: () =>
      api.get(URLs.notifications).then((response) => {
        return response.data;
      }),
    dashboard: {
      getStats: () =>
        api.get(URLs.dashboard.stats).then((response) => {
          return response.data;
        }),
      getRecentActivity: () =>
        api.get(URLs.dashboard.recentActivity).then((response) => {
          return response.data;
        }),
    },

    coupaDashboard: {
      getCount: (days_back: number) => {
        console.log('Bridge.tsx - coupaDashboard.getCount - days_back:', days_back);
        return api.get(`${URLs.coupaDashboard.getCount}?days_back=${days_back}`).then((response) => {
          return response.data;
        });
      },
      budgetOverview: {
        getChartData: (days_back: number) => {
          console.log('Bridge.tsx - coupaDashboard.budgetOverview.getChartData - days_back:', days_back);
          return api.get(`${URLs.coupaDashboard.budgetOverview.getChartData}?days_back=${days_back}`).then((response) => {
            return response.data;
          });
        },
      },
      costCenterDistribution: {
        getChartData: (days_back: number) => {
          console.log('Bridge.tsx - coupaDashboard.costCenterDistribution.getChartData - days_back:', days_back);
          return api.get(`${URLs.coupaDashboard.costCenterDistribution.getChartData}?days_back=${days_back}`).then((response) => {
            return response.data;
          });
        },
      },
      statusDistribution: {
        getChartData: (days_back: number) => {
          console.log('Bridge.tsx - coupaDashboard.statusDistribution.getChartData - days_back:', days_back);
          return api.get(`${URLs.coupaDashboard.statusDistribution.getChartData}?days_back=${days_back}`).then((response) => {
            return response.data;
          });
        },
      },
      spendByDepartment: {
        getChartData: (days_back: number) => {
          console.log('Bridge.tsx - coupaDashboard.spendByDepartment.getChartData - days_back:', days_back);
          return api.get(`${URLs.coupaDashboard.spendByDepartment.getChartData}?days_back=${days_back}`).then((response) => {
            return response.data;
          });
        },
      },
      commodityDistribution: {
        getChartData: (days_back: number) => {
          console.log('Bridge.tsx - coupaDashboard.commodityDistribution.getChartData - days_back:', days_back);
          return api.get(`${URLs.coupaDashboard.commodityDistribution.getChartData}?days_back=${days_back}`).then((response) => {
            return response.data;
          });
        },
      },
      filters: {
        getSuppliers: () => {
          return api.get(URLs.coupaDashboard.filters.suppliers).then((response) => {
            return response.data;
          });
        },
        getCostCenters: () => {
          return api.get(URLs.coupaDashboard.filters.costCenters).then((response) => {
            return response.data;
          });
        },
        getDepartments: () => {
          return api.get(URLs.coupaDashboard.filters.departments).then((response) => {
            return response.data;
          });
        },
        getStatuses: () => {
          return api.get(URLs.coupaDashboard.filters.statuses).then((response) => {
            return response.data;
          });
        },
      },
    },


    zipDashboard: {
      getData: () =>
        api.get(URLs.zipDashboard.getData).then((response) => {
          return response.data;
        }),
      getZipMetrics: () =>
        api.get(URLs.zipDashboard.getZipMetrics).then((response) => {
          return response.data;
        }),
      getOnboardingTrendData: () =>
        api.get(URLs.zipDashboard.getOnboardingTrendData).then((response) => {
          return response.data;
        }),
      getVendorStatusData: () =>
        api.get(URLs.zipDashboard.getVendorStatusData).then((response) => {
          return response.data;
        }),
      getOnboardingStageData: () =>
        api.get(URLs.zipDashboard.getOnboardingStageData).then((response) => {
          return response.data;
        }),
      getOnboardingTimeData: () =>
        api.get(URLs.zipDashboard.getOnboardingTimeData).then((response) => {
          return response.data;
        }),
      getRecentActivities: () =>
        api.get(URLs.zipDashboard.getRecentActivities).then((response) => {
          return response.data;
        }),
    },

}