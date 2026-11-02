import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.PROJECT_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)
export const supabase = isSupabaseConfigured ? createClient(supabaseUrl, supabaseAnonKey) : null

export async function signInLandlord(email, password) {
  if (!supabase) return { user: { email } }
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signOutLandlord() {
  if (supabase) {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }
}

export async function loadRentalData() {
  if (!supabase) return null

  const [{ data: rooms, error: roomsError }, { data: tenants, error: tenantsError }] = await Promise.all([
    supabase.from('rooms').select('*').order('room_number'),
    supabase.from('tenants').select('*, rooms(room_number, type, rent_amount)').order('created_at', { ascending: false }),
  ])
  if (roomsError) throw roomsError
  if (tenantsError) throw tenantsError

  const { data: bills, error: billsError } = await supabase
    .from('electricity_bills')
    .select('tenant_id, total_amount, status')
    .order('month_year', { ascending: false })
  if (billsError) throw billsError

  const latestBills = new Map()
  for (const bill of bills || []) {
    if (!latestBills.has(bill.tenant_id)) latestBills.set(bill.tenant_id, bill)
  }
  return {
    rooms: rooms || [],
    tenants: (tenants || []).map((tenant) => {
      const bill = latestBills.get(tenant.id)
      const room = tenant.rooms || {}
      return {
        id: tenant.id,
        name: tenant.name,
        initials: tenant.name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase(),
        room: room.room_number || 'Unassigned',
        type: room.type || 'Single',
        rent: Number(room.rent_amount || 0),
        bill: Number(bill?.total_amount || 0),
        status: bill?.status === 'Paid' ? 'Paid' : bill?.status === 'Delayed' ? 'Overdue' : 'Due soon',
        model: tenant.payment_model,
        phone: tenant.phone || '—',
        moveIn: tenant.move_in_date || '—',
        color: 'blue',
      }
    }),
  }
}

export async function createTenantRecord({ name, roomNumber, rent, phone }) {
  if (!supabase) return null
  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .upsert({ room_number: roomNumber, type: 'Single', rent_amount: rent, status: 'Occupied' }, { onConflict: 'room_number' })
    .select('id')
    .single()
  if (roomError) throw roomError
  const { data, error } = await supabase
    .from('tenants')
    .insert({ name, room_id: room.id, phone, payment_model: 'Postpaid', move_in_date: new Date().toISOString().slice(0, 10) })
    .select('*, rooms(room_number, type, rent_amount)')
    .single()
  if (error) throw error
  return data
}

export async function recordPayment({ tenantId, amount, reference }) {
  if (!supabase || typeof tenantId !== 'string') return
  const { error } = await supabase.from('payments').insert({
    tenant_id: tenantId,
    amount,
    payment_type: 'Combined',
    transaction_reference: reference || null,
  })
  if (error) throw error
}

export async function saveElectricityBill({ tenantId, monthYear, previousReading, currentReading, ratePerUnit, meterFile }) {
  if (!supabase || typeof tenantId !== 'string') return null
  let meterImageUrl = null
  if (meterFile) {
    const path = `${tenantId}/${monthYear}-${Date.now()}-${meterFile.name.replace(/[^a-zA-Z0-9._-]/g, '-')}`
    const { error: uploadError } = await supabase.storage.from('meter-images').upload(path, meterFile, { upsert: false })
    if (uploadError) throw new Error(`Meter photo upload failed. Create a public "meter-images" storage bucket in Supabase. ${uploadError.message}`)
    meterImageUrl = supabase.storage.from('meter-images').getPublicUrl(path).data.publicUrl
  }
  const unitsConsumed = Math.max(0, currentReading - previousReading)
  const { data, error } = await supabase.from('electricity_bills').upsert({
    tenant_id: tenantId,
    month_year: `${monthYear}-01`,
    previous_reading: previousReading,
    current_reading: currentReading,
    rate_per_unit: ratePerUnit,
    total_amount: unitsConsumed * ratePerUnit,
    meter_image_url: meterImageUrl,
    status: 'Unpaid',
  }, { onConflict: 'tenant_id,month_year' }).select().single()
  if (error) throw error
  return data
}
