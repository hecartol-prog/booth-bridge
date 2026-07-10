export function hasExhibitorCreds(): boolean {
  return Boolean(process.env.E2E_EXHIBITOR_EMAIL && process.env.E2E_EXHIBITOR_PASSWORD);
}

export function hasBuyerCreds(): boolean {
  return Boolean(process.env.E2E_BUYER_EMAIL && process.env.E2E_BUYER_PASSWORD);
}

export function hasAdminCreds(): boolean {
  return Boolean(process.env.E2E_ADMIN_EMAIL && process.env.E2E_ADMIN_PASSWORD);
}

export function exhibitorCreds() {
  return {
    email: process.env.E2E_EXHIBITOR_EMAIL!,
    password: process.env.E2E_EXHIBITOR_PASSWORD!,
  };
}

export function buyerCreds() {
  return {
    email: process.env.E2E_BUYER_EMAIL!,
    password: process.env.E2E_BUYER_PASSWORD!,
  };
}

export function adminCreds() {
  return {
    email: process.env.E2E_ADMIN_EMAIL!,
    password: process.env.E2E_ADMIN_PASSWORD!,
  };
}
