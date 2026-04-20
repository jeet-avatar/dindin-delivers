export function VideoAnalytics() {
  return (
    <div className="min-h-screen bg-[#12121f] p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-[#F1F5F9] mb-2">Video Analytics</h1>
        <p className="text-[#94A3B8] mb-8">
          Detailed analytics and insights for your video campaigns
        </p>

        <div className="bg-[#161625] rounded-xl shadow-md p-12 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-orange-100 to-rose-100 rounded-full mb-4">
            <svg className="w-10 h-10 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-[#F1F5F9] mb-2">Analytics Dashboard</h2>
          <p className="text-[#94A3B8] max-w-md mx-auto">
            Detailed analytics including views, engagement metrics, and campaign performance will be available here.
          </p>
        </div>
      </div>
    </div>
  );
}
