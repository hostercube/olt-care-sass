import { useEffect, useId, useRef, useState } from 'react';
import { AlertCircle } from 'lucide-react';

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: any) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId: string) => void;
    };
    __turnstileScriptLoading?: Promise<void>;
  }
}

type Props = {
  siteKey: string;
  onToken: (token: string | null) => void;
  resetKey?: number; // increment to force widget re-render
};

function loadTurnstileScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();

  if (window.turnstile) return Promise.resolve();
  if (window.__turnstileScriptLoading) return window.__turnstileScriptLoading;

  window.__turnstileScriptLoading = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-turnstile="true"]');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Failed to load Turnstile')));
      return;
    }

    const s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    s.async = true;
    s.defer = true;
    s.setAttribute('data-turnstile', 'true');
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load Turnstile'));
    document.head.appendChild(s);
  });

  return window.__turnstileScriptLoading;
}

export function TurnstileWidget({ siteKey, onToken, resetKey = 0 }: Props) {
  const id = useId();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'verified' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    // Validate site key
    if (!siteKey || siteKey.trim().length < 10) {
      console.warn('Turnstile: Invalid or missing site key, length:', siteKey?.length || 0);
      setStatus('error');
      setErrorMessage('CAPTCHA not configured properly');
      onToken(null);
      return;
    }

    const trimmedKey = siteKey.trim();

    (async () => {
      try {
        setStatus('loading');
        console.log('Turnstile: Loading script...');
        
        await loadTurnstileScript();
        
        if (!mounted) return;
        if (!containerRef.current) {
          console.error('Turnstile: Container ref not available');
          return;
        }
        if (!window.turnstile) {
          console.error('Turnstile: window.turnstile not available after script load');
          setStatus('error');
          setErrorMessage('Failed to load CAPTCHA');
          return;
        }

        // Ensure clean re-render
        if (widgetIdRef.current) {
          try {
            window.turnstile.remove(widgetIdRef.current);
          } catch {
            // ignore
          }
          widgetIdRef.current = null;
        }

        containerRef.current.innerHTML = '';

        console.log('Turnstile: Rendering widget with site key:', trimmedKey.substring(0, 10) + '...');
        
        const widgetId = window.turnstile.render(containerRef.current, {
          sitekey: trimmedKey,
          theme: 'auto',
          size: 'normal',
          callback: (token: string) => {
            console.log('Turnstile: Token received');
            setStatus('verified');
            onToken(token || null);
          },
          'expired-callback': () => {
            console.log('Turnstile: Token expired');
            setStatus('ready');
            onToken(null);
          },
          'error-callback': (error: any) => {
            console.error('Turnstile: Error callback', error);
            setStatus('error');
            setErrorMessage('Verification failed');
            onToken(null);
          },
          'before-interactive-callback': () => {
            console.log('Turnstile: Widget ready for interaction');
            setStatus('ready');
          },
        });

        widgetIdRef.current = widgetId;
        console.log('Turnstile: Widget rendered with ID:', widgetId);
        
        // If no callback fired, set to ready after a short delay
        setTimeout(() => {
          if (mounted && status === 'loading') {
            setStatus('ready');
          }
        }, 1000);
        
      } catch (err: any) {
        console.error('Turnstile: Error during initialization', err);
        setStatus('error');
        setErrorMessage(err?.message || 'Failed to load CAPTCHA');
        onToken(null);
      }
    })();

    return () => {
      mounted = false;
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // ignore
        }
      }
      widgetIdRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteKey, id, resetKey]);

  return (
    <div className="space-y-2">
      {/* Turnstile container - must always be in DOM for widget rendering */}
      <div 
        ref={containerRef} 
        className="min-h-[66px] flex items-center justify-center"
        id={`turnstile-container-${id.replace(/:/g, '-')}`}
      />
      
      {/* No loading indicator - Cloudflare widget shows its own */}
      
      {/* No visible indicator for verified status - Cloudflare widget shows it */}
      
      {status === 'error' && (
        <div className="flex items-center gap-2 text-xs text-destructive">
          <AlertCircle className="h-3 w-3" />
          <span>{errorMessage || 'Verification error'}</span>
        </div>
      )}
    </div>
  );
}
