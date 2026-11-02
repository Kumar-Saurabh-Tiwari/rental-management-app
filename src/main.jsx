import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  ArrowUpRight, Bell, Bolt, Building2, CalendarDays, Car, Check, ChevronDown,
  CircleDollarSign, FileText, Home, LayoutDashboard, Lightbulb, Menu, MoreHorizontal,
  Plus, Search, Settings, ShieldCheck, UserRound, Users, WalletCards, X, Zap
} from 'lucide-react'
import './styles.css'
import { createTenantRecord, isSupabaseConfigured, loadRentalData, recordPayment, saveElectricityBill } from './supabaseClient'

const tenantsSeed = [
  { id: 1, name: 'Aarav Mehta', initials: 'AM', room: 'A-204', type: 'Deluxe', rent: 18500, bill: 1280, status: 'Paid', model: 'Postpaid', phone: '+91 98765 43210', moveIn: '12 Jan 2024', color: 'coral' },
  { id: 2, name: 'Priya Sharma', initials: 'PS', room: 'B-102', type: 'Single', rent: 14000, bill: 940, status: 'Due soon', model: 'Prepaid', phone: '+91 99887 66554', moveIn: '04 Mar 2024', color: 'lavender' },
  { id: 3, name: 'Rohan Kapoor', initials: 'RK', room: 'A-101', type: 'Double', rent: 16000, bill: 1560, status: 'Overdue', model: 'Postpaid', phone: '+91 91234 56789', moveIn: '22 Nov 2023', color: 'mint' },
  { id: 4, name: 'Neha Verma', initials: 'NV', room: 'C-303', type: 'Single', rent: 14500, bill: 870, status: 'Paid', model: 'Postpaid', phone: '+91 90000 11223', moveIn: '18 Aug 2024', color: 'peach' },
]

const formatMoney = (value) => `₹${value.toLocaleString('en-IN')}`

