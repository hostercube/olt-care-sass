export type OLTBrand = 'ZTE' | 'Huawei' | 'Fiberhome' | 'Nokia' | 'BDCOM' | 'VSOL' | 'Other';

export type ConnectionStatus = 'online' | 'offline' | 'warning' | 'unknown';

export interface OLT {
  id: string;
  name: string;
  brand: OLTBrand;
  ipAddress: string;
  port: number;
  username: string;
  status: ConnectionStatus;
  lastPolled: Date | null;
  totalPorts: number;
  activePorts: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ONU {
  id: string;
  oltId: string;
  oltName: string;
  ponPort: string;
  onuIndex: number;
  name: string;
  routerName: string;
  macAddress: string;
  serialNumber: string;
  pppoeUsername: string;
  rxPower: number;
  txPower: number;
  status: ConnectionStatus;
  lastOnline: Date | null;
  lastOffline: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PowerReading {
  id: string;
  onuId: string;
  rxPower: number;
  txPower: number;
  timestamp: Date;
}

export interface Alert {
  id: string;
  type: 'onu_offline' | 'power_drop' | 'olt_unreachable' | 'high_latency';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  deviceId: string;
  deviceName: string;
  isRead: boolean;
  createdAt: Date;
}

export interface DashboardStats {
  totalOLTs: number;
  onlineOLTs: number;
  offlineOLTs: number;
  totalONUs: number;
  onlineONUs: number;
  offlineONUs: number;
  activeAlerts: number;
  avgRxPower: number;
}

export interface AddOLTFormData {
  name: string;
  brand: OLTBrand;
  ipAddress: string;
  port: number;
  username: string;
  password: string;
}
