import React, { useEffect, useState } from 'react'
import {
  Package,
  Users,
  ShoppingCart,
  IndianRupee,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Activity
} from 'lucide-react'
import { API_BASE } from '../App'
import { formatINR, formatINRDecimal } from '../utils/currency'

const COLORS = ['#1e40af', '#0284c7', '#7c3aed', '#059669', '#d97706', '#dc2626', '#0891b2']

function Dashboard({ onNavigate }) {
  const [stats, setStats]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState(null)

  useEffect(() => { fetchStats() }, [])

  const fetchStats = async () => {
    try {
      setLoading(true)
      const res = await fetch(`${API_BASE}/inventory/stats`)
      if (!res.ok) throw new Error('Failed to load dashboard statistics.')
      setStats(await res.json())
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return (
    <div className="flex-center" style={{ minHeight: '60vh', flexDirection: 'column', gap: '1rem' }}>
      <div className="spinner"></div>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Loading workspace metrics…</p>
    </div>
  )

  if (error) return (
    <div className="glass-panel" style={{ borderColor: '#fca5a5', textAlign: 'center', padding: '2.5rem' }}>
      <AlertTriangle style={{ width: '40px', height: '40px', color: 'var(--danger)', marginBottom: '0.75rem' }} />
      <h3 style={{ marginBottom: '0.5rem' }}>Connection Error</h3>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '1.25rem', fontSize: '0.9rem' }}>{error}</p>
      <button className="btn btn-secondary" onClick={fetchStats}>Retry</button>
    </div>
  )

  const totalCount = stats.category_distribution.reduce((s, c) => s + c.count, 0)

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div className="page-title">
          <h1>Dashboard Overview</h1>
          <p>Real-time summary of inventory, orders, and revenue in INR.</p>
        </div>
        <button className="btn btn-primary" onClick={() => onNavigate('orders')}>
          <ShoppingCart style={{ width: '16px', height: '16px' }} />
          New Order
        </button>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card primary">
          <div className="kpi-header">
            <span className="kpi-title">Total Products</span>
            <div className="kpi-icon"><Package style={{ width: '18px', height: '18px' }} /></div>
          </div>
          <div className="kpi-value">{stats.total_products}</div>
          <div className="kpi-meta">Active catalogue items</div>
        </div>

        <div className="kpi-card warning">
          <div className="kpi-header">
            <span className="kpi-title">Low Stock Alerts</span>
            <div className="kpi-icon"><AlertTriangle style={{ width: '18px', height: '18px' }} /></div>
          </div>
          <div className="kpi-value" style={{ color: 'var(--warning)' }}>{stats.low_stock_products}</div>
          <div className="kpi-meta">Items below reorder level</div>
        </div>

        <div className="kpi-card success">
          <div className="kpi-header">
            <span className="kpi-title">Total Revenue</span>
            <div className="kpi-icon"><IndianRupee style={{ width: '18px', height: '18px' }} /></div>
          </div>
          <div className="kpi-value" style={{ fontSize: '1.4rem' }}>{formatINR(stats.total_revenue)}</div>
          <div className="kpi-meta">Excl. cancelled orders</div>
        </div>

        <div className="kpi-card secondary">
          <div className="kpi-header">
            <span className="kpi-title">Customers</span>
            <div className="kpi-icon"><Users style={{ width: '18px', height: '18px' }} /></div>
          </div>
          <div className="kpi-value">{stats.total_customers}</div>
          <div className="kpi-meta">Registered accounts</div>
        </div>
      </div>

      {/* Charts + Activity */}
      <div className="analytics-grid">
        {/* Donut Chart */}
        <div className="glass-panel" style={{ marginBottom: 0 }}>
          <div className="panel-header" style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: '0.5rem' }}>
            <span className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <TrendingUp style={{ color: 'var(--primary)', width: '18px', height: '18px' }} />
              Category Distribution
            </span>
          </div>
          <div className="chart-container">
            {stats.category_distribution.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>No data available.</p>
            ) : (
              <div style={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-around' }}>
                <svg width="170" height="170" viewBox="0 0 200 200" style={{ overflow: 'visible' }}>
                  <circle cx="100" cy="100" r="78" fill="none" stroke="#f1f5f9" strokeWidth="18" />
                  {(() => {
                    let cumulative = 0
                    return stats.category_distribution.map((cat, idx) => {
                      const pct = cat.count / totalCount
                      const dashArr = `${pct * 490} 490`
                      const dashOff = `${-cumulative * 490}`
                      cumulative += pct
                      return (
                        <circle key={cat.category} cx="100" cy="100" r="78"
                          fill="none"
                          stroke={COLORS[idx % COLORS.length]}
                          strokeWidth="18"
                          strokeDasharray={dashArr}
                          strokeDashoffset={dashOff}
                          transform="rotate(-90 100 100)"
                          strokeLinecap="round"
                          style={{ transition: 'all 0.4s ease' }}
                        >
                          <title>{cat.category}: {cat.count} ({Math.round(pct * 100)}%)</title>
                        </circle>
                      )
                    })
                  })()}
                  <text x="100" y="98" textAnchor="middle" fill="var(--text-primary)" fontSize="22" fontWeight="800" fontFamily="var(--font-heading)">
                    {stats.total_products}
                  </text>
                  <text x="100" y="116" textAnchor="middle" fill="var(--text-muted)" fontSize="9.5" letterSpacing="0.05em">
                    TOTAL ITEMS
                  </text>
                </svg>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                  {stats.category_distribution.map((cat, idx) => (
                    <div key={cat.category} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem' }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: COLORS[idx % COLORS.length], flexShrink: 0 }} />
                      <span style={{ color: 'var(--text-secondary)', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat.category}</span>
                      <strong style={{ marginLeft: 'auto', paddingLeft: '0.5rem', color: 'var(--text-primary)' }}>{cat.count}</strong>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Activity Feed */}
        <div className="glass-panel" style={{ marginBottom: 0 }}>
          <div className="panel-header" style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: '0.75rem' }}>
            <span className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity style={{ color: 'var(--secondary)', width: '18px', height: '18px' }} />
              Recent Activity
            </span>
            <button className="btn btn-secondary btn-small" onClick={() => onNavigate('inventory')}>
              View Ledger <ArrowRight style={{ width: '12px', height: '12px' }} />
            </button>
          </div>
          <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
            {stats.recent_activities.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem', fontSize: '0.875rem' }}>No activity recorded yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {stats.recent_activities.map((act, i) => (
                  <div key={i} style={{
                    display: 'flex', gap: '0.65rem', alignItems: 'flex-start',
                    padding: '0.7rem 0.85rem',
                    background: '#f8fafc', borderRadius: '8px',
                    border: '1px solid var(--border-color)'
                  }}>
                    <span style={{
                      padding: '0.3rem', borderRadius: '6px', flexShrink: 0, marginTop: '0.1rem',
                      background: act.type === 'ORDER' ? '#dbeafe' : '#e0f2fe',
                      color: act.type === 'ORDER' ? 'var(--primary)' : 'var(--secondary)'
                    }}>
                      {act.type === 'ORDER'
                        ? <ShoppingCart style={{ width: '13px', height: '13px' }} />
                        : <Package      style={{ width: '13px', height: '13px' }} />}
                    </span>
                    <div>
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-primary)', lineHeight: '1.35' }}>{act.message}</p>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {new Date(act.timestamp).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
