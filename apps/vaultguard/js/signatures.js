const Signatures = (() => {
  const VERSION = '2025.10.26-1';

  const HEX_PATTERNS = [
    { id: 'EICAR-TEST', name: 'Test.EICAR', severity: 'test', weight: 100, hex: '58354F2150254041505B345C505A58353428505E2937434329377D2445494341522D5354414E444152442D414E544956495255532D544553542D46494C452124482B482A' },
    { id: 'EICAR-STD-68', name: 'Test.EICAR (standard 68-byte string)', severity: 'test', weight: 100, text: 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*' },
  ];

  const URL_PATTERNS = [
    { id: 'SUSPICIOUS-TLD', name: 'Suspicious TLD hosting', severity: 'low', weight: 10, re: /https?:\/\/[^\s"']+\.(tk|ml|ga|cf|gq|xyz|top|work|click|country|stream|download|loan|racing|cricket|faith|review|accountant|science|party|trade|date|men|bid|stream)\b/i },
    { id: 'IP-URL-EXEC', name: 'Executable download from raw IP', severity: 'medium', weight: 35, re: /https?:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}[^\s"']*\.(exe|msi|scr|bat|cmd|ps1|hta|dll|apk)\b/i },
    { id: 'DATA-URI-EXE', name: 'Executable in data URI', severity: 'high', weight: 55, re: /data:(text\/(html|javascript)|application\/(x-msdownload|x-sh|x-bat|javascript))[;,]/i },
    { id: 'LONG-HEX-BLOB', name: 'Long hex-encoded blob', severity: 'medium', weight: 25, re: /(?:[0-9a-fA-F]{2}){200,}/ },
    { id: 'BASE64-BLOB', name: 'Long base64 blob', severity: 'medium', weight: 20, re: /(?:[A-Za-z0-9+/]{4}){80,}={0,2}/ },
  ];

  const MZ_CHECKS = [
    { id: 'MZ-PE-HEADER', name: 'PE executable with suspicious imports', severity: 'medium', weight: 30, needle: 'This program cannot be run in DOS mode', check: (t) => /LoadLibrary|GetProcAddress|VirtualAlloc|WriteProcessMemory|CreateRemoteThread/i.test(t) },
    { id: 'MZ-SFX-RAR', name: 'Self-extracting archive', severity: 'medium', weight: 25, needle: 'Rar!', check: () => true },
    { id: 'MZ-SFX-7Z', name: 'Self-extracting 7z archive', severity: 'medium', weight: 25, needle: '7z\xBC\xAF\x27\x1C', check: () => true },
  ];

  const TEXT_PATTERNS = [
    { id: 'JS-EVAL-OBFUSCATED', name: 'Obfuscated JS payload', severity: 'high', weight: 55, re: /eval\s*\(\s*(atob|unescape|String\.fromCharCode)/i },
    { id: 'PS-DOWNLOAD-EXEC', name: 'PowerShell download-and-execute', severity: 'critical', weight: 85, re: /(Invoke-WebRequest|Invoke-Expression|iwr|iex|DownloadString|DownloadFile).{0,200}(Invoke-Expression|iex|Start-Process|Invoke-WebRequest|iwr|DownloadString|DownloadFile)/is },
    { id: 'PS-IWR-IEX', name: 'PowerShell iwr|iex pipeline', severity: 'critical', weight: 85, re: /\b(iwr|Invoke-WebRequest)\b[^|;]{0,200}\|[^|;]{0,40}\b(iex|Invoke-Expression)\b/is },
    { id: 'WGET-CURL-PIPE-SH', name: 'Remote script piped to shell', severity: 'critical', weight: 80, re: /\b(wget|curl)\b[^|]{0,200}\|\s*(sh|bash|zsh|cmd|powershell)/is },
    { id: 'PS-ENCODED-COMMAND', name: 'PowerShell encoded command', severity: 'high', weight: 65, re: /-enc(odedcommand)?\s+[A-Za-z0-9+/=]{40,}/i },
    { id: 'VBS-HTA-DROP', name: 'VBS/HTA dropper', severity: 'high', weight: 60, re: /(CreateObject\s*\(\s*["']WScript\.Shell["']|\.hta|mshta\.exe)/i },
    { id: 'CMD-Ransom-Note', name: 'Ransom note pattern', severity: 'critical', weight: 90, re: /(your files (have been|are) encrypted|bitcoin|ransom|decrypt.{0,40}payment)/i },
    { id: 'PHP-WEBSHELL', name: 'PHP webshell', severity: 'critical', weight: 80, re: /(eval\s*\(\s*\$_(GET|POST|REQUEST|COOKIE)|assert\s*\(\s*\$_(GET|POST|REQUEST)|base64_decode\s*\(.{0,80}(eval|assert|system))/i },
    { id: 'BAT-MASS-DELETE', name: 'Destructive batch script', severity: 'high', weight: 70, re: /(del\s+\/s\s+\/q|rd\s+\/s\s+\/q|format\s+[a-z]:)/i },
    { id: 'LNK-PATH-TRAVERSAL', name: 'Suspicious shortcut target', severity: 'medium', weight: 45, re: /\\(Windows|System32|SysWOW64)\\(System32\\)?(cmd|powershell|wscript|cscript|mshta)\.exe/i },
    { id: 'MACRO-AUTO-EXEC', name: 'Office auto-exec macro', severity: 'high', weight: 60, re: /(AutoOpen|Auto_Open|Document_Open|Workbook_Open)\s*\(\s*\)/i },
    { id: 'CRON-PERSISTENCE', name: 'Persistence via cron/systemd', severity: 'medium', weight: 50, re: /(crontab|systemctl\s+(enable|start)|\/etc\/rc\.local|launchctl\s+load)/i },
    { id: 'REG-RUN-KEY', name: 'Registry run-key persistence', severity: 'high', weight: 60, re: /(HKCU|HKLM|HKEY_(CURRENT_USER|LOCAL_MACHINE))\\(Software\\)?(Microsoft\\)?Windows\\CurrentVersion\\(Run|RunOnce|Policies\\Explorer\\Run)/i },
    { id: 'SCHEDULED-TASK', name: 'Scheduled task creation', severity: 'high', weight: 55, re: /schtasks\s+\/create|New-ScheduledTask|Register-ScheduledTask/i },
    { id: 'WMI-PERSISTENCE', name: 'WMI event persistence', severity: 'high', weight: 60, re: /(ActiveScriptEventConsumer|__EventFilter|CommandLineEventConsumer|ActiveScriptEventConsumer)/i },
    { id: 'LSASS-ACCESS', name: 'Credential dumping (LSASS access)', severity: 'critical', weight: 85, re: /(sekurlsa::logonpasswords|privilege::debug|lsass\.exe|MiniDump|comsvcs\.dll.{0,40}MiniDump)/i },
    { id: 'MIMIKATZ-STRING', name: 'Mimikatz indicator', severity: 'critical', weight: 90, re: /mimikatz|gentilkiwi|kiwi_cmd|sekurlsa/i },
    { id: 'COBALT-NAMED-PIPE', name: 'C2 named-pipe pattern', severity: 'high', weight: 55, re: /\\\\(pipe|PIPE)\\(MSSE-\d+|msagent_\d+|aegis_\d+|[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i },
    { id: 'XOR-LOOP', name: 'XOR decryption loop', severity: 'medium', weight: 35, re: /for\s*\([^)]*\)\s*\{[^}]{0,120}\^\s*=?\s*[^;]{0,40};/s },
    { id: 'CRYPTO-RANSOM-API', name: 'Ransomware crypto API usage', severity: 'high', weight: 60, re: /(CryptEncrypt|CryptAcquireContext|CryptDeriveKey|CryptGenKey|BCryptEncrypt|CryptSetKeyParam)/i },
    { id: 'KILL-SHADOW-COPIES', name: 'Shadow copy deletion', severity: 'critical', weight: 85, re: /(vssadmin\s+(delete|del)\s+shadows|wmic\s+shadowcopy\s+delete|bcdedit\s+\/set\s+\{default\}\s+recoveryenabled\s+no)/i },
    { id: 'DEFENDER-DISABLE', name: 'Defender disable attempt', severity: 'critical', weight: 85, re: /(Set-MpPreference\s+-DisableRealtimeMonitoring|sc\s+(stop|config)\s+WinDefend|net\s+stop\s+"Windows Defender"|DisableAntiSpyware)/i },
    { id: 'ETW-PATCH', name: 'ETW/AMSI patching', severity: 'high', weight: 60, re: /(NtTraceEvent|EtwEventWrite|amsi\.dll|AmsiScanBuffer|VirtualProtect.{0,80}0x40)/is },
    { id: 'PROCESS-HOLLOWING', name: 'Process hollowing', severity: 'critical', weight: 85, re: /(NtUnmapViewOfSection|ZwUnmapViewOfSection|SetThreadContext|NtResumeThread|NtMapViewOfSection)/i },
    { id: 'INJECTION-API', name: 'DLL injection API chain', severity: 'critical', weight: 80, re: /(VirtualAllocEx|WriteProcessMemory|CreateRemoteThread|NtCreateThreadEx|RtlCreateUserThread)/i },
    { id: 'KEYLOGGER-HOOK', name: 'Keylogger hook', severity: 'high', weight: 60, re: /(SetWindowsHookEx\s*\(\s*WH_KEYBOARD|GetAsyncKeyState|GetForegroundWindow.{0,80}GetAsyncKeyState)/is },
    { id: 'CLIPBOARD-HIJACK', name: 'Clipboard hijacker (BTC swap)', severity: 'high', weight: 55, re: /(SetClipboardData|OpenClipboard).{0,200}(1[A-Za-z0-9]{25,34}|3[A-Za-z0-9]{25,34}|bc1[a-z0-9]{25,42})/is },
    { id: 'SCREEN-CAPTURE', name: 'Screen capture spyware', severity: 'medium', weight: 40, re: /(BitBlt|PrintWindow|GetDC\s*\(\s*0|CreateCompatibleBitmap).{0,120}(SendInput|InternetWriteFile|send\()/is },
    { id: 'BROWSER-CRED-STEAL', name: 'Browser credential theft', severity: 'critical', weight: 85, re: /(Login\s+Data|cookies\.sqlite|logins\.json|signons\.sqlite|Web\s+Data)/i },
    { id: 'CRYPTO-MINER', name: 'Crypto miner config', severity: 'high', weight: 70, re: /(stratum\+tcp:\/\/|"algo"\s*:\s*"(cryptonight|randomx|ethash|kawpow|autolykos)"|xmrig|nicehash)/i },
    { id: 'BOTNET-C2', name: 'Botnet C2 channel', severity: 'critical', weight: 80, re: /\/(gate|panel|api|cmd|upload)\.php\?|\/cgi-bin\/[a-z]{8}\.(cgi|pl)|JOIN\s+#&\s*\w+/i },
    { id: 'DNS-TUNNEL', name: 'DNS tunneling', severity: 'medium', weight: 40, re: /([a-z0-9]{20,}\.){3,}[a-z]{2,}\b/i },
    { id: 'TOR-EXIT', name: 'Tor / proxy tool', severity: 'medium', weight: 35, re: /(torrc|Tor\s+Browser|127\.0\.0\.1:9050|Privoxy)/i },
    { id: 'PASSWORD-SPRAY', name: 'Password spraying', severity: 'medium', weight: 40, re: /(Invoke-SMBEnum|Invoke-PasswordSpray|\$password\s*=\s*['"]Password1['"])/i },
    { id: 'LATERAL-PSEXEC', name: 'Lateral movement (PsExec-like)', severity: 'high', weight: 60, re: /(psexesvc|\\\\[a-z0-9_$.-]+\\ADMIN\$|ADMIN\$\\[^\\]+\.exe|wmiexec|atexec)/i },
    { id: 'EXFIL-CLOUD', name: 'Cloud exfiltration', severity: 'high', weight: 55, re: /(rclone|megasync|drive\.google|dropbox\.com\/s\/|wetransfer|sendspace|anonfiles)/i },
    { id: 'MACRO-SHELLCODE', name: 'Macro shellcode loader', severity: 'high', weight: 65, re: /(CreateObject\s*\(\s*["']Shell\.Application["']|WScript\.CreateObject|CallByName|GetObject\s*\(\s*["']winmgmts)/i },
  ];

  const EXTENSION_RISK = {
    '.exe': 10, '.scr': 15, '.bat': 12, '.cmd': 12, '.ps1': 15, '.vbs': 14,
    '.hta': 16, '.js': 6, '.jse': 12, '.wsf': 14, '.lnk': 10, '.pif': 15,
    '.dll': 8, '.jar': 10, '.sh': 8, '.command': 10, '.app': 6, '.msi': 6,
  };

  const DANGEROUS_NAMES = [
    'eicar.com', 'eicar.com.txt', 'xmrig', 'mimikatz', 'cobaltstrike', 'cobalt strike',
    'meterpreter', 'njrat', 'njrat.exe', 'quasarrat', 'asyncrat', 'remcos', 'nanocore',
  ];

  const ARCHIVE_EXTS = ['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.xz'];
  const SCRIPT_EXTS = ['.js', '.jse', '.vbs', '.vbe', '.wsf', '.wsh', '.ps1', '.bat', '.cmd', '.sh', '.py', '.php', '.hta'];
  const DOC_EXTS = ['.doc', '.docm', '.xls', '.xlsm', '.ppt', '.pptm', '.docx', '.xlsx', '.pdf'];
  const SOURCE_EXTS = ['.py', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.java', '.c', '.h', '.cpp', '.hpp', '.cs', '.go', '.rs', '.rb', '.lua', '.sql', '.json', '.yml', '.yaml', '.xml', '.html', '.css', '.scss', '.md', '.txt', '.csv', '.log', '.ini', '.cfg', '.toml', '.env.example', '.sh', '.bash', '.ps1', '.psm1', '.bat', '.cmd', '.php'];
  const TRUSTED_DIRS = /(^|[\\/])(src|lib|dist|build|tests?|__tests__|node_modules|docs?|examples?|scripts|tools?|migrations?|assets|public|static|config)([\\/]|$)/i;
  const SOURCE_FILE_RE = /\.(py|ts|tsx|js|jsx|mjs|cjs|java|c|h|cpp|hpp|cs|go|rs|rb|lua|sql|json|ya?ml|xml|html?|css|scss|md|txt|csv|log|ini|cfg|toml|sh|bash|ps1|psm1|bat|cmd|php)$/i;

  const MAX_SCAN_TEXT = 512 * 1024;

  function decodeHex(hex) {
    if (typeof hex !== 'string' || hex.length > 1024 * 1024) return '';
    const clean = hex.toLowerCase().replace(/[^0-9a-f]/g, '');
    if (clean.length % 2) return '';
    let out = '';
    for (let i = 0; i < clean.length; i += 2) out += String.fromCharCode(parseInt(clean.substr(i, 2), 16));
    return out;
  }

  function matchHexPatterns(bytes) {
    const hits = [];
    if (!bytes || !bytes.length) return hits;
    const text = bytesToLatin1(bytes);
    for (const p of HEX_PATTERNS) {
      if (p.text && text.indexOf(p.text) !== -1) { hits.push(p); continue; }
      if (!p.hex) continue;
      const needle = decodeHex(p.hex);
      if (needle && text.indexOf(needle) !== -1) hits.push(p);
    }
    return hits;
  }

  function bytesToLatin1(bytes) {
    let s = '';
    const len = Math.min(bytes.length, MAX_SCAN_TEXT);
    for (let i = 0; i < len; i++) s += String.fromCharCode(bytes[i]);
    return s;
  }

  function matchTextPatterns(bytes) {
    const hits = [];
    if (!bytes || !bytes.length) return hits;
    const text = bytesToLatin1(bytes);
    for (const p of TEXT_PATTERNS) {
      p.re.lastIndex = 0;
      if (p.re.test(text)) hits.push(p);
    }
    for (const p of URL_PATTERNS) {
      p.re.lastIndex = 0;
      if (p.re.test(text)) hits.push(p);
    }
    for (const m of MZ_CHECKS) {
      if (text.indexOf(m.needle) !== -1 && (!m.check || m.check(text))) hits.push(m);
    }
    return hits;
  }

  function extOf(name) {
    if (typeof name !== 'string') return '';
    const i = name.lastIndexOf('.');
    return i === -1 ? '' : name.slice(i).toLowerCase();
  }

  function nameRisk(name) {
    if (typeof name !== 'string') return 0;
    const n = name.toLowerCase().trim();
    if (!n) return 0;
    if (DANGEROUS_NAMES.includes(n)) return 75;
    let score = 0;
    for (const d of DANGEROUS_NAMES) {
      if (n.includes(d)) { score = Math.max(score, 55); break; }
    }
    if (/^(invoice|payment|document|scan|photo|img)\d*\.(exe|scr|bat|cmd|ps1|hta|lnk)$/i.test(n)) score = Math.max(score, 50);
    if (/\.(exe|scr|bat|cmd|ps1|hta|lnk)\.(zip|rar|7z|pdf|docx?|txt|jpg|png)$/i.test(n)) score = Math.max(score, 60);
    if (/\.(pdf|docx?|txt|jpg|png|zip)\.(exe|scr|bat|cmd|ps1|hta|lnk)$/i.test(n)) score = Math.max(score, 55);
    return score;
  }

  function extensionRisk(name) {
    return EXTENSION_RISK[extOf(name)] || 0;
  }

  function shannonEntropy(bytes) {
    if (!bytes || !bytes.length) return 0;
    const freq = new Uint32Array(256);
    const len = Math.min(bytes.length, 256 * 1024);
    for (let i = 0; i < len; i++) freq[bytes[i]]++;
    let ent = 0;
    const inv = 1 / len;
    for (let i = 0; i < 256; i++) {
      const c = freq[i];
      if (!c) continue;
      const p = c * inv;
      ent -= p * Math.log2(p);
    }
    return ent;
  }

  function buildRegexSafe(patterns) {
    return patterns.filter((p) => p && p.re instanceof RegExp && typeof p.id === 'string');
  }

  return {
    VERSION,
    HEX_PATTERNS: deepFreezeSafe(HEX_PATTERNS),
    TEXT_PATTERNS: deepFreezeSafe(TEXT_PATTERNS),
    URL_PATTERNS: deepFreezeSafe(URL_PATTERNS),
    MZ_CHECKS: deepFreezeSafe(MZ_CHECKS),
    DANGEROUS_NAMES: Object.freeze([...DANGEROUS_NAMES]),
    EXTENSION_RISK: Object.freeze({ ...EXTENSION_RISK }),
    ARCHIVE_EXTS: Object.freeze([...ARCHIVE_EXTS]),
    SCRIPT_EXTS: Object.freeze([...SCRIPT_EXTS]),
    DOC_EXTS: Object.freeze([...DOC_EXTS]),
    SOURCE_EXTS: Object.freeze([...SOURCE_EXTS]),
    TRUSTED_DIRS,
    SOURCE_FILE_RE,
    MAX_SCAN_TEXT,
    decodeHex,
    matchHexPatterns,
    matchTextPatterns,
    bytesToLatin1,
    extOf,
    nameRisk,
    extensionRisk,
    shannonEntropy,
    buildRegexSafe,
    countSignatures,
  };

  function deepFreezeSafe(arr) {
    for (const p of arr) Object.freeze(p);
    return Object.freeze(arr);
  }

  function countSignatures() {
    return HEX_PATTERNS.length + TEXT_PATTERNS.length + URL_PATTERNS.length + MZ_CHECKS.length + DANGEROUS_NAMES.length + Object.keys(EXTENSION_RISK).length;
  }
})();
if (typeof window !== 'undefined') window.Signatures = Signatures;
if (typeof module !== 'undefined' && module.exports) module.exports = Signatures;
