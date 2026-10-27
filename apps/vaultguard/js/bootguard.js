const BootGuard = (() => {
  const RUN_LOCATIONS = [
    'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run',
    'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\RunOnce',
    'HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Run',
    'HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\RunOnce',
    'HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Policies\\Explorer\\Run',
    'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Policies\\Explorer\\Run',
    'HKLM\\Software\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Run',
  ];

  const STARTUP_DIRS = [
    'AppData\\Roaming\\Microsoft\\Windows\\Start Menu\\Programs\\Startup',
    'ProgramData\\Microsoft\\Windows\\Start Menu\\Programs\\Startup',
  ];

  const KNOWN_ENTRIES = [
    'SecurityHealth', 'Windows Defender', 'OneDrive', 'Teams', 'Zoom', 'Discord', 'Steam',
    'Adobe Updater', 'Google Update', 'AdobeGCInvoker', 'IAStorIcon', 'RTHDVCPL', 'Logitech',
    'Spotify', ' EpicGamesLauncher', 'CCleaner', 'NordVPN', 'ShareX', 'PowerToys',
    'Microsoft Edge', 'Windows Security', 'SecurityHealthSystray',
  ];

  const SUSPICIOUS_VALUE_PATTERNS = [
    /AppData\\Local\\Temp/i, /AppData\\Roaming\\[a-z0-9]{6,}\\/i, /\\Temp\\/i,
    /%TEMP%/i, /%APPDATA%\\[a-z0-9]{6,}\\/i, /powershell/i, /cmd\.exe/i,
    /wscript/i, /cscript/i, /mshta/i, /rundll32/i, /regsvr32/i, /certutil/i, /bitsadmin/i,
    /-enc(odedcommand)?\s/i, /Invoke-WebRequest/i, /DownloadString/i, /iex/i,
    /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/, /\.tk\b|\.ml\b|\.ga\b|\.cf\b|\.gq\b|\.xyz\b/i,
    /\\Users\\[^\\]+\\Downloads\\/i, /http:\/\//i, /https:\/\//i,
  ];

  function normalizeEntry(e) {
    if (!e || typeof e !== 'object') return null;
    return {
      location: Security.clampString(e.location, 200),
      name: Security.clampString(e.name, 200),
      value: Security.clampString(e.value, 2000),
      type: Security.clampString(e.type, 30) || 'registry',
    };
  }

  function analyzeEntry(raw) {
    const e = normalizeEntry(raw);
    if (!e || (!e.name && !e.value)) return null;
    const findings = [];
    let score = 0;

    const isRun = /CurrentVersion\\Run/i.test(e.location) || /Policies\\Explorer\\Run/i.test(e.location);
    const isStartupDir = /Start Menu\\Programs\\Startup/i.test(e.location) || e.type === 'startup-folder';

    for (const p of SUSPICIOUS_VALUE_PATTERNS) {
      if (p.test(e.value)) {
        findings.push('suspicious value pattern: ' + p.source.slice(0, 60));
        score += 30;
        break;
      }
    }

    const valLow = e.value.toLowerCase();
    const hasUrl = /https?:\/\//i.test(e.value);
    const referencesScript = /\.(ps1|bat|cmd|vbs|js|hta|scr|lnk)\b/i.test(e.value) || /\b(iwr|Invoke-WebRequest|DownloadString|iex|Invoke-Expression)\b/i.test(e.value);
    if (hasUrl && referencesScript) {
      findings.push('download-and-execute from URL');
      score += 50;
    }

    const baseName = e.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const known = KNOWN_ENTRIES.some((k) => baseName.includes(k.toLowerCase().replace(/[^a-z0-9]/g, '')));
    if (!known && baseName.length > 0) {
      const genericName = /^(update|updater|service|svchost|winlogon|explorer|csrss|system|windows|driver|agent|helper|host|client|sync|cloud|backup|task)$/i.test(e.name.trim());
      if (genericName) {
        findings.push('masquerading as system component name');
        score += 35;
      }
    }

    if (/AppData\\(Local|Roaming)\\[^\\]+\\[^\\]+\.(exe|dll|scr)/i.test(e.value) && !known) {
      findings.push('executable hidden in AppData');
      score += 40;
    }

    const exePathMatch = e.value.match(/"?([A-Za-z]:\\[^"]+\.(exe|dll|scr))"?/i);
    if (exePathMatch && isRun) {
      const p = exePathMatch[1].toLowerCase();
      if (/\\(temp|tmp|downloads)\\/i.test(p) || /AppData\\(Local|Roaming)\\[^\\]+\\[^\\]+\.(exe|dll)/i.test(p)) {
        findings.push('persistence from non-standard location');
        score += 35;
      }
    }

    if (isStartupDir && /\.(vbs|js|hta|scr|bat|cmd|ps1|lnk)$/i.test(e.value)) {
      findings.push('script/shortcut in Startup folder');
      score += 40;
    }

    if (score > 100) score = 100;
    let risk = 'clean';
    if (score >= 70) risk = 'malicious';
    else if (score >= 40) risk = 'suspicious';
    else if (score > 0) risk = 'review';

    return { ...e, isRun, isStartupDir, score, risk, findings };
  }

  function scanEntries(list) {
    const arr = Array.isArray(list) ? list : [];
    const out = [];
    for (const raw of arr.slice(0, 2000)) {
      const r = analyzeEntry(raw);
      if (r) out.push(r);
    }
    const summary = {
      total: out.length,
      clean: out.filter((e) => e.risk === 'clean').length,
      review: out.filter((e) => e.risk === 'review').length,
      suspicious: out.filter((e) => e.risk === 'suspicious').length,
      malicious: out.filter((e) => e.risk === 'malicious').length,
      flagged: out.filter((e) => e.risk !== 'clean'),
    };
    return { entries: out, summary };
  }

  return { RUN_LOCATIONS, STARTUP_DIRS, KNOWN_ENTRIES, SUSPICIOUS_VALUE_PATTERNS, analyzeEntry, scanEntries, normalizeEntry };
})();
if (typeof window !== 'undefined') window.BootGuard = BootGuard;
if (typeof module !== 'undefined' && module.exports) module.exports = BootGuard;
