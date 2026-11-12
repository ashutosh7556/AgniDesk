import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

/**
 * PWA state for the whole app:
 * - service worker registration + "new version available" (needRefresh / updateApp)
 * - install support: Android/Chrome/Edge via the beforeinstallprompt event,
 *   iPhone/iPad via manual "Add to Home Screen" instructions
 * - online/offline status
 */
const PwaContext = createContext(null);

const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;

const detectIOS = () =>
  /iphone|ipad|ipod/i.test(window.navigator.userAgent) ||
  (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1); // iPadOS

const UPDATE_CHECK_MS = 60 * 60 * 1000; // look for a new deployment every hour

export function PwaProvider({ children }) {
  const [installEvent, setInstallEvent] = useState(null);
  const [isInstalled, setIsInstalled] = useState(isStandalone);
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (registration) setInterval(() => registration.update().catch(() => {}), UPDATE_CHECK_MS);
    },
  });

  useEffect(() => {
    const onPrompt = (event) => {
      event.preventDefault(); // keep it for our own "Install app" button
      setInstallEvent(event);
    };
    const onInstalled = () => {
      setIsInstalled(true);
      setInstallEvent(null);
    };
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const install = useCallback(async () => {
    if (!installEvent) return 'unavailable';
    installEvent.prompt();
    const { outcome } = await installEvent.userChoice;
    setInstallEvent(null); // the event can only be used once
    return outcome; // 'accepted' | 'dismissed'
  }, [installEvent]);

  const isIOS = useMemo(detectIOS, []);

  const value = useMemo(
    () => ({
      isInstalled,
      isIOS,
      // Show the install option when the browser offers it, or on iOS (manual steps).
      canInstall: !isInstalled && (Boolean(installEvent) || isIOS),
      hasNativePrompt: Boolean(installEvent),
      install,
      needRefresh,
      updateApp: () => updateServiceWorker(true),
      dismissUpdate: () => setNeedRefresh(false),
      isOnline,
    }),
    [isInstalled, isIOS, installEvent, install, needRefresh, updateServiceWorker, setNeedRefresh, isOnline],
  );

  return <PwaContext.Provider value={value}>{children}</PwaContext.Provider>;
}

export function usePwa() {
  const context = useContext(PwaContext);
  if (!context) throw new Error('usePwa must be used inside <PwaProvider>.');
  return context;
}
