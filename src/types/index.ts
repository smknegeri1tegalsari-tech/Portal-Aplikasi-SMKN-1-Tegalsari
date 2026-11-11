export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'GURU' | 'SISWA';

export interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: UserRole;
  department: string;
  allowedAppIds?: string[]; // If empty or undefined, access is governed by role
  isActive: boolean;
  avatarUrl?: string;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Application {
  id: string;
  name: string;
  description: string;
  categoryId: string;
  iconName: string;
  targetUrl: string;
  allowedRoles: UserRole[];
  allowedUserIds?: string[];
  isActive: boolean;
  sortOrder: number;
  openCount: number;
  badge?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  icon?: string;
  sortOrder: number;
  createdAt: string;
}

export type AuditAction = 
  | 'LOGIN'
  | 'LOGOUT'
  | 'OPEN_APP'
  | 'CREATE_APP'
  | 'UPDATE_APP'
  | 'DELETE_APP'
  | 'CREATE_USER'
  | 'UPDATE_USER'
  | 'DELETE_USER'
  | 'DEACTIVATE_USER'
  | 'ACTIVATE_USER'
  | 'RESET_PASSWORD'
  | 'UPDATE_SETTINGS';

export interface AccessLog {
  id: string;
  userId: string;
  username: string;
  role: string;
  action: AuditAction;
  targetAppId?: string;
  targetAppName?: string;
  details?: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
}

export interface PortalSettings {
  id: string;
  schoolName: string;
  portalTitle: string;
  tagline: string;
  logoUrl?: string;
  address: string;
  contactHelpdesk: string;
  maintenanceMode: boolean;
  allowSelfRegistration: boolean;
  announcementText?: string;
  updatedAt: string;
}

export interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalApps: number;
  activeApps: number;
  totalCategories: number;
  totalLaunches: number;
  todayLogins: number;
}
