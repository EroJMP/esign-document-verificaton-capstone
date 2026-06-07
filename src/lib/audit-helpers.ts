import { SupabaseClient, User } from '@supabase/supabase-js';

export interface AuditTrailEntry {
  user_id: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  details?: Record<string, any>;
  ip_address?: string;
}

/**
 * Log an admin action to the audit trail
 */
export async function logAdminAction(
  supabase: SupabaseClient,
  user: User,
  action: string,
  entityType: string,
  entityId?: string,
  details?: Record<string, any>,
  ipAddress?: string
): Promise<void> {
  try {
    const auditEntry: AuditTrailEntry = {
      user_id: user.id,
      action,
      entity_type: entityType,
      entity_id: entityId,
      details: details || {},
      ip_address: ipAddress
    };

    const { error } = await supabase
      .from('audit_trail')
      .insert(auditEntry);

    if (error) {
      console.error('Failed to log audit trail:', error);
      // Don't throw error to avoid breaking the main operation
    }
  } catch (error) {
    console.error('Error in logAdminAction:', error);
    // Don't throw error to avoid breaking the main operation
  }
}

/**
 * Extract IP address from NextRequest
 */
export function getClientIP(req: Request): string | undefined {
  const forwarded = req.headers.get('x-forwarded-for');
  const realIP = req.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  return undefined;
}

/**
 * Common audit actions for admin operations
 */
export const AUDIT_ACTIONS = {
  FORM_CREATED: 'form_created',
  FORM_UPDATED: 'form_updated',
  FORM_PUBLISHED: 'form_published',
  FORM_ARCHIVED: 'form_archived',
  FORM_DELETED: 'form_deleted',
  FORM_STATUS_CHANGED: 'form_status_changed',
  ACCESS_LINK_CREATED: 'access_link_created',
  ACCESS_LINK_DELETED: 'access_link_deleted',
} as const;

/**
 * Common entity types
 */
export const ENTITY_TYPES = {
  FORM: 'form',
  ACCESS_LINK: 'access_link',
} as const;
