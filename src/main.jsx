import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  ArrowUpRight, Bell, Bolt, Building2, CalendarDays, Car, Check, ChevronDown,
  CircleDollarSign, FileText, Home, LayoutDashboard, Lightbulb, Menu, MoreHorizontal,
  Plus, Search, Settings, ShieldCheck, SlidersHorizontal, UserRound, Users, WalletCards, X, Zap
} from 'lucide-react'
import './styles.css'
import { createTenantRecord, isSupabaseConfigured, loadRentalData, recordPayment, saveElectricityBill, signInLandlord, signOutLandlord, supabase } from './supabaseClient'

const tenantsSeed = [
  { id: 1, name: 'Aarav Mehta', initials: 'AM', room: 'A-204', type: 'Deluxe', rent: 18500, bill: 1280, status: 'Paid', model: 'Postpaid', phone: '+91 98765 43210', moveIn: '12 Jan 2024', color: 'coral' },
  { id: 2, name: 'Priya Sharma', initials: 'PS', room: 'B-102', type: 'Single', rent: 14000, bill: 940, status: 'Due soon', model: 'Prepaid', phone: '+91 99887 66554', moveIn: '04 Mar 2024', color: 'lavender' },
  { id: 3, name: 'Rohan Kapoor', initials: 'RK', room: 'A-101', type: 'Double', rent: 16000, bill: 1560, status: 'Overdue', model: 'Postpaid', phone: '+91 91234 56789', moveIn: '22 Nov 2023', color: 'mint' },
  { id: 4, name: 'Neha Verma', initials: 'NV', room: 'C-303', type: 'Single', rent: 14500, bill: 870, status: 'Paid', model: 'Postpaid', phone: '+91 90000 11223', moveIn: '18 Aug 2024', color: 'peach' },
]

const formatMoney = (value) => `₹${value.toLocaleString('en-IN')}`

function App() {
  const [user, setUser] = useState(isSupabaseConfigured ? null : { email: 'demo@nestly.app' })
  const [landlord, setLandlord] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('nestly-landlord-profile')) || { name: 'RB Tiwari', phone: '+91 98765 43210', email: 'rbtiwari@example.com', workspace: "RB Tiwari's Properties" }
    } catch {
      return { name: 'RB Tiwari', phone: '+91 98765 43210', email: 'rbtiwari@example.com', workspace: "RB Tiwari's Properties" }
    }
  })
  const [active, setActive] = useState('Overview')
  const [tenants, setTenants] = useState(tenantsSeed)
  const [selectedTenant, setSelectedTenant] = useState(tenantsSeed[0])
  const [modal, setModal] = useState(null)
  const [toast, setToast] = useState('')
  const [search, setSearch] = useState('')
  const [darkMode, setDarkMode] = useState(false)
  const [dataSource, setDataSource] = useState(isSupabaseConfigured ? 'connecting' : 'demo')
  const [profileOpen, setProfileOpen] = useState(false)
  const [landlordProfileOpen, setLandlordProfileOpen] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState('All statuses')
  const [roomFilter, setRoomFilter] = useState('All room types')
  const [paymentFilter, setPaymentFilter] = useState('All payment models')

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user || null))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user || null))
    return () => listener.subscription.unsubscribe()
  }, [])

  const filteredTenants = useMemo(() => {
    const query = search.trim().toLowerCase()
    return tenants.filter((tenant) => {
      const matchesSearch = !query || [tenant.name, tenant.room, tenant.phone, tenant.status, tenant.type, tenant.model].some(value => String(value).toLowerCase().includes(query))
      return matchesSearch && (statusFilter === 'All statuses' || tenant.status === statusFilter) && (roomFilter === 'All room types' || tenant.type === roomFilter) && (paymentFilter === 'All payment models' || tenant.model === paymentFilter)
    })
  }, [tenants, search, statusFilter, roomFilter, paymentFilter])
  const activeFilters = [statusFilter !== 'All statuses', roomFilter !== 'All room types', paymentFilter !== 'All payment models'].filter(Boolean).length
  const clearFilters = () => { setSearch(''); setStatusFilter('All statuses'); setRoomFilter('All room types'); setPaymentFilter('All payment models') }
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
      notify(error.message || 'Supabase could not be reached; showing demo data')
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
    if (!user) return <LoginScreen onLogin={setUser} />
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
        <div className="workspace-switch"><div className="workspace-avatar">{landlord.name.slice(0, 2).toUpperCase()}</div><div><strong>{landlord.workspace}</strong><small>Landlord workspace</small></div><ChevronDown size={16} /></div>
        <nav>
          <p className="nav-label">Workspace</p>
          {[['Overview', LayoutDashboard], ['Tenants', Users], ['Rooms', Building2], ['Payments', WalletCards], ['Utilities', Zap]].map(([label, Icon]) =>
            <button key={label} className={active === label ? 'nav-item active' : 'nav-item'} onClick={() => { setActive(label); if (label === 'Utilities') setModal('bill') }}><Icon size={18} /><span>{label}</span>{label === 'Tenants' && <em>12</em>}</button>
          )}
          <p className="nav-label nav-bottom">Manage</p>
          <button className="nav-item" onClick={() => notify('Settings are coming soon')}><Settings size={18} /><span>Settings</span></button>
          <button className="nav-item" onClick={() => notify('Help center opened')}><ShieldCheck size={18} /><span>Help center</span></button>
        </nav>
        <div className="sidebar-footer"><div className="upgrade-card"><div className="sparkle">✦</div><strong>Unlock more with Pro</strong><p>Automate your rent collection and more.</p><button onClick={() => notify('Pro plan request sent')}>Explore Pro <ArrowUpRight size={14} /></button></div><button className="profile-row" onClick={() => setLandlordProfileOpen(true)}><div className="avatar">{landlord.name.slice(0, 2).toUpperCase()}</div><div><strong>{landlord.name}</strong><small>Landlord workspace</small></div><MoreHorizontal size={18} /></button></div>
      </aside>
      <main className="main">
        <header className="topbar"><button className="mobile-menu" onClick={() => notify('Use the tabs below to navigate')}><Menu size={21} /></button><div className="breadcrumb"><span>{landlord.workspace}</span><span>/</span><strong>{active}</strong></div><div className="top-actions"><div className="search-wrap"><div className="search"><Search size={17} /><input aria-label="Search tenants" placeholder="Search tenants, rooms..." value={search} onChange={e => setSearch(e.target.value)} /><kbd>⌘ K</kbd>{search && <button className="search-clear" onClick={() => setSearch('')} aria-label="Clear search"><X size={14} /></button>}</div><button className={`filter-trigger ${activeFilters ? 'has-filters' : ''}`} onClick={() => setFiltersOpen(value => !value)} aria-label="Open filters"><SlidersHorizontal size={16} />{activeFilters > 0 && <b>{activeFilters}</b>}</button>{filtersOpen && <div className="filter-popover"><div className="filter-head"><strong>Filter workspace</strong><button onClick={clearFilters}>Clear all</button></div><label>Status<select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option>All statuses</option><option>Paid</option><option>Due soon</option><option>Overdue</option></select></label><label>Room type<select value={roomFilter} onChange={e => setRoomFilter(e.target.value)}><option>All room types</option><option>Single</option><option>Double</option><option>Deluxe</option></select></label><label>Payment model<select value={paymentFilter} onChange={e => setPaymentFilter(e.target.value)}><option>All payment models</option><option>Prepaid</option><option>Postpaid</option></select></label><button className="apply-filter" onClick={() => setFiltersOpen(false)}>Show {filteredTenants.length} results</button></div>}</div><span className={`connection-state ${dataSource}`} title={dataSource === 'live' ? 'Connected to Supabase' : 'Using local demo data'}>{dataSource === 'live' ? 'Live' : dataSource === 'connecting' ? 'Connecting…' : 'Demo'}</span><button className="icon-btn theme-toggle" onClick={() => setDarkMode(v => !v)} aria-label="Toggle dark mode">{darkMode ? '☀' : '☾'}</button><button className="icon-btn notification" onClick={() => notify('You have 3 unread notifications')}><Bell size={18} /><i /></button><button className="top-avatar" onClick={() => setLandlordProfileOpen(true)} aria-label="Open landlord profile">{landlord.name.slice(0, 2).toUpperCase()}</button></div></header>
        <div className="content">
          <div className="welcome-row"><div><p className="eyebrow">MONDAY, 14 OCTOBER 2024</p><h1>Good morning, {landlord.name} <span>✦</span></h1><p className="subtext">Here's what is happening with your properties today.</p></div><button className="primary-btn" onClick={() => setModal('tenant')}><Plus size={18} /> Add new tenant</button></div>
          <section className="stats-grid" style={{ display: active === 'Overview' ? undefined : 'none' }}>
            <StatCard label="Total rooms" value="24" foot="12 occupied · 12 vacant" icon={Building2} tone="violet" />
            <StatCard label="Occupancy rate" value="50%" foot="+4.2% from last month" icon={Users} tone="blue" trend />
            <StatCard label="Pending rent" value={formatMoney(52000)} foot="3 payments awaiting" icon={CircleDollarSign} tone="amber" />
            <StatCard label="Electricity dues" value={formatMoney(11280)} foot="For October 2024" icon={Lightbulb} tone="green" />
          </section>
          <div className="quick-actions" style={{ display: active === 'Overview' ? undefined : 'none' }}><button onClick={() => setModal('tenant')}><Users size={16} /> Add new tenant</button><button onClick={() => setModal('bill')}><Zap size={16} /> Upload monthly bill</button><button onClick={() => setModal('payment')}><CircleDollarSign size={16} /> Record payment</button></div>
          <div className="dashboard-grid" style={{ display: active === 'Overview' ? undefined : 'none' }}>
            <section className="panel tenants-panel"><div className="panel-heading"><div><h2>Recent tenants</h2><p>{search || activeFilters ? `${filteredTenants.length} matching residents` : 'Keep track of your latest residents'}</p></div><button className="link-btn" onClick={() => setActive('Tenants')}>View all <ArrowUpRight size={15} /></button></div><div className="tenant-table"><div className="table-head"><span>Tenant</span><span>Room</span><span>Monthly total</span><span>Status</span><span></span></div>{filteredTenants.slice(0, 4).map(t => <button className="tenant-row" key={t.id} onClick={() => setSelectedTenant(t)}><span className="tenant-name"><span className={`tenant-avatar ${t.color}`}>{t.initials}</span><span><strong>{t.name}</strong><small>{t.phone}</small></span></span><span><strong>{t.room}</strong><small>{t.type} room</small></span><span><strong>{formatMoney(t.rent + t.bill)}</strong><small>Rent {formatMoney(t.rent)}</small></span><Status status={t.status} /><MoreHorizontal size={18} className="row-more" /></button>)}{filteredTenants.length === 0 && <div className="empty-search"><Search size={20} /><strong>No residents found</strong><span>Try a different search or clear your filters.</span><button onClick={clearFilters}>Clear search</button></div>}</div></section>
            <section className="panel due-panel"><div className="panel-heading"><div><h2>Upcoming dues</h2><p>October 2024 collection</p></div><button className="round-btn" onClick={() => setModal('payment')}><Plus size={17} /></button></div><div className="progress-wrap"><div className="progress-label"><strong>Collection progress</strong><span>68%</span></div><div className="progress"><div style={{ width: '68%' }} /></div><small>₹1,24,500 collected of ₹1,83,300</small></div><div className="due-list">{tenants.slice(1, 4).map(t => <button key={t.id} className="due-item" onClick={() => { setSelectedTenant(t); setModal('payment') }}><span className={`mini-avatar ${t.color}`}>{t.initials}</span><span><strong>{t.name}</strong><small>{t.room} · Due 15 Oct</small></span><b>{formatMoney(t.rent + t.bill)}</b></button>)}</div><button className="full-link" onClick={() => setActive('Payments')}>Open payment tracker <ArrowUpRight size={15} /></button></section>
          </div>
          <div className="lower-grid" style={{ display: active === 'Overview' ? undefined : 'none' }}><section className="panel utility-card"><div className="panel-heading"><div><h2>Utility snapshot</h2><p>Electricity usage across properties</p></div><button className="filter-btn">This month <ChevronDown size={14} /></button></div><div className="chart-area"><div className="chart-y"><span>2,000</span><span>1,500</span><span>1,000</span><span>500</span><span>0</span></div><div className="bars">{[42, 64, 51, 76, 58, 84, 68, 91, 73, 62, 80, 56].map((h, i) => <div className="bar-col" key={i}><div className="bar" style={{ height: `${h}%` }} /><small>{['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'][i]}</small></div>)}</div></div><div className="chart-legend"><span><i className="dot electricity" /> Electricity bill</span><span><i className="dot usage" /> Units consumed</span><strong>1,860 <small>units this month</small></strong></div></section><section className="panel notice-card"><div className="panel-heading"><div><h2>Notice board</h2><p>Updates for your tenants</p></div><button className="round-btn" onClick={() => notify('Notice composer opened')}><Plus size={17} /></button></div><div className="notice-item"><span className="notice-icon coral-icon"><CalendarDays size={17} /></span><div><strong>Water tank cleaning</strong><p>Scheduled for 18 October, 10:00 AM</p><small>Posted 2 days ago</small></div></div><div className="notice-item"><span className="notice-icon blue-icon"><Bell size={17} /></span><div><strong>Rent reminder</strong><p>Monthly rent is due by 15 October.</p><small>Posted 4 days ago</small></div></div><button className="full-link" onClick={() => notify('Notice board opened')}>Manage announcements <ArrowUpRight size={15} /></button></section></div>
          {active !== 'Overview' && <WorkspaceView active={active} tenants={filteredTenants} setSelectedTenant={setSelectedTenant} setModal={setModal} notify={notify} />}
          <div className="mobile-tabs">{[['Overview', LayoutDashboard], ['Tenants', Users], ['Payments', WalletCards], ['Utilities', Zap]].map(([label, Icon]) => <button className={active === label ? 'selected' : ''} key={label} onClick={() => { setActive(label); if (label === 'Utilities') setModal('bill') }}><Icon size={19} /><span>{label}</span></button>)}</div>
        </div>
      </main>
      {selectedTenant && !profileOpen && <aside className="tenant-drawer"><button className="drawer-close" onClick={() => setSelectedTenant(null)}><X size={18} /></button><div className={`drawer-avatar ${selectedTenant.color}`}>{selectedTenant.initials}</div><h2>{selectedTenant.name}</h2><p className="drawer-sub">{selectedTenant.room} · {selectedTenant.type} room</p><Status status={selectedTenant.status} /><div className="drawer-actions"><button onClick={() => setModal('payment')}><CircleDollarSign size={16} /> Record payment</button><button onClick={() => setProfileOpen(true)}><UserRound size={16} /> Full profile</button></div><div className="drawer-section"><h3>Lease details</h3><div className="detail-row"><span>Monthly rent</span><strong>{formatMoney(selectedTenant.rent)}</strong></div><div className="detail-row"><span>Payment model</span><strong>{selectedTenant.model}</strong></div><div className="detail-row"><span>Move-in date</span><strong>{selectedTenant.moveIn}</strong></div></div><div className="drawer-section"><h3>October bill <span>Due 15 Oct</span></h3><div className="bill-total"><span>Total payable</span><strong>{formatMoney(selectedTenant.rent + selectedTenant.bill)}</strong></div><div className="detail-row"><span>Room rent</span><span>{formatMoney(selectedTenant.rent)}</span></div><div className="detail-row"><span>Electricity · current month</span><span>{formatMoney(selectedTenant.bill)}</span></div></div><div className="drawer-section"><h3>Registered vehicle</h3><div className="vehicle"><Car size={16} /><span>MH 02 EQ 4821<small>Honda City · Car</small></span></div></div></aside>}
      {profileOpen && selectedTenant && <div className="profile-overlay"><div className="profile-page"><button className="profile-close" onClick={() => setProfileOpen(false)}><X size={19} /></button><div className="profile-hero"><div className={`profile-avatar ${selectedTenant.color}`}>{selectedTenant.initials}</div><div><p className="eyebrow">TENANT PROFILE</p><h2>{selectedTenant.name}</h2><p>{selectedTenant.room} · {selectedTenant.type} room</p><Status status={selectedTenant.status} /></div></div><div className="profile-grid"><section className="profile-block"><h3>Personal details</h3><div className="profile-detail"><span>Phone number</span><strong>{selectedTenant.phone}</strong></div><div className="profile-detail"><span>Email</span><strong>{selectedTenant.name.toLowerCase().replace(' ', '.')}@email.com</strong></div><div className="profile-detail"><span>Emergency contact</span><strong>Not added</strong></div><div className="profile-detail"><span>Move-in date</span><strong>{selectedTenant.moveIn}</strong></div></section><section className="profile-block"><h3>Billing configuration</h3><div className="profile-detail"><span>Monthly rent</span><strong>{formatMoney(selectedTenant.rent)}</strong></div><div className="profile-detail"><span>Payment model</span><strong>{selectedTenant.model} {selectedTenant.model === 'Prepaid' ? '(Advance)' : '(End of month)'}</strong></div><button className="profile-action" onClick={() => setModal('bill')}><Zap size={15} /> Add electricity reading</button></section><section className="profile-block"><h3>ID proofs</h3><div className="document-card"><FileText size={17} /><span>Aadhaar card<small>Not uploaded</small></span><button onClick={() => notify('Document upload is ready to connect to Supabase Storage')}>Upload</button></div><div className="document-card"><FileText size={17} /><span>PAN card<small>Not uploaded</small></span><button onClick={() => notify('Document upload is ready to connect to Supabase Storage')}>Upload</button></div></section><section className="profile-block"><h3>Registered vehicles</h3><div className="vehicle"><Car size={16} /><span>MH 02 EQ 4821<small>Honda City · Car</small></span></div></section></div></div></div>}
      {landlordProfileOpen && <LandlordProfile landlord={landlord} onSave={(next) => { setLandlord(next); localStorage.setItem('nestly-landlord-profile', JSON.stringify(next)); notify('Landlord profile updated') }} onClose={() => setLandlordProfileOpen(false)} onSignOut={async () => { await signOutLandlord(); setUser(null) }} />}
      {modal && <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && setModal(null)}><div className="modal"><button className="modal-close" onClick={() => setModal(null)}><X size={18} /></button>{modal === 'tenant' ? <><div className="modal-icon violet-icon"><Users size={20} /></div><h2>Add a new tenant</h2><p>Enter the resident's details to create a profile.</p><form onSubmit={addTenant}><label>Full name<input name="name" required placeholder="e.g. Kabir Singh" /></label><div className="form-grid"><label>Room number<input name="room" placeholder="e.g. B-204" /></label><label>Monthly rent<input name="rent" type="number" placeholder="15000" /></label></div><label>Phone number<input name="phone" placeholder="+91 98765 43210" /></label><button className="primary-btn submit-btn">Create tenant <Check size={17} /></button></form></> : modal === 'bill' ? <><div className="modal-icon amber-icon"><Zap size={20} /></div><h2>Monthly electricity bill</h2><p>Enter the latest meter reading. Units are calculated automatically.</p><form onSubmit={addElectricityBill}><label>Tenant<select name="tenant" defaultValue={selectedTenant?.id}>{tenants.map(t => <option key={t.id} value={t.id}>{t.name} · {t.room}</option>)}</select></label><div className="form-grid"><label>Billing month<input name="monthYear" type="month" defaultValue="2024-10" required /></label><label>Rate per unit<input name="ratePerUnit" type="number" defaultValue="10" min="0" step="0.01" required /></label></div><div className="form-grid"><label>Last bill reading<input name="previousReading" type="number" defaultValue="1200" min="0" required /></label><label>Latest reading<input name="currentReading" type="number" defaultValue="1328" min="0" required /></label></div><div className="calculation-preview"><span>Units consumed <strong>Latest − last reading</strong></span><b>Auto calculated at ₹10/unit</b></div><label className="upload-field">Meter photo<input name="meterPhoto" type="file" accept="image/*" capture="environment" required /><small>Take a photo directly from your phone camera</small></label><button className="primary-btn submit-btn">Generate bill <Check size={17} /></button></form></> : <><div className="modal-icon green-icon"><CircleDollarSign size={20} /></div><h2>Record payment</h2><p>Log a payment received from {selectedTenant?.name}.</p><form onSubmit={addPayment}><label>Tenant<select name="tenant" defaultValue={selectedTenant?.id}>{tenants.map(t => <option key={t.id} value={t.id}>{t.name} · {t.room}</option>)}</select></label><label>Amount<input name="amount" type="number" defaultValue={selectedTenant?.rent + selectedTenant?.bill} /></label><div className="form-grid"><label>Payment date<input type="date" defaultValue="2024-10-14" /></label><label>Reference<input name="reference" placeholder="UPI-482910" /></label></div><button className="primary-btn submit-btn">Save payment <Check size={17} /></button></form></>}</div></div>}
      {toast && <div className="toast"><Check size={16} />{toast}</div>}
    </div>
  )
}