function App() {
  const [active, setActive] = useState('Overview')
  const [tenants, setTenants] = useState(tenantsSeed)
  const [selectedTenant, setSelectedTenant] = useState(tenantsSeed[0])
  const [modal, setModal] = useState(null)
  const [toast, setToast] = useState('')
  const [search, setSearch] = useState('')
  const [darkMode, setDarkMode] = useState(false)
  const [dataSource, setDataSource] = useState(isSupabaseConfigured ? 'connecting' : 'demo')
  const [profileOpen, setProfileOpen] = useState(false)

  const filteredTenants = useMemo(() => tenants.filter(t => t.name.toLowerCase().includes(search.toLowerCase()) || t.room.toLowerCase().includes(search.toLowerCase())), [tenants, search])
  const notify = (message) => { setToast(message); window.setTimeout(() => setToast(''), 2600) }
  useEffect(() => {
    if (!isSupabaseConfigured) return
    loadRentalData().then((result) => {
      if (result?.tenants?.length) {
        setTenants(result.tenants)
        setSelectedTenant(result.tenants[0])
      }
      setDataSource('live')
    }).catch((error) => {
      console.error('Unable to load Supabase rental data', error)
      setDataSource('demo')
      notify('Supabase could not be reached; showing demo data')
    })
  }, [])
  const addPayment = async (event) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    try {
      await recordPayment({ tenantId: selectedTenant.id, amount: Number(form.get('amount')), reference: form.get('reference') })
    } catch (error) {
      console.error('Unable to record payment', error)
      notify('Payment could not be saved')
      return
    }
    setTenants(items => items.map(t => t.id === selectedTenant.id ? { ...t, status: 'Paid' } : t))
    setSelectedTenant(t => ({ ...t, status: 'Paid' }))
    setModal(null)
    notify('Payment recorded successfully')
  }
  const addTenant = async (event) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const name = form.get('name') || 'New tenant'
    const next = { id: Date.now(), name, initials: name.split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase(), room: form.get('room') || 'A-105', type: 'Single', rent: Number(form.get('rent')) || 14000, bill: 0, status: 'Due soon', model: 'Postpaid', phone: form.get('phone') || '—', moveIn: 'Today', color: 'blue' }
    if (isSupabaseConfigured) {
      try {
        const saved = await createTenantRecord({ name, roomNumber: next.room, rent: next.rent, phone: next.phone })
        if (saved?.id) next.id = saved.id
      } catch (error) {
        console.error('Unable to create tenant in Supabase', error)
        notify('Tenant could not be saved')
        return
      }
    }
    setTenants(items => [next, ...items]); setSelectedTenant(next); setModal(null); notify(`${name} added to your tenants`)
  }
  const addElectricityBill = async (event) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const tenantId = form.get('tenant')
    const tenant = tenants.find(item => String(item.id) === String(tenantId)) || selectedTenant
    const previousReading = Number(form.get('previousReading')) || 0
    const currentReading = Number(form.get('currentReading')) || 0
    const ratePerUnit = Number(form.get('ratePerUnit')) || 10
    if (currentReading < previousReading) {
      notify('Latest reading must be greater than the last reading')
      return
    }
    try {
      await saveElectricityBill({ tenantId, monthYear: form.get('monthYear'), previousReading, currentReading, ratePerUnit, meterFile: form.get('meterPhoto') })
    } catch (error) {
      console.error('Unable to save electricity bill', error)
      notify(error.message || 'Electricity bill could not be saved')
      return
    }
    const bill = (currentReading - previousReading) * ratePerUnit
    const updated = { ...tenant, bill, status: 'Due soon' }
    setTenants(items => items.map(item => item.id === tenant.id ? updated : item))
    setSelectedTenant(updated)
    setModal(null)
    notify(`Bill generated: ${formatMoney(bill)} for ${currentReading - previousReading} units`)
  }

  return (
    <div className={darkMode ? 'app dark' : 'app'}>
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark"><Home size={19} strokeWidth={2.6} /></div><span>nestly</span></div>
        <div className="workspace-switch"><div className="workspace-avatar">RB</div><div><strong>RB Tiwari's Properties</strong><small>Landlord workspace</small></div><ChevronDown size={16} /></div>
        <nav>
          <p className="nav-label">Workspace</p>
          {[['Overview', LayoutDashboard], ['Tenants', Users], ['Rooms', Building2], ['Payments', WalletCards], ['Utilities', Zap]].map(([label, Icon]) =>
            <button key={label} className={active === label ? 'nav-item active' : 'nav-item'} onClick={() => { setActive(label); if (label === 'Utilities') setModal('bill') }}><Icon size={18} /><span>{label}</span>{label === 'Tenants' && <em>12</em>}</button>
          )}
          <p className="nav-label nav-bottom">Manage</p>
          <button className="nav-item" onClick={() => notify('Settings are coming soon')}><Settings size={18} /><span>Settings</span></button>
          <button className="nav-item" onClick={() => notify('Help center opened')}><ShieldCheck size={18} /><span>Help center</span></button>
        </nav>
        <div className="sidebar-footer"><div className="upgrade-card"><div className="sparkle">✦</div><strong>Unlock more with Pro</strong><p>Automate your rent collection and more.</p><button onClick={() => notify('Pro plan request sent')}>Explore Pro <ArrowUpRight size={14} /></button></div><div className="profile-row"><div className="avatar">RB</div><div><strong>RB Tiwari</strong><small>Landlord workspace</small></div><MoreHorizontal size={18} /></div></div>
      </aside>
      <main className="main">
        <header className="topbar"><button className="mobile-menu" onClick={() => notify('Use the tabs below to navigate')}><Menu size={21} /></button><div className="breadcrumb"><span>RB Tiwari's Properties</span><span>/</span><strong>{active}</strong></div><div className="top-actions"><div className="search"><Search size={17} /><input placeholder="Search anything" value={search} onChange={e => setSearch(e.target.value)} /></div><span className={`connection-state ${dataSource}`} title={dataSource === 'live' ? 'Connected to Supabase' : 'Using local demo data'}>{dataSource === 'live' ? 'Live' : dataSource === 'connecting' ? 'Connecting…' : 'Demo'}</span><button className="icon-btn theme-toggle" onClick={() => setDarkMode(v => !v)} aria-label="Toggle dark mode">{darkMode ? '☀' : '☾'}</button><button className="icon-btn notification" onClick={() => notify('You have 3 unread notifications')}><Bell size={18} /><i /></button><div className="top-avatar">RB</div></div></header>
        <div className="content">
          <div className="welcome-row"><div><p className="eyebrow">MONDAY, 14 OCTOBER 2024</p><h1>Good morning, RB Tiwari <span>✦</span></h1><p className="subtext">Here's what is happening with your properties today.</p></div><button className="primary-btn" onClick={() => setModal('tenant')}><Plus size={18} /> Add new tenant</button></div>
          <section className="stats-grid">
            <StatCard label="Total rooms" value="24" foot="12 occupied · 12 vacant" icon={Building2} tone="violet" />
            <StatCard label="Occupancy rate" value="50%" foot="+4.2% from last month" icon={Users} tone="blue" trend />
            <StatCard label="Pending rent" value={formatMoney(52000)} foot="3 payments awaiting" icon={CircleDollarSign} tone="amber" />
            <StatCard label="Electricity dues" value={formatMoney(11280)} foot="For October 2024" icon={Lightbulb} tone="green" />
          </section>
          <div className="quick-actions"><button onClick={() => setModal('tenant')}><Users size={16} /> Add new tenant</button><button onClick={() => setModal('bill')}><Zap size={16} /> Upload monthly bill</button><button onClick={() => setModal('payment')}><CircleDollarSign size={16} /> Record payment</button></div>
          <div className="dashboard-grid">
            <section className="panel tenants-panel"><div className="panel-heading"><div><h2>Recent tenants</h2><p>Keep track of your latest residents</p></div><button className="link-btn" onClick={() => setActive('Tenants')}>View all <ArrowUpRight size={15} /></button></div><div className="tenant-table"><div className="table-head"><span>Tenant</span><span>Room</span><span>Monthly total</span><span>Status</span><span></span></div>{filteredTenants.slice(0, 4).map(t => <button className="tenant-row" key={t.id} onClick={() => setSelectedTenant(t)}><span className="tenant-name"><span className={`tenant-avatar ${t.color}`}>{t.initials}</span><span><strong>{t.name}</strong><small>{t.phone}</small></span></span><span><strong>{t.room}</strong><small>{t.type} room</small></span><span><strong>{formatMoney(t.rent + t.bill)}</strong><small>Rent {formatMoney(t.rent)}</small></span><Status status={t.status} /><MoreHorizontal size={18} className="row-more" /></button>)}</div></section>
            <section className="panel due-panel"><div className="panel-heading"><div><h2>Upcoming dues</h2><p>October 2024 collection</p></div><button className="round-btn" onClick={() => setModal('payment')}><Plus size={17} /></button></div><div className="progress-wrap"><div className="progress-label"><strong>Collection progress</strong><span>68%</span></div><div className="progress"><div style={{ width: '68%' }} /></div><small>₹1,24,500 collected of ₹1,83,300</small></div><div className="due-list">{tenants.slice(1, 4).map(t => <button key={t.id} className="due-item" onClick={() => { setSelectedTenant(t); setModal('payment') }}><span className={`mini-avatar ${t.color}`}>{t.initials}</span><span><strong>{t.name}</strong><small>{t.room} · Due 15 Oct</small></span><b>{formatMoney(t.rent + t.bill)}</b></button>)}</div><button className="full-link" onClick={() => setActive('Payments')}>Open payment tracker <ArrowUpRight size={15} /></button></section>
          </div>
          <div className="lower-grid"><section className="panel utility-card"><div className="panel-heading"><div><h2>Utility snapshot</h2><p>Electricity usage across properties</p></div><button className="filter-btn">This month <ChevronDown size={14} /></button></div><div className="chart-area"><div className="chart-y"><span>2,000</span><span>1,500</span><span>1,000</span><span>500</span><span>0</span></div><div className="bars">{[42, 64, 51, 76, 58, 84, 68, 91, 73, 62, 80, 56].map((h, i) => <div className="bar-col" key={i}><div className="bar" style={{ height: `${h}%` }} /><small>{['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'][i]}</small></div>)}</div></div><div className="chart-legend"><span><i className="dot electricity" /> Electricity bill</span><span><i className="dot usage" /> Units consumed</span><strong>1,860 <small>units this month</small></strong></div></section><section className="panel notice-card"><div className="panel-heading"><div><h2>Notice board</h2><p>Updates for your tenants</p></div><button className="round-btn" onClick={() => notify('Notice composer opened')}><Plus size={17} /></button></div><div className="notice-item"><span className="notice-icon coral-icon"><CalendarDays size={17} /></span><div><strong>Water tank cleaning</strong><p>Scheduled for 18 October, 10:00 AM</p><small>Posted 2 days ago</small></div></div><div className="notice-item"><span className="notice-icon blue-icon"><Bell size={17} /></span><div><strong>Rent reminder</strong><p>Monthly rent is due by 15 October.</p><small>Posted 4 days ago</small></div></div><button className="full-link" onClick={() => notify('Notice board opened')}>Manage announcements <ArrowUpRight size={15} /></button></section></div>
          <div className="mobile-tabs">{[['Overview', LayoutDashboard], ['Tenants', Users], ['Payments', WalletCards], ['Utilities', Zap]].map(([label, Icon]) => <button className={active === label ? 'selected' : ''} key={label} onClick={() => setActive(label)}><Icon size={19} /><span>{label}</span></button>)}</div>
        </div>
      </main>
      {selectedTenant && !profileOpen && <aside className="tenant-drawer"><button className="drawer-close" onClick={() => setSelectedTenant(null)}><X size={18} /></button><div className={`drawer-avatar ${selectedTenant.color}`}>{selectedTenant.initials}</div><h2>{selectedTenant.name}</h2><p className="drawer-sub">{selectedTenant.room} · {selectedTenant.type} room</p><Status status={selectedTenant.status} /><div className="drawer-actions"><button onClick={() => setModal('payment')}><CircleDollarSign size={16} /> Record payment</button><button onClick={() => setProfileOpen(true)}><UserRound size={16} /> Full profile</button></div><div className="drawer-section"><h3>Lease details</h3><div className="detail-row"><span>Monthly rent</span><strong>{formatMoney(selectedTenant.rent)}</strong></div><div className="detail-row"><span>Payment model</span><strong>{selectedTenant.model}</strong></div><div className="detail-row"><span>Move-in date</span><strong>{selectedTenant.moveIn}</strong></div></div><div className="drawer-section"><h3>October bill <span>Due 15 Oct</span></h3><div className="bill-total"><span>Total payable</span><strong>{formatMoney(selectedTenant.rent + selectedTenant.bill)}</strong></div><div className="detail-row"><span>Room rent</span><span>{formatMoney(selectedTenant.rent)}</span></div><div className="detail-row"><span>Electricity · current month</span><span>{formatMoney(selectedTenant.bill)}</span></div></div><div className="drawer-section"><h3>Registered vehicle</h3><div className="vehicle"><Car size={16} /><span>MH 02 EQ 4821<small>Honda City · Car</small></span></div></div></aside>}
      {profileOpen && selectedTenant && <div className="profile-overlay"><div className="profile-page"><button className="profile-close" onClick={() => setProfileOpen(false)}><X size={19} /></button><div className="profile-hero"><div className={`profile-avatar ${selectedTenant.color}`}>{selectedTenant.initials}</div><div><p className="eyebrow">TENANT PROFILE</p><h2>{selectedTenant.name}</h2><p>{selectedTenant.room} · {selectedTenant.type} room</p><Status status={selectedTenant.status} /></div></div><div className="profile-grid"><section className="profile-block"><h3>Personal details</h3><div className="profile-detail"><span>Phone number</span><strong>{selectedTenant.phone}</strong></div><div className="profile-detail"><span>Email</span><strong>{selectedTenant.name.toLowerCase().replace(' ', '.')}@email.com</strong></div><div className="profile-detail"><span>Emergency contact</span><strong>Not added</strong></div><div className="profile-detail"><span>Move-in date</span><strong>{selectedTenant.moveIn}</strong></div></section><section className="profile-block"><h3>Billing configuration</h3><div className="profile-detail"><span>Monthly rent</span><strong>{formatMoney(selectedTenant.rent)}</strong></div><div className="profile-detail"><span>Payment model</span><strong>{selectedTenant.model} {selectedTenant.model === 'Prepaid' ? '(Advance)' : '(End of month)'}</strong></div><button className="profile-action" onClick={() => setModal('bill')}><Zap size={15} /> Add electricity reading</button></section><section className="profile-block"><h3>ID proofs</h3><div className="document-card"><FileText size={17} /><span>Aadhaar card<small>Not uploaded</small></span><button onClick={() => notify('Document upload is ready to connect to Supabase Storage')}>Upload</button></div><div className="document-card"><FileText size={17} /><span>PAN card<small>Not uploaded</small></span><button onClick={() => notify('Document upload is ready to connect to Supabase Storage')}>Upload</button></div></section><section className="profile-block"><h3>Registered vehicles</h3><div className="vehicle"><Car size={16} /><span>MH 02 EQ 4821<small>Honda City · Car</small></span></div></section></div></div></div>}
      {modal && <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && setModal(null)}><div className="modal"><button className="modal-close" onClick={() => setModal(null)}><X size={18} /></button>{modal === 'tenant' ? <><div className="modal-icon violet-icon"><Users size={20} /></div><h2>Add a new tenant</h2><p>Enter the resident's details to create a profile.</p><form onSubmit={addTenant}><label>Full name<input name="name" required placeholder="e.g. Kabir Singh" /></label><div className="form-grid"><label>Room number<input name="room" placeholder="e.g. B-204" /></label><label>Monthly rent<input name="rent" type="number" placeholder="15000" /></label></div><label>Phone number<input name="phone" placeholder="+91 98765 43210" /></label><button className="primary-btn submit-btn">Create tenant <Check size={17} /></button></form></> : modal === 'bill' ? <><div className="modal-icon amber-icon"><Zap size={20} /></div><h2>Monthly electricity bill</h2><p>Enter the latest meter reading. Units are calculated automatically.</p><form onSubmit={addElectricityBill}><label>Tenant<select name="tenant" defaultValue={selectedTenant?.id}>{tenants.map(t => <option key={t.id} value={t.id}>{t.name} · {t.room}</option>)}</select></label><div className="form-grid"><label>Billing month<input name="monthYear" type="month" defaultValue="2024-10" required /></label><label>Rate per unit<input name="ratePerUnit" type="number" defaultValue="10" min="0" step="0.01" required /></label></div><div className="form-grid"><label>Last bill reading<input name="previousReading" type="number" defaultValue="1200" min="0" required /></label><label>Latest reading<input name="currentReading" type="number" defaultValue="1328" min="0" required /></label></div><div className="calculation-preview"><span>Units consumed <strong>Latest − last reading</strong></span><b>Auto calculated at ₹10/unit</b></div><label className="upload-field">Meter photo<input name="meterPhoto" type="file" accept="image/*" capture="environment" required /><small>Take a photo directly from your phone camera</small></label><button className="primary-btn submit-btn">Generate bill <Check size={17} /></button></form></> : <><div className="modal-icon green-icon"><CircleDollarSign size={20} /></div><h2>Record payment</h2><p>Log a payment received from {selectedTenant?.name}.</p><form onSubmit={addPayment}><label>Tenant<select name="tenant" defaultValue={selectedTenant?.id}>{tenants.map(t => <option key={t.id} value={t.id}>{t.name} · {t.room}</option>)}</select></label><label>Amount<input name="amount" type="number" defaultValue={selectedTenant?.rent + selectedTenant?.bill} /></label><div className="form-grid"><label>Payment date<input type="date" defaultValue="2024-10-14" /></label><label>Reference<input name="reference" placeholder="UPI-482910" /></label></div><button className="primary-btn submit-btn">Save payment <Check size={17} /></button></form></>}</div></div>}
      {toast && <div className="toast"><Check size={16} />{toast}</div>}
    </div>
  )
}

function StatCard({ label, value, foot, icon: Icon, tone, trend }) { return <div className="stat-card"><div className={`stat-icon ${tone}`}><Icon size={19} /></div><p>{label}</p><h2>{value}</h2><small className={trend ? 'positive' : ''}>{trend && <ArrowUpRight size={13} />}{foot}</small></div> }
function Status({ status }) { return <span className={`status ${status.toLowerCase().replace(' ', '-')}`}><i />{status}</span> }

createRoot(document.getElementById('root')).render(<App />)
