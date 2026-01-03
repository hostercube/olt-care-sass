import { useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DIVISIONS, getDistricts, getUpazilas } from '@/data/bangladeshLocations';

interface LocationDropdownsProps {
  division: string;
  district: string;
  upazila: string;
  onDivisionChange: (value: string) => void;
  onDistrictChange: (value: string) => void;
  onUpazilaChange: (value: string) => void;
  showLabels?: boolean;
  columns?: 2 | 3;
}

export function LocationDropdowns({
  division,
  district,
  upazila,
  onDivisionChange,
  onDistrictChange,
  onUpazilaChange,
  showLabels = true,
  columns = 3,
}: LocationDropdownsProps) {
  const districts = useMemo(() => getDistricts(division), [division]);
  const upazilas = useMemo(() => getUpazilas(district), [district]);

  const handleDivisionChange = (value: string) => {
    onDivisionChange(value);
    onDistrictChange('');
    onUpazilaChange('');
  };

  const handleDistrictChange = (value: string) => {
    onDistrictChange(value);
    onUpazilaChange('');
  };

  const gridClass = columns === 3 ? 'grid grid-cols-3 gap-4' : 'grid grid-cols-2 gap-4';

  return (
    <div className={gridClass}>
      <div className="space-y-2">
        {showLabels && <Label>Division</Label>}
        <Select value={division} onValueChange={handleDivisionChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select Division" />
          </SelectTrigger>
          <SelectContent className="bg-popover border border-border z-50">
            {DIVISIONS.map((d) => (
              <SelectItem key={d} value={d}>{d}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        {showLabels && <Label>District</Label>}
        <Select 
          value={district} 
          onValueChange={handleDistrictChange}
          disabled={!division}
        >
          <SelectTrigger>
            <SelectValue placeholder={division ? "Select District" : "Select Division first"} />
          </SelectTrigger>
          <SelectContent className="bg-popover border border-border z-50 max-h-[300px]">
            {districts.map((d) => (
              <SelectItem key={d} value={d}>{d}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        {showLabels && <Label>Upazila/Thana</Label>}
        <Select 
          value={upazila} 
          onValueChange={onUpazilaChange}
          disabled={!district}
        >
          <SelectTrigger>
            <SelectValue placeholder={district ? "Select Upazila" : "Select District first"} />
          </SelectTrigger>
          <SelectContent className="bg-popover border border-border z-50 max-h-[300px]">
            {upazilas.map((u) => (
              <SelectItem key={u} value={u}>{u}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
