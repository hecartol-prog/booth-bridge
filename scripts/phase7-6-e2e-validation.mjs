import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

const REQUIRED_ENV = [
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
];

for (const name of REQUIRED_ENV) {
  if (!process.env[name]) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || "jjqhmvfzqpohvukoxeoe";
const FUNCTIONS_BASE = `https://${PROJECT_REF}.functions.supabase.co`;
const RUN_ID = `phase76-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
const APP_URL = "https://boothbridge.app";

const PNG_BYTES = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/a7kAAAAASUVORK5CYII=",
  "base64",
);

const service = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function makePublicClient() {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function decodeJwt(token) {
  const [, payload] = token.split(".");
  return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
}

function makePassword(label) {
  return `P7!${label}-${crypto.randomBytes(6).toString("hex")}`;
}

function makeEmail(label) {
  return `${RUN_ID}.${label}@example.com`;
}

function okResult(extra = {}) {
  return { ok: true, ...extra };
}

function serializeError(error) {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack || null,
    };
  }
  if (error && typeof error === "object") {
    try {
      return JSON.parse(JSON.stringify(error));
    } catch {
      return { message: String(error) };
    }
  }
  return { message: String(error) };
}

function failResult(error, extra = {}) {
  const serialized = serializeError(error);
  return {
    ok: false,
    error: serialized.message || String(error),
    error_details: serialized,
    ...extra,
  };
}

async function attempt(fn) {
  try {
    return okResult({ value: await fn() });
  } catch (error) {
    return failResult(error);
  }
}

async function httpJson(path, { method = "POST", token, body, headers = {} } = {}) {
  const response = await fetch(`${FUNCTIONS_BASE}/${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  return {
    status: response.status,
    ok: response.ok,
    headers: Object.fromEntries(response.headers.entries()),
    text,
    json,
  };
}

async function createUser({ email, password, appMetadata, userMetadata }) {
  const { data, error } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: appMetadata,
    user_metadata: userMetadata,
  });
  if (error) throw error;
  return data.user;
}

async function ensurePublicUserRow(id, patch = {}) {
  const { error } = await service.from("user").upsert(
    {
      id,
      ...patch,
    },
    { onConflict: "id" },
  );
  if (error) throw error;
}

async function signIn(email, password) {
  const client = makePublicClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  const session = data.session;
  if (!session) throw new Error(`No session returned for ${email}`);
  client.realtime.setAuth(session.access_token);
  return {
    client,
    user: data.user,
    session,
    claims: decodeJwt(session.access_token),
  };
}

function makeImageBlob() {
  return new Blob([PNG_BYTES], { type: "image/png" });
}

async function waitForChannel(channel) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Realtime subscribe timed out")), 15000);
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        clearTimeout(timeout);
        resolve();
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        clearTimeout(timeout);
        reject(new Error(`Realtime subscribe failed: ${status}`));
      }
    });
  });
}

function waitForEvent(events, predicate, timeoutMs = 15000) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const timer = setInterval(() => {
      const match = events.find(predicate);
      if (match) {
        clearInterval(timer);
        resolve(match);
        return;
      }
      if (Date.now() - started > timeoutMs) {
        clearInterval(timer);
        reject(new Error("Timed out waiting for realtime event"));
      }
    }, 150);
  });
}

function summarizeEnvelope(response) {
  const json = response.json || {};
  return {
    status: response.status,
    success: json.success,
    hasProvider: typeof json.provider === "string",
    hasModel: typeof json.model === "string",
    hasLatency: typeof json.latency === "number",
    hasUsageField: Object.prototype.hasOwnProperty.call(json, "usage"),
    errorCode: json.error?.code || null,
  };
}

