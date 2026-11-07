// config/logSanitiser.js
// Pure helpers that keep secrets and personal data out of log files and the cloud log platform.

const SENSITIVE_KEYS = ['password', 'token', 'authorization', 'secret', 'cookie', 'jwt', 'mongouri', 'mongo_uri'];

const isSensitiveKey = (key) => {
  const k = String(key).toLowerCase();
  return SENSITIVE_KEYS.some((s) => k.includes(s));
};

// Hide credentials inside connection strings, e.g. mongodb+srv://user:pass@host
const scrubString = (str) =>
  str.replace(/(mongodb(?:\+srv)?:\/\/)[^@\s/]+@/gi, '$1[REDACTED]@');

function redact(value, depth = 0) {
  if (depth > 5) return '[truncated]';
  if (typeof value === 'string') return scrubString(value);
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  if (value instanceof Error) {
    return { name: value.name, message: scrubString(value.message), stack: value.stack };
  }
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = isSensitiveKey(k) ? '[REDACTED]' : redact(v, depth + 1);
    }
    return out;
  }
  return value;
}

// al***@example.com - enough to spot repeated attempts without storing the full address
function maskEmail(email) {
  if (typeof email !== 'string') return undefined;
  const [local, domain] = email.split('@');
  if (!domain) return '[invalid]';
  return `${local.slice(0, 2)}***@${domain}`;
}

module.exports = { redact, maskEmail, isSensitiveKey };
