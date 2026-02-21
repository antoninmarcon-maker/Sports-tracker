import { supabase } from '@/integrations/supabase/client';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
const SUBSCRIPTION_ENDPOINT_KEY = 'push-subscription-endpoint';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export function isIOSSafari(): boolean {
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isStandalone = (window.navigator as any).standalone === true;
  return isIOS && !isStandalone;
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isPushSupported()) return 'unsupported';
  return Notification.permission;
}

export async function subscribeToPush(): Promise<boolean> {
  if (!VAPID_PUBLIC_KEY) {
    if (import.meta.env.DEV) console.warn('[Push] VITE_VAPID_PUBLIC_KEY not set');
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return false;

    const registration = await navigator.serviceWorker.ready;
    
    // Check for existing subscription
    let subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY).buffer as ArrayBuffer,
      });
    }

    const keys = subscription.toJSON().keys;
    if (!keys?.auth || !keys?.p256dh) {
      if (import.meta.env.DEV) console.error('[Push] Missing subscription keys');
      return false;
    }

    // Get current user (may be null for guests)
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id || null;

    // Upsert subscription in database
    const { error } = await supabase.from('push_subscriptions' as any).upsert(
      {
        endpoint: subscription.endpoint,
        auth_key: keys.auth,
        p256dh_key: keys.p256dh,
        user_id: userId,
      },
      { onConflict: 'endpoint' }
    );

    if (error) {
      if (import.meta.env.DEV) console.error('[Push] Upsert error:', error);
      return false;
    }

    // Store endpoint locally for tutorial step updates
    localStorage.setItem(SUBSCRIPTION_ENDPOINT_KEY, subscription.endpoint);
    return true;
  } catch (err) {
    if (import.meta.env.DEV) console.error('[Push] Subscribe error:', err);
    return false;
  }
}

export async function updateTutorialStep(newStep: number, currentMaxStep?: number): Promise<void> {
  const endpoint = localStorage.getItem(SUBSCRIPTION_ENDPOINT_KEY);
  if (!endpoint) return;

  try {
    // Only update if current step is less than newStep
    const { data } = await supabase
      .from('push_subscriptions' as any)
      .select('tutorial_step')
      .eq('endpoint', endpoint)
      .maybeSingle();

    if (!data) return;
    const current = (data as any).tutorial_step ?? 0;
    if (current >= newStep) return;

    await supabase
      .from('push_subscriptions' as any)
      .update({ tutorial_step: newStep } as any)
      .eq('endpoint', endpoint);
  } catch (err) {
    if (import.meta.env.DEV) console.error('[Push] Tutorial step update error:', err);
  }
}

export async function linkUserToSubscription(userId: string): Promise<void> {
  const endpoint = localStorage.getItem(SUBSCRIPTION_ENDPOINT_KEY);
  if (!endpoint) return;

  try {
    await supabase
      .from('push_subscriptions' as any)
      .update({ user_id: userId } as any)
      .eq('endpoint', endpoint);
  } catch (err) {
    if (import.meta.env.DEV) console.error('[Push] Link user error:', err);
  }
}
