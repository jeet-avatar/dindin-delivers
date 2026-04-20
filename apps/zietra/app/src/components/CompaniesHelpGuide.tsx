import { useState } from 'react';
import {

  BuildingOfficeIcon,
  PlusIcon,
  ArrowUpTrayIcon,
  MagnifyingGlassIcon,
  SparklesIcon,
  TagIcon,
  UsersIcon,
  ChartBarIcon,
  LightBulbIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

interface HelpGuideProps {
  onClose: () => void;
}

export function CompaniesHelpGuide({ onClose }: HelpGuideProps) {
  const [activeTab, setActiveTab] = useState<'quickstart' | 'features' | 'tips'>('quickstart');

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#161625] border-4 border-black rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 via-orange-600 to-rose-500 p-8 relative rounded-t-3xl">
          <div className="flex items-center gap-3 mb-3">
            <BuildingOfficeIcon className="w-12 h-12 text-white" />
            <h2 className="text-4xl font-bold text-white">
              Companies Guide
            </h2>
          </div>
          <p className="text-lg text-white/90 mb-6">
            Manage your B2B accounts and discover new opportunities
          </p>

          {/* Tab Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => setActiveTab('quickstart')}
              className={activeTab === 'quickstart'
                ? "bg-[#161625] text-white font-bold px-6 py-3 rounded-xl shadow-lg"
                : "bg-[#161625]/40 text-white/70 hover:bg-[#161625]/60 px-6 py-3 rounded-xl transition-all"
              }
            >
              Quick Start
            </button>
            <button
              onClick={() => setActiveTab('features')}
              className={activeTab === 'features'
                ? "bg-[#161625] text-white font-bold px-6 py-3 rounded-xl shadow-lg"
                : "bg-[#161625]/40 text-white/70 hover:bg-[#161625]/60 px-6 py-3 rounded-xl transition-all"
              }
            >
              Features
            </button>
            <button
              onClick={() => setActiveTab('tips')}
              className={activeTab === 'tips'
                ? "bg-[#161625] text-white font-bold px-6 py-3 rounded-xl shadow-lg"
                : "bg-[#161625]/40 text-white/70 hover:bg-[#161625]/60 px-6 py-3 rounded-xl transition-all"
              }
            >
              Pro Tips
            </button>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6">

          {activeTab === 'quickstart' && (
            <>
              <p className="text-lg text-white mb-6">
                Master company management to track accounts, find leads, and grow your B2B pipeline.
              </p>

              {/* Step 1 */}
              <div className="bg-gradient-to-br from-orange-100 via-rose-50 to-orange-50 border-3 border-black rounded-3xl shadow-xl p-6 hover:shadow-2xl transition-all">
                <div className="flex items-start gap-4">
                  <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full w-12 h-12 flex items-center justify-center flex-shrink-0">
                    <span className="text-2xl font-bold text-white">1</span>
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <PlusIcon className="w-6 h-6 text-indigo-400" />
                      <h3 className="text-2xl font-bold text-white">Add Your First Company</h3>
                    </div>
                    <p className="text-white/80 mb-4">
                      Click the "Add Company" button to manually add a new company to your CRM.
                    </p>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0">
                          <CheckCircleIcon className="w-3 h-3 text-white" />
                        </div>
                        <span className="text-white">Fill in company name (required)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0">
                          <CheckCircleIcon className="w-3 h-3 text-white" />
                        </div>
                        <span className="text-white">Add website URL for automatic enrichment</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0">
                          <CheckCircleIcon className="w-3 h-3 text-white" />
                        </div>
                        <span className="text-white">Enter industry, size, and location</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0">
                          <CheckCircleIcon className="w-3 h-3 text-white" />
                        </div>
                        <span className="text-white">Set status and assign to team member</span>
                      </div>
                    </div>

                    <button className="w-full mt-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold text-lg px-8 py-4 rounded-xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all">
                      Add Company
                    </button>
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="bg-gradient-to-br from-orange-100 via-rose-50 to-orange-50 border-3 border-black rounded-3xl shadow-xl p-6 hover:shadow-2xl transition-all">
                <div className="flex items-start gap-4">
                  <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full w-12 h-12 flex items-center justify-center flex-shrink-0">
                    <span className="text-2xl font-bold text-white">2</span>
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <ArrowUpTrayIcon className="w-6 h-6 text-indigo-400" />
                      <h3 className="text-2xl font-bold text-white">Import Companies in Bulk</h3>
                    </div>
                    <p className="text-white/80 mb-4">
                      Import multiple companies at once using a CSV file with automatic deduplication.
                    </p>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0">
                          <CheckCircleIcon className="w-3 h-3 text-white" />
                        </div>
                        <span className="text-white">Download CSV template</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0">
                          <CheckCircleIcon className="w-3 h-3 text-white" />
                        </div>
                        <span className="text-white">Fill in company data (name, website, industry)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0">
                          <CheckCircleIcon className="w-3 h-3 text-white" />
                        </div>
                        <span className="text-white">System auto-deduplicates by domain</span>
                      </div>
                    </div>

                    <button className="w-full mt-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold text-lg px-8 py-4 rounded-xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all">
                      Import Companies
                    </button>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="bg-gradient-to-br from-orange-100 via-rose-50 to-orange-50 border-3 border-black rounded-3xl shadow-xl p-6 hover:shadow-2xl transition-all">
                <div className="flex items-start gap-4">
                  <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full w-12 h-12 flex items-center justify-center flex-shrink-0">
                    <span className="text-2xl font-bold text-white">3</span>
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <SparklesIcon className="w-6 h-6 text-indigo-400" />
                      <h3 className="text-2xl font-bold text-white">Discover Company Leads</h3>
                    </div>
                    <p className="text-white/80 mb-4">
                      Find and add new companies automatically using our AI-powered lead discovery tool.
                    </p>

                    <button className="w-full mt-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold text-lg px-8 py-4 rounded-xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all">
                      Discover Leads
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'features' && (
            <>
              <p className="text-lg text-white mb-6">
                Powerful features to manage and grow your company database.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-orange-100 via-rose-50 to-orange-50 border-3 border-black rounded-3xl shadow-xl p-6 hover:shadow-2xl transition-all">
                  <MagnifyingGlassIcon className="w-8 h-8 text-indigo-400 mb-3" />
                  <h4 className="text-xl font-bold text-white mb-2">Smart Search</h4>
                  <p className="text-white/80">Search by company name, domain, industry, or location</p>
                </div>

                <div className="bg-gradient-to-br from-orange-100 via-rose-50 to-orange-50 border-3 border-black rounded-3xl shadow-xl p-6 hover:shadow-2xl transition-all">
                  <TagIcon className="w-8 h-8 text-purple-400 mb-3" />
                  <h4 className="text-xl font-bold text-white mb-2">Tags & Filters</h4>
                  <p className="text-white/80">Organize companies with custom tags and advanced filters</p>
                </div>

                <div className="bg-gradient-to-br from-orange-100 via-rose-50 to-orange-50 border-3 border-black rounded-3xl shadow-xl p-6 hover:shadow-2xl transition-all">
                  <SparklesIcon className="w-8 h-8 text-amber-600 mb-3" />
                  <h4 className="text-xl font-bold text-white mb-2">AI Enrichment</h4>
                  <p className="text-white/80">Automatically discover company info, revenue, employees, and tech stack</p>
                </div>

                <div className="bg-gradient-to-br from-orange-100 via-rose-50 to-orange-50 border-3 border-black rounded-3xl shadow-xl p-6 hover:shadow-2xl transition-all">
                  <UsersIcon className="w-8 h-8 text-green-600 mb-3" />
                  <h4 className="text-xl font-bold text-white mb-2">Contact Linking</h4>
                  <p className="text-white/80">View all contacts and deals associated with each company</p>
                </div>

                <div className="bg-gradient-to-br from-orange-100 via-rose-50 to-orange-50 border-3 border-black rounded-3xl shadow-xl p-6 hover:shadow-2xl transition-all">
                  <ChartBarIcon className="w-8 h-8 text-indigo-400 mb-3" />
                  <h4 className="text-xl font-bold text-white mb-2">Analytics</h4>
                  <p className="text-white/80">Track company engagement, deal value, and relationship strength</p>
                </div>

                <div className="bg-gradient-to-br from-orange-100 via-rose-50 to-orange-50 border-3 border-black rounded-3xl shadow-xl p-6 hover:shadow-2xl transition-all">
                  <ArrowUpTrayIcon className="w-8 h-8 text-purple-400 mb-3" />
                  <h4 className="text-xl font-bold text-white mb-2">Bulk Operations</h4>
                  <p className="text-white/80">Import, export, and bulk update company records</p>
                </div>
              </div>
            </>
          )}

          {activeTab === 'tips' && (
            <>
              <p className="text-lg text-white mb-6">
                Pro tips to maximize your company management effectiveness.
              </p>

              <div className="space-y-4">
                <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border-l-4 border-yellow-500 rounded-r-2xl p-6 shadow-lg">
                  <div className="flex items-start gap-3">
                    <LightBulbIcon className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-1" />
                    <div>
                      <h4 className="text-xl font-bold text-white mb-2">Enrich Immediately</h4>
                      <p className="text-white/80">Always add website URLs when creating companies to trigger automatic data enrichment</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border-l-4 border-yellow-500 rounded-r-2xl p-6 shadow-lg">
                  <div className="flex items-start gap-3">
                    <LightBulbIcon className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-1" />
                    <div>
                      <h4 className="text-xl font-bold text-white mb-2">Link Contacts</h4>
                      <p className="text-white/80">Always link contacts to their company for better relationship tracking and reporting</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border-l-4 border-yellow-500 rounded-r-2xl p-6 shadow-lg">
                  <div className="flex items-start gap-3">
                    <LightBulbIcon className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-1" />
                    <div>
                      <h4 className="text-xl font-bold text-white mb-2">Use Lead Discovery</h4>
                      <p className="text-white/80">Set up weekly lead discovery searches to continuously find new target companies</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border-l-4 border-yellow-500 rounded-r-2xl p-6 shadow-lg">
                  <div className="flex items-start gap-3">
                    <LightBulbIcon className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-1" />
                    <div>
                      <h4 className="text-xl font-bold text-white mb-2">Track Account Health</h4>
                      <p className="text-white/80">Monitor last contact date and engagement score to identify at-risk accounts</p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

        </div>

        {/* Footer */}
        <div className="bg-[#12121f] border-t-2 border-black p-6">
          <button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all"
          >
            Got it, thanks!
          </button>
        </div>

      </div>
    </div>
  );
}
