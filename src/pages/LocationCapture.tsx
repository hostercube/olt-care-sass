import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { MapPin, Smartphone, Loader2, CheckCircle, AlertCircle, Monitor, Clock, Wifi, Navigation } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface LocationData {
  latitude: number | null;
  longitude: number | null;
  full_address: string | null;
  area: string | null;
  district: string | null;
  thana: string | null;
}

interface IpData {
  ip_address: string | null;
  isp_name: string | null;
  asn: string | null;
}

interface DeviceData {
  device_type: 'mobile' | 'tablet' | 'desktop';
  user_agent: string;
}

interface SettingsData {
  id: string;
  tenant_id: string;
  unique_token: string;
  is_active: boolean;
  popup_title: string;
  popup_description: string;
  popup_enabled?: boolean;
  require_name: boolean;
  require_phone: boolean;
}

// Storage key for deduplication
const getStorageKey = (token: string) => `loc_visit_${token}`;

export default function LocationCapture() {
  const { token } = useParams<{ token: string }>();
  const { toast } = useToast();
  const hasSubmittedRef = useRef(false);
  const captureStartTime = useRef<number>(Date.now());

  const [step, setStep] = useState<'loading' | 'already-submitted' | 'desktop-warning' | 'capturing' | 'form' | 'submitting' | 'success' | 'error'>('loading');
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [locationData, setLocationData] = useState<LocationData>({
    latitude: null,
    longitude: null,
    full_address: null,
    area: null,
    district: null,
    thana: null,
  });
  const [ipData, setIpData] = useState<IpData>({
    ip_address: null,
    isp_name: null,
    asn: null,
  });
  const [deviceData, setDeviceData] = useState<DeviceData>({
    device_type: 'mobile',
    user_agent: '',
  });
  const [formData, setFormData] = useState({ name: '', phone: '' });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [captureTime, setCaptureTime] = useState<number | null>(null);
  const [captureProgress, setCaptureProgress] = useState<string>('Initializing...');

  // Robust device detection - detects true mobile vs desktop emulation
  const detectDeviceType = useCallback((): DeviceData => {
    const ua = navigator.userAgent;
    
    // Primary mobile detection - look for actual mobile OS
    const isAndroid = /Android/i.test(ua);
    const isIOS = /iPhone|iPad|iPod/i.test(ua);
    const isMobileOS = isAndroid || isIOS || /webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    
    // Detect if it's a tablet
    const isTablet = /iPad|Android.*Tablet|Tablet/i.test(ua) && !/Mobile/i.test(ua);
    
    // Desktop OS detection - strong indicators this is NOT a real mobile
    const isWindowsDesktop = /Windows NT/i.test(ua) && !/Windows Phone/i.test(ua);
    const isMacDesktop = /Macintosh/i.test(ua) && !('ontouchend' in document);
    const isLinuxDesktop = /Linux/i.test(ua) && !/Android/i.test(ua);
    const isDesktopOS = isWindowsDesktop || isMacDesktop || isLinuxDesktop;
    
    // Additional check: Chrome DevTools emulation has large outerWidth
    const isDevToolsEmulation = window.outerWidth > 1000 && window.innerWidth < 600;
    
    // Use UserAgentData API if available for more accurate detection
    const uaData = (navigator as any).userAgentData;
    if (uaData) {
      const isMobileFromUA = uaData.mobile === true;
      const platform = uaData.platform?.toLowerCase() || '';
      const isRealDesktop = ['windows', 'macos', 'linux', 'chromeos'].includes(platform);
      
      if (isRealDesktop && !isMobileFromUA) {
        return { device_type: 'desktop', user_agent: ua };
      }
      if (isMobileFromUA) {
        return { device_type: isTablet ? 'tablet' : 'mobile', user_agent: ua };
      }
    }
    
    // Final determination
    if (isDesktopOS || isDevToolsEmulation) {
      return { device_type: 'desktop', user_agent: ua };
    }
    
    if (isTablet) {
      return { device_type: 'tablet', user_agent: ua };
    }
    
    if (isMobileOS) {
      return { device_type: 'mobile', user_agent: ua };
    }
    
    // Default to mobile if touch is available and no desktop indicators
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (hasTouch && !isDesktopOS) {
      return { device_type: 'mobile', user_agent: ua };
    }
    
    return { device_type: 'desktop', user_agent: ua };
  }, []);
  
  // Check if this is truly a mobile device
  const isTrulyMobile = useCallback(() => {
    const device = detectDeviceType();
    return device.device_type === 'mobile' || device.device_type === 'tablet';
  }, [detectDeviceType]);

  // Check if already submitted from this browser
  const hasAlreadySubmitted = useCallback(() => {
    if (!token) return false;
    try {
      const stored = localStorage.getItem(getStorageKey(token));
      if (stored) {
        const data = JSON.parse(stored);
        // Expire after 24 hours
        if (Date.now() - data.timestamp < 24 * 60 * 60 * 1000) {
          return true;
        }
        localStorage.removeItem(getStorageKey(token));
      }
    } catch {
      // Ignore storage errors
    }
    return false;
  }, [token]);

  // Mark as submitted in localStorage
  const markAsSubmitted = useCallback(() => {
    if (!token) return;
    try {
      localStorage.setItem(getStorageKey(token), JSON.stringify({
        timestamp: Date.now(),
        submitted: true,
      }));
    } catch {
      // Ignore storage errors
    }
  }, [token]);

  // Get IP info - optimized (HTTPS-only fallbacks to avoid mixed-content blocking)
  const fetchIpInfo = useCallback(async (): Promise<IpData> => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500); // 2.5s timeout

    // 1) ipapi.co (good signal, https)
    try {
      const res = await fetch('https://ipapi.co/json/', { signal: controller.signal });
      if (res.ok) {
        const d = await res.json();
        if (d?.ip) {
          clearTimeout(timeout);
          return {
            ip_address: d.ip,
            isp_name: d.org || null,
            asn: d.asn || null,
          };
        }
      }
    } catch {
      // fall through
    }

    // 2) ipwho.is (https + provides ISP/ASN in many cases)
    try {
      const res = await fetch('https://ipwho.is/', { signal: controller.signal });
      if (res.ok) {
        const d = await res.json();
        if (d?.ip) {
          clearTimeout(timeout);
          return {
            ip_address: d.ip || null,
            isp_name: d.connection?.isp || d.connection?.org || null,
            asn: d.connection?.asn ? `AS${d.connection.asn}` : null,
          };
        }
      }
    } catch {
      // ignore
    }

    clearTimeout(timeout);
    return { ip_address: null, isp_name: null, asn: null };
  }, []);

  // Get address from coordinates using OpenStreetMap
  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await response.json();
      
      if (data && data.address) {
        const addr = data.address;
        return {
          full_address: data.display_name || null,
          area: addr.suburb || addr.neighbourhood || addr.village || addr.hamlet || null,
          district: addr.county || addr.state_district || addr.city || addr.town || null,
          thana: addr.town || addr.municipality || addr.city_district || null,
        };
      }
      return null;
    } catch (error) {
      console.error('Reverse geocode failed:', error);
      return null;
    }
  }, []);

  // Get GPS location (fast first, then high-accuracy fallback)
  const getLocationFast = useCallback((): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser'));
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: false,
        timeout: 7000,
        maximumAge: 5 * 60 * 1000, // allow cached fix for speed
      });
    });
  }, []);

  const getLocationHighAccuracy = useCallback((): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser'));
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0,
      });
    });
  }, []);

  // Submit location to database
  const submitLocationData = useCallback(async (
    settingsData: SettingsData,
    location: LocationData,
    ip: IpData,
    device: DeviceData,
    form?: { name?: string; phone?: string }
  ) => {
    if (hasSubmittedRef.current) return; // Prevent duplicate submissions
    hasSubmittedRef.current = true;

    setIsSubmitting(true);
    setStep('submitting');

    try {
      const { error: insertError } = await supabase
        .from('location_visits')
        .insert({
          token: settingsData.unique_token,
          tenant_id: settingsData.tenant_id,
          latitude: location.latitude,
          longitude: location.longitude,
          full_address: location.full_address,
          area: location.area,
          district: location.district,
          thana: location.thana,
          ip_address: ip.ip_address,
          isp_name: ip.isp_name,
          asn: ip.asn,
          device_type: device.device_type,
          user_agent: device.user_agent,
          name: form?.name || null,
          phone: form?.phone || null,
          verified_status: 'pending',
          visited_at: new Date().toISOString(),
        });

      if (insertError) throw insertError;

      // Mark as submitted in localStorage to prevent duplicate visits
      markAsSubmitted();

      // Calculate capture time
      const elapsed = (Date.now() - captureStartTime.current) / 1000;
      setCaptureTime(elapsed);

      setStep('success');
    } catch (err: any) {
      console.error('Failed to submit location:', err);
      toast({
        title: 'Error',
        description: 'Failed to submit location. Please try again.',
        variant: 'destructive',
      });
      setStep('form');
      hasSubmittedRef.current = false;
    } finally {
      setIsSubmitting(false);
    }
  }, [toast, markAsSubmitted]);

  // Initialize on mount
  useEffect(() => {
    captureStartTime.current = Date.now();

    const init = async () => {
      if (!token) {
        setStep('error');
        setError('Invalid link');
        return;
      }

      // Check if already submitted from this browser
      if (hasAlreadySubmitted()) {
        setStep('already-submitted');
        return;
      }

      // Check device type - block desktop devices
      if (!isTrulyMobile()) {
        setStep('desktop-warning');
        return;
      }

      setCaptureProgress('Loading settings...');

      // Fetch settings directly from Supabase
      try {
        const { data, error: fetchError } = await supabase
          .from('tenant_location_settings')
          .select('*')
          .eq('unique_token', token)
          .eq('is_active', true)
          .maybeSingle();

        if (fetchError) throw fetchError;

        if (!data) {
          setStep('error');
          setError('This link is invalid or has been disabled');
          return;
        }

        setSettings(data as SettingsData);
        setStep('capturing');
      } catch (err) {
        console.error('Settings fetch error:', err);
        setStep('error');
        setError('Failed to load. Please try again.');
      }
    };

    init();
  }, [token, isTrulyMobile, hasAlreadySubmitted]);

  // Capture location when on capturing step - optimized for speed
  useEffect(() => {
    if (step !== 'capturing' || !settings) return;

    const captureAndProcess = async () => {
      let capturedLocation: LocationData = { ...locationData };
      let capturedIp: IpData = { ...ipData };
      const capturedDevice = detectDeviceType();
      setDeviceData(capturedDevice);

      setCaptureProgress('Getting your location...');

       try {
         // Start GPS immediately (fast attempt first)
         const gpsPromise = (async () => {
           try {
             return await getLocationFast();
           } catch {
             setCaptureProgress('Trying high accuracy...');
             return await getLocationHighAccuracy();
           }
         })().catch(err => {
           console.warn('GPS failed:', err);
           return null;
         });

         // Fetch IP in parallel (non-blocking)
         const ipPromise = fetchIpInfo();

         // Wait for GPS first (critical)
         const position = await gpsPromise;

         if (position) {
           const { latitude, longitude } = position.coords;
           capturedLocation = { ...capturedLocation, latitude, longitude };
           setLocationData(capturedLocation);
           setCaptureProgress('Getting address...');

           // Reverse geocode in background
           reverseGeocode(latitude, longitude).then(addressData => {
             if (addressData) {
               setLocationData(prev => ({
                 ...prev,
                 full_address: addressData.full_address,
                 area: addressData.area,
                 district: addressData.district,
                 thana: addressData.thana,
               }));
               capturedLocation = { ...capturedLocation, ...addressData };
             }
           });
         }

         // Get IP result
         capturedIp = await ipPromise;
         setIpData(capturedIp);

       } catch (err) {
         console.error('Location capture error:', err);
       }

       // Show popup if enabled OR any field is required
       const showPopup = !!settings.popup_enabled || settings.require_name || settings.require_phone;

       if (showPopup) {
         setStep('form');
       } else {
         await submitLocationData(settings, capturedLocation, capturedIp, capturedDevice);
       }
    };

    captureAndProcess();
  }, [step, settings, fetchIpInfo, getLocationFast, getLocationHighAccuracy, reverseGeocode, submitLocationData, detectDeviceType, locationData, ipData]);

  // Handle form submit
  const handleFormSubmit = async () => {
    if (!settings) return;
    
    // Validate required fields
    if (settings.require_name === true && !formData.name.trim()) {
      toast({ title: 'Error', description: 'Name is required', variant: 'destructive' });
      return;
    }
    if (settings.require_phone === true && !formData.phone.trim()) {
      toast({ title: 'Error', description: 'Phone is required', variant: 'destructive' });
      return;
    }

    await submitLocationData(settings, locationData, ipData, deviceData, {
      name: formData.name.trim() || undefined,
      phone: formData.phone.trim() || undefined,
    });
  };

  // Render based on step
  if (step === 'loading' || step === 'submitting') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">
              {step === 'submitting' ? 'Submitting your location...' : captureProgress}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'already-submitted') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 rounded-full bg-blue-100 p-4 dark:bg-blue-900/20">
              <CheckCircle className="h-12 w-12 text-blue-600 dark:text-blue-400" />
            </div>
            <CardTitle>আপনার লোকেশন ইতিমধ্যে সাবমিট হয়েছে</CardTitle>
            <CardDescription>
              এই ডিভাইস থেকে আগেই লোকেশন পাঠানো হয়েছে
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground">
              আপনি এই পেজটি বন্ধ করতে পারেন
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'desktop-warning') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 rounded-full bg-yellow-100 p-4 dark:bg-yellow-900/20">
              <Monitor className="h-12 w-12 text-yellow-600 dark:text-yellow-400" />
            </div>
            <CardTitle>মোবাইল ফোন প্রয়োজন</CardTitle>
            <CardDescription>
              এই লিংকটি শুধুমাত্র মোবাইল ফোন থেকে ওপেন করতে হবে
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="rounded-lg bg-muted p-4">
              <Smartphone className="h-8 w-8 mx-auto text-primary mb-2" />
              <p className="text-sm text-muted-foreground">
                Please open this link on your smartphone to capture your GPS location.
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              📱 WhatsApp বা SMS এ আসা লিংকটি সরাসরি আপনার ফোনে ট্যাপ করে ওপেন করুন
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'capturing') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 rounded-full bg-primary/10 p-4">
              <Navigation className="h-12 w-12 text-primary animate-pulse" />
            </div>
            <CardTitle>লোকেশন সংগ্রহ করা হচ্ছে</CardTitle>
            <CardDescription>
              অনুগ্রহ করে লোকেশন পারমিশন দিন
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center py-4 space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              {captureProgress}
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Wifi className="h-3 w-3" />
              <span>Fetching network info...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'form') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 rounded-full bg-green-100 p-4 dark:bg-green-900/20">
              <MapPin className="h-12 w-12 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle>{settings?.popup_title || 'লোকেশন সংগ্রহ হয়েছে!'}</CardTitle>
            <CardDescription>
              {settings?.popup_description || 'Please provide your details'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {locationData.latitude && (
              <div className="rounded-lg bg-muted p-3 text-sm">
                <p className="text-muted-foreground">
                  📍 {locationData.full_address || `${locationData.area || ''} ${locationData.district || ''}`.trim() || 'Location captured'}
                </p>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <Label htmlFor="name">
                  নাম {settings?.require_name && <span className="text-destructive">*</span>}
                </Label>
                <Input
                  id="name"
                  placeholder="আপনার নাম লিখুন"
                  value={formData.name}
                  onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="phone">
                  মোবাইল নম্বর {settings?.require_phone && <span className="text-destructive">*</span>}
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="আপনার মোবাইল নম্বর লিখুন"
                  value={formData.phone}
                  onChange={(e) => setFormData(f => ({ ...f, phone: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <Button 
                onClick={handleFormSubmit} 
                disabled={isSubmitting}
                className="w-full"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    সাবমিট হচ্ছে...
                  </>
                ) : (
                  'সাবমিট করুন'
                )}
              </Button>
              
              {!settings?.require_name && !settings?.require_phone && (
                <Button 
                  variant="ghost" 
                  onClick={() => submitLocationData(settings!, locationData, ipData, deviceData)}
                  disabled={isSubmitting}
                >
                  Skip
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 rounded-full bg-green-100 p-4 dark:bg-green-900/20">
              <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle>ধন্যবাদ!</CardTitle>
            <CardDescription>
              আপনার লোকেশন সফলভাবে সাবমিট হয়েছে
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-3">
            {captureTime && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Time taken: {captureTime.toFixed(2)}s</span>
              </div>
            )}
            {locationData.full_address && (
              <div className="rounded-lg bg-muted p-3 text-sm text-left">
                <p className="text-muted-foreground">
                  📍 {locationData.full_address}
                </p>
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              আপনি এই পেজটি বন্ধ করতে পারেন
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 rounded-full bg-red-100 p-4 dark:bg-red-900/20">
            <AlertCircle className="h-12 w-12 text-red-600 dark:text-red-400" />
          </div>
          <CardTitle>ত্রুটি হয়েছে</CardTitle>
          <CardDescription>
            {error || 'Something went wrong'}
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
