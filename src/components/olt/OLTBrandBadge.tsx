import { 
  Server, 
  Radio, 
  Cpu, 
  Box, 
  Wifi, 
  Zap, 
  Database, 
  HardDrive,
  Network,
  Router,
  type LucideIcon
} from 'lucide-react';
import type { OLTBrand } from '@/types/olt';

interface BrandConfig {
  icon: LucideIcon;
  color: string;
  bgColor: string;
}

export const oltBrandConfig: Record<OLTBrand, BrandConfig> = {
  ZTE: {
    icon: Zap,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10'
  },
  Huawei: {
    icon: Radio,
    color: 'text-red-500',
    bgColor: 'bg-red-500/10'
  },
  Fiberhome: {
    icon: Network,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10'
  },
  Nokia: {
    icon: Server,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10'
  },
  BDCOM: {
    icon: Database,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10'
  },
  VSOL: {
    icon: Wifi,
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-500/10'
  },
  DBC: {
    icon: HardDrive,
    color: 'text-indigo-500',
    bgColor: 'bg-indigo-500/10'
  },
  CDATA: {
    icon: Cpu,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10'
  },
  ECOM: {
    icon: Router,
    color: 'text-teal-500',
    bgColor: 'bg-teal-500/10'
  },
  Other: {
    icon: Box,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted'
  }
};

interface OLTBrandBadgeProps {
  brand: OLTBrand;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function OLTBrandBadge({ brand, showLabel = true, size = 'md' }: OLTBrandBadgeProps) {
  const config = oltBrandConfig[brand] || oltBrandConfig.Other;
  const Icon = config.icon;
  
  const sizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };
  
  const paddingClasses = {
    sm: 'px-1.5 py-0.5 text-[10px]',
    md: 'px-2 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm'
  };
  
  return (
    <span className={`inline-flex items-center gap-1.5 rounded font-medium ${config.bgColor} ${config.color} ${paddingClasses[size]}`}>
      <Icon className={sizeClasses[size]} />
      {showLabel && brand}
    </span>
  );
}
