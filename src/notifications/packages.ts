export type NotificationSource = 'WhatsApp' | 'Telegram' | 'SMS' | 'Call' | 'Other';

export const WHATSAPP_PACKAGES = [
  'com.whatsapp',
  'com.whatsapp.w4b',
];

export const TELEGRAM_PACKAGES = [
  'org.telegram.messenger',
  'org.telegram.messenger.web',
  'org.thunderdog.challegram',
];

export const SMS_PACKAGES = [
  'com.google.android.apps.messaging',
  'com.android.mms',
  'com.android.messaging',
  'com.samsung.android.messaging',
  'com.google.android.apps.dynamite',
];

export const PHONE_PACKAGES = [
  'com.google.android.dialer',
  'com.android.dialer',
  'com.android.incallui',
  'com.samsung.android.incallui',
  'com.samsung.android.dialer',
  'com.android.server.telecom',
];

function pkgMatches(pkg: string, list: string[]): boolean {
  const p = pkg.toLowerCase();
  return list.some((known) => p === known || p.startsWith(known + '.'));
}

export function categorizePackage(
  packageName: string,
  androidCategory?: string | null
): NotificationSource {
  const pkg = (packageName || '').toLowerCase();
  const cat = (androidCategory || '').toLowerCase();

  if (pkgMatches(pkg, WHATSAPP_PACKAGES) || pkg.includes('whatsapp')) {
    return 'WhatsApp';
  }
  if (pkgMatches(pkg, TELEGRAM_PACKAGES) || pkg.includes('telegram')) {
    return 'Telegram';
  }
  if (
    pkgMatches(pkg, SMS_PACKAGES) ||
    ((pkg.includes('mms') || pkg.includes('sms')) && !pkg.includes('whatsapp'))
  ) {
    return 'SMS';
  }
  if (
    pkgMatches(pkg, PHONE_PACKAGES) ||
    pkg.includes('incallui') ||
    pkg.includes('dialer') ||
    cat.includes('call')
  ) {
    return 'Call';
  }
  return 'Other';
}
