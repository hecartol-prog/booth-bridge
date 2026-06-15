import { createClient } from "./node_modules/@base44/sdk/dist/index.js";

const appId = "6a1efdb97246f738e8422e59";
const base44 = createClient({ appId, requiresAuth: false, serverUrl: "https://base44.app", appBaseUrl: "https://base44.app" });

const email = `hecto.batch2.test.${Date.now()}@gmail.com`;
const password = "TestPass123!batch2val";

try {
  const reg = await base44.auth.register({ email, password });
  console.log("REGISTER_OK", JSON.stringify(reg));
} catch (e) {
  console.log("REGISTER_FAIL", JSON.stringify({ status: e.status, message: e.message }));
}

try {
  const res = await base44.functions.invoke("adminAuth", { email: "bad@test.com", password: "wrong" });
  console.log("ADMIN_SHAPE", JSON.stringify(res));
} catch (e) {
  console.log("ADMIN_THROW", JSON.stringify({ status: e.status, message: e.message, data: e.data }));
}
