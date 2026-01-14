// Customer Apps Module Types

export interface CustomerAppsConfig {
  id: string;
  tenant_id: string;
  // App Branding
  app_name: string | null;
  app_icon_url: string | null;
  splash_screen_url: string | null;
  // Dashboard
  dashboard_banner_url: string | null;
  dashboard_banner_link: string | null;
  dashboard_announcement: string | null;
  dashboard_announcement_enabled: boolean;
  // Feature Toggles
  live_tv_enabled: boolean;
  ftp_enabled: boolean;
  news_enabled: boolean;
  referral_enabled: boolean;
  speed_test_enabled: boolean;
  // Colors
  primary_color: string;
  secondary_color: string;
  // Store Links
  android_app_url: string | null;
  ios_app_url: string | null;
  // App Control
  force_update_enabled: boolean;
  min_app_version: string | null;
  maintenance_mode: boolean;
  maintenance_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustomerAppsLink {
  id: string;
  tenant_id: string;
  category: string;
  title: string;
  url: string;
  icon_url: string | null;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  requires_login: boolean;
  open_in_browser: boolean;
  created_at: string;
  updated_at: string;
}

export type LinkCategory = 'live_tv' | 'ftp' | 'news' | 'custom';

export const LINK_CATEGORIES: { value: LinkCategory; label: string; icon: string }[] = [
  { value: 'live_tv', label: 'Live TV', icon: 'Tv' },
  { value: 'ftp', label: 'FTP Server', icon: 'Server' },
  { value: 'news', label: 'News', icon: 'Newspaper' },
  { value: 'custom', label: 'Custom Link', icon: 'Link' },
];
