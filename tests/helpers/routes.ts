export type AppRoute = {
  path: string;
  heading: RegExp;
};

export const exhibitorRoutes: AppRoute[] = [
  { path: '/', heading: /^dashboard$/i },
  { path: '/qr', heading: /my qr code/i },
  { path: '/connections', heading: /^leads$/i },
  { path: '/rfi-inbox', heading: /rfi inbox/i },
  { path: '/catalog-library', heading: /catalog library/i },
  { path: '/products', heading: /^products$/i },
  { path: '/meetings', heading: /^meetings$/i },
  { path: '/business-card', heading: /my business card/i },
  { path: '/events', heading: /event directory/i },
  { path: '/lead-intelligence', heading: /lead intelligence/i },
  { path: '/analytics', heading: /analytics suite/i },
  { path: '/premium-booth', heading: /premium booth/i },
  { path: '/nfc', heading: /nfc badge exchange/i },
  { path: '/organizer-analytics', heading: /event analytics/i },
  { path: '/organizer-command', heading: /organizer command center/i },
  { path: '/integrations', heading: /integration hub/i },
  { path: '/billing', heading: /billing center/i },
  { path: '/setup-wizard', heading: /exhibitor setup wizard/i },
  { path: '/catalogue', heading: /my catalogue/i },
  { path: '/notifications', heading: /^notifications$/i },
  { path: '/profile', heading: /^profile$/i },
  { path: '/nfc-admin', heading: /nfc management/i },
];

export const buyerRoutes: AppRoute[] = [
  { path: '/', heading: /hey|trade show brain/i },
  { path: '/scan', heading: /visit a booth/i },
  { path: '/saved-booths', heading: /saved booths/i },
  { path: '/my-library', heading: /my library/i },
  { path: '/my-rfis', heading: /my rfis/i },
  { path: '/meetings', heading: /^meetings$/i },
  { path: '/qr', heading: /my qr code/i },
  { path: '/events', heading: /event directory/i },
  { path: '/workspace/compare', heading: /supplier workspace/i },
  { path: '/discover', heading: /discover exhibitors/i },
  { path: '/nfc', heading: /nfc badge exchange/i },
  { path: '/ocr-scanner', heading: /ocr scanner/i },
  { path: '/contacts', heading: /scanned contacts/i },
  { path: '/billing', heading: /billing center/i },
  { path: '/connections', heading: /my connections/i },
  { path: '/profile', heading: /^profile$/i },
  { path: '/notifications', heading: /^notifications$/i },
];

export const adminRoutes: AppRoute[] = [
  { path: '/admin', heading: /admin control center/i },
  { path: '/admin/users', heading: /user management/i },
  { path: '/admin/exhibitors', heading: /^exhibitors$/i },
  { path: '/admin/products', heading: /product database/i },
  { path: '/admin/catalogues', heading: /^catalogues$/i },
  { path: '/admin/events', heading: /event management/i },
  { path: '/admin/connections', heading: /^connections$/i },
  { path: '/admin/revenue', heading: /revenue operations center/i },
  { path: '/admin/leads', heading: /lead intelligence control/i },
  { path: '/admin/media', heading: /media library/i },
  { path: '/admin/settings', heading: /system settings/i },
  { path: '/admin/data-quality', heading: /data quality center/i },
  { path: '/admin/audit', heading: /audit log/i },
  { path: '/admin/event-readiness', heading: /event readiness center/i },
  { path: '/admin/control-room', heading: /live event control room/i },
  { path: '/admin/support-center', heading: /event support center/i },
  { path: '/admin/tickets', heading: /support tickets/i },
  { path: '/admin/nfc-validation', heading: /nfc validation center/i },
  { path: '/admin/search', heading: /global search/i },
  { path: '/admin/stress-test', heading: /stress test center/i },
  { path: '/admin/monitoring', heading: /production monitoring/i },
  { path: '/admin/ocr-review', heading: /ocr quality review/i },
];

export const protectedAppPaths = [
  '/',
  '/qr',
  '/connections',
  '/products',
  '/profile',
  '/events',
  '/billing',
  '/admin',
];

export const publicAuthPaths = [
  { path: '/login', heading: /welcome back/i },
  { path: '/register', heading: /create account/i },
  { path: '/forgot-password', heading: /reset password|forgot password/i },
];
