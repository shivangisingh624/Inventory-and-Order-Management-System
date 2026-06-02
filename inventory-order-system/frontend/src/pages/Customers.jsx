import React, { useEffect, useState } from 'react'
import {
  Plus, Search, Edit3, Trash2, X,
  AlertTriangle, Mail, Phone, MapPin, Calendar, Users
} from 'lucide-react'
import { API_BASE } from '../App'

function Customers() {
  const [customers, setCustomers] = useState([])
  const [search, setSearch]       = useState('')
  const [loading, setLoading]     = useState(true)

  const [showModal, setShowModal]             = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [formData, setFormData]               = useState({ name: '', email: '', phone: '', address: '' })
  const [formError, setFormError]             = useState(null)

  useEffect(() => { fetchCustomers() }, [search])

  const fetchCustomers = async () => {
    try {
      setLoading(true)
      let url = `${API_BASE}/customers/?`
      if (search) url += `search=${encodeURIComponent(search)}`
      const res = await fetch(url)
      if (!res.ok) throw new Error()
      setCustomers(await res.json())
    } catch { /* silent */ }
    finally { setLoading(false) }
  }

  const openAdd = () => {
    setSelectedCustomer(null)
    setFormData({ name: '', email: '', phone: '', address: '' })
    setFormError(null); setShowModal(true)
  }

  const openEdit = (c) => {
    setSelectedCustomer(c)
    setFormData({ name: c.name, email: c.email, phone: c.phone || '', address: c.address || '' })
    setFormError(null); setShowModal(true)
  }

  const handleSave = async (e) => {
    e.preventDefault(); setFormError(null)
    if (!formData.name || !formData.email) { setFormError('Name and Email are required.'); return }
    try {
      const isEdit = !!selectedCustomer
      const res = await fetch(
        isEdit ? `${API_BASE}/customers/${selectedCustomer.id}` : `${API_BASE}/customers/`,
        { method: isEdit ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) }
      )
      if (!res.ok) { const err = await res.json(); throw new Error(err.detail || 'Save failed.') }
      setShowModal(false); fetchCustomers()
    } catch (err) { setFormError(err.message) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this customer and all their orders?')) return
    await fetch(`${API_BASE}/customers/${id}`, { method: 'DELETE' })
    fetchCustomers()
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title">
          <h1>Customer Accounts</h1>
          <p>Manage customer profiles and contact details.</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>
          <Plus style={{ width: '16px', height: '16px' }} /> Add Customer
        </button>
      </div>

      {/* Filter */}
      <div className="glass-panel filter-bar" style={{ padding: '1rem 1.25rem' }}>
        <div className="search-input-wrapper">
          <Search />
          <input type="text" className="form-control" placeholder="Search by name or email…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Table */}
      <div className="glass-panel">
        {loading ? (
          <div className="flex-center" style={{ minHeight: '28vh', flexDirection: 'column', gap: '1rem' }}>
            <div className="spinner" />
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Loading customers…</p>
          </div>
        ) : customers.length === 0 ? (
          <div className="text-center" style={{ padding: '3rem 0' }}>
            <Users style={{ width: '40px', height: '40px', color: 'var(--text-muted)', marginBottom: '0.75rem' }} />
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No customer profiles found.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Contact Details</th>
                  <th>Address</th>
                  <th>Member Since</th>
                  <th className="text-center" style={{ width: '100px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.map(c => (
                  <tr key={c.id}>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{c.name}</div>
                      <span style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>CUST-{String(c.id).padStart(4, '0')}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                        <Mail style={{ width: '13px', height: '13px', color: 'var(--primary)', flexShrink: 0 }} />
                        <a href={`mailto:${c.email}`} style={{ color: 'inherit', textDecoration: 'none' }}>{c.email}</a>
                      </div>
                      {c.phone && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                          <Phone style={{ width: '12px', height: '12px', color: 'var(--text-muted)', flexShrink: 0 }} />
                          {c.phone}
                        </div>
                      )}
                    </td>
                    <td>
                      {c.address ? (
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-secondary)', maxWidth: '250px', lineHeight: '1.35' }}>
                          <MapPin style={{ width: '13px', height: '13px', color: 'var(--secondary)', flexShrink: 0, marginTop: '0.1rem' }} />
                          {c.address}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>Not provided</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                        <Calendar style={{ width: '13px', height: '13px', color: 'var(--text-muted)' }} />
                        {new Date(c.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                        <button className="btn btn-secondary btn-small" style={{ padding: '0.35rem 0.5rem' }} onClick={() => openEdit(c)}>
                          <Edit3 style={{ width: '13px', height: '13px' }} />
                        </button>
                        <button className="btn btn-danger btn-small" style={{ padding: '0.35rem 0.5rem' }} onClick={() => handleDelete(c.id)}>
                          <Trash2 style={{ width: '13px', height: '13px' }} />
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

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{selectedCustomer ? 'Edit Customer' : 'Register Customer'}</h3>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }} onClick={() => setShowModal(false)}><X /></button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                {formError && <div className="error-box"><AlertTriangle style={{ width: '15px', height: '15px' }} />{formError}</div>}
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input type="text" className="form-control" placeholder="e.g. Rahul Sharma"
                    value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address *</label>
                  <input type="email" className="form-control" placeholder="e.g. rahul@example.com"
                    value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Mobile Number</label>
                  <input type="text" className="form-control" placeholder="e.g. +91 98765 43210"
                    value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Address</label>
                  <textarea className="form-control" rows="3" placeholder="e.g. 42, MG Road, Bengaluru, Karnataka - 560001"
                    value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Customers
