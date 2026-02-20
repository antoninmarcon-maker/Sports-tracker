import { useState, useEffect } from 'react';
import { X, Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';

type Platform = 'ios' | 'android' | 'standalone' | 'other';

function detectPlatform(): Platform {
  if (window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone) {
    return 'standalone';
  }
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'other';
}

export function PwaInstallBanner() {
  const { t } = useTranslation();
  const [platform, setPlatform] = useState<Platform>('other');
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setPlatform(detectPlatform());
    if (sessionStorage.getItem('pwa-banner-dismissed')) setDismissed(true);
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('pwa-banner-dismissed', '1');
  };

  if (platform === 'standalone' || platform === 'other' || dismissed) return null;

  return (
    <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 flex items-start gap-3 animate-in slide-in-from-top-2 duration-300">
      <div className="p-2 rounded-lg bg-primary/20 text-primary shrink-0">
        <Download size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">{t('pwa.installApp')}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {platform === 'ios' ? t('pwa.iosInstall') : t('pwa.androidInstall')}
        </p>
      </div>
      <button onClick={handleDismiss} className="p-1 rounded-full text-muted-foreground hover:text-foreground shrink-0">
        <X size={16} />
      </button>
    </div>
  );
}
