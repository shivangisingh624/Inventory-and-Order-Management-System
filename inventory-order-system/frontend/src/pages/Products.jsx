import React, { useEffect, useState } from 'react'
import {
  Plus, Search, Edit3, Trash2, ArrowUpRight,
  AlertTriangle, RotateCcw, X, IndianRupee
} from 'lucide-react'
import { API_BASE } from '../App'
import { formatINR } from '../utils/currency'

const CATEGORIES = [
  'Electronics', 'Mobile & Accessories', 'Clothing & Apparel',
  'Home & Kitchen', 'Food & Grocery', 'Books & Stationery',
  'Health & Pharma', 'Automobiles', 'Sports & Fitness', 'Furniture'
]

function Products() {
  const [products, setProducts]     = useState([])
  const [search, setSearch]         = useState('')
  const [category, setCategory]     = useState('')
  const [lowStockOnly, setLowStock] = useState(false)
  const [loading, setLoading]       = useState(true)

  const [showProductModal, setShowProductModal] = useState(false)
  const [showRestockModal, setShowRestockModal] = useState(false)
  const [selectedProduct, setSelectedProduct]   = useState(null)
  const [formData, setFormData] = useState({
    sku: '', name: '', description: '', price: '',
    quantity_in_stock: 0, low_stock_threshold: 5, category: 'Electronics'
  })
  const [restockQty, setRestockQty] = useState(10)
  const [formError, setFormError]   = useState(null)

  useEffect(() => { fetchProducts() }, [search, category, lowStockOnly])

  const fetchProducts = async () => {
    try {
      setLoading(true)
      let url = `${API_BASE}/products/?`
      if (search)       url += `search=${encodeURIComponent(search)}&`
      if (category)     url += `category=${encodeURIComponent(category)}&`
      if (lowStockOnly) url += `low_stock=true&`
      const res = await fetch(url)
      if (!res.ok) throw new Error()
      setProducts(await res.json())
    } catch { /* handled silently */ }
    finally { setLoading(false) }
  }

  const openAdd = () => {
    setSelectedProduct(null)
    setFormData({ sku: '', name: '', description: '', price: '', quantity_in_stock: 0, low_stock_threshold: 5, category: 'Electronics' })
    setFormError(null)
    setShowProductModal(true)
  }

  const openEdit = (p) => {
    setSelectedProduct(p)
    setFormData({ sku: p.sku, name: p.name, description: p.description || '', price: p.price, quantity_in_stock: p.quantity_in_stock, low_stock_threshold: p.low_stock_threshold, category: p.category })
    setFormError(null)
    setShowProductModal(true)
  }

  const openRestock = (p) => { setSelectedProduct(p); setRestockQty(10); setShowRestockModal(true) }

  const handleSave = async (e) => {
    e.preventDefault(); setFormError(null)
    if (!formData.sku || !formData.name || !formData.price || Number(formData.price) < 0) {
      setFormError('Please fill all required fields.'); return
    }
    try {
      const isEdit = !!selectedProduct
      const res = await fetch(
        isEdit ? `${API_BASE}/products/${selectedProduct.id}` : `${API_BASE}/products/`,
        {
          method: isEdit ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formData,
            price: Number(formData.price),
            quantity_in_stock: Number(formData.quantity_in_stock),
            low_stock_threshold: Number(formData.low_stock_threshold)
          })
        }
      )
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail || 'Save failed.') }
      setShowProductModal(false); fetchProducts()
    } catch (err) { setFormError(err.message) }
  }

  const handleRestock = async (e) => {
    e.preventDefault()
    const res = await fetch(`${API_BASE}/products/${selectedProduct.id}/restock`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity: Number(restockQty) })
    })
    if (!res.ok) { alert('Restock failed'); return }
    setShowRestockModal(false); fetchProducts()
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this product permanently?')) return
    await fetch(`${API_BASE}/products/${id}`, { method: 'DELETE' })
    fetchProducts()
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title">
          <h1>Product Catalogue</h1>
          <p>Manage stock, pricing (₹), and SKU details.</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>
          <Plus style={{ width: '16px', height: '16px' }} /> Add Product
        </button>
      </div>

      {/* Filter Bar */}
      <div className="glass-panel filter-bar" style={{ padding: '1rem 1.25rem' }}>
        <div className="search-input-wrapper">
          <Search />
          <input type="text" className="form-control" placeholder="Search product name, SKU…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="form-control filter-select" value={category} onChange={e => setCategory(e.target.value)}>
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
          <input type="checkbox" checked={lowStockOnly} onChange={e => setLowStock(e.target.checked)}
            style={{ accentColor: 'var(--primary)', width: '15px', height: '15px' }} />
          <AlertTriangle style={{ width: '14px', height: '14px', color: lowStockOnly ? 'var(--warning)' : 'var(--text-muted)' }} />
          Low Stock Only
        </label>
        {(search || category || lowStockOnly) && (
          <button className="btn btn-secondary btn-small" onClick={() => { setSearch(''); setCategory(''); setLowStock(false) }}>
            <RotateCcw style={{ width: '13px', height: '13px' }} /> Reset
          </button>
        )}
      </div>

      {/* Table */}
      <div className="glass-panel">
        {loading ? (
          <div className="flex-center" style={{ minHeight: '30vh', flexDirection: 'column', gap: '1rem' }}>
            <div className="spinner" />
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Loading products…</p>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center" style={{ padding: '3rem 0' }}>
            <Package style={{ width: '40px', height: '40px', color: 'var(--text-muted)', marginBottom: '0.75rem' }} />
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No products match your filters.</p>
            <button className="btn btn-secondary btn-small mt-2" onClick={() => { setSearch(''); setCategory(''); setLowStock(false) }}>Clear Filters</button>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Product</th>
                  <th>Category</th>
                  <th className="text-right">Price (₹)</th>
                  <th className="text-center">Stock</th>
                  <th className="text-center">Reorder Level</th>
                  <th className="text-center" style={{ width: '180px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map(p => {
                  const isLow = p.quantity_in_stock <= p.low_stock_threshold
                  return (
                    <tr key={p.id}>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.82rem', color: 'var(--primary)', fontWeight: 600 }}>{p.sku}</td>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.name}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.15rem', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.description || 'No description'}
                        </div>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.8rem', background: '#eff6ff', color: 'var(--primary)', padding: '0.2rem 0.55rem', borderRadius: '12px', fontWeight: 600, border: '1px solid #dbeafe' }}>
                          {p.category}
                        </span>
                      </td>
                      <td className="text-right" style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                        {formatINR(p.price)}
                      </td>
                      <td className="text-center">
                        <span className={`badge ${isLow ? 'badge-danger' : 'badge-success'}`} style={{ minWidth: '48px', justifyContent: 'center' }}>
                          {p.quantity_in_stock}
                        </span>
                      </td>
                      <td className="text-center" style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                        Min {p.low_stock_threshold}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                          <button className="btn btn-success btn-small" onClick={() => openRestock(p)} title="Add Stock">
                            <ArrowUpRight style={{ width: '13px', height: '13px' }} /> Restock
                          </button>
                          <button className="btn btn-secondary btn-small" style={{ padding: '0.375rem 0.5rem' }} onClick={() => openEdit(p)}>
                            <Edit3 style={{ width: '13px', height: '13px' }} />
                          </button>
                          <button className="btn btn-danger btn-small" style={{ padding: '0.375rem 0.5rem' }} onClick={() => handleDelete(p.id)}>
                            <Trash2 style={{ width: '13px', height: '13px' }} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {showProductModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{selectedProduct ? 'Edit Product' : 'Add New Product'}</h3>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }} onClick={() => setShowProductModal(false)}><X /></button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                {formError && <div className="error-box"><AlertTriangle style={{ width: '15px', height: '15px' }} />{formError}</div>}
                <div className="form-group">
                  <label className="form-label">SKU *</label>
                  <input type="text" className="form-control" placeholder="e.g. IND-MOB-001"
                    value={formData.sku} onChange={e => setFormData({ ...formData, sku: e.target.value })}
                    required disabled={!!selectedProduct} />
                </div>
                <div className="form-group">
                  <label className="form-label">Product Name *</label>
                  <input type="text" className="form-control" placeholder="e.g. Redmi Note 13 Pro"
                    value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="form-control" rows="2" placeholder="Product details…"
                    value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                  <div className="form-group">
                    <label className="form-label">Price (₹) *</label>
                    <input type="number" step="0.01" className="form-control" placeholder="e.g. 15999"
                      value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Category *</label>
                    <select className="form-control" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                {!selectedProduct && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                    <div className="form-group">
                      <label className="form-label">Opening Stock</label>
                      <input type="number" className="form-control" value={formData.quantity_in_stock}
                        onChange={e => setFormData({ ...formData, quantity_in_stock: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Reorder Level</label>
                      <input type="number" className="form-control" value={formData.low_stock_threshold}
                        onChange={e => setFormData({ ...formData, low_stock_threshold: e.target.value })} />
                    </div>
                  </div>
                )}
                {selectedProduct && (
                  <div className="form-group">
                    <label className="form-label">Reorder Level</label>
                    <input type="number" className="form-control" value={formData.low_stock_threshold}
                      onChange={e => setFormData({ ...formData, low_stock_threshold: e.target.value })} />
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowProductModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Product</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Restock Modal */}
      {showRestockModal && selectedProduct && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: '400px' }}>
            <div className="modal-header">
              <h3>Add Stock</h3>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }} onClick={() => setShowRestockModal(false)}><X /></button>
            </div>
            <form onSubmit={handleRestock}>
              <div className="modal-body">
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1rem' }}>
                  Adding stock to <strong>{selectedProduct.name}</strong>
                </p>
                <div className="form-group">
                  <label className="form-label">Quantity to Add *</label>
                  <input type="number" className="form-control" min="1" value={restockQty}
                    onChange={e => setRestockQty(e.target.value)} required />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0', fontSize: '0.875rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>New Stock Level:</span>
                  <strong style={{ color: 'var(--success)' }}>{Number(selectedProduct.quantity_in_stock) + Number(restockQty)} units</strong>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowRestockModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Confirm Restock</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Products
