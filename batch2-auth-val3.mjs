import { createClient } from "./node_modules/@base44/sdk/dist/index.js";

const appId = "6a1efdb97246f738e8422e59";
const base44 = createClient({ appId, requiresAuth: false, serverUrl: "https://base44.app", appBaseUrl: "https://base44.app" });

const email = "hecto.batch2.test.1730000000000@gmail.com";
const password = "TestPass123!batch2val";

// Use latest registered email from env note - try wrong OTP shape test on a fresh register
const testEmail = `hecto.batch2.otp.${Date.now()}@gmail.com`;
await base44.auth.register({ email: testEmail, password });

try {
  const result = await base44.auth.verifyOtp({ email: testEmail, otpCode: "000000" });
  console.log("VERIFY_OTP_SHAPE", JSON.stringify(result));
} catch (e) {
  console.log("VERIFY_OTP_ERROR", JSON.stringify({ status: e.status, message: e.message }));
}

try {
  const login = await base44.auth.loginViaEmailPassword(testEmail, password);
  console.log("LOGIN_UNVERIFIED", JSON.stringify({ hasToken: !!login?.access_token, keys: Object.keys(login || {}) }));
} catch (e) {
  console.log("LOGIN_UNVERIFIED_ERROR", JSON.stringify({ status: e.status, message: e.message }));
}
