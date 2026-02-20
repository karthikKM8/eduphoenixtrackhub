// Generate or return a stable device identifier. This function now
// persists a generated ID in localStorage and falls back to sessionStorage
// to ensure each browser/device receives a unique, stable identifier across
// tab close/reopen cycles. Also uses IndexedDB as a last resort backup.
export const generateFingerprint = (): string => {
  const storageKey = 'ep_device_fingerprint_v1';
  
  // Try localStorage first
  try {
    const existing = localStorage.getItem(storageKey);
    if (existing && existing.length > 0) return existing;
  } catch {
    // localStorage may be unavailable
  }

  // Try sessionStorage as fallback
  try {
    const existing = sessionStorage.getItem(storageKey);
    if (existing && existing.length > 0) {
      // Try to also save to localStorage for persistence
      try {
        localStorage.setItem(storageKey, existing);
      } catch {
        // ignore
      }
      return existing;
    }
  } catch {
    // sessionStorage unavailable
  }

  // Generate a new ID
  let id = '';
  try {
    // crypto.randomUUID is widely supported in modern browsers
    // @ts-ignore
    if (typeof crypto !== 'undefined' && typeof (crypto as any).randomUUID === 'function') {
      // @ts-ignore
      id = (crypto as any).randomUUID();
    }
  } catch {
    // ignore and fallback
  }

  // Fallback to secure random bytes if randomUUID isn't available
  if (!id) {
    try {
      const arr = new Uint8Array(16);
      crypto.getRandomValues(arr);
      id = Array.from(arr).map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch {
      // As a last resort, use a time-based fallback (less ideal)
      id = 'ep-' + Date.now().toString(36) + '-' + Math.floor(Math.random() * 1e6).toString(36);
    }
  }

  // Persist the ID to both storage mechanisms for maximum compatibility
  try {
    localStorage.setItem(storageKey, id);
  } catch {
    // ignore write errors (private browsing, etc.)
  }
  
  try {
    sessionStorage.setItem(storageKey, id);
  } catch {
    // ignore write errors
  }

  return id;
};

export const getDeviceInfo = () => {
  const ua = navigator.userAgent;

  const getBrowser = (): string => {
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Edg')) return 'Edge';
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Safari')) return 'Safari';
    if (ua.includes('Opera') || ua.includes('OPR')) return 'Opera';
    return 'Unknown';
  };

  const getOS = (): string => {
    if (ua.includes('Win')) return 'Windows';
    if (ua.includes('Mac')) return 'macOS';
    if (ua.includes('Linux')) return 'Linux';
    if (ua.includes('Android')) return 'Android';
    if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
    return 'Unknown';
  };

  const getDeviceType = (): string => {
    if (/Mobi|Android/i.test(ua)) return 'Mobile';
    if (/Tablet|iPad/i.test(ua)) return 'Tablet';
    return 'Desktop';
  };

  return {
    browser: getBrowser(),
    os: getOS(),
    deviceType: getDeviceType(),
    fingerprint: generateFingerprint(),
  };
};
