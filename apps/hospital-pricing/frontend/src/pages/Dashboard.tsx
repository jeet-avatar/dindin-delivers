import { FileText, Receipt, AlertTriangle, CheckCircle } from 'lucide-react'

const kpiCards = [
  {
    label: 'Active Contracts',
    icon: FileText,
    colorClass: 'text-primary',
    bgClass: 'bg-primary/10',
    borderClass: 'border-primary/20',
  },
  {
    label: 'Invoices This Month',
    icon: Receipt,
    colorClass: 'text-warning',
    bgClass: 'bg-warning/10',
    borderClass: 'border-warning/20',
  },
  {
    label: 'Open Discrepancies',
    icon: AlertTriangle,
    colorClass: 'text-destructive',
    bgClass: 'bg-destructive/10',
    borderClass: 'border-destructive/20',
  },
  {
    label: 'Resolved Today',
    icon: CheckCircle,
    colorClass: 'text-accent',
    bgClass: 'bg-accent/10',
    borderClass: 'border-accent/20',
  },
]

export function Dashboard() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
        <p className="text-text-muted text-sm mt-1">Overview of pricing assurance activity</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpiCards.map(({ label, icon: Icon, colorClass, bgClass, borderClass }) => (
          <div key={label} className="bg-surface border border-border rounded-xl p-6">
            <div className="flex items-start justify-between mb-4">
              <div className={`flex items-center justify-center w-10 h-10 rounded-lg border ${bgClass} ${borderClass}`}>
                <Icon className={`w-5 h-5 ${colorClass}`} strokeWidth={1.75} />
              </div>
            </div>
            <p className="text-3xl font-bold text-text-primary mb-1">&mdash;</p>
            <p className="text-sm text-text-muted">{label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
