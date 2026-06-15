import { createClient } from "./node_modules/@base44/sdk/dist/index.js";
const appId = "6a1efdb97246f738e8422e59";
const base44 = createClient({ appId, requiresAuth: false, serverUrl: "https://base44.app", appBaseUrl: "https://base44.app" });
const email = `hecto.batch2.resend.${Date.now()}@gmail.com`;
const password = "TestPass123!batch2val";
await base44.auth.register({ email, password });
try {
  const res = await base44.auth.resendOtp(email);
  console.log("RESEND_OK", JSON.stringify(res));
} catch (e) {
  console.log("RESEND_FAIL", JSON.stringify({ status: e.status, message: e.message }));
}
