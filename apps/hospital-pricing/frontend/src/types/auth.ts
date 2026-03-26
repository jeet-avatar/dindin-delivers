export interface LoginRequest { username: string; password: string; }
export interface TokenResponse { access_token: string; token_type: string; }
export interface UserInfo {
  id: string;
  username: string;
  role: 'admin' | 'analyst' | 'viewer' | 'api_service';
  hospital_entity_id: string | null;
}
