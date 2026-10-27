const Repair = (() => {
  const MAX_OUTPUT = 5 * 1024 * 1024;

  const WEBSHELL_BLOCKS = [
    /(eval|assert|system|shell_exec|passthru|exec|popen|proc_open)\s*\(\s*\$_(GET|POST|REQUEST|COOKIE|SERVER)\s*\[[^\]]*\]\s*\)\s*;?/gi,
    /(eval|assert|system|shell_exec|passthru)\s*\(\s*\$_(GET|POST|REQUEST|COOKIE)\s*\[[^\]]*\][^)]*\)\s*;?/gi,
    /@?(eval|assert|system|shell_exec|passthru)\s*\(\s*(base64_decode|str_rot13|gzinflate|gzuncompress)\s*\([^)]*\)\s*\)\s*;?/gi,
    /<\?php\s+(eval|assert|system|shell_exec|passthru|exec|popen|proc_open)[^;]{0,200};?\s*\?>/gi,
  ];

  const PS_OBFUSCATED = [
    /-enc(odedcommand)?\s+[A-Za-z0-9+/=]{40,}/gi,
    /Invoke-Expression\s*\(\s*(Invoke-WebRequest|iwr|curl|wget)[^)]*\)/gi,
    /\[Convert\]::FromBase64String\s*\([^)]*\)\s*\|?\s*(iex|Invoke-Expression)/gi,
    /DownloadString\s*\(\s*['"][^'"]+['"]\s*\)/gi,
  ];

  const JS_OBFUSCATED = [
    /eval\s*\(\s*atob\s*\(/gi,
    /eval\s*\(\s*unescape\s*\(/gi,
    /document\.write\s*\(\s*unescape\s*\(/gi,
    /String\.fromCharCode\s*\([^)]*\)\s*\)\s*\)\s*\)/gi,
  ];

  const RANSOM_NOTE = /(your files (have been|are) encrypted[^.]{0,200}(bitcoin|btc|pay|ransom|decrypt)[^.]{0,200}\.)/gi;

  function bytesToText(bytes) {
    let s = '';
    const len = Math.min(bytes.length, MAX_OUTPUT);
    for (let i = 0; i < len; i++) s += String.fromCharCode(bytes[i]);
    return s;
  }

  function textToBytes(text) {
    const out = new Uint8Array(text.length);
    for (let i = 0; i < text.length; i++) out[i] = text.charCodeAt(i) & 0xff;
    return out;
  }

  function repairText(text, opts = {}) {
    let out = String(text);
    const removed = [];
    const rules = [
      ...WEBSHELL_BLOCKS.map((re) => ({ re, label: 'php webshell block' })),
      ...PS_OBFUSCATED.map((re) => ({ re, label: 'obfuscated powershell' })),
      ...JS_OBFUSCATED.map((re) => ({ re, label: 'obfuscated javascript' })),
    ];
    if (opts.removeRansomNotes) rules.push({ re: RANSOM_NOTE, label: 'ransom note text' });
    for (const r of rules) {
      const before = out;
      out = out.replace(r.re, '');
      if (out !== before) removed.push(r.label);
    }
    const original = String(text);
    const trimmedOriginal = original.replace(/\n{3,}/g, '\n\n').trim() + (original.endsWith('\n') ? '' : '\n');
    out = out.replace(/\n{3,}/g, '\n\n').trim() + (out.endsWith('\n') ? '' : '\n');
    return { text: out, removed, changed: out !== trimmedOriginal };
  }

  function repairBytes(bytes, opts = {}) {
    const text = bytesToText(bytes);
    const { text: fixed, removed, changed } = repairText(text, opts);
    if (!changed) return { bytes, changed: false, removed };
    return { bytes: textToBytes(fixed), changed: true, removed };
  }

  function canRepair(name, bytes) {
    const ext = Signatures.extOf(name);
    if (!Signatures.SCRIPT_EXTS.includes(ext) && !['.html', '.htm', '.js'].includes(ext)) return { ok: false, reason: 'binary or unsupported type' };
    if (!bytes || bytes.length > MAX_OUTPUT) return { ok: false, reason: 'file too large' };
    return { ok: true };
  }

  return { MAX_OUTPUT, repairText, repairBytes, canRepair, bytesToText, textToBytes };
})();
if (typeof window !== 'undefined') window.Repair = Repair;
if (typeof module !== 'undefined' && module.exports) module.exports = Repair;
