/**
 * Rutin Mobil Uygulama Güncelleme Denetleyicisi.
 * GitHub Releases API ve yerel eşitleme sunucusu üzerinden
 * yeni sürüm kontrolü ve APK indirme bağlantısı sağlar.
 */

export const CURRENT_APP_VERSION = '0.2.13';
export const DEFAULT_GITHUB_REPO = 'aykuttepe/reminder-health';

export interface UpdateCheckResult {
  updateAvailable: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseNotes?: string;
  downloadUrl?: string;
  publishedAt?: string;
  source?: 'github' | 'server';
  error?: string;
}

/**
 * Semantik sürüm karşılaştırması (örn. "v0.3.0" vs "0.2.2").
 * Dönüş:
 *   1  -> v1 > v2 (v1 daha yeni)
 *   0  -> v1 == v2 (aynı sürüm)
 *  -1  -> v1 < v2 (v1 daha eski)
 */
export function compareVersions(v1: string, v2: string): number {
  const clean1 = (v1 || '').replace(/^v/i, '').trim();
  const clean2 = (v2 || '').replace(/^v/i, '').trim();

  const parts1 = clean1.split('.').map(n => parseInt(n, 10) || 0);
  const parts2 = clean2.split('.').map(n => parseInt(n, 10) || 0);

  const maxLen = Math.max(parts1.length, parts2.length);
  for (let i = 0; i < maxLen; i++) {
    const num1 = parts1[i] ?? 0;
    const num2 = parts2[i] ?? 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
}

/**
 * GitHub Releases veya yerel sunucudan yeni sürüm olup olmadığını denetler.
 */
export async function checkForAppUpdates(options: {
  serverUrl?: string;
  repo?: string;
  currentVersion?: string;
  timeoutMs?: number;
} = {}): Promise<UpdateCheckResult> {
  const currentVersion = options.currentVersion || CURRENT_APP_VERSION;
  const repo = options.repo || DEFAULT_GITHUB_REPO;
  const timeoutMs = options.timeoutMs || 5000;

  // 1. Önce GitHub Releases API'yi dene
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const ghUrl = `https://api.github.com/repos/${repo}/releases/latest`;
    const res = await fetch(ghUrl, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': `Rutin-App/${currentVersion}`,
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const release = await res.json();
      const latestTag = (release.tag_name || release.name || '').trim();

      if (latestTag) {
        const isNewer = compareVersions(latestTag, currentVersion) > 0;

        // APK asset bağlantısını bul
        let apkUrl = '';
        if (Array.isArray(release.assets)) {
          const apkAsset = release.assets.find((a: any) =>
            typeof a?.name === 'string' && a.name.endsWith('.apk')
          );
          if (apkAsset?.browser_download_url) {
            apkUrl = apkAsset.browser_download_url;
          }
        }

        // Eğer assetlerde apk yoksa doğrudan release sayfasına veya repo release indirme linkine yönlendir
        if (!apkUrl && release.html_url) {
          apkUrl = release.html_url;
        }

        return {
          updateAvailable: isNewer,
          currentVersion,
          latestVersion: latestTag.replace(/^v/i, ''),
          releaseNotes: release.body || '',
          downloadUrl: apkUrl,
          publishedAt: release.published_at,
          source: 'github',
        };
      }
    }
  } catch {
    // GitHub erişilemediyse (çevrimdışı, rate limit vb.), yerel sunucuya geç
  }

  // 2. GitHub olmadıysa veya release yoksa yerel eşitleme sunucusunu kontrol et
  if (options.serverUrl && options.serverUrl.trim()) {
    try {
      const cleanUrl = options.serverUrl.trim().replace(/\/+$/, '');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const res = await fetch(`${cleanUrl}/api/version`, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const serverVer = await res.json();
        const serverVersionStr = (serverVer.version || '').trim();

        if (serverVersionStr) {
          const isNewer = compareVersions(serverVersionStr, currentVersion) > 0;
          const apkUrl = serverVer.apkUrl
            ? (serverVer.apkUrl.startsWith('http') ? serverVer.apkUrl : `${cleanUrl}${serverVer.apkUrl}`)
            : `${cleanUrl}/app-release.apk`;

          return {
            updateAvailable: isNewer,
            currentVersion,
            latestVersion: serverVersionStr.replace(/^v/i, ''),
            releaseNotes: serverVer.releaseNotes || 'Yerel sunucudan güncelleme mevcut.',
            downloadUrl: apkUrl,
            publishedAt: serverVer.publishedAt,
            source: 'server',
          };
        }
      }
    } catch {
      // Yerel sunucu da erişilemedi
    }
  }

  // Hiçbir kaynaktan yeni sürüm bulunamadı veya uygulama güncel
  return {
    updateAvailable: false,
    currentVersion,
    latestVersion: currentVersion,
  };
}
