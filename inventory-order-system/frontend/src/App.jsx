import React, { useState } from 'react'
import {
  LayoutDashboard,
  Package,
  Users,
  ShoppingCart,
  History,
  IndianRupee
} from 'lucide-react'

import Dashboard  from './pages/Dashboard'
import Products   from './pages/Products'
import Customers  from './pages/Customers'
import Orders     from './pages/Orders'
import Inventory  from './pages/Inventory'

export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

function App() {
  const [activeTab, setActiveTab] = useState('dashboard')

  const renderPage = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard onNavigate={setActiveTab} />
      case 'products':  return <Products />
      case 'customers': return <Customers />
      case 'orders':    return <Orders />
      case 'inventory': return <Inventory />
      default:          return <Dashboard onNavigate={setActiveTab} />
    }
  }

  const navItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'products',  icon: Package,         label: 'Products' },
    { id: 'customers', icon: Users,           label: 'Customers' },
    { id: 'orders',    icon: ShoppingCart,    label: 'Orders' },
    { id: 'inventory', icon: History,         label: 'Ledger' },
  ]

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="logo-container">
            <div className="logo-icon">
              <IndianRupee style={{ width: '18px', height: '18px' }} />
            </div>
            <div>
              <div className="logo-text">NexusStock</div>
              <div className="logo-tagline">Inventory Suite · India</div>
            </div>
          </div>
        </div>

        <nav className="nav-links">
          <span className="nav-section-label">Main Menu</span>
          {navItems.map(({ id, icon: Icon, label }) => (
            <a
              key={id}
              className={`nav-item ${activeTab === id ? 'active' : ''}`}
              onClick={() => setActiveTab(id)}
            >
              <Icon />
              <span>{label}</span>
            </a>
          ))}
        </nav>

        <div className="nav-footer">
          <div>NexusStock v1.0</div>
          <div>Made for India 🇮🇳</div>
        </div>
      </aside>

      {/* Main Page */}
      <main className="main-content">
        {renderPage()}
      </main>
    </div>
  )
}

export default App
