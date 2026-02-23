import { useEffect, useState } from 'react'
import { api } from '../api'
import type { DashboardData } from '../types'
import { formatDatePL, daysUntilExpiry, getCertStatus } from '../types'
import {
  Users, Award, AlertTriangle, CheckCircle, Clock, XCircle,
  TrendingUp, BarChart3,
} from 'lucide-react'

function StatCard({ icon: Icon, label, value, color }: {
  icon: React.ElementType; label: string; value: number; color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <div className="text-2xl font-bold text-slate-900">{value}</div>
        <div className="text-xs text-slate-500">{label}</div>
      </div>
    </div>
  )
}

function StatusBadge({ status, days }: { status: string; days: number }) {
  const cfg: Record<string, { cls: string; label: string }> = {
    expired: { cls: 'status-expired', label: `Wygasło ${Math.abs(days)} dni temu` },
    critical: { cls: 'status-critical', label: `Wygasa za ${days} dni!` },
    warning: { cls: 'status-warning', label: `Wygasa za ${days} dni` },
    ok: { cls: 'status-ok', label: `Ważne (${days} dni)` },
  }
  const c = cfg[status] || cfg.ok
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${c.cls}`}>
      {c.label}
    </span>
  )
}

export function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.dashboard().then(setData).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="text-slate-400 p-8">Ładowanie...</div>
  if (!data) return <div className="text-red-500 p-8">Błąd ładowania danych</div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">Przegląd statusu uprawnień i certyfikatów</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Aktywni pracownicy" value={data.totalEmployees} color="bg-blue-50 text-blue-600" />
        <StatCard icon={Award} label="Łącznie uprawnień" value={data.totalCerts} color="bg-purple-50 text-purple-600" />
        <StatCard icon={XCircle} label="Wygasłe" value={data.expired} color="bg-red-50 text-red-600" />
        <StatCard icon={AlertTriangle} label="Wygasa w 7 dni" value={data.expiring7} color="bg-orange-50 text-orange-600" />
      </div>

      {/* Status bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
          <BarChart3 className="w-4 h-4" /> Rozkład statusów
        </h2>
        {data.totalCerts > 0 ? (
          <div className="flex rounded-lg overflow-hidden h-8">
            {data.expired > 0 && (
              <div className="bg-red-500 flex items-center justify-center text-white text-xs font-bold"
                style={{ width: `${(data.expired / data.totalCerts) * 100}%`, minWidth: data.expired > 0 ? 30 : 0 }}>
                {data.expired}
              </div>
            )}
            {data.expiring7 > 0 && (
              <div className="bg-orange-400 flex items-center justify-center text-white text-xs font-bold"
                style={{ width: `${(data.expiring7 / data.totalCerts) * 100}%`, minWidth: data.expiring7 > 0 ? 30 : 0 }}>
                {data.expiring7}
              </div>
            )}
            {data.expiring30 > 0 && (
              <div className="bg-yellow-400 flex items-center justify-center text-slate-700 text-xs font-bold"
                style={{ width: `${(data.expiring30 / data.totalCerts) * 100}%`, minWidth: data.expiring30 > 0 ? 30 : 0 }}>
                {data.expiring30}
              </div>
            )}
            {(data.expiring60 + data.valid) > 0 && (
              <div className="bg-green-500 flex items-center justify-center text-white text-xs font-bold"
                style={{ width: `${((data.expiring60 + data.valid) / data.totalCerts) * 100}%`, minWidth: 30 }}>
                {data.expiring60 + data.valid}
              </div>
            )}
          </div>
        ) : (
          <div className="text-sm text-slate-400">Brak uprawnień w systemie</div>
        )}
        <div className="flex gap-4 mt-2 text-xs text-slate-500">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Wygasłe</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-orange-400" /> &lt;7 dni</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-yellow-400" /> &lt;30 dni</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-500" /> OK</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Urgent list */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-500" /> Wymagają uwagi (wygasłe + &lt;30 dni)
          </h2>
          {data.urgentList.length > 0 ? (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {data.urgentList.map((item) => {
                const days = daysUntilExpiry(item.expiry_date)
                const status = getCertStatus(item.expiry_date)
                return (
                  <div key={item.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-50 border border-slate-100">
                    <div>
                      <div className="text-sm font-medium text-slate-800">
                        {item.first_name} {item.last_name}
                      </div>
                      <div className="text-xs text-slate-500">
                        <span className="inline-block w-2 h-2 rounded-full mr-1" style={{ backgroundColor: item.category_color }} />
                        {item.category_name} · {formatDatePL(item.expiry_date)}
                      </div>
                    </div>
                    <StatusBadge status={status} days={days} />
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-green-600 py-4">
              <CheckCircle className="w-4 h-4" /> Wszystko w porządku — brak pilnych spraw
            </div>
          )}
        </div>

        {/* By category */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" /> Wg kategorii
          </h2>
          {data.byCategory.length > 0 ? (
            <div className="space-y-3">
              {data.byCategory.map((cat) => (
                <div key={cat.name} className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-700 truncate">{cat.name}</div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{
                          width: `${cat.total > 0 ? ((cat.total - cat.expired - cat.expiring_soon) / cat.total) * 100 : 0}%`,
                          backgroundColor: cat.color,
                        }} />
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-bold text-slate-800">{cat.total}</div>
                    {(cat.expired + cat.expiring_soon) > 0 && (
                      <div className="text-[10px] text-red-500 font-medium">
                        {cat.expired + cat.expiring_soon} uwaga
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-slate-400 py-4">Brak danych</div>
          )}
        </div>
      </div>
    </div>
  )
}
