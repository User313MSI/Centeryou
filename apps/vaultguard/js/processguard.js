const ProcessGuard = (() => {
  const MAX_PROCS = 2000;
  const SUSPICIOUS_NAMES = [
    'mimikatz', 'procdump', 'lazagne', 'hashdump', 'pwdump', 'fgdump',
    'cobalt', 'metasploit', 'meterpreter', 'psexec', 'bloodhound', 'sharphound',
    'rubeus', 'chisel', 'plink', 'nc64', 'ncat', 'socat', 'chocolatey',
    'anydesk', 'teamviewer', 'rustdesk', 'ammyy', 'supreme', 'nomachine',
    'xmrig', 'minerd', 'cpuminer', 'cgminer', 'bfgminer', 'nicehash',
    'powershell_ise', 'wscript', 'cscript', 'mshta', 'regsvr32', 'rundll32',
    'certutil', 'bitsadmin', 'installutil', 'msbuild', 'csc', 'mscoreei',
  ];

  const LOLBIN = ['rundll32', 'regsvr32', 'mshta', 'certutil', 'bitsadmin', 'installutil', 'msbuild', 'csc', 'wscript', 'cscript', 'powershell', 'pwsh', 'curl', 'wget'];

  const TEMP_PATH_RE = /(^|[\\/])(\.?tmp|temp|AppData[\\/]Local[\\/]Temp|Windows[\\/]Temp|Temporary Internet Files|Downloads)([\\/]|$)/i;
  const NO_SIGNER_HINTS = ['unsigned', 'no signature', 'not signed', 'verification failed'];

  function normalizeProc(p) {
    if (!p || typeof p !== 'object') return null;
    const name = Security.clampString(p.name, 200).toLowerCase();
    const path = Security.clampString(p.path || p.exe || '');
    if (!name) return null;
    return {
      pid: Security.clampInt(p.pid, 0, Number.MAX_SAFE_INTEGER, 0),
      name,
      path,
      ppid: Security.clampInt(p.ppid, 0, Number.MAX_SAFE_INTEGER, 0),
      user: Security.clampString(p.user, 100),
      signer: Security.clampString(p.signer, 200),
      cmdline: Security.clampString(p.cmdline, 1000),
      parentName: Security.clampString(p.parentName, 200).toLowerCase(),
    };
  }

  function analyzeProcess(raw) {
    const p = normalizeProc(raw);
    if (!p) return null;
    const findings = [];
    let score = 0;

    const base = p.name.replace(/\.exe$/i, '');
    for (const s of SUSPICIOUS_NAMES) {
      if (base === s || base.startsWith(s + '_') || base.includes(s)) {
        findings.push(`known tool: ${s}`);
        score += s.length > 6 ? 60 : 40;
        break;
      }
    }

    const ext = (p.path.includes('.') ? p.path.slice(p.path.lastIndexOf('.')) : '').toLowerCase();
    const isLolbin = LOLBIN.includes(base) && ext === '.exe';
    if (isLolbin) {
      const cmd = p.cmdline.toLowerCase();
      const hasDownload = /http|urlcache|-enc|downloadstring|iex|invoke-expression|frombase64string/.test(cmd);
      const hasTempPath = TEMP_PATH_RE.test(p.path);
      const suspiciousParent = ['winword', 'excel', 'outlook', 'powerpnt', 'chrome', 'firefox', 'edge', 'acrord32'].includes(p.parentName.replace(/\.exe$/i, ''));
      if (hasDownload || hasTempPath || suspiciousParent) {
        findings.push(`LOLBIN abuse: ${base} launched${suspiciousParent ? ' by ' + p.parentName : ''}${hasDownload ? ' with download/exec args' : ''}${hasTempPath ? ' from temp' : ''}`);
        score += 55;
      } else {
        findings.push(`LOLBIN present: ${base} (monitoring)`);
        score += 15;
      }
    }

    if (TEMP_PATH_RE.test(p.path) && /\.(exe|dll|scr)$/i.test(p.path)) {
      findings.push('executable running from temp/download folder');
      score += 40;
    }

    const signerLow = p.signer.toLowerCase();
    if (p.signer && NO_SIGNER_HINTS.some((h) => signerLow.includes(h))) {
      findings.push('unsigned / unverified binary');
      score += 20;
    }

    const hiddenWindow = /\/min|\/c start|windowstyle\s+hidden|^-w\s+hidden/i.test(p.cmdline);
    if (hiddenWindow && isLolbin) {
      findings.push('hidden-window execution');
      score += 25;
    }

    const parentChain = ['winword', 'excel', 'outlook', 'powerpnt', 'chrome', 'firefox', 'edge', 'teams', 'zoom', 'slack'];
    const baseParent = p.parentName.replace(/\.exe$/i, '');
    if (parentChain.includes(baseParent) && !parentChain.includes(base) && /\.(exe|dll)$/i.test(ext)) {
      const knownChild = ['chrome', 'firefox', 'edge', 'explorer', 'svchost', 'dwm', 'csrss', 'winlogon', 'services', 'lsass', 'smss', 'taskeng', 'conhost', 'rundll32', 'regsvr32', 'spoolsv', 'audiodg'];
      if (!knownChild.includes(base)) {
        findings.push(`unusual child of ${p.parentName}: office/browser spawned ${base}`);
        score += 35;
      }
    }

    if (score > 100) score = 100;
    let risk = 'clean';
    if (score >= 70) risk = 'malicious';
    else if (score >= 40) risk = 'suspicious';
    else if (score > 0) risk = 'monitor';

    return { ...p, score, risk, findings };
  }

  function scanProcesses(list) {
    const arr = Array.isArray(list) ? list : [];
    const out = [];
    for (const raw of arr.slice(0, MAX_PROCS)) {
      const r = analyzeProcess(raw);
      if (r) out.push(r);
    }
    const summary = {
      total: out.length,
      clean: out.filter((p) => p.risk === 'clean').length,
      monitor: out.filter((p) => p.risk === 'monitor').length,
      suspicious: out.filter((p) => p.risk === 'suspicious').length,
      malicious: out.filter((p) => p.risk === 'malicious').length,
      flagged: out.filter((p) => p.risk !== 'clean'),
    };
    return { processes: out, summary };
  }

  function findProcess(list, pid) {
    const arr = Array.isArray(list) ? list : [];
    return arr.find((p) => p && p.pid === pid) || null;
  }

  return { MAX_PROCS, SUSPICIOUS_NAMES, LOLBIN, TEMP_PATH_RE, analyzeProcess, scanProcesses, findProcess, normalizeProc };
})();
if (typeof window !== 'undefined') window.ProcessGuard = ProcessGuard;
if (typeof module !== 'undefined' && module.exports) module.exports = ProcessGuard;
