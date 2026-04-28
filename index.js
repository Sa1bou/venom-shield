const PATTERNS = [
  { name: "instruction-override", regex: /ignore\s+(all\s+)?previous\s+instructions/i },
  { name: "instruction-override", regex: /forget\s+(all\s+)?your\s+(rules|instructions|training)/i },
  { name: "role-hijack",          regex: /you\s+are\s+now\s+(?!claude)/i },
  { name: "role-hijack",          regex: /act\s+as\s+(?!a\s+helpful)/i },
  { name: "role-hijack",          regex: /pretend\s+(you\s+are|to\s+be)/i },
  { name: "system-spoof",         regex: /\[\s*SYSTEM\s*\]|\[\s*INST\s*\]/i },
  { name: "credential-theft",     regex: /(send|post|exfil|leak|print)\s+.*(api[_-]?key|token|secret|password|\.env)/i },
  { name: "destructive",          regex: /rm\s+-rf|delete\s+all|drop\s+table|format\s+(the\s+)?disk/i },
  { name: "obfuscated",           regex: /[A-Za-z0-9+/]{40,}={0,2}/ },
  { name: "hidden-html",          regex: /<!--[\s\S]*?(ignore|system|override|jailbreak)[\s\S]*?-->/i },
  { name: "jailbreak",            regex: /jailbreak|DAN\b|do\s+anything\s+now/i },
  { name: "zero-width",           regex: /[​-‍﻿⁠]/ },
];

function scan(text, source = "unknown") {
  const findings = [];
  for (const { name, regex } of PATTERNS) {
    const match = text.match(regex);
    if (match) {
      findings.push({ type: name, match: match[0], index: match.index });
    }
  }
  return findings.length > 0
    ? { safe: false, source, findings }
    : { safe: true, source, findings: [] };
}

module.exports = { scan, PATTERNS };
