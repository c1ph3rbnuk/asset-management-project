import { createClient } from '@supabase/supabase-js'
import { Asset, LifecycleAction, MaintenanceTicket, AuditLog, User } from '../types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseKey)

// Assets service
export const assetsService = {
  async getAll(): Promise<Asset[]> {
    const { data, error } = await supabase
      .from('assets')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data?.map(transformAssetFromDB) || []
  },

  async create(asset: Omit<Asset, 'id' | 'createdAt' | 'updatedAt'>): Promise<Asset> {
    const dbAsset = transformAssetToDB(asset)
    const { data, error } = await supabase
      .from('assets')
      .insert([dbAsset])
      .select()
      .single()
    
    if (error) throw error
    return transformAssetFromDB(data)
  },

  async update(id: string, updates: Partial<Asset>): Promise<Asset> {
    const dbUpdates = transformAssetToDB(updates)
    const { data, error } = await supabase
      .from('assets')
      .update({ ...dbUpdates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return transformAssetFromDB(data)
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('assets')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  }
}

// Lifecycle actions service
export const lifecycleService = {
  async getAll(): Promise<LifecycleAction[]> {
    const { data, error } = await supabase
      .from('lifecycle_actions')
      .select('*')
      .order('request_date', { ascending: false })
    
    if (error) throw error
    return data?.map(transformLifecycleFromDB) || []
  },

  async create(action: Omit<LifecycleAction, 'id'>): Promise<LifecycleAction> {
    const dbAction = transformLifecycleToDB(action)
    const { data, error } = await supabase
      .from('lifecycle_actions')
      .insert([dbAction])
      .select()
      .single()
    
    if (error) throw error
    return transformLifecycleFromDB(data)
  },

  async update(id: string, updates: Partial<LifecycleAction>): Promise<LifecycleAction> {
    const dbUpdates = transformLifecycleToDB(updates)
    const { data, error } = await supabase
      .from('lifecycle_actions')
      .update({ ...dbUpdates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return transformLifecycleFromDB(data)
  },

  async uploadMovementForm(file: File, actionId: string): Promise<string> {
    const fileExt = file.name.split('.').pop()
    const fileName = `${actionId}-movement-form.${fileExt}`
    const filePath = `movement-forms/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('asset-documents')
      .upload(filePath, file)

    if (uploadError) throw uploadError

    // Update the lifecycle action with the file path
    const { error: updateError } = await supabase
      .from('lifecycle_actions')
      .update({ movement_form_path: filePath })
      .eq('id', actionId)

    if (updateError) throw updateError

    return filePath
  },

  async getMovementFormUrl(filePath: string): Promise<string | null> {
    const { data } = await supabase.storage
      .from('asset-documents')
      .createSignedUrl(filePath, 3600) // 1 hour expiry

    return data?.signedUrl || null
  }
}

// Maintenance tickets service
export const maintenanceService = {
  async getAll(): Promise<MaintenanceTicket[]> {
    const { data, error } = await supabase
      .from('maintenance_tickets')
      .select('*')
      .order('date_received', { ascending: false })
    
    if (error) throw error
    return data?.map(transformMaintenanceFromDB) || []
  },

  async create(ticket: Omit<MaintenanceTicket, 'id' | 'createdAt' | 'updatedAt'>): Promise<MaintenanceTicket> {
    const dbTicket = transformMaintenanceToDB(ticket)
    const { data, error } = await supabase
      .from('maintenance_tickets')
      .insert([dbTicket])
      .select()
      .single()
    
    if (error) throw error
    return transformMaintenanceFromDB(data)
  },

  async update(id: string, updates: Partial<MaintenanceTicket>): Promise<MaintenanceTicket> {
    const dbUpdates = transformMaintenanceToDB(updates)
    const { data, error } = await supabase
      .from('maintenance_tickets')
      .update({ ...dbUpdates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return transformMaintenanceFromDB(data)
  }
}

// Audit logs service
export const auditService = {
  async getAll(): Promise<AuditLog[]> {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('timestamp', { ascending: false })
    
    if (error) throw error
    return data?.map(transformAuditFromDB) || []
  },

  async create(log: Omit<AuditLog, 'id'>): Promise<AuditLog> {
    const dbLog = transformAuditToDB(log)
    const { data, error } = await supabase
      .from('audit_logs')
      .insert([dbLog])
      .select()
      .single()
    
    if (error) throw error
    return transformAuditFromDB(data)
  }
}

// Users service
export const usersService = {
  async authenticate(personalNumber: string, password: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('personal_number', personalNumber)
      .eq('is_active', true)
      .single()
    
    if (error || !data) return error
    
    // Verify password (assuming passwords are stored as plain text for demo)
    // In production, you should hash passwords and compare hashes
    if (data.password !== password) {
      return data
    }
    
    // Update last login
    await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', data.id)
    
    return transformUserFromDB(data)
  },

  async getAll(): Promise<User[]> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data?.map(transformUserFromDB) || []
  }
}

// Asset status update service
export const assetStatusService = {
  async updateAssetStatus(assetId: string, newStatus: Asset['status']): Promise<void> {
    const { error } = await supabase
      .from('assets')
      .update({ 
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('tag', assetId)
    
    if (error) throw error
  },

  async updateAssetOwnership(assetId: string, newUser: string, newLocation: string, newDepartment: string, newStatus?: Asset['status']): Promise<void> {
    const updates: any = {
      user_name: newUser,
      location: newLocation,
      department: newDepartment,
      updated_at: new Date().toISOString()
    }
    
    if (newStatus) {
      updates.status = newStatus
    }
    
    const { error } = await supabase
      .from('assets')
      .update(updates)
      .eq('tag', assetId)
    
    if (error) throw error
  },
  async getAssetByTag(assetTag: string): Promise<Asset | null> {
    const { data, error } = await supabase
      .from('assets')
      .select('*')
      .eq('tag', assetTag)
      .single()
    
    if (error || !data) return null
    return transformAssetFromDB(data)
  }
}

// Transform functions to convert between DB format and app format
function transformAssetFromDB(dbAsset: any): Asset {
  return {
    id: dbAsset.id,
    assetType: dbAsset.asset_type,
    serialNumber: dbAsset.serial_number,
    model: dbAsset.model,
    tag: dbAsset.tag,
    brand: dbAsset.brand,
    user: dbAsset.user_name || '',
    location: dbAsset.location,
    department: dbAsset.department,
    status: dbAsset.status,
    createdAt: dbAsset.created_at,
    updatedAt: dbAsset.updated_at
  }
}

function transformAssetToDB(asset: Partial<Asset>): any {
  const dbAsset: any = {}
  
  if (asset.assetType) dbAsset.asset_type = asset.assetType
  if (asset.serialNumber) dbAsset.serial_number = asset.serialNumber
  if (asset.model) dbAsset.model = asset.model
  if (asset.tag) dbAsset.tag = asset.tag
  if (asset.brand) dbAsset.brand = asset.brand
  if (asset.user !== undefined) dbAsset.user_name = asset.user
  if (asset.location) dbAsset.location = asset.location
  if (asset.department) dbAsset.department = asset.department
  if (asset.status) dbAsset.status = asset.status
  
  return dbAsset
}

function transformLifecycleFromDB(dbAction: any): LifecycleAction {
  return {
    id: dbAction.id,
    assetId: dbAction.asset_id,
    actionType: dbAction.action_type,
    fromUser: dbAction.from_user,
    toUser: dbAction.to_user,
    fromLocation: dbAction.from_location,
    toLocation: dbAction.to_location,
    fromDepartment: dbAction.from_department,
    toDepartment: dbAction.to_department,
    requestedBy: dbAction.requested_by,
    status: dbAction.status,
    requestDate: dbAction.request_date,
    completionDate: dbAction.completion_date,
    comments: dbAction.comments,
    movementFormPath: dbAction.movement_form_path
  }
}

function transformLifecycleToDB(action: Partial<LifecycleAction>): any {
  const dbAction: any = {}
  
  // Required fields
  if (action.assetId) dbAction.asset_id = action.assetId
  if (action.actionType) dbAction.action_type = action.actionType
  if (action.toUser) dbAction.to_user = action.toUser
  if (action.toLocation) dbAction.to_location = action.toLocation
  if (action.toDepartment) dbAction.to_department = action.toDepartment
  if (action.requestedBy) dbAction.requested_by = action.requestedBy
  if (action.status) dbAction.status = action.status
  if (action.requestDate) dbAction.request_date = action.requestDate
  
  // Optional fields
  if (action.fromUser !== undefined) dbAction.from_user = action.fromUser
  if (action.fromLocation !== undefined) dbAction.from_location = action.fromLocation
  if (action.fromDepartment !== undefined) dbAction.from_department = action.fromDepartment
  if (action.completionDate !== undefined) dbAction.completion_date = action.completionDate
  if (action.comments !== undefined) dbAction.comments = action.comments
  if (action.movementFormPath !== undefined) dbAction.movement_form_path = action.movementFormPath
  
  return dbAction
}

function transformMaintenanceFromDB(dbTicket: any): MaintenanceTicket {
  return {
    id: dbTicket.id,
    assetId: dbTicket.asset_id,
    title: dbTicket.title,
    description: dbTicket.description,
    priority: dbTicket.priority,
    status: dbTicket.status,
    reportedBy: dbTicket.reported_by,
    assignedTo: dbTicket.assigned_to,
    dateReceived: dbTicket.date_received,
    dateReturned: dbTicket.date_returned,
    resolution: dbTicket.resolution,
    category: dbTicket.category,
    cost: dbTicket.cost,
    obsoleteReason: dbTicket.obsolete_reason,
    obsoleteDate: dbTicket.obsolete_date,
    createdAt: dbTicket.created_at,
    updatedAt: dbTicket.updated_at
  }
}

function transformMaintenanceToDB(ticket: Partial<MaintenanceTicket>): any {
  const dbTicket: any = {}
  
  if (ticket.assetId) dbTicket.asset_id = ticket.assetId
  if (ticket.title) dbTicket.title = ticket.title
  if (ticket.description) dbTicket.description = ticket.description
  if (ticket.priority) dbTicket.priority = ticket.priority
  if (ticket.status) dbTicket.status = ticket.status
  if (ticket.reportedBy) dbTicket.reported_by = ticket.reportedBy
  if (ticket.assignedTo) dbTicket.assigned_to = ticket.assignedTo
  if (ticket.dateReceived) dbTicket.date_received = ticket.dateReceived
  if (ticket.dateReturned) dbTicket.date_returned = ticket.dateReturned
  if (ticket.resolution) dbTicket.resolution = ticket.resolution
  if (ticket.category) dbTicket.category = ticket.category
  if (ticket.cost) dbTicket.cost = ticket.cost
  if (ticket.obsoleteReason) dbTicket.obsolete_reason = ticket.obsoleteReason
  if (ticket.obsoleteDate) dbTicket.obsolete_date = ticket.obsoleteDate
  
  return dbTicket
}

function transformAuditFromDB(dbLog: any): AuditLog {
  return {
    id: dbLog.id,
    assetId: dbLog.asset_id,
    action: dbLog.action,
    performedBy: dbLog.performed_by,
    timestamp: dbLog.timestamp,
    details: dbLog.details,
    oldValues: dbLog.old_values,
    newValues: dbLog.new_values
  }
}

function transformAuditToDB(log: Partial<AuditLog>): any {
  const dbLog: any = {}
  
  if (log.assetId) dbLog.asset_id = log.assetId
  if (log.action) dbLog.action = log.action
  if (log.performedBy) dbLog.performed_by = log.performedBy
  if (log.timestamp) dbLog.timestamp = log.timestamp
  if (log.details) dbLog.details = log.details
  if (log.oldValues) dbLog.old_values = log.oldValues
  if (log.newValues) dbLog.new_values = log.newValues
  
  return dbLog
}

function transformUserFromDB(dbUser: any): User {
  return {
    id: dbUser.id,
    name: dbUser.name,
    email: dbUser.email,
    role: dbUser.role,
    department: dbUser.department,
    isActive: dbUser.is_active,
    createdAt: dbUser.created_at
  }
}