import React, { useEffect, useState } from 'react'
import {
  Plus, ShoppingCart, Trash2, X, AlertTriangle,
  FileText, User, ArrowLeft, IndianRupee
} from 'lucide-react'
import { API_BASE } from '../App'
import { formatINR, formatINRDecimal } from '../utils/currency'

function Orders() {
  const [orders, setOrders]   = useState([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState('list') // 'list' | 'create'

  const [customers, setCustomers]           = useState([])
  const [products, setProducts]             = useState([])
  const [selectedCustomerId, setSelCust]    = useState('')
  const [orderItems, setOrderItems]         = useState([{ product_id: '', quantity: 1, maxStock: 0, price: 0 }])
  const [orderError, setOrderError]         = useState(null)

  const [activeOrder, setActiveOrder]       = useState(null)
  const [showDetails, setShowDetails]       = useState(false)

  useEffect(() => {
    fetchOrders()
    if (viewMode === 'create') loadCreationData()
  }, [viewMode])

  const fetchOrders = async () => {
    try {
      setLoading(true)
      const res = await fetch(`${API_BASE}/orders/`)
      if (!res.ok) throw new Error()
      setOrders(await res.json())
    } catch { /* silent */ }
    finally { setLoading(false) }
  }

  const loadCreationData = async () => {
    const [rc, rp] = await Promise.all([
      fetch(`${API_BASE}/customers/`),
      fetch(`${API_BASE}/products/`)
    ])
    const cust = await rc.json(); const prod = await rp.json()
    setCustomers(cust); setProducts(prod)
    if (cust.length > 0) setSelCust(cust[0].id.toString())
  }

  const addRow = () => setOrderItems([...orderItems, { product_id: '', quantity: 1, maxStock: 0, price: 0 }])

  const removeRow = (idx) => { if (orderItems.length > 1) setOrderItems(orderItems.filter((_, i) => i !== idx)) }

  const setRowProduct = (idx, prodId) => {
    const updated = [...orderItems]
    const prod = products.find(p => p.id.toString() === prodId)
    if (prod) {
      updated[idx] = { product_id: prodId, quantity: Math.min(updated[idx].quantity, prod.quantity_in_stock) || (prod.quantity_in_stock > 0 ? 1 : 0), maxStock: prod.quantity_in_stock, price: Number(prod.price) }
    } else {
      updated[idx] = { product_id: '', quantity: 1, maxStock: 0, price: 0 }
    }
    setOrderItems(updated)
  }

  const setRowQty = (idx, val) => {
    const updated = [...orderItems]
    const qty = Math.max(1, Math.min(Number(val) || 1, updated[idx].maxStock))
    updated[idx] = { ...updated[idx], quantity: qty }
    setOrderItems(updated)
  }

  const calcTotal = () => orderItems.reduce((s, i) => s + i.price * i.quantity, 0)

  const handlePlaceOrder = async (e) => {
    e.preventDefault(); setOrderError(null)
    if (!selectedCustomerId) { setOrderError('Please select a customer.'); return }
    const items = orderItems.filter(i => i.product_id && i.quantity > 0).map(i => ({ product_id: parseInt(i.product_id), quantity: i.quantity }))
    if (items.length === 0) { setOrderError('Add at least one product to the order.'); return }
    try {
      const res = await fetch(`${API_BASE}/orders/`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer_id: parseInt(selectedCustomerId), items })
      })
      if (!res.ok) { const err = await res.json(); throw new Error(err.detail || 'Order failed.') }
      setViewMode('list')
      setOrderItems([{ product_id: '', quantity: 1, maxStock: 0, price: 0 }])
    } catch (err) { setOrderError(err.message) }
  }

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      const res = await fetch(`${API_BASE}/orders/${orderId}/status`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
      if (!res.ok) { const err = await res.json(); throw new Error(err.detail) }
      fetchOrders()
      if (activeOrder?.id === orderId) setActiveOrder({ ...activeOrder, status: newStatus })
    } catch (err) { alert(err.message) }
  }

  const openDetails = async (order) => {
    const res = await fetch(`${API_BASE}/orders/${order.id}`)
    if (!res.ok) return
    setActiveOrder(await res.json()); setShowDetails(true)
  }

  const deleteOrder = async (id) => {
    if (!confirm('Delete this order? Stock will be restored.')) return
    await fetch(`${API_BASE}/orders/${id}`, { method: 'DELETE' })
    setShowDetails(false); fetchOrders()
  }

  const statusBadge = (s) => {
    switch (s) {
      case 'DELIVERED': return 'badge-success'
      case 'SHIPPED':   return 'badge-info'
      case 'PENDING':   return 'badge-warning'
      case 'CANCELLED': return 'badge-danger'
      default:          return 'badge-info'
    }
  }

  return (
    <div>
      {viewMode === 'list' ? (
        <>
          <div className="page-header">
            <div className="page-title">
              <h1>Order Management</h1>
              <p>Create, track, and manage customer orders with INR invoicing.</p>
            </div>
            <button className="btn btn-primary" onClick={() => setViewMode('create')}>
              <Plus style={{ width: '16px', height: '16px' }} /> Create Order
            </button>
          </div>

          <div className="glass-panel">
            {loading ? (
              <div className="flex-center" style={{ minHeight: '28vh', flexDirection: 'column', gap: '1rem' }}>
                <div className="spinner" />
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Loading orders…</p>
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center" style={{ padding: '3rem 0' }}>
                <ShoppingCart style={{ width: '40px', height: '40px', color: 'var(--text-muted)', marginBottom: '0.75rem' }} />
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No orders placed yet.</p>
                <button className="btn btn-primary btn-small mt-2" onClick={() => setViewMode('create')}>Create First Order</button>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Order No.</th>
                      <th>Customer</th>
                      <th>Date</th>
                      <th className="text-right">Amount (₹)</th>
                      <th className="text-center">Status</th>
                      <th className="text-center" style={{ width: '200px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map(o => (
                      <tr key={o.id}>
                        <td
                          style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary)', cursor: 'pointer', fontSize: '0.85rem' }}
                          onClick={() => openDetails(o)}
                        >
                          {o.order_number}
                        </td>
                        <td style={{ fontWeight: 600 }}>{o.customer?.name || '—'}</td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                          {new Date(o.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="text-right" style={{ fontWeight: 700 }}>{formatINR(o.total_amount)}</td>
                        <td className="text-center">
                          <span className={`badge ${statusBadge(o.status)}`}>{o.status}</span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center', alignItems: 'center' }}>
                            <select className="form-control"
                              style={{ width: '120px', padding: '0.35rem 0.5rem', fontSize: '0.8rem' }}
                              value={o.status} onChange={e => handleStatusChange(o.id, e.target.value)}>
                              <option value="PENDING">Pending</option>
                              <option value="SHIPPED">Shipped</option>
                              <option value="DELIVERED">Delivered</option>
                              <option value="CANCELLED">Cancelled</option>
                            </select>
                            <button className="btn btn-secondary btn-small" style={{ padding: '0.35rem 0.5rem' }} onClick={() => openDetails(o)}>
                              <FileText style={{ width: '13px', height: '13px' }} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        /* Create Order View */
        <>
          <div className="page-header">
            <button className="btn btn-secondary btn-small" onClick={() => setViewMode('list')}>
              <ArrowLeft style={{ width: '13px', height: '13px' }} /> Back
            </button>
            <div className="page-title" style={{ textAlign: 'right' }}>
              <h1>Order Builder</h1>
              <p>Select products and customer to generate an invoice in INR.</p>
            </div>
          </div>

          <form onSubmit={handlePlaceOrder} className="glass-panel">
            {orderError && (
              <div className="error-box" style={{ marginBottom: '1.25rem' }}>
                <AlertTriangle style={{ width: '15px', height: '15px' }} /> {orderError}
              </div>
            )}
            <div className="order-creator-grid">
              {/* Left: Line Items */}
              <div className="order-items-builder">
                <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Order Line Items</h3>
                {orderItems.map((item, idx) => (
                  <div key={idx} className="order-item-row">
                    <select className="form-control" value={item.product_id} onChange={e => setRowProduct(idx, e.target.value)} required>
                      <option value="">Select Product…</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id} disabled={p.quantity_in_stock === 0}>
                          {p.name} — {formatINR(p.price)} [Stock: {p.quantity_in_stock}]
                        </option>
                      ))}
                    </select>
                    <input type="number" className="form-control" placeholder="Qty" min="1" max={item.maxStock}
                      value={item.quantity} onChange={e => setRowQty(idx, e.target.value)} disabled={!item.product_id} required />
                    <div style={{ textAlign: 'right', fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                      {formatINR(item.price * item.quantity)}
                    </div>
                    <button type="button" className="btn btn-danger btn-small" style={{ padding: '0.4rem' }}
                      onClick={() => removeRow(idx)} disabled={orderItems.length === 1}>
                      <Trash2 style={{ width: '13px', height: '13px' }} />
                    </button>
                  </div>
                ))}
                <button type="button" className="btn btn-secondary btn-small" onClick={addRow} style={{ marginTop: '0.75rem' }}>
                  <Plus style={{ width: '13px', height: '13px' }} /> Add Line Item
                </button>
              </div>

              {/* Right: Customer & Summary */}
              <div>
                <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Invoice Details</h3>
                <div className="form-group">
                  <label className="form-label">Customer *</label>
                  <select className="form-control" value={selectedCustomerId} onChange={e => setSelCust(e.target.value)} required>
                    {customers.length === 0
                      ? <option value="">No customers registered</option>
                      : customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.email})</option>)
                    }
                  </select>
                </div>

                <div className="order-summary-box mt-2">
                  <h4 style={{ marginBottom: '0.75rem', fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Invoice Summary
                  </h4>
                  <div className="order-summary-row">
                    <span>Subtotal</span>
                    <span>{formatINR(calcTotal())}</span>
                  </div>
                  <div className="order-summary-row">
                    <span>GST / Taxes</span>
                    <span style={{ color: 'var(--success)', fontWeight: 600 }}>Included</span>
                  </div>
                  <div className="order-summary-row">
                    <span>Shipping</span>
                    <span style={{ color: 'var(--success)', fontWeight: 600 }}>FREE</span>
                  </div>
                  <div className="order-summary-row total">
                    <span>Total (INR)</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                      <IndianRupee style={{ width: '16px', height: '16px' }} />
                      {new Intl.NumberFormat('en-IN').format(calcTotal())}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
                  <button type="button" className="btn btn-secondary" style={{ flexGrow: 1 }} onClick={() => setViewMode('list')}>Cancel</button>
                  <button type="submit" className="btn btn-primary" style={{ flexGrow: 1 }}>
                    <IndianRupee style={{ width: '15px', height: '15px' }} /> Place Order
                  </button>
                </div>
              </div>
            </div>
          </form>
        </>
      )}

      {/* Order Details Modal */}
      {showDetails && activeOrder && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: '620px' }}>
            <div className="modal-header">
              <div>
                <div style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '1.05rem', color: 'var(--primary)' }}>
                  {activeOrder.order_number}
                </div>
                <span className={`badge ${statusBadge(activeOrder.status)}`} style={{ marginTop: '0.35rem' }}>
                  {activeOrder.status}
                </span>
              </div>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }} onClick={() => setShowDetails(false)}><X /></button>
            </div>
            <div className="modal-body">
              {/* Customer + Meta */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Customer</div>
                  <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <User style={{ width: '14px', height: '14px', color: 'var(--primary)' }} />
                    {activeOrder.customer?.name || '—'}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>{activeOrder.customer?.email}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Order Date</div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                    {new Date(activeOrder.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
                    {new Date(activeOrder.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>

              {/* Shipping Address */}
              {activeOrder.customer?.address && (
                <div style={{ background: '#f8fafc', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1.25rem' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Shipping Address</div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>{activeOrder.customer.address}</p>
                </div>
              )}

              {/* Items Table */}
              <h4 style={{ marginBottom: '0.75rem', fontSize: '0.9rem', fontWeight: 700 }}>Products in Order</h4>
              <div className="table-wrapper" style={{ border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
                <table className="custom-table" style={{ fontSize: '0.82rem' }}>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th className="text-right">Unit Price</th>
                      <th className="text-center">Qty</th>
                      <th className="text-right">Line Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeOrder.items.map(item => (
                      <tr key={item.id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{item.product_name || 'Deleted Product'}</div>
                          <span style={{ fontSize: '0.72rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>{item.product_sku || 'N/A'}</span>
                        </td>
                        <td className="text-right">{formatINR(item.unit_price)}</td>
                        <td className="text-center">{item.quantity}</td>
                        <td className="text-right" style={{ fontWeight: 700 }}>{formatINR(Number(item.unit_price) * item.quantity)}</td>
                      </tr>
                    ))}
                    <tr style={{ background: '#f8fafc', borderTop: '2px solid var(--border-color)' }}>
                      <td colSpan="3" style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>Invoice Total (INR)</td>
                      <td className="text-right" style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--primary)' }}>
                        {formatINRDecimal(activeOrder.total_amount)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
              <button className="btn btn-danger btn-small" onClick={() => deleteOrder(activeOrder.id)}>
                <Trash2 style={{ width: '13px', height: '13px' }} /> Delete Order
              </button>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-secondary" onClick={() => setShowDetails(false)}>Close</button>
                <select className="btn btn-secondary"
                  style={{ width: '135px', padding: '0.45rem 0.75rem', cursor: 'pointer' }}
                  value={activeOrder.status}
                  onChange={e => handleStatusChange(activeOrder.id, e.target.value)}>
                  <option value="PENDING">Pending</option>
                  <option value="SHIPPED">Shipped</option>
                  <option value="DELIVERED">Delivered</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Orders
