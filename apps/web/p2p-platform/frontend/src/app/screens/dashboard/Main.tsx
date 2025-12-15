import React, { useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement,
  ArcElement
} from 'chart.js';

import { systemTabs,dateRangeOptions } from '../../constants/consts';
// inner components
import ConsolidatedView from './tabs/ConsolidatedView';
import Cupa from './tabs/Cupa';
import NetSuite from './tabs/Netsuite';
import Zip from './tabs/Zip';
import Jira from './tabs/Jira';
import ProcessUtility from './tabs/ProcessUtility';
import NetSuiteWolt from './tabs/NetSuiteWolt';
import { Select } from 'antd';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const { Option } = Select;
const Main: React.FC = () => {
  const [dateRange, setDateRange] = useState('2years');
  const [activeTab, setActiveTab] = useState('consolidated');


  const renderConsolidatedView = () => (
    <ConsolidatedView setActiveTab={setActiveTab} dateRange={dateRange} />
  );

  const renderCoupaView = () => (
    <Cupa dateRange={dateRange} />
  );

  const renderNetSuiteView = () => (
    <NetSuite dateRange={dateRange} />
  );

  const renderZIPView = () => (
    <Zip />
  );

  const renderJIRAView = () => (
    <Jira />
  );

  const renderProcessUnityView = () => (
    <ProcessUtility />
  );

  const renderNetSuiteWoltView = () => (
    <NetSuiteWolt />
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'consolidated':
        return renderConsolidatedView();
      case 'coupa':
        return renderCoupaView();
      case 'netsuite':
        return renderNetSuiteView();
      case 'zip':
        return renderZIPView();
      case 'jira':
        return renderJIRAView();
      case 'process-unity':
        return renderProcessUnityView();
      case 'netsuite-wolt':
        return renderNetSuiteWoltView();
      default:
        return renderConsolidatedView();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Consolidated Dashboard</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Unified view across all integrated systems
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <Select
              className="rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              value={dateRange}
              onChange={(value) => setDateRange(value)}
            >
              {dateRangeOptions.map((option: any) => (
                <Option key={option.value} value={option.value}>
                  {option.label}
                </Option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      {/* System Tabs */}
      <div className="bg-white rounded-lg shadow-card overflow-hidden">
        <div className="border-b border-neutral-200">
          <nav className="flex space-x-4 px-6 overflow-x-auto">
            {systemTabs.map((tab: any) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
                }`}
              >
                {tab.icon}
                <span>{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>
        
        <div className="p-6">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};

export default Main;