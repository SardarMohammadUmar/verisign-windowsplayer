import config from '../../config.json';

export interface BrandingTheme {
  primary: string;
  primaryDark: string;
  accent: string;
  /** Headlines / “STEP” labels (orange in reference UI) */
  headingAccent: string;
  surface: string;
  text: string;
  /** Left panel background when not pure black */
  panelBg: string;
}

export interface BrandingConfig {
  appTitle: string;
  faviconUrl: string;
  logoUrl: string;
  logoText: string;
  theme: BrandingTheme;
  /** Right-side hero for registration screen */
  pairingHeroUrl: string;
  /** Right-side hero for “no content” screen */
  noMediaHeroUrl: string;
  /** Shown in “Register this screen at: …” */
  cmsRegisterHost: string;
  /** Full URL encoded in the assign-content QR code */
  cmsAssignUrl: string;
  /** Small label near QR (e.g. example.com/assign) */
  assignHelpLabel: string;
}

const defaultTheme: BrandingTheme = {
  primary: '#5b6cf0',
  primaryDark: '#4a3f9f',
  accent: '#ffd700',
  headingAccent: '#ff6b00',
  surface: 'rgba(255, 255, 255, 0.08)',
  text: '#ffffff',
  panelBg: '#1a1a1d',
};

const defaults: BrandingConfig = {
  appTitle: 'Digital Signage Player',
  faviconUrl: '/vite.svg',
  logoUrl: '',
  logoText: 'DS',
  theme: defaultTheme,
  pairingHeroUrl: '/bg-auth.jpg',
  noMediaHeroUrl: '/bg-auth.jpg',
  cmsRegisterHost: 'app.example.com',
  cmsAssignUrl: 'https://example.com/assign',
  assignHelpLabel: 'example.com/assign',
};

function mergeTheme(over?: Partial<BrandingTheme>): BrandingTheme {
  return { ...defaultTheme, ...over };
}

function normalizePublicPath(url: string): string {
  if (!url) return url;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('//')) return url;
  return url.startsWith('/') ? url : `/${url}`;
}

export function getBranding(): BrandingConfig {
  const raw = config as typeof config & {
    branding?: Partial<BrandingConfig> & { theme?: Partial<BrandingTheme> };
  };
  const b = raw.branding;
  if (!b) {
    return {
      ...defaults,
      faviconUrl: normalizePublicPath(defaults.faviconUrl),
      logoUrl: defaults.logoUrl ? normalizePublicPath(defaults.logoUrl) : '',
      pairingHeroUrl: normalizePublicPath(defaults.pairingHeroUrl),
      noMediaHeroUrl: normalizePublicPath(defaults.noMediaHeroUrl),
    };
  }
  const faviconUrl = normalizePublicPath(b.faviconUrl ?? defaults.faviconUrl);
  const logoUrlRaw = b.logoUrl ?? defaults.logoUrl;
  const logoUrl = logoUrlRaw ? normalizePublicPath(logoUrlRaw) : '';
  return {
    appTitle: b.appTitle ?? defaults.appTitle,
    faviconUrl,
    logoUrl,
    logoText: b.logoText ?? defaults.logoText,
    theme: mergeTheme(b.theme),
    pairingHeroUrl: normalizePublicPath(b.pairingHeroUrl ?? defaults.pairingHeroUrl),
    noMediaHeroUrl: normalizePublicPath(b.noMediaHeroUrl ?? defaults.noMediaHeroUrl),
    cmsRegisterHost: b.cmsRegisterHost ?? defaults.cmsRegisterHost,
    cmsAssignUrl: b.cmsAssignUrl ?? defaults.cmsAssignUrl,
    assignHelpLabel: b.assignHelpLabel ?? defaults.assignHelpLabel,
  };
}

export function applyBrandingToDocument(branding: BrandingConfig): void {
  document.title = branding.appTitle;

  let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.href = branding.faviconUrl;
  link.type = branding.faviconUrl.endsWith('.svg') ? 'image/svg+xml' : 'image/png';

  const r = document.documentElement;
  r.style.setProperty('--brand-primary', branding.theme.primary);
  r.style.setProperty('--brand-primary-dark', branding.theme.primaryDark);
  r.style.setProperty('--brand-accent', branding.theme.accent);
  r.style.setProperty('--brand-heading-accent', branding.theme.headingAccent);
  r.style.setProperty('--brand-surface', branding.theme.surface);
  r.style.setProperty('--brand-text', branding.theme.text);
  r.style.setProperty('--brand-panel-bg', branding.theme.panelBg);
}
