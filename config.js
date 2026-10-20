/* GamePulse access config.
   passwordSha256 is filled in by .github/workflows/deploy.yml from the GP_PASSWORD_SHA256 secret.
   For local testing, paste a hash here (do not commit it).
   The password is never stored in plain text — only its SHA-256 hash.
   To change it: Settings → Security → "Generate hash", or run
     printf '%s' 'your-password' | shasum -a 256
   and paste the hex digest below. On GitHub, keep the real hash out of the repo:
   store it as an Actions secret (GP_PASSWORD_SHA256) and let the deploy workflow
   write this file at build time (see README → Deploying with a password).
   NOTE: a client-side gate deters casual access only. For real protection put the
   site behind server-side auth (Cloudflare Access, Vercel/Netlify password, or the API backend). */
window.GP_CONFIG = {
  passwordSha256: "REPLACED_AT_DEPLOY",
  sessionHours: 12,
  maxAttempts: 5,
  lockoutSeconds: 30
};
