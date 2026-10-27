const NetGuard = (() => {
  const MAX_CONNS = 5000;

  const C2_PORTS = [4444, 5555, 6666, 7777, 8080, 8443, 9001, 9999, 1337, 31337, 12345];
  const SUSPICIOUS_TLDS = ['.tk', '.ml', '.ga', '.cf', '.gq', '.xyz', '.top', '.work', '.click', '.country', '.stream', '.download', '.loan', '.racing', '.cricket', '.faith', '.review', '.accountant', '.science', '.party', '.trade', '.date', '.men', '.bid'];
  const KNOWN_GOOD_HOSTS = ['microsoft.com', 'windows.com', 'windowsupdate.com', 'live.com', 'msn.com', 'bing.com', 'office.com', 'office365.com', 'azure.com', 'aka.ms', 'google.com', 'googleapis.com', 'gstatic.com', 'github.com', 'githubusercontent.com', 'npmjs.org', 'nodejs.org', 'apple.com', 'icloud.com', 'cdn.cloudflare.net', 'amazonaws.com', 'azureedge.net'];
  const RAW_IP_RE = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
  const PRIVATE_RE = /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|127\.|169\.254\.|0\.0\.0\.0)/;

  function normalizeConn(c) {
    if (!c || typeof c !== 'object') return null;
    const remote = Security.clampString(c.remote || c.remoteAddress || '');
    const local = Security.clampString(c.local || c.localAddress || '');
    if (!remote && !local) return null;
    return {
      pid: Security.clampInt(c.pid, 0, Number.MAX_SAFE_INTEGER, -1),
      process: Security.clampString(c.process || c.name || '', 200),
      protocol: Security.clampString(c.protocol || 'tcp', 10).toLowerCase(),
      local,
      localPort: Security.clampInt(c.localPort, 0, 65535, 0),
      remote,
      remotePort: Security.clampInt(c.remotePort, 0, 65535, 0),
      state: Security.clampString(c.state, 30),
    };
  }

  function hostOf(addr) {
    if (!addr) return '';
    const m = String(addr).match(/^\[?([0-9a-fA-F:.]+)\]?:(\d+)$/) || String(addr).match(/^([^:]+):(\d+)$/);
    if (m) return m[1].toLowerCase();
    return String(addr).toLowerCase();
  }

  function isPrivate(host) {
    return PRIVATE_RE.test(host) || host === 'localhost' || host === '::1';
  }

  function analyzeConn(raw) {
    const c = normalizeConn(raw);
    if (!c) return null;
    const findings = [];
    let score = 0;

    if (c.state && !['established', 'listen', 'syn_sent', 'close_wait', 'time_wait', 'fin_wait'].includes(c.state.toLowerCase())) {
      // unknown state — ignore
    }

    const host = hostOf(c.remote);
    const procBase = c.process.toLowerCase().replace(/\.exe$/i, '');
    const isSystemProc = ['svchost', 'system', 'smss', 'csrss', 'winlogon', 'services', 'lsass', 'registry', 'dwm', 'fontdrvhost'].includes(procBase);

    if (C2_PORTS.includes(c.remotePort) && !isPrivate(host)) {
      findings.push(`classic C2 port ${c.remotePort}`);
      score += 45;
    }

    if (RAW_IP_RE.test(host) && !isPrivate(host)) {
      const ext = (c.process.includes('.') ? c.process.slice(c.process.lastIndexOf('.')) : '').toLowerCase();
      const suspiciousProc = ['powershell', 'pwsh', 'cmd', 'wscript', 'cscript', 'mshta', 'rundll32', 'regsvr32', 'curl', 'wget'].includes(procBase) || /\.(exe|dll|scr)$/i.test(ext);
      if (suspiciousProc) {
        findings.push(`raw-IP C2 from ${procBase || 'unknown process'}`);
        score += 50;
      } else {
        findings.push('raw-IP connection (review)');
        score += 10;
      }
    }

    for (const tld of SUSPICIOUS_TLDS) {
      if (host.endsWith(tld) && !isPrivate(host)) {
        findings.push(`suspicious TLD ${tld}`);
        score += 25;
        break;
      }
    }

    if (host && !RAW_IP_RE.test(host) && !isPrivate(host)) {
      const known = KNOWN_GOOD_HOSTS.some((d) => host === d || host.endsWith('.' + d));
      if (!known) {
        const parts = host.split('.');
        if (parts.length >= 3 && parts[parts.length - 2].length > 12) {
          findings.push('long/obfuscated domain (DGA-like)');
          score += 20;
        }
      }
    }

    const tempProc = /(^|[\\/])(\.?tmp|temp|AppData[\\/]Local[\\/]Temp|Windows[\\/]Temp|Downloads)([\\/]|$)/i.test(c.process);
    const exeFromTemp = tempProc && /\.(exe|dll|scr)$/i.test(c.process);
    if (exeFromTemp && !isPrivate(host)) {
      findings.push('executable from temp folder making network connection');
      score += 40;
    }

    const beaconish = c.state === 'established' && C2_PORTS.includes(c.remotePort) && !isSystemProc && !isPrivate(host);
    if (beaconish) {
      findings.push('beaconing pattern (C2 port + non-system process, public host)');
      score += 20;
    }

    if (score > 100) score = 100;
    let risk = 'clean';
    if (score >= 70) risk = 'malicious';
    else if (score >= 40) risk = 'suspicious';
    else if (score > 0) risk = 'monitor';

    return { ...c, remoteHost: host, score, risk, findings };
  }

  function scanConnections(list) {
    const arr = Array.isArray(list) ? list : [];
    const out = [];
    for (const raw of arr.slice(0, MAX_CONNS)) {
      const r = analyzeConn(raw);
      if (r) out.push(r);
    }
    const summary = {
      total: out.length,
      established: out.filter((c) => c.state === 'established').length,
      listening: out.filter((c) => c.state === 'listen').length,
      clean: out.filter((c) => c.risk === 'clean').length,
      monitor: out.filter((c) => c.risk === 'monitor').length,
      suspicious: out.filter((c) => c.risk === 'suspicious').length,
      malicious: out.filter((c) => c.risk === 'malicious').length,
      flagged: out.filter((c) => c.risk !== 'clean'),
    };
    return { connections: out, summary };
  }

  return { MAX_CONNS, C2_PORTS, SUSPICIOUS_TLDS, KNOWN_GOOD_HOSTS, analyzeConn, scanConnections, hostOf, isPrivate, normalizeConn };
})();
if (typeof window !== 'undefined') window.NetGuard = NetGuard;
if (typeof module !== 'undefined' && module.exports) module.exports = NetGuard;
