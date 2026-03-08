export interface PortalUser {
  id: string;
  user_id: string | null;
  client_id: string;
  email: string;
  full_name: string;
  status: 'invited' | 'active' | 'deactivated';
  invited_at: string;
  activated_at: string | null;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PortalInvite {
  id: string;
  client_id: string;
  email: string;
  token: string;
  expires_at: string;
  accepted_at: string | null;
  invited_by: string | null;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  created_at: string;
}

export interface PortalBranding {
  id: string;
  client_id: string | null;
  portal_title: string;
  logo_url: string | null;
  accent_color: string;
  agency_label: string | null;
  created_at: string;
  updated_at: string;
}