function WorkspaceView({ active, tenants, setSelectedTenant, setModal, notify }) {
  const title = active === 'Tenants' ? 'All tenants' : active === 'Rooms' ? 'Room inventory' : active === 'Payments' ? 'Payment tracker' : 'Utilities'
  const description = active === 'Tenants' ? 'Manage profiles, leases and resident details.' : active === 'Rooms' ? 'See occupancy across every room.' : active === 'Payments' ? 'Review collection status and record payments.' : 'Generate monthly meter bills with photo evidence.'
  return <section className="workspace-view"><div className="workspace-view-head"><div><p className="eyebrow">WORKSPACE</p><h2>{title}</h2><p>{description}</p></div><button className="primary-btn" onClick={() => setModal(active === 'Utilities' ? 'bill' : active === 'Payments' ? 'payment' : 'tenant')}><Plus size={17} /> {active === 'Utilities' ? 'Upload bill' : active === 'Payments' ? 'Record payment' : 'Add new tenant'}</button></div>{active === 'Rooms' ? <div className="room-grid">{['A-101', 'A-204', 'B-102', 'C-303', 'C-304', 'D-401'].map((room, index) => <div className="room-card" key={room}><span className={index % 3 === 1 ? 'room-status vacant' : 'room-status'}>{index % 3 === 1 ? 'Vacant' : 'Occupied'}</span><Building2 size={20} /><strong>{room}</strong><small>{index % 2 ? 'Single room' : 'Deluxe room'} · {index % 3 === 1 ? 'Ready to lease' : 'Tenant assigned'}</small></div>)}</div> : <div className="workspace-list">{tenants.map((tenant) => <button className="workspace-list-row" key={tenant.id} onClick={() => setSelectedTenant(tenant)}><span className={`tenant-avatar ${tenant.color}`}>{tenant.initials}</span><span><strong>{tenant.name}</strong><small>{tenant.room} · {tenant.type} · {tenant.phone}</small></span><b>{active === 'Payments' ? formatMoney(tenant.rent + tenant.bill) : active === 'Utilities' ? `${tenant.bill ? formatMoney(tenant.bill) : 'Add reading'}` : tenant.model}</b><Status status={tenant.status} /><ArrowUpRight size={16} /></button>)}</div>}{active === 'Utilities' && <div className="utility-tip"><Lightbulb size={17} /><span><strong>Monthly workflow</strong><small>Last reading → latest reading → units consumed × rate per unit. Meter photos are stored with each bill.</small></span><button onClick={() => notify('Choose a tenant and add the latest meter reading')}>How it works</button></div>}</section>
}

