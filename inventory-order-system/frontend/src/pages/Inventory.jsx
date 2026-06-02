import React, { useEffect, useState } from 'react'
import {
  History, ArrowUpRight, ArrowDownLeft,
  TrendingUp, Sparkles, Plus, Package
} from 'lucide-react'
import { API_BASE } from '../App'

function Inventory() {
  const [logs, setLogs]             = useState([])
  const [loading, setLoading]       = useState(true)
  const [products, setProducts]     = useState([])
  const [selProductId, setSelProd]  = useState('')
  const [qty, setQty]               = useState(10)
  const [formLoading, setFormLoading] = useState(false)

  useEffect(() => { fetchLogs(); loadProducts() }, [])

  const fetchLogs = async () => {
    try {
      setLoading(true)
      const res = await fetch(`${API_BASE}/inventory/logs`)
      if (!res.ok) throw new Error()
      setLogs(await res.json())
    } catch { /* silent */ }
    finally { setLoading(false) }
  }

  const loadProducts = async () => {
    const res = await fetch(`${API_BASE}/products/`)
    if (!res.ok) return
    const data = await res.json()
    setProducts(data)
    if (data.length > 0) setSelProd(data[0].id.toString())
  }

  const handleRestock = async (e) => {
    e.preventDefault()
    if (!selProductId || qty <= 0) return
    try {
      setFormLoading(true)
      const res = await fetch(`${API_BASE}/products/${selProductId}/restock`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: Number(qty) })
      })
      if (!res.ok) throw new Error('Restock failed.')
      setQty(10); fetchLogs(); loadProducts()
    } catch (err) { alert(err.message) }
    finally { setFormLoading(false) }
  }

  const typeClass = (r) => r === 'RESTOCK' ? 'restock' : r === 'SALE' ? 'sale' : 'adjustment'

  return (
    <div>
      <div className="page-header">
        <div className="page-title">
          <h1>Stock Ledger</h1>
          <p>Audit trail of all inventory movements — restocks, sales, and adjustments.</p>
        </div>
      </div>

      <div className="order-creator-grid">
        {/* Timeline Log */}
        <div className="glass-panel">
          <div className="panel-header" style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: '1.25rem' }}>
            <span className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <History style={{ color: 'var(--primary)', width: '18px', height: '18px' }} />
              Transaction History
            </span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>{logs.length} Entries</span>
            </div>
          </div>

          {loading ? (
            <div className="flex-center" style={{ minHeight: '30vh', flexDirection: 'column', gap: '1rem' }}>
              <div className="spinner" />
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Loading ledger…</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center" style={{ padding: '3rem 0' }}>
              <History style={{ width: '36px', height: '36px', color: 'var(--text-muted)', marginBottom: '0.75rem' }} />
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No stock transactions recorded yet.</p>
            </div>
          ) : (
            <ul className="timeline">
              {logs.map(log => {
                const isPositive = log.change_amount > 0
                return (
                  <li key={log.id} className={`timeline-item ${typeClass(log.reason)}`}>
                    <div className="timeline-marker" />
                    <div className="timeline-content">
                      <div className="timeline-header">
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                          <Package style={{ width: '13px', height: '13px', color: 'var(--primary)', flexShrink: 0 }} />
                          {log.product_name || 'Deleted Product'}
                          <span style={{ fontFamily: 'monospace', fontSize: '0.72rem', fontWeight: 600, color: 'var(--secondary)', background: '#e0f2fe', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                            {log.product_sku || 'N/A'}
                          </span>
                        </span>
                        <span className="timeline-time">
                          {new Date(log.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.3rem' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          Type: <strong style={{ color: 'var(--text-primary)' }}>{log.reason}</strong>
                        </span>
                        <span style={{
                          fontWeight: 800, fontSize: '1rem',
                          color: isPositive ? 'var(--success)' : 'var(--danger)',
                          display: 'flex', alignItems: 'center', gap: '0.2rem'
                        }}>
                          {isPositive
                            ? <ArrowUpRight style={{ width: '15px', height: '15px' }} />
                            : <ArrowDownLeft style={{ width: '15px', height: '15px' }} />}
                          {isPositive ? `+${log.change_amount}` : log.change_amount} units
                        </span>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* Quick Replenishment */}
        <div className="glass-panel" style={{ height: 'fit-content', position: 'sticky', top: '1.5rem' }}>
          <div className="panel-header" style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: '1.25rem' }}>
            <span className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sparkles style={{ color: 'var(--success)', width: '18px', height: '18px' }} />
              Quick Restock
            </span>
          </div>

          <form onSubmit={handleRestock}>
            <div className="form-group">
              <label className="form-label">Select Product</label>
              <select className="form-control" value={selProductId} onChange={e => setSelProd(e.target.value)} required>
                {products.length === 0
                  ? <option value="">No products available</option>
                  : products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Stock: {p.quantity_in_stock})
                    </option>
                  ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Quantity to Add</label>
              <input type="number" className="form-control" min="1" value={qty}
                onChange={e => setQty(e.target.value)} required />
            </div>

            {selProductId && products.length > 0 && (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '0.75rem', marginBottom: '1rem', fontSize: '0.82rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Current Stock:</span>
                  <span style={{ fontWeight: 700 }}>{products.find(p => p.id.toString() === selProductId)?.quantity_in_stock ?? 0} units</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.3rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>After Restock:</span>
                  <span style={{ fontWeight: 700, color: 'var(--success)' }}>
                    {(products.find(p => p.id.toString() === selProductId)?.quantity_in_stock ?? 0) + Number(qty)} units
                  </span>
                </div>
              </div>
            )}

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}
              disabled={formLoading || products.length === 0}>
              <Plus style={{ width: '16px', height: '16px' }} />
              {formLoading ? 'Processing…' : 'Confirm Restock'}
            </button>
          </form>

          {/* Legend */}
          <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.6rem' }}>Legend</div>
            {[
              { label: 'Restock', color: 'var(--success)', bg: 'var(--success-bg)', desc: 'Units added' },
              { label: 'Sale', color: 'var(--secondary)', bg: var(--info-bg)', desc: 'Units sold' },
              { label: 'Adjustment', color: 'var(--warning)', bg: 'var(--warning-bg)', desc: 'Manual change' },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem', fontSize: '0.8rem' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: item.color, flexShrink: 0 }} />
                <strong style={{ color: 'var(--text-primary)', minWidth: '70px' }}>{item.label}</strong>
                <span style={{ color: 'var(--text-muted)' }}>{item.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Inventory
