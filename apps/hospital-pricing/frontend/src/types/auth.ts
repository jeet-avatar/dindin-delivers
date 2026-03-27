export type UserRole =
  | 'procurement_officer'
  | 'procurement_approver'
  | 'entity_admin'
  | 'platform_admin'

export interface EntityDetail {
  entity_id: string
  name: string
  is_covered_entity: boolean
  gpo_memberships: string[]
}

export interface CurrentUser {
  user_id: string
  entity_id: string
  email: string
  role: UserRole
  entity: EntityDetail
}

export interface LoginResponse {
  access_token: string
  token_type: string
}

// ---------------------------------------------------------------------------
// Legacy aliases kept for backward compatibility with api/auth.ts, hooks/useAuth.ts
// and contexts/AuthContext.tsx. These will be removed once those files are updated.
// ---------------------------------------------------------------------------
export interface LoginRequest {
  username: string
  password: string
}

/** @deprecated Use LoginResponse instead */
export type TokenResponse = LoginResponse

/** @deprecated Use CurrentUser instead */
export interface UserInfo {
  id: string
  username: string
  role: UserRole
  hospital_entity_id: string | null
}
