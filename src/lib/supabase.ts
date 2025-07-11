import { createClient } from '@supabase/supabase-js'
import { Asset, LifecycleAction, MaintenanceTicket, AuditLog, User, AssetPair, UserDetails, AssetReplacement } from '../types'

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

  async getBySerial(serialNumber: string): Promise<Asset | null> {
    const { data, error } = await supabase
      .from('assets')
      .select('*')
      .eq('serial_number', serialNumber)
      .single()
    
    if (error && error.code !== 'PGRST116') throw error
    return data ? transformAssetFromDB(data) : null
  },

  async checkDuplicateSerial(serialNumber: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('assets')
      .select('id')
      .eq('serial_number', serialNumber)
      .single()
    
    if (error && error.code === 'PGRST116') return false // Not found
    if (error) throw error
    return !!data
  },

  async create(asset: Omit<Asset, 'id' | 'createdAt' | 'updatedAt'>): Promise<Asset> {
    // Check for duplicate serial number
    const isDuplicate = await this.checkDuplicateSerial(asset.serialNumber)
    if (isDuplicate) {
      throw new Error(`Asset with serial number ${asset.serialNumber} already exists`)
    }

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

  async updateBySerial(serialNumber: string, updates: Partial<Asset>): Promise<Asset> {
    const dbUpdates = transformAssetToDB(updates)
    const { data, error } = await supabase
      .from('assets')
      .update({ ...dbUpdates, updated_at: new Date().toISOString() })
      .eq('serial_number', serialNumber)
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

// Asset Pairs service
export const assetPairsService = {
  async getAll(): Promise<AssetPair[]> {
    const { data, error } = await supabase
      .from('asset_pairs')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data?.map(transformAssetPairFromDB) || []
  },

  async create(pair: Omit<AssetPair, 'id' | 'createdAt' | 'updatedAt'>): Promise<AssetPair> {
    const dbPair = transformAssetPairToDB(pair)
    const { data, error } = await supabase
      .from('asset_pairs')
      .insert([dbPair])
      .select()
      .single()
    
    if (error) throw error
    return transformAssetPairFromDB(data)
  },

  /*async getByAssetSerial(serialNumber: string): Promise<AssetPair | null> {
    const { data, error } = await supabase
      .from('asset_pairs')
      .select(`
        *,
        primary_asset:assets!asset_pairs_primary_asset_id_fkey(*),
        secondary_asset:assets!asset_pairs_secondary_asset_id_fkey(*)
      `)
      .or(`primary_asset.serial_number.eq.${serialNumber},secondary_asset.serial_number.eq.${serialNumber}`)
      .single()
    
    if (error && error.code !== 'PGRST116') throw error
    return data ? transformAssetPairFromDB(data) : null
  },*/
  async getByAssetSerial(serialNumber: string): Promise<AssetPair | null> {
  // Step 1: Get the asset ID
  const { data: asset, error: assetError } = await supabase
    .from('assets')
    .select('id')
    .eq('serial_number', serialNumber)
    .single();

  if (assetError || !asset) throw assetError ?? new Error('Asset not found');

  // Step 2: Find asset_pairs where asset is primary or secondary
  const { data, error } = await supabase
    .from('asset_pairs')
    .select(`
      *,
      primary_asset:assets!asset_pairs_primary_asset_id_fkey(*),
      secondary_asset:assets!asset_pairs_secondary_asset_id_fkey(*)
    `)
    .or(`primary_asset_id.eq.${asset.id},secondary_asset_id.eq.${asset.id}`)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') throw error;

  return data ? transformAssetPairFromDB(data) : null;
},

  async updateDeploymentStatus(pairId: string, isDeployed: boolean, userDetails?: any): Promise<void> {
    const updates: any = { 
      is_deployed: isDeployed,
      updated_at: new Date().toISOString()
    }
    
    if (userDetails) {
      updates.current_user = userDetails.fullName
      updates.current_location = userDetails.location
      updates.current_department = userDetails.department
      updates.current_section = userDetails.section
    }
    
    const { error } = await supabase
      .from('asset_pairs')
      .update(updates)
      .eq('id', pairId)
    
    if (error) throw error
  }
}

// User Details service
export const userDetailsService = {
  async getByDomainAccount(domainAccount: string): Promise<UserDetails | null> {
    const { data, error } = await supabase
      .from('user_details')
      .select('*')
      .eq('domain_account', domainAccount)
      .single()
    
    if (error && error.code !== 'PGRST116') throw error
    return data ? transformUserDetailsFromDB(data) : null
  },

  async create(userDetails: Omit<UserDetails, 'id' | 'createdAt' | 'updatedAt'>): Promise<UserDetails> {
    const dbUserDetails = transformUserDetailsToDB(userDetails)
    const { data, error } = await supabase
      .from('user_details')
      .insert([dbUserDetails])
      .select()
      .single()
    
    if (error) throw error
    return transformUserDetailsFromDB(data)
  },

  async update(id: string, updates: Partial<UserDetails>): Promise<UserDetails> {
    const dbUpdates = transformUserDetailsToDB(updates)
    const { data, error } = await supabase
      .from('user_details')
      .update({ ...dbUpdates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return transformUserDetailsFromDB(data)
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
      .createSignedUrl(filePath, 3600)

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

// Asset Replacements service
export const assetReplacementsService = {
  async create(replacement: Omit<AssetReplacement, 'id' | 'createdAt' | 'updatedAt'>): Promise<AssetReplacement> {
    const dbReplacement = transformAssetReplacementToDB(replacement)
    const { data, error } = await supabase
      .from('asset_replacements')
      .insert([dbReplacement])
      .select()
      .single()
    
    if (error) throw error
    return transformAssetReplacementFromDB(data)
  },

  async getByTicketId(ticketId: string): Promise<AssetReplacement[]> {
    const { data, error } = await supabase
      .from('asset_replacements')
      .select('*')
      .eq('maintenance_ticket_id', ticketId)
    
    if (error) throw error
    return data?.map(transformAssetReplacementFromDB) || []
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
    console.log('Attempting login with:', { personalNumber, password: '***' });
    
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('personal_number', personalNumber)
        .eq('is_active', true)
        .single()
      
      console.log('Database query result:', { data, error });
      
      if (error) {
        console.error('Database error:', error);
        if (error.code === 'PGRST116') {
          console.log('User not found');
          return null;
        }
        throw error;
      }
      
      if (!data) {
        console.log('No user data returned');
        return null;
      }
      
      console.log('User found, checking password...');
      console.log('Stored password:', data.password_hash);
      console.log('Provided password:', password);
      
      // Check password (case-sensitive comparison)
      if (data.password_hash !== password) {
        console.log('Password mismatch');
        return null;
      }
      
      console.log('Password matches, updating last login...');
      
      // Update last login
      await supabase
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', data.id)
      
      console.log('Login successful');
      return transformUserFromDB(data)
    } catch (err) {
      console.error('Authentication error:', err);
      return null;
    }
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
  async updateAssetStatus(serialNumber: string, newStatus: Asset['status']): Promise<void> {
    const { error } = await supabase
      .from('assets')
      .update({ 
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('serial_number', serialNumber)
    
    if (error) throw error
  },

  async updateAssetOwnership(serialNumber: string, userDetails: any, newStatus?: Asset['status']): Promise<void> {
    const updates: any = {
      user_name: userDetails.fullName,
      location: userDetails.location,
      department: userDetails.department,
      section: userDetails.section,
      domain_account: userDetails.domainAccount,
      updated_at: new Date().toISOString()
    }
    
    if (newStatus) {
      updates.status = newStatus
    }
    
    const { error } = await supabase
      .from('assets')
      .update(updates)
      .eq('serial_number', serialNumber)
    
    if (error) throw error
  },

  async getAssetBySerial(serialNumber: string): Promise<Asset | null> {
    const { data, error } = await supabase
      .from('assets')
      .select('*')
      .eq('serial_number', serialNumber)
      .single()
    
    if (error || !data) return null
    return transformAssetFromDB(data)
  }
}

// Transform functions
function transformAssetFromDB(dbAsset: any): Asset {
  return {
    id: dbAsset.id,
    assetType: dbAsset.asset_type,
    serialNumber: dbAsset.serial_number,
    model: dbAsset.model,
    brand: dbAsset.brand,
    user: dbAsset.user_name || '',
    location: dbAsset.location,
    department: dbAsset.department,
    section: dbAsset.section,
    status: dbAsset.status,
    pairId: dbAsset.pair_id,
    domainAccount: dbAsset.domain_account,
    createdAt: dbAsset.created_at,
    updatedAt: dbAsset.updated_at
  }
}

function transformAssetToDB(asset: Partial<Asset>): any {
  const dbAsset: any = {}
  
  if (asset.assetType) dbAsset.asset_type = asset.assetType
  if (asset.serialNumber) dbAsset.serial_number = asset.serialNumber
  if (asset.model) dbAsset.model = asset.model
  if (asset.brand) dbAsset.brand = asset.brand
  if (asset.user !== undefined) dbAsset.user_name = asset.user
  if (asset.location) dbAsset.location = asset.location
  if (asset.department) dbAsset.department = asset.department
  if (asset.section !== undefined) dbAsset.section = asset.section
  if (asset.status) dbAsset.status = asset.status
  if (asset.pairId !== undefined) dbAsset.pair_id = asset.pairId
  if (asset.domainAccount !== undefined) dbAsset.domain_account = asset.domainAccount
  
  return dbAsset
}

function transformAssetPairFromDB(dbPair: any): AssetPair {
  return {
    id: dbPair.id,
    primaryAssetId: dbPair.primary_asset_id,
    secondaryAssetId: dbPair.secondary_asset_id,
    pairType: dbPair.pair_type,
    isDeployed: dbPair.is_deployed,
    currentUser: dbPair.current_user,
    currentLocation: dbPair.current_location,
    currentDepartment: dbPair.current_department,
    currentSection: dbPair.current_section,
    createdAt: dbPair.created_at,
    updatedAt: dbPair.updated_at
  }
}

function transformAssetPairToDB(pair: Partial<AssetPair>): any {
  const dbPair: any = {}
  
  if (pair.primaryAssetId) dbPair.primary_asset_id = pair.primaryAssetId
  if (pair.secondaryAssetId) dbPair.secondary_asset_id = pair.secondaryAssetId
  if (pair.pairType) dbPair.pair_type = pair.pairType
  if (pair.isDeployed !== undefined) dbPair.is_deployed = pair.isDeployed
  if (pair.currentUser !== undefined) dbPair.current_user = pair.currentUser
  if (pair.currentLocation !== undefined) dbPair.current_location = pair.currentLocation
  if (pair.currentDepartment !== undefined) dbPair.current_department = pair.currentDepartment
  if (pair.currentSection !== undefined) dbPair.current_section = pair.currentSection
  
  return dbPair
}

function transformUserDetailsFromDB(dbUser: any): UserDetails {
  return {
    id: dbUser.id,
    fullName: dbUser.full_name,
    domainAccount: dbUser.domain_account,
    location: dbUser.location,
    department: dbUser.department,
    section: dbUser.section,
    isActive: dbUser.is_active,
    createdAt: dbUser.created_at,
    updatedAt: dbUser.updated_at
  }
}

function transformUserDetailsToDB(user: Partial<UserDetails>): any {
  const dbUser: any = {}
  
  if (user.fullName) dbUser.full_name = user.fullName
  if (user.domainAccount) dbUser.domain_account = user.domainAccount
  if (user.location) dbUser.location = user.location
  if (user.department) dbUser.department = user.department
  if (user.section) dbUser.section = user.section
  if (user.isActive !== undefined) dbUser.is_active = user.isActive
  
  return dbUser
}

function transformLifecycleFromDB(dbAction: any): LifecycleAction {
  return {
    id: dbAction.id,
    actionType: dbAction.action_type,
    primaryAssetSerial: dbAction.primary_asset_serial,
    secondaryAssetSerial: dbAction.secondary_asset_serial,
    assetPairType: dbAction.asset_pair_type,
    fromUserFullName: dbAction.from_user_full_name,
    fromUserDomainAccount: dbAction.from_user_domain_account,
    fromLocation: dbAction.from_location,
    fromDepartment: dbAction.from_department,
    fromSection: dbAction.from_section,
    toUserFullName: dbAction.to_user_full_name,
    toUserDomainAccount: dbAction.to_user_domain_account,
    toLocation: dbAction.to_location,
    toDepartment: dbAction.to_department,
    toSection: dbAction.to_section,
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
  
  if (action.actionType) dbAction.action_type = action.actionType
  if (action.primaryAssetSerial) dbAction.primary_asset_serial = action.primaryAssetSerial
  if (action.secondaryAssetSerial) dbAction.secondary_asset_serial = action.secondaryAssetSerial
  if (action.assetPairType) dbAction.asset_pair_type = action.assetPairType
  if (action.fromUserFullName !== undefined) dbAction.from_user_full_name = action.fromUserFullName
  if (action.fromUserDomainAccount !== undefined) dbAction.from_user_domain_account = action.fromUserDomainAccount
  if (action.fromLocation !== undefined) dbAction.from_location = action.fromLocation
  if (action.fromDepartment !== undefined) dbAction.from_department = action.fromDepartment
  if (action.fromSection !== undefined) dbAction.from_section = action.fromSection
  if (action.toUserFullName) dbAction.to_user_full_name = action.toUserFullName
  if (action.toUserDomainAccount) dbAction.to_user_domain_account = action.toUserDomainAccount
  if (action.toLocation) dbAction.to_location = action.toLocation
  if (action.toDepartment) dbAction.to_department = action.toDepartment
  if (action.toSection) dbAction.to_section = action.toSection
  if (action.requestedBy) dbAction.requested_by = action.requestedBy
  if (action.status) dbAction.status = action.status
  if (action.requestDate) dbAction.request_date = action.requestDate
  if (action.completionDate !== undefined) dbAction.completion_date = action.completionDate
  if (action.comments !== undefined) dbAction.comments = action.comments
  if (action.movementFormPath !== undefined) dbAction.movement_form_path = action.movementFormPath
  
  return dbAction
}

function transformMaintenanceFromDB(dbTicket: any): MaintenanceTicket {
  return {
    id: dbTicket.id,
    assetSerial: dbTicket.asset_serial,
    assetType: dbTicket.asset_type,
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
    isObsolete: dbTicket.is_obsolete,
    obsoleteReason: dbTicket.obsolete_reason,
    obsoleteDate: dbTicket.obsolete_date,
    requiresReplacement: dbTicket.requires_replacement,
    replacementAssetSerial: dbTicket.replacement_asset_serial,
    replacementAssetType: dbTicket.replacement_asset_type,
    replacementBrand: dbTicket.replacement_brand,
    replacementModel: dbTicket.replacement_model,
    replacementStatus: dbTicket.replacement_status,
    createdAt: dbTicket.created_at,
    updatedAt: dbTicket.updated_at
  }
}

function transformMaintenanceToDB(ticket: Partial<MaintenanceTicket>): any {
  const dbTicket: any = {}
  
  if (ticket.assetSerial) dbTicket.asset_serial = ticket.assetSerial
  if (ticket.assetType) dbTicket.asset_type = ticket.assetType
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
  if (ticket.isObsolete !== undefined) dbTicket.is_obsolete = ticket.isObsolete
  if (ticket.obsoleteReason) dbTicket.obsolete_reason = ticket.obsoleteReason
  if (ticket.obsoleteDate) dbTicket.obsolete_date = ticket.obsoleteDate
  if (ticket.requiresReplacement !== undefined) dbTicket.requires_replacement = ticket.requiresReplacement
  if (ticket.replacementAssetSerial) dbTicket.replacement_asset_serial = ticket.replacementAssetSerial
  if (ticket.replacementAssetType) dbTicket.replacement_asset_type = ticket.replacementAssetType
  if (ticket.replacementBrand) dbTicket.replacement_brand = ticket.replacementBrand
  if (ticket.replacementModel) dbTicket.replacement_model = ticket.replacementModel
  if (ticket.replacementStatus) dbTicket.replacement_status = ticket.replacementStatus
  
  return dbTicket
}

function transformAssetReplacementFromDB(dbReplacement: any): AssetReplacement {
  return {
    id: dbReplacement.id,
    originalAssetSerial: dbReplacement.original_asset_serial,
    replacementAssetSerial: dbReplacement.replacement_asset_serial,
    maintenanceTicketId: dbReplacement.maintenance_ticket_id,
    replacementReason: dbReplacement.replacement_reason,
    replacementDate: dbReplacement.replacement_date,
    deployedToUser: dbReplacement.deployed_to_user,
    deployedLocation: dbReplacement.deployed_location,
    status: dbReplacement.status,
    createdAt: dbReplacement.created_at,
    updatedAt: dbReplacement.updated_at
  }
}

function transformAssetReplacementToDB(replacement: Partial<AssetReplacement>): any {
  const dbReplacement: any = {}
  
  if (replacement.originalAssetSerial) dbReplacement.original_asset_serial = replacement.originalAssetSerial
  if (replacement.replacementAssetSerial) dbReplacement.replacement_asset_serial = replacement.replacementAssetSerial
  if (replacement.maintenanceTicketId) dbReplacement.maintenance_ticket_id = replacement.maintenanceTicketId
  if (replacement.replacementReason) dbReplacement.replacement_reason = replacement.replacementReason
  if (replacement.replacementDate) dbReplacement.replacement_date = replacement.replacementDate
  if (replacement.deployedToUser) dbReplacement.deployed_to_user = replacement.deployedToUser
  if (replacement.deployedLocation) dbReplacement.deployed_location = replacement.deployedLocation
  if (replacement.status) dbReplacement.status = replacement.status
  
  return dbReplacement
}

function transformAuditFromDB(dbLog: any): AuditLog {
  return {
    id: dbLog.id,
    assetSerial: dbLog.asset_serial,
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
  
  if (log.assetSerial) dbLog.asset_serial = log.assetSerial
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
    personalNumber: dbUser.personal_number,
    password: dbUser.password,
    role: dbUser.role,
    department: dbUser.department,
    isActive: dbUser.is_active,
    lastLogin: dbUser.last_login,
    createdAt: dbUser.created_at
  }
}