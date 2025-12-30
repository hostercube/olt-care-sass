import { OLT, ONU, Alert, DashboardStats, ConnectionStatus, OLTBrand } from '@/types/olt';

const generateRandomMac = () => {
  return 'XX:XX:XX:XX:XX:XX'.replace(/X/g, () => 
    '0123456789ABCDEF'.charAt(Math.floor(Math.random() * 16))
  );
};

const generateRandomSerial = (brand: OLTBrand) => {
  const prefixes: Record<OLTBrand, string> = {
    'ZTE': 'ZTEG',
    'Huawei': 'HWTC',
    'Fiberhome': 'FHTT',
    'Nokia': 'ALCLF',
    'BDCOM': 'BDCM',
    'VSOL': 'VSOL',
    'DBC': 'DBCG',
    'CDATA': 'CDTA',
    'ECOM': 'ECOM',
    'Other': 'GPON'
  };
  return prefixes[brand] + Math.random().toString(36).substring(2, 10).toUpperCase();
};

const randomStatus = (): ConnectionStatus => {
  const rand = Math.random();
  if (rand > 0.85) return 'offline';
  if (rand > 0.75) return 'warning';
  return 'online';
};

const randomPower = (isRx: boolean) => {
  if (isRx) {
    return parseFloat((Math.random() * -8 - 18).toFixed(2)); // -18 to -26 dBm
  }
  return parseFloat((Math.random() * 2 + 1).toFixed(2)); // 1 to 3 dBm
};

export const mockOLTs: OLT[] = [
  {
    id: 'olt-1',
    name: 'OLT-Core-DC1',
    brand: 'ZTE',
    ipAddress: '192.168.1.10',
    port: 22,
    username: 'admin',
    status: 'online',
    lastPolled: new Date(Date.now() - 60000),
    totalPorts: 16,
    activePorts: 14,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date(),
  },
  {
    id: 'olt-2',
    name: 'OLT-Edge-North',
    brand: 'Huawei',
    ipAddress: '192.168.1.20',
    port: 22,
    username: 'admin',
    status: 'online',
    lastPolled: new Date(Date.now() - 120000),
    totalPorts: 8,
    activePorts: 7,
    createdAt: new Date('2024-02-20'),
    updatedAt: new Date(),
  },
  {
    id: 'olt-3',
    name: 'OLT-Edge-South',
    brand: 'Fiberhome',
    ipAddress: '192.168.1.30',
    port: 23,
    username: 'admin',
    status: 'warning',
    lastPolled: new Date(Date.now() - 300000),
    totalPorts: 8,
    activePorts: 5,
    createdAt: new Date('2024-03-10'),
    updatedAt: new Date(),
  },
  {
    id: 'olt-4',
    name: 'OLT-Remote-West',
    brand: 'Nokia',
    ipAddress: '192.168.2.10',
    port: 22,
    username: 'operator',
    status: 'offline',
    lastPolled: new Date(Date.now() - 600000),
    totalPorts: 4,
    activePorts: 0,
    createdAt: new Date('2024-04-05'),
    updatedAt: new Date(),
  },
];

const onuNames = [
  'Customer-Residence-A1', 'Business-Tower-B2', 'Apartment-Complex-C3',
  'Industrial-Zone-D4', 'Shopping-Mall-E5', 'Office-Building-F6',
  'Residential-Block-G7', 'Tech-Park-H8', 'Hospital-Wing-I9',
  'School-Campus-J10', 'Government-Office-K11', 'Bank-Branch-L12'
];

const routerNames = [
  'TP-Link-Archer', 'Netgear-Nighthawk', 'ASUS-RT', 'Ubiquiti-EdgeRouter',
  'MikroTik-hAP', 'Linksys-Velop', 'D-Link-DIR', 'Cisco-RV'
];

export const mockONUs: ONU[] = [];

mockOLTs.forEach((olt) => {
  const numONUs = Math.floor(Math.random() * 8) + 4;
  for (let i = 1; i <= numONUs; i++) {
    const status = randomStatus();
    mockONUs.push({
      id: `onu-${olt.id}-${i}`,
      oltId: olt.id,
      oltName: olt.name,
      ponPort: `gpon-olt_0/0/${Math.ceil(i / 4)}`,
      onuIndex: i,
      name: onuNames[Math.floor(Math.random() * onuNames.length)] + `-${i}`,
      routerName: routerNames[Math.floor(Math.random() * routerNames.length)] + `-${Math.floor(Math.random() * 1000)}`,
      macAddress: generateRandomMac(),
      serialNumber: generateRandomSerial(olt.brand),
      pppoeUsername: `user_${Math.random().toString(36).substring(2, 8)}@isp.net`,
      rxPower: randomPower(true),
      txPower: randomPower(false),
      status,
      lastOnline: status === 'online' ? new Date() : new Date(Date.now() - Math.random() * 86400000),
      lastOffline: status === 'offline' ? new Date() : null,
      createdAt: olt.createdAt,
      updatedAt: new Date(),
    });
  }
});

export const mockAlerts: Alert[] = [
  {
    id: 'alert-1',
    type: 'olt_unreachable',
    severity: 'critical',
    title: 'OLT Connection Lost',
    message: 'Unable to connect to OLT-Remote-West. Last successful connection was 10 minutes ago.',
    deviceId: 'olt-4',
    deviceName: 'OLT-Remote-West',
    isRead: false,
    createdAt: new Date(Date.now() - 600000),
  },
  {
    id: 'alert-2',
    type: 'onu_offline',
    severity: 'warning',
    title: 'ONU Offline',
    message: 'Customer-Residence-A1-2 has been offline for more than 5 minutes.',
    deviceId: 'onu-olt-1-2',
    deviceName: 'Customer-Residence-A1-2',
    isRead: false,
    createdAt: new Date(Date.now() - 300000),
  },
  {
    id: 'alert-3',
    type: 'power_drop',
    severity: 'warning',
    title: 'Low RX Power Detected',
    message: 'RX power dropped below -25 dBm on Business-Tower-B2-5.',
    deviceId: 'onu-olt-2-5',
    deviceName: 'Business-Tower-B2-5',
    isRead: true,
    createdAt: new Date(Date.now() - 900000),
  },
  {
    id: 'alert-4',
    type: 'high_latency',
    severity: 'info',
    title: 'High Latency Detected',
    message: 'Response time from OLT-Edge-South exceeded 200ms threshold.',
    deviceId: 'olt-3',
    deviceName: 'OLT-Edge-South',
    isRead: true,
    createdAt: new Date(Date.now() - 1800000),
  },
];

export const mockDashboardStats: DashboardStats = {
  totalOLTs: mockOLTs.length,
  onlineOLTs: mockOLTs.filter(o => o.status === 'online').length,
  offlineOLTs: mockOLTs.filter(o => o.status === 'offline').length,
  totalONUs: mockONUs.length,
  onlineONUs: mockONUs.filter(o => o.status === 'online').length,
  offlineONUs: mockONUs.filter(o => o.status === 'offline').length,
  activeAlerts: mockAlerts.filter(a => !a.isRead).length,
  avgRxPower: parseFloat((mockONUs.reduce((acc, o) => acc + o.rxPower, 0) / mockONUs.length).toFixed(2)),
};
