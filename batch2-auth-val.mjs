import { createClient } from "./node_modules/@base44/sdk/dist/index.js";
import { createAxiosClient } from "./node_modules/@base44/sdk/dist/utils/axios-client.js";

const appId = "6a1efdb97246f738e8422e59";
const base44 = createClient({ appId, requiresAuth: false, serverUrl: "https://base44.app", appBaseUrl: "https://base44.app" });

async function main() {
  const results = {};

  try {
    const appClient = createAxiosClient({
      baseURL: "https://base44.app/api/apps/public",
      headers: { "X-App-Id": appId },
      interceptResponses: true,
    });
    const publicSettings = await appClient.get(`/prod/public-settings/by-id/${appId}`);
    results.checkAppReady = { ok: true, keys: Object.keys(publicSettings || {}), sample: JSON.stringify(publicSettings).slice(0, 300) };
  } catch (e) {
    results.checkAppReady = { ok: false, status: e.status, hasData: !!e.data, reason: e.data?.extra_data?.reason, message: e.message };
  }

  const email = `batch2val.${Date.now()}@mailinator.com`;
  const password = "TestPass123!batch2";
  try {
    await base44.auth.register({ email, password });
    results.register = { ok: true, email };
  } catch (e) {
    results.register = { ok: false, status: e.status, message: e.message, data: e.data };
  }

  try {
    await base44.auth.resetPasswordRequest("nonexistent-batch2-test@example.com");
    results.requestPasswordReset = { ok: true };
  } catch (e) {
    results.requestPasswordReset = { ok: false, status: e.status, message: e.message };
  }

  try {
    const res = await base44.functions.invoke("adminAuth", { email: "bad@test.com", password: "wrong" });
    results.adminLogin = { ok: true, shape: res, hasDataSuccess: res?.data?.success };
  } catch (e) {
    results.adminLogin = { ok: false, status: e.status, message: e.message, data: e.data };
  }

  console.log(JSON.stringify(results, null, 2));
}
main().catch(e => { console.error(e); process.exit(1); });
