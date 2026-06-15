import { createClient } from "./node_modules/@base44/sdk/dist/index.js";
const appId = "6a1efdb97246f738e8422e59";
const base44 = createClient({ appId, requiresAuth: false, serverUrl: "https://base44.app", appBaseUrl: "https://base44.app" });
try {
  const row = await base44.entities.AdminAccessLog.create({
    email: "batch2-validation@test.com",
    action_performed: "validation_probe",
    status: "test",
    browser: "node",
    device: "desktop",
    login_timestamp: new Date().toISOString(),
    notes: "Batch2 static validation probe",
  });
  console.log("ADMIN_ACCESS_LOG_OK", JSON.stringify({ id: row?.id }));
} catch (e) {
  console.log("ADMIN_ACCESS_LOG_FAIL", JSON.stringify({ status: e.status, message: e.message }));
}
