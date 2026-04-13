declare global {
  interface Window {
    electronAPI?: {
      readScreenCode: () => Promise<string | null>;
      saveScreenCode: (code: string) => Promise<boolean>;
      getPlayerFingerprints?: () => Promise<{ serial1: string; serial2: string }>;
    };
  }
}

function generateScreenCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function getScreenCode(): Promise<string> {
  // Fallback to localStorage for browser testing
  if (!window.electronAPI) {
    const stored = localStorage.getItem('screen-code');
    if (stored && /^\d{6}$/.test(stored)) {
      return stored;
    }
    const newCode = generateScreenCode();
    localStorage.setItem('screen-code', newCode);
    return newCode;
  }

  // Try to read existing code
  const existingCode = await window.electronAPI.readScreenCode();
  if (existingCode && /^\d{6}$/.test(existingCode)) {
    return existingCode;
  }

  // Generate new 6-digit code
  const newCode = generateScreenCode();
  await window.electronAPI.saveScreenCode(newCode);
  return newCode;
}