function LandlordProfile({ landlord, onSave, onClose, onSignOut }) {
  const [saved, setSaved] = useState(false)
  const submit = (event) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    onSave({ name: form.get('name'), phone: form.get('phone'), email: form.get('email'), workspace: form.get('workspace') })
    setSaved(true)
    window.setTimeout(() => setSaved(false), 2200)
  }
  return <div className="profile-overlay"><div className="profile-page landlord-profile-page"><button className="profile-close" onClick={onClose}><X size={19} /></button><div className="profile-hero"><div className="profile-avatar landlord-avatar">{landlord.name.slice(0, 2).toUpperCase()}</div><div><p className="eyebrow">LANDLORD ACCOUNT</p><h2>{landlord.name}</h2><p>Property owner · Nestly admin</p><span className="account-badge"><ShieldCheck size={12} /> Admin verified</span></div></div><form className="landlord-form" onSubmit={submit}><div className="form-grid"><label>Full name<input name="name" defaultValue={landlord.name} required /></label><label>Phone number<input name="phone" defaultValue={landlord.phone} required /></label></div><label>Email address<input name="email" type="email" defaultValue={landlord.email} required /></label><label>Property workspace<input name="workspace" defaultValue={landlord.workspace} required /></label><button type="submit" className="primary-btn submit-btn">{saved ? 'Profile updated ✓' : 'Save profile'} <Check size={16} /></button></form><div className="account-footer"><span><ShieldCheck size={15} /> Landlord-only access</span><button type="button" onClick={onSignOut}>Sign out</button></div></div></div>
}

