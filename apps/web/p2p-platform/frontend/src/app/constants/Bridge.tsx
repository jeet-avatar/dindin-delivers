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
      consolidatedView: {
        getCount: (days_back: number) =>
          api.get(`${URLs.dashboard.consolidatedView.getCount}?days_back=${days_back}`).then((response) => {
            return response.data;
          }),
        getFinancialMatricsData: () =>
          api
            .get(URLs.dashboard.consolidatedView.getFinancialMatricsData)
            .then((response) => {
              return response.data;
            }),
        getRecentActivityData: () =>
          api
            .get(URLs.dashboard.consolidatedView.getRecentActivityData)
            .then((response) => {
              return response.data;
            }),
      },

      cupa: {
        getCount: () =>
          api.get(URLs.dashboard.cupa.getCount).then((response) => {
            return response.data;
          }),
        getChartData: () =>
          api.get(URLs.dashboard.cupa.getChartData).then((response) => {
            return response.data;
          }),
      },

      netSuite: {
        getCount: () =>
          api.get(URLs.dashboard.netSuite.getCount).then((response) => {
            return response.data;
          }),
        getChartData: () =>
          api.get(URLs.dashboard.netSuite.getChartData).then((response) => {
            return response.data;
          }),
      },

      zip: {
        getCount: () =>
          api.get(URLs.dashboard.zip.getCount).then((response) => {
            return response.data;
          }),
        getChartData: () =>
          api.get(URLs.dashboard.zip.getChartData).then((response) => {
            return response.data;
          }),
      },

      jira: {
        getCount: () =>
          api.get(URLs.dashboard.jira.getCount).then((response) => {
            return response.data;
          }),
        getChartData: () =>
          api.get(URLs.dashboard.jira.getChartData).then((response) => {
            return response.data;
          }),
      },

      processUtility: {
        getCount: () =>
          api.get(URLs.dashboard.processUtility.getCount).then((response) => {
            return response.data;
          }),
        getChartData: () =>
          api.get(URLs.dashboard.processUtility.getChartData).then((response) => {
            return response.data;
          }),
      },

      netSuiteWolt: {
        getCount: () =>
          api.get(URLs.dashboard.netSuiteWolt.getCount).then((response) => {
            return response.data;
          }),
        getChartData: () =>
          api.get(URLs.dashboard.netSuiteWolt.getChartData).then((response) => {
            return response.data;
          }),
      },
  },

    systemDashboard: {
      getData: () =>
        api.get(URLs.systemDashboard.getData).then((response) => {
          return response.data;
        }),
      getProcessUnityData: () =>
        api.get(URLs.systemDashboard.getProcessUnityData).then((response) => {
          return response.data;
        }),
      getNetsuiteWoltData: () =>
        api.get(URLs.systemDashboard.getNetsuiteWoltData).then((response) => {
          return response.data;
        }),
      getCoupaData: () =>
        api.get(URLs.systemDashboard.getCoupaData).then((response) => {
          return response.data;
        }),
      getNetsuiteData: () =>
        api.get(URLs.systemDashboard.getNetsuiteData).then((response) => {
          return response.data;
        }),
      getZipData: () =>
        api.get(URLs.systemDashboard.getZipData).then((response) => {
          return response.data;
        }),
      getJiraData: () =>
        api.get(URLs.systemDashboard.getJiraData).then((response) => {
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

    netSuiteDashboard: {      
      getCounts: (days_back: number) =>
        api.get(`${URLs.netSuiteDashboard.getCounts}?days_back=${days_back}`).then((response) => {
          return response.data;
        }),
      getChartData: (days_back: number) =>
        api.get(`${URLs.netSuiteDashboard.getChartData}?days_back=${days_back}`).then((response) => {
          return response.data;
        }),
      getMetrics: (days_back: number) =>
        api.get(`${URLs.netSuiteDashboard.getMetrics}?days_back=${days_back}`).then((response) => {
          return response.data;
        }),
      getMonthlyTrends: (days_back: number) =>
        api.get(`${URLs.netSuiteDashboard.getMonthlyTrends}?days_back=${days_back}`).then((response) => {
          return response.data;
        }),
      getStatusDistribution: (days_back: number) =>
        api.get(`${URLs.netSuiteDashboard.getStatusDistribution}?days_back=${days_back}`).then((response) => {
          return response.data;
        }),
      getSpendByDepartment: (days_back: number) =>
        api.get(`${URLs.netSuiteDashboard.getSpendByDepartment}?days_back=${days_back}`).then((response) => {
          return response.data;
        }),
      getTypeDistribution: (days_back: number) =>
        api.get(`${URLs.netSuiteDashboard.getTypeDistribution}?days_back=${days_back}`).then((response) => {
          return response.data;
        }),
    },

    jiraDashboard: {
      getData: () =>
        api.get(URLs.jiraDashboard.getData).then((response) => {
          return response.data;
        }),
      getJiraMetrics: () =>
        api.get(URLs.jiraDashboard.getJiraMetrics).then((response) => {
          return response.data;
        }),
      getTicketTrendData: () =>
        api.get(URLs.jiraDashboard.getTicketTrendData).then((response) => {
          return response.data;
        }),
      getPriorityDistributionData: () =>
        api.get(URLs.jiraDashboard.getPriorityDistributionData).then((response) => {
          return response.data;
        }),
      getResolutionTimeData: () =>
        api.get(URLs.jiraDashboard.getResolutionTimeData).then((response) => {
          return response.data;
        }),
      getTeamPerformanceData: () =>
        api.get(URLs.jiraDashboard.getTeamPerformanceData).then((response) => {
          return response.data;
        }),
      getRecentTickets: () =>
        api.get(URLs.jiraDashboard.getRecentTickets).then((response) => {
          return response.data;
        }),
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

    transactions:{
      getCounts: (days_back: number) =>
        api.get(`${URLs.transactions.getCounts}?days_back=${days_back}`).then((response) => {
          return response.data;
        }),
      getCoupaTransactions: (days_back: number, limit: number, offset: number) =>
        api.get(`${URLs.transactions.getCoupaTransactions}?days_back=${days_back}&limit=${limit}&offset=${offset}`).then((response) => {
          return response.data;
        }),
      getNetsuiteTransactions: (days_back: number, limit: number, offset: number) =>
        api.get(`${URLs.transactions.getNetsuiteTransactions}?days_back=${days_back}&limit=${limit}&offset=${offset}`).then((response) => {
          return response.data;
        }),
      getNetsuiteFilters: (days_back: number) =>
        api.get(`${URLs.transactions.getNetsuiteFilters}?days_back=${days_back}`).then((response) => {
          return response.data;
        }),
    }
}