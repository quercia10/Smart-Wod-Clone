export type LicenseStatus =
  | "none"
  | "trial-active"
  | "trial-expired"
  | "lifetime";

const KEYS = {
  type: "smartwod_license_type",
  trialStart: "smartwod_trial_start",
  trialUsed: "smartwod_trial_used",
};

const TRIAL_CODE = "123456";
const LIFETIME_CODE = "060792";
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export function checkLicense(): LicenseStatus {
  try {
    const type = localStorage.getItem(KEYS.type);
    if (type === "lifetime") return "lifetime";
    if (type === "trial") {
      const start = parseInt(localStorage.getItem(KEYS.trialStart) || "0", 10);
      const elapsed = Date.now() - start;
      return elapsed < SEVEN_DAYS_MS ? "trial-active" : "trial-expired";
    }
    return "none";
  } catch {
    return "none";
  }
}

export function getTrialDaysLeft(): number {
  try {
    const start = parseInt(localStorage.getItem(KEYS.trialStart) || "0", 10);
    const elapsed = Date.now() - start;
    const remaining = SEVEN_DAYS_MS - elapsed;
    return Math.max(0, Math.ceil(remaining / (24 * 60 * 60 * 1000)));
  } catch {
    return 0;
  }
}

export type ActivateResult =
  | "lifetime-ok"
  | "trial-ok"
  | "trial-expired-rejected"
  | "wrong";

export function tryActivate(code: string): ActivateResult {
  if (code === LIFETIME_CODE) {
    try {
      localStorage.setItem(KEYS.type, "lifetime");
    } catch { /* noop */ }
    return "lifetime-ok";
  }

  if (code === TRIAL_CODE) {
    // If trial already expired on this device, reject permanently
    const trialUsed = localStorage.getItem(KEYS.trialUsed);
    const status = checkLicense();
    if (trialUsed === "true" || status === "trial-expired") {
      // Mark used to block future attempts
      try { localStorage.setItem(KEYS.trialUsed, "true"); } catch { /* noop */ }
      return "trial-expired-rejected";
    }
    // Activate trial
    try {
      localStorage.setItem(KEYS.type, "trial");
      localStorage.setItem(KEYS.trialStart, String(Date.now()));
    } catch { /* noop */ }
    return "trial-ok";
  }

  return "wrong";
}

export function markTrialUsed() {
  try { localStorage.setItem(KEYS.trialUsed, "true"); } catch { /* noop */ }
}