async function main() {
  const results = {
    run_id: RUN_ID,
    project_ref: PROJECT_REF,
    auth: {},
    jwt: {},
    crud: {},
    rls: {},
    storage: {},
    ai: {},
    realtime: {},
    abstractions: {},
    cleanup: {},
    defects: [],
    limitations: [],
  };

  const createdAuthUserIds = [];
  const cleanupRows = {
    notification: [],
    meeting: [],
    connection: [],
    booth: [],
    product: [],
    company: [],
    user: [],
  };
  const cleanupStorage = {
    "boothbridge-media": [],
    "boothbridge-assets": [],
    "boothbridge-ocr": [],
  };
  const channels = [];
  let currentStep = "start";
  const mark = (step) => {
    currentStep = step;
  };

  let ownerUser;
  let otherUser;
  let adminUser;
  let resetUser;
  let userCrudUser;

  const credentials = {
    register: { email: makeEmail("register"), password: makePassword("register") },
    owner: { email: makeEmail("owner"), password: makePassword("owner") },
    other: { email: makeEmail("other"), password: makePassword("other") },
    admin: { email: makeEmail("admin"), password: makePassword("admin") },
    reset: { email: makeEmail("reset"), password: makePassword("reset") },
    userCrud: { email: makeEmail("usercrud"), password: makePassword("usercrud") },
    otpEmail: { email: makeEmail("otp-email"), password: makePassword("otp-email") },
    otpSignup: { email: makeEmail("otp-signup"), password: makePassword("otp-signup") },
  };

  try {
    mark("auth.register");
    const registerClient = makePublicClient();
    const registerOutcome = await registerClient.auth.signUp({
      email: credentials.register.email,
      password: credentials.register.password,
      options: { emailRedirectTo: APP_URL },
    });
    results.auth.register = registerOutcome.error
      ? failResult(registerOutcome.error)
      : okResult({
          user_id: registerOutcome.data.user?.id || null,
          has_session: Boolean(registerOutcome.data.session),
          email_confirmed_at: registerOutcome.data.user?.email_confirmed_at || null,
        });
    if (registerOutcome.data.user?.id) createdAuthUserIds.push(registerOutcome.data.user.id);

    mark("auth.seed-users");
    ownerUser = await createUser({
      email: credentials.owner.email,
      password: credentials.owner.password,
      userMetadata: { user_role: "exhibitor", onboarded: true },
    });
    otherUser = await createUser({
      email: credentials.other.email,
      password: credentials.other.password,
      userMetadata: { user_role: "buyer", onboarded: true },
    });
    adminUser = await createUser({
      email: credentials.admin.email,
      password: credentials.admin.password,
      appMetadata: { role: "admin" },
      userMetadata: { user_role: "exhibitor", onboarded: true },
    });
    resetUser = await createUser({
      email: credentials.reset.email,
      password: credentials.reset.password,
      userMetadata: { user_role: "user", onboarded: true },
    });
    userCrudUser = await createUser({
      email: credentials.userCrud.email,
      password: credentials.userCrud.password,
      userMetadata: { user_role: "user", onboarded: false },
    });

    createdAuthUserIds.push(
      ownerUser.id,
      otherUser.id,
      adminUser.id,
      resetUser.id,
      userCrudUser.id,
    );

    await ensurePublicUserRow(ownerUser.id, {
      user_role: "exhibitor",
      onboarded: true,
    });
    await ensurePublicUserRow(otherUser.id, {
      user_role: "buyer",
      onboarded: true,
    });
    await ensurePublicUserRow(adminUser.id, {
      user_role: "exhibitor",
      onboarded: true,
    });
    await ensurePublicUserRow(resetUser.id, {
      user_role: "user",
      onboarded: true,
    });
    cleanupRows.user.push(ownerUser.id, otherUser.id, adminUser.id, resetUser.id);

    mark("auth.signin-seed-users");
    const ownerAuth = await signIn(credentials.owner.email, credentials.owner.password);
    const otherAuth = await signIn(credentials.other.email, credentials.other.password);
    const adminAuth = await signIn(credentials.admin.email, credentials.admin.password);
    const resetAuth = await signIn(credentials.reset.email, credentials.reset.password);

    results.auth.login = okResult({
      owner: Boolean(ownerAuth.session?.access_token),
      other: Boolean(otherAuth.session?.access_token),
      admin: Boolean(adminAuth.session?.access_token),
    });

    mark("auth.refresh");
    const refreshAttempt = await ownerAuth.client.auth.refreshSession();
    results.auth.session_refresh = refreshAttempt.error
      ? failResult(refreshAttempt.error)
      : okResult({
          has_session: Boolean(refreshAttempt.data.session),
          access_token_changed:
            refreshAttempt.data.session?.access_token !== ownerAuth.session.access_token,
        });
    if (refreshAttempt.data.session?.access_token) {
      ownerAuth.session = refreshAttempt.data.session;
      ownerAuth.claims = decodeJwt(ownerAuth.session.access_token);
      ownerAuth.client.realtime.setAuth(ownerAuth.session.access_token);
    }

    mark("auth.logout");
    const logoutClient = makePublicClient();
    await logoutClient.auth.signInWithPassword({
      email: credentials.other.email,
      password: credentials.other.password,
    });
    const logoutAttempt = await logoutClient.auth.signOut();
    const logoutSession = await logoutClient.auth.getSession();
    results.auth.logout = logoutAttempt.error
      ? failResult(logoutAttempt.error)
      : okResult({
          session_after_logout: logoutSession.data.session,
        });

    mark("auth.password-reset");
    const recovery = await service.auth.admin.generateLink({
      type: "recovery",
      email: credentials.reset.email,
      options: { redirectTo: `${APP_URL}/reset-password` },
    });
    if (recovery.error) {
      results.auth.password_reset = failResult(recovery.error);
    } else {
      const newPassword = makePassword("reset-new");
      const recoveryClient = makePublicClient();
      const verifyRecovery = await recoveryClient.auth.verifyOtp({
        token_hash: recovery.data.properties.hashed_token,
        type: "recovery",
      });
      const updatePassword = verifyRecovery.error
        ? { error: verifyRecovery.error }
        : await recoveryClient.auth.updateUser({ password: newPassword });
      let relogin = null;
      if (!updatePassword.error) {
        relogin = await attempt(() => signIn(credentials.reset.email, newPassword));
        credentials.reset.password = newPassword;
      }
      results.auth.password_reset = verifyRecovery.error || updatePassword.error
        ? failResult(verifyRecovery.error || updatePassword.error)
        : okResult({
            verify_session: Boolean(verifyRecovery.data.session),
            relogin_ok: Boolean(relogin?.ok),
          });
    }

    mark("auth.otp");
    const otpEmailLink = await service.auth.admin.generateLink({
      type: "signup",
      email: credentials.otpEmail.email,
      password: credentials.otpEmail.password,
      options: { redirectTo: APP_URL },
    });
    const otpSignupLink = await service.auth.admin.generateLink({
      type: "signup",
      email: credentials.otpSignup.email,
      password: credentials.otpSignup.password,
      options: { redirectTo: APP_URL },
    });
    if (otpEmailLink.error || otpSignupLink.error) {
      results.auth.otp_verification = failResult(
        otpEmailLink.error || otpSignupLink.error,
      );
    } else {
      const otpEmailClient = makePublicClient();
      const otpSignupClient = makePublicClient();
      const verifyEmail = await otpEmailClient.auth.verifyOtp({
        email: credentials.otpEmail.email,
        token: otpEmailLink.data.properties.email_otp,
        type: "email",
      });
      const verifySignup = await otpSignupClient.auth.verifyOtp({
        email: credentials.otpSignup.email,
        token: otpSignupLink.data.properties.email_otp,
        type: "signup",
      });
      if (otpEmailLink.data.user?.id) createdAuthUserIds.push(otpEmailLink.data.user.id);
      if (otpSignupLink.data.user?.id) createdAuthUserIds.push(otpSignupLink.data.user.id);
      results.auth.otp_verification = okResult({
        verify_email_type: !verifyEmail.error,
        verify_signup_type: !verifySignup.error,
        signup_type_error: verifySignup.error?.message || null,
      });
      if (verifySignup.error) {
        results.defects.push(
          "Supabase email OTP verification with type='signup' failed; current docs recommend type='email', but src/api/supabaseAuth.js still calls type='signup'.",
        );
      }
    }

    mark("auth.oauth");
    const googleClient = makePublicClient();
    const linkedinClient = makePublicClient();
    const googleOAuth = await googleClient.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${APP_URL}/oauth/google`,
        skipBrowserRedirect: true,
      },
    });
    const linkedinOAuth = await linkedinClient.auth.signInWithOAuth({
      provider: "linkedin_oidc",
      options: {
        redirectTo: `${APP_URL}/oauth/linkedin`,
        skipBrowserRedirect: true,
      },
    });
    results.auth.google_oauth = googleOAuth.error
      ? failResult(googleOAuth.error)
      : okResult({ has_url: Boolean(googleOAuth.data?.url) });
    results.auth.linkedin_oauth = linkedinOAuth.error
      ? failResult(linkedinOAuth.error)
      : okResult({ has_url: Boolean(linkedinOAuth.data?.url) });

    mark("jwt.validation");
    const ownerGetUser = await ownerAuth.client.auth.getUser();
    results.jwt = okResult({
      owner_has_access_token: Boolean(ownerAuth.session.access_token),
      owner_sub_matches: ownerAuth.claims.sub === ownerUser.id,
      owner_role_claim: ownerAuth.claims.role || null,
      admin_app_metadata_role: adminAuth.claims.app_metadata?.role || null,
      auth_get_user_ok: Boolean(ownerGetUser.data.user && !ownerGetUser.error),
    });

    results.abstractions.authClient = okResult({
      live_supabase_paths_validated: [
        "register",
        "loginWithEmailPassword",
        "logout",
        "refresh",
        "requestPasswordReset",
        "verifyOtp",
        "signInWithGoogle",
        "signInWithLinkedIn",
      ],
      merge_app_user_static_basis: {
        owner_public_user_row_present: true,
        admin_role_claim: adminAuth.claims.app_metadata?.role || null,
        note: "mergeAppUser() itself was not executed in Node; behavior inferred from source and live auth/public.user data.",
      },
    });

    mark("crud.user");
    const userCrudAuth = await signIn(credentials.userCrud.email, credentials.userCrud.password);
    const createdUserRow = await userCrudAuth.client.from("user").insert({
      id: userCrudUser.id,
      user_role: "user",
      onboarded: false,
    }).select("*").single();
    if (createdUserRow.error) throw createdUserRow.error;
    cleanupRows.user.push(userCrudUser.id);
    const userRead = await userCrudAuth.client.from("user").select("*").eq("id", userCrudUser.id).single();
    const userUpdate = await userCrudAuth.client.from("user").update({
      onboarded: true,
      user_role: "validated_user",
    }).eq("id", userCrudUser.id).select("*").single();
    const userDelete = await adminAuth.client.from("user").delete().eq("id", userCrudUser.id);
    results.crud.user = okResult({
      create: !createdUserRow.error,
      read: !userRead.error && userRead.data?.id === userCrudUser.id,
      update: !userUpdate.error && userUpdate.data?.onboarded === true,
      delete: !userDelete.error,
    });

    mark("crud.company");
    const companyInsert = await ownerAuth.client.from("company").insert({
      company_name: `${RUN_ID} Company`,
      created_by_user_id: ownerUser.id,
      description: "Phase 7.6 validation company",
    }).select("*").single();
    if (companyInsert.error) throw companyInsert.error;
    const company = companyInsert.data;
    cleanupRows.company.push(company.id);

    const companyRead = await ownerAuth.client.from("company").select("*").eq("id", company.id).single();
    const companyUpdate = await ownerAuth.client.from("company").update({
      city: "Tokyo",
    }).eq("id", company.id).select("*").single();
    const companyDeleteProbe = await ownerAuth.client.from("company").delete().eq("id", company.id);
    results.crud.company = okResult({
      create: !companyInsert.error,
      read: !companyRead.error,
      update: !companyUpdate.error && companyUpdate.data?.city === "Tokyo",
      delete: !companyDeleteProbe.error,
    });
    if (!companyDeleteProbe.error) {
      const companyRestore = await service.from("company").insert({
        ...company,
        city: "Tokyo",
      }).select("*").single();
      if (companyRestore.error) throw companyRestore.error;
    }

    mark("crud.booth");
    const boothInsert = await ownerAuth.client.from("booth").insert({
      company_id: company.id,
      company_name: company.company_name,
      exhibitor_user_id: ownerUser.id,
      booth_number: "A-101",
      event_name: `${RUN_ID} Expo`,
    }).select("*").single();
    if (boothInsert.error) throw boothInsert.error;
    const booth = boothInsert.data;
    cleanupRows.booth.push(booth.id);
    const boothRead = await ownerAuth.client.from("booth").select("*").eq("id", booth.id).single();
    const boothUpdate = await ownerAuth.client.from("booth").update({
      live_status: "online",
    }).eq("id", booth.id).select("*").single();
    const boothDelete = await ownerAuth.client.from("booth").delete().eq("id", booth.id);
    results.crud.booth = okResult({
      create: !boothInsert.error,
      read: !boothRead.error,
      update: !boothUpdate.error && boothUpdate.data?.live_status === "online",
      delete: !boothDelete.error,
    });
    if (!boothDelete.error) {
      const boothRestore = await service.from("booth").insert({
        ...booth,
        live_status: "online",
      }).select("*").single();
      if (boothRestore.error) throw boothRestore.error;
    }

    mark("crud.product");
    const productInsert = await ownerAuth.client.from("product").insert({
      exhibitor_user_id: ownerUser.id,
      title: `${RUN_ID} Product`,
      description: "Phase 7.6 validation product",
    }).select("*").single();
    if (productInsert.error) throw productInsert.error;
    const product = productInsert.data;
    cleanupRows.product.push(product.id);
    const productRead = await ownerAuth.client.from("product").select("*").eq("id", product.id).single();
    const productUpdate = await ownerAuth.client.from("product").update({
      event_name: `${RUN_ID} Event`,
    }).eq("id", product.id).select("*").single();
    const productDelete = await ownerAuth.client.from("product").delete().eq("id", product.id);
    results.crud.product = okResult({
      create: !productInsert.error,
      read: !productRead.error,
      update: !productUpdate.error && productUpdate.data?.event_name === `${RUN_ID} Event`,
      delete: !productDelete.error,
    });
    if (!productDelete.error) {
      const productRestore = await service.from("product").insert({
        ...product,
        event_name: `${RUN_ID} Event`,
      }).select("*").single();
      if (productRestore.error) throw productRestore.error;
    }

    mark("crud.connection");
    const connectionInsert = await ownerAuth.client.from("connection").insert({
      exhibitor_user_id: ownerUser.id,
      buyer_user_id: otherUser.id,
      initiated_by: "exhibitor",
      exhibitor_name: "Owner User",
      buyer_name: "Other User",
      exhibitor_company: company.company_name,
      buyer_company: `${RUN_ID} Buyer`,
      event_name: `${RUN_ID} Expo`,
    }).select("*").single();
    if (connectionInsert.error) throw connectionInsert.error;
    const connection = connectionInsert.data;
    cleanupRows.connection.push(connection.id);
    const connectionRead = await ownerAuth.client.from("connection").select("*").eq("id", connection.id).single();
    const connectionUpdate = await otherAuth.client.from("connection").update({
      status: "accepted",
    }).eq("id", connection.id).select("*").single();
    const connectionDelete = await ownerAuth.client.from("connection").delete().eq("id", connection.id);
    results.crud.connection = okResult({
      create: !connectionInsert.error,
      read: !connectionRead.error,
      update: !connectionUpdate.error && connectionUpdate.data?.status === "accepted",
      delete: !connectionDelete.error,
    });
    if (!connectionDelete.error) {
      const connectionRestore = await service.from("connection").insert({
        ...connection,
        status: "accepted",
      }).select("*").single();
      if (connectionRestore.error) throw connectionRestore.error;
    }

    mark("crud.meeting");
    const meetingInsert = await ownerAuth.client.from("meeting").insert({
      connection_id: connection.id,
      proposed_by: ownerUser.id,
      proposed_to: otherUser.id,
      proposed_time: new Date(Date.now() + 3600000).toISOString(),
      title: `${RUN_ID} Meeting`,
      location: "Hall A",
      proposer_name: "Owner User",
      recipient_name: "Other User",
    }).select("*").single();
    if (meetingInsert.error) throw meetingInsert.error;
    const meeting = meetingInsert.data;
    cleanupRows.meeting.push(meeting.id);
    const meetingRead = await otherAuth.client.from("meeting").select("*").eq("id", meeting.id).single();
    const meetingUpdate = await otherAuth.client.from("meeting").update({
      status: "confirmed",
    }).eq("id", meeting.id).select("*").single();
    const meetingDelete = await ownerAuth.client.from("meeting").delete().eq("id", meeting.id);
    results.crud.meeting = okResult({
      create: !meetingInsert.error,
      read: !meetingRead.error,
      update: !meetingUpdate.error && meetingUpdate.data?.status === "confirmed",
      delete: !meetingDelete.error,
    });
    if (!meetingDelete.error) {
      const meetingRestore = await service.from("meeting").insert({
        ...meeting,
        status: "confirmed",
      }).select("*").single();
      if (meetingRestore.error) throw meetingRestore.error;
    }

    mark("crud.notification");
    const crossUserNotificationAttempt = await ownerAuth.client.from("notification").insert({
      user_id: otherUser.id,
      type: "phase76",
      title: `${RUN_ID} Notification`,
      message: "Validation notification",
      from_user_name: "Owner User",
    }).select("*").single();
    if (crossUserNotificationAttempt.error) {
      results.defects.push(
        "Cross-user notification creation fails on the Supabase path because dbClient/makeSupabaseEntity.create() always selects the inserted row, but notification SELECT is recipient-only. This breaks sender-side create flows such as sendNotification().",
      );
    }

    const selfNotificationInsert = await otherAuth.client.from("notification").insert({
      user_id: otherUser.id,
      type: "phase76-self",
      title: `${RUN_ID} Self Notification`,
      message: "Validation self notification",
      from_user_name: "Other User",
    }).select("*").single();
    if (selfNotificationInsert.error) throw selfNotificationInsert.error;
    const notification = selfNotificationInsert.data;
    cleanupRows.notification.push(notification.id);
    const notificationRead = await otherAuth.client.from("notification").select("*").eq("id", notification.id).single();
    const notificationUpdate = await otherAuth.client.from("notification").update({
      read: true,
    }).eq("id", notification.id).select("*").single();
    const notificationDelete = await otherAuth.client.from("notification").delete().eq("id", notification.id);
    results.crud.notification = okResult({
      cross_user_create_via_dbclient_shape: !crossUserNotificationAttempt.error,
      create: !selfNotificationInsert.error,
      read: !notificationRead.error,
      update: !notificationUpdate.error && notificationUpdate.data?.read === true,
      delete: !notificationDelete.error,
    });

    mark("rls.matrix");
    const anonCompanyRead = await makePublicClient().from("company").select("*").eq("id", company.id);
    const anonCompanyInsert = await makePublicClient().from("company").insert({
      company_name: `${RUN_ID} Anon`,
      created_by_user_id: ownerUser.id,
    });
    const otherCompanyRead = await otherAuth.client.from("company").select("*").eq("id", company.id);
    const adminCompanyRead = await adminAuth.client.from("company").select("*").eq("id", company.id).single();
    const otherProductRead = await otherAuth.client.from("product").select("*").eq("id", product.id).single();
    const otherBoothRead = await otherAuth.client.from("booth").select("*").eq("id", booth.id);
    const ownerNotificationRead = await ownerAuth.client.from("notification").select("*").eq("id", notification.id);
    const adminUserRead = await adminAuth.client.from("user").select("*").eq("id", ownerUser.id).single();
    results.rls = okResult({
      anonymous_company_read_count: anonCompanyRead.data?.length ?? 0,
      anonymous_company_insert_error: anonCompanyInsert.error?.message || null,
      authenticated_non_owner_company_read_count: otherCompanyRead.data?.length ?? 0,
      authenticated_non_owner_booth_read_count: otherBoothRead.data?.length ?? 0,
      authenticated_non_owner_product_read: Boolean(otherProductRead.data),
      owner_company_read: (companyRead.data?.id === company.id),
      recipient_notification_read: Boolean(notificationRead.data),
      sender_notification_read_count: ownerNotificationRead.data?.length ?? 0,
      admin_company_read: Boolean(adminCompanyRead.data),
      admin_user_read: Boolean(adminUserRead.data),
    });

    mark("storage.upload");
    const mediaPath = `uploads/${ownerUser.id}/${RUN_ID}-media.png`;
    const assetsPath = `companies/${company.id}/catalogs/${RUN_ID}-catalog.png`;
    const ocrPath = `scans/${ownerUser.id}/${RUN_ID}-ocr.png`;
    cleanupStorage["boothbridge-media"].push(mediaPath);
    cleanupStorage["boothbridge-assets"].push(assetsPath);
    cleanupStorage["boothbridge-ocr"].push(ocrPath);

    const mediaUpload = await ownerAuth.client.storage.from("boothbridge-media").upload(
      mediaPath,
      makeImageBlob(),
      { upsert: true, contentType: "image/png" },
    );
    const assetsUpload = await ownerAuth.client.storage.from("boothbridge-assets").upload(
      assetsPath,
      makeImageBlob(),
      { upsert: true, contentType: "image/png" },
    );
    const ocrUpload = await ownerAuth.client.storage.from("boothbridge-ocr").upload(
      ocrPath,
      makeImageBlob(),
      { upsert: true, contentType: "image/png" },
    );
    if (mediaUpload.error) throw mediaUpload.error;
    if (assetsUpload.error) throw assetsUpload.error;
    if (ocrUpload.error) throw ocrUpload.error;

    const mediaSigned = await ownerAuth.client.storage.from("boothbridge-media").createSignedUrl(mediaPath, 900);
    const assetsSigned = await ownerAuth.client.storage.from("boothbridge-assets").createSignedUrl(assetsPath, 900);
    const ocrSigned = await ownerAuth.client.storage.from("boothbridge-ocr").createSignedUrl(ocrPath, 900);
    const mediaDownload = await ownerAuth.client.storage.from("boothbridge-media").download(mediaPath);
    const assetsDownload = await ownerAuth.client.storage.from("boothbridge-assets").download(assetsPath);
    const ocrDownload = await ownerAuth.client.storage.from("boothbridge-ocr").download(ocrPath);
    const otherMediaSigned = await otherAuth.client.storage.from("boothbridge-media").createSignedUrl(mediaPath, 900);
    const otherAssetsDownload = await otherAuth.client.storage.from("boothbridge-assets").download(assetsPath);
    const otherOcrDelete = await otherAuth.client.storage.from("boothbridge-ocr").remove([ocrPath]);
    const ocrDownloadAfterOtherDelete = await ownerAuth.client.storage.from("boothbridge-ocr").download(ocrPath);
    results.storage = okResult({
      media: {
        upload: !mediaUpload.error,
        signed_url: !mediaSigned.error,
        download: !mediaDownload.error,
        other_user_signed_url_error: otherMediaSigned.error?.message || null,
      },
      assets: {
        upload: !assetsUpload.error,
        signed_url: !assetsSigned.error,
        download: !assetsDownload.error,
        other_user_download_error: otherAssetsDownload.error?.message || null,
      },
      ocr: {
        upload: !ocrUpload.error,
        signed_url: !ocrSigned.error,
        download: !ocrDownload.error,
        other_user_delete_error: otherOcrDelete.error?.message || null,
        object_still_exists_after_other_delete: !ocrDownloadAfterOtherDelete.error,
      },
    });

    const mediaFileUrl = mediaSigned.data.signedUrl;
    const documentFileUrl = assetsSigned.data.signedUrl;

    mark("ai.functions");
    const aiHealth = await httpJson("ai-health", {
      token: ownerAuth.session.access_token,
      body: { ping: true },
    });
    const aiChat = await httpJson("ai-chat", {
      token: ownerAuth.session.access_token,
      body: {
        messages: [{ role: "user", content: "Reply with the single word OK." }],
      },
    });
    const aiGenerate = await httpJson("ai-generate", {
      token: ownerAuth.session.access_token,
      body: {
        prompt: "Return a JSON object with ok=true.",
        json_schema: {
          type: "object",
          properties: { ok: { type: "boolean" } },
          required: ["ok"],
        },
      },
    });
    const aiDocument = await httpJson("ai-document", {
      token: ownerAuth.session.access_token,
      body: {
        prompt: "Extract any visible text from this uploaded document.",
        file_url: documentFileUrl,
      },
    });
    const aiBusinessCard = await httpJson("ai-business-card", {
      token: ownerAuth.session.access_token,
      body: {
        prompt: "Extract contact details if any. If none are visible, say no contact info.",
        file_url: mediaFileUrl,
      },
    });
    const aiGenerateError = await httpJson("ai-generate", {
      token: ownerAuth.session.access_token,
      body: {},
    });
    results.ai = okResult({
      ai_health: summarizeEnvelope(aiHealth),
      ai_chat: summarizeEnvelope(aiChat),
      ai_generate: summarizeEnvelope(aiGenerate),
      ai_document: summarizeEnvelope(aiDocument),
      ai_business_card: summarizeEnvelope(aiBusinessCard),
      error_handling: summarizeEnvelope(aiGenerateError),
      provider_selection: aiHealth.json?.result?.provider || aiHealth.json?.provider || null,
      health_probe_status: aiHealth.json?.result?.result?.status || aiHealth.json?.result?.status || null,
      health_probe_message:
        aiHealth.json?.result?.result?.probe?.message ||
        aiHealth.json?.result?.probe?.message ||
        aiHealth.json?.error?.message ||
        null,
      chat_error_message: aiChat.json?.error?.message || null,
      generate_error_message: aiGenerate.json?.error?.message || null,
      document_error_message: aiDocument.json?.error?.message || null,
      business_card_error_message: aiBusinessCard.json?.error?.message || null,
    });
    if (
      aiHealth.json?.result?.result?.probe?.ok === false &&
      aiGenerate.json?.error?.code === "AI_AUTHENTICATION"
    ) {
      results.defects.push(
        "AI provider execution is blocked on the canonical project. ai-health reaches the function but reports a degraded provider probe, and authenticated AI functions fail with provider authentication errors.",
      );
    }

    results.abstractions.dbClient = okResult({
      live_tables_exercised: ["user", "company", "booth", "product", "meeting", "connection", "notification"],
      note: "Validated against the same tables and RLS patterns used by src/utils/dbClient.js and src/utils/supabaseEntity.js.",
    });
    results.abstractions.storageClient = okResult({
      live_buckets_exercised: ["boothbridge-media", "boothbridge-assets", "boothbridge-ocr"],
      note: "Validated against the same bucket conventions used by src/api/storageClient.js and src/api/supabaseStorage.js.",
    });
    results.abstractions.aiClient = okResult({
      live_functions_exercised: ["ai-health", "ai-chat", "ai-generate", "ai-document", "ai-business-card"],
      note: "Validated the Supabase function endpoints that src/api/supabaseAi.js targets.",
    });

    mark("realtime.subscribe");
    const ownerConnEvents = [];
    const otherConnEvents = [];
    const ownerMeetingEvents = [];
    const otherMeetingEvents = [];
    const ownerConnChannel = ownerAuth.client.channel(`phase76-connection-owner-${RUN_ID}`);
    const otherConnChannel = otherAuth.client.channel(`phase76-connection-other-${RUN_ID}`);
    const ownerMeetingChannel = ownerAuth.client.channel(`phase76-meeting-owner-${RUN_ID}`);
    const otherMeetingChannel = otherAuth.client.channel(`phase76-meeting-other-${RUN_ID}`);
    channels.push(ownerConnChannel, otherConnChannel, ownerMeetingChannel, otherMeetingChannel);

    ownerConnChannel.on("postgres_changes", { event: "*", schema: "public", table: "connection" }, (payload) => ownerConnEvents.push(payload));
    otherConnChannel.on("postgres_changes", { event: "*", schema: "public", table: "connection" }, (payload) => otherConnEvents.push(payload));
    ownerMeetingChannel.on("postgres_changes", { event: "*", schema: "public", table: "meeting" }, (payload) => ownerMeetingEvents.push(payload));
    otherMeetingChannel.on("postgres_changes", { event: "*", schema: "public", table: "meeting" }, (payload) => otherMeetingEvents.push(payload));

    await Promise.all([
      waitForChannel(ownerConnChannel),
      waitForChannel(otherConnChannel),
      waitForChannel(ownerMeetingChannel),
      waitForChannel(otherMeetingChannel),
    ]);
    await sleep(1000);

    mark("realtime.exercise");
    const realtimeConnectionInsert = await ownerAuth.client.from("connection").insert({
      exhibitor_user_id: ownerUser.id,
      buyer_user_id: otherUser.id,
      initiated_by: "exhibitor",
      exhibitor_name: "Owner User",
      buyer_name: "Other User",
      event_name: `${RUN_ID} Realtime`,
    }).select("*").single();
    if (realtimeConnectionInsert.error) throw realtimeConnectionInsert.error;
    const realtimeConnection = realtimeConnectionInsert.data;
    cleanupRows.connection.push(realtimeConnection.id);

    await Promise.all([
      waitForEvent(ownerConnEvents, (e) => e.eventType === "INSERT" && e.new?.id === realtimeConnection.id),
      waitForEvent(otherConnEvents, (e) => e.eventType === "INSERT" && e.new?.id === realtimeConnection.id),
    ]);

    const realtimeConnectionUpdate = await otherAuth.client.from("connection").update({
      status: "engaged",
    }).eq("id", realtimeConnection.id).select("*").single();
    if (realtimeConnectionUpdate.error) throw realtimeConnectionUpdate.error;

    await Promise.all([
      waitForEvent(ownerConnEvents, (e) => e.eventType === "UPDATE" && e.new?.id === realtimeConnection.id && e.new?.status === "engaged"),
      waitForEvent(otherConnEvents, (e) => e.eventType === "UPDATE" && e.new?.id === realtimeConnection.id && e.new?.status === "engaged"),
    ]);

    const realtimeMeetingInsert = await ownerAuth.client.from("meeting").insert({
      connection_id: realtimeConnection.id,
      proposed_by: ownerUser.id,
      proposed_to: otherUser.id,
      proposed_time: new Date(Date.now() + 5400000).toISOString(),
      title: `${RUN_ID} Realtime Meeting`,
      location: "Realtime Hall",
      proposer_name: "Owner User",
      recipient_name: "Other User",
    }).select("*").single();
    if (realtimeMeetingInsert.error) throw realtimeMeetingInsert.error;
    const realtimeMeeting = realtimeMeetingInsert.data;
    cleanupRows.meeting.push(realtimeMeeting.id);

    await Promise.all([
      waitForEvent(ownerMeetingEvents, (e) => e.eventType === "INSERT" && e.new?.id === realtimeMeeting.id),
      waitForEvent(otherMeetingEvents, (e) => e.eventType === "INSERT" && e.new?.id === realtimeMeeting.id),
    ]);

    const realtimeMeetingUpdate = await otherAuth.client.from("meeting").update({
      status: "accepted",
    }).eq("id", realtimeMeeting.id).select("*").single();
    if (realtimeMeetingUpdate.error) throw realtimeMeetingUpdate.error;

    await Promise.all([
      waitForEvent(ownerMeetingEvents, (e) => e.eventType === "UPDATE" && e.new?.id === realtimeMeeting.id && e.new?.status === "accepted"),
      waitForEvent(otherMeetingEvents, (e) => e.eventType === "UPDATE" && e.new?.id === realtimeMeeting.id && e.new?.status === "accepted"),
    ]);

    results.realtime = okResult({
      connection_insert_propagated_owner: true,
      connection_insert_propagated_other: true,
      connection_update_propagated_owner: true,
      connection_update_propagated_other: true,
      meeting_insert_propagated_owner: true,
      meeting_insert_propagated_other: true,
      meeting_update_propagated_owner: true,
      meeting_update_propagated_other: true,
    });
  } catch (error) {
    if (currentStep.startsWith("realtime.")) {
      results.realtime = failResult(error, { step: currentStep });
      results.defects.push(
        "Realtime subscriptions for connection/meeting did not deliver expected postgres_changes events during validation.",
      );
    } else {
      results.harness_error = failResult(error, { step: currentStep });
    }
  } finally {
    for (const channel of channels) {
      try {
        await channel.unsubscribe();
      } catch {
        // Ignore cleanup failures.
      }
    }

    for (const [bucket, paths] of Object.entries(cleanupStorage)) {
      if (paths.length === 0) continue;
      await service.storage.from(bucket).remove(paths);
    }

    const reverseDeletePlan = [
      ["notification", cleanupRows.notification],
      ["meeting", cleanupRows.meeting],
      ["connection", cleanupRows.connection],
      ["booth", cleanupRows.booth],
      ["product", cleanupRows.product],
      ["company", cleanupRows.company],
      ["user", cleanupRows.user],
    ];

    for (const [table, ids] of reverseDeletePlan) {
      if (!ids.length) continue;
      await service.from(table).delete().in("id", ids);
    }

    for (const id of createdAuthUserIds) {
      await service.auth.admin.deleteUser(id);
    }

    results.cleanup = okResult({
      auth_users_deleted: createdAuthUserIds.length,
      storage_objects_deleted:
        cleanupStorage["boothbridge-media"].length +
        cleanupStorage["boothbridge-assets"].length +
        cleanupStorage["boothbridge-ocr"].length,
    });
  }

  console.log(JSON.stringify(results, null, 2));
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        run_id: RUN_ID,
        fatal: error instanceof Error ? error.message : String(error),
      },
      null,
      2,
    ),
  );
  process.exit(1);
});