function LoginScreen({ onLogin }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const submit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    const form = new FormData(event.currentTarget)
    try {
      const result = await signInLandlord(form.get('email'), form.get('password'))
      onLogin(result.user)
    } catch (loginError) {
      setError(loginError.message || 'Unable to sign in')
    } finally {
      setLoading(false)
    }
  }
  return <div className="login-shell"><div className="login-glow glow-one" /><div className="login-glow glow-two" /><section className="login-card"><div className="brand login-brand"><div className="brand-mark"><Home size={19} /></div><span>nestly</span></div><div className="login-kicker">LANDLORD PORTAL</div><h1>Welcome back, RB Tiwari</h1><p className="login-copy">Sign in to manage your tenants, rent collection and utilities.</p><form onSubmit={submit} className="login-form"><label>Email address<input name="email" type="email" placeholder="you@example.com" required autoComplete="email" /></label><label>Password<input name="password" type="password" placeholder="Enter your password" required autoComplete="current-password" /></label>{error && <div className="login-error">{error}</div>}<button className="primary-btn login-submit" disabled={loading}>{loading ? 'Signing in…' : 'Sign in to dashboard'} <ArrowUpRight size={16} /></button></form><div className="login-note"><ShieldCheck size={15} /> Admin access only · Tenant portal coming soon</div></section><div className="login-preview"><div className="preview-top"><span>RB Tiwari's Properties</span><span className="preview-dot">● Live</span></div><div className="preview-number">₹1,24,500 <small>collected this month</small></div><div className="preview-bars"><i /><i /><i /><i /><i /><i /><i /></div><div className="preview-caption">A calm, clear view of your properties.</div></div></div>
}

function StatCard({ label, value, foot, icon: Icon, tone, trend }) { return <div className="stat-card"><div className={`stat-icon ${tone}`}><Icon size={19} /></div><p>{label}</p><h2>{value}</h2><small className={trend ? 'positive' : ''}>{trend && <ArrowUpRight size={13} />}{foot}</small></div> }
function Status({ status }) { return <span className={`status ${status.toLowerCase().replace(' ', '-')}`}><i />{status}</span> }

createRoot(document.getElementById('root')).render(<App />)
