const path = require('path');

const apiPort = Number.parseInt(process.env.API_PORT || process.env.PORT || '3100', 10) || 3100;
const dataDir = process.env.PREZGEN_DATA_DIR
    ? path.resolve(process.env.PREZGEN_DATA_DIR)
    : path.join(__dirname, '../data');
const frontendDistDir = process.env.PREZGEN_FRONTEND_DIST
    ? path.resolve(process.env.PREZGEN_FRONTEND_DIST)
    : path.join(__dirname, '../frontend/dist');

const config = {
    apiPort,
    dataDir,
    frontendDistDir,
    authCookieName: process.env.PREZGEN_AUTH_COOKIE_NAME || 'prezgen_auth',
    internalBaseUrl: process.env.APP_INTERNAL_BASE_URL || `http://127.0.0.1:${apiPort}`,
    isProduction: process.env.NODE_ENV === 'production',
    bootstrapAdminLogin: process.env.PREZGEN_BOOTSTRAP_ADMIN_LOGIN || 'admin',
    bootstrapAdminName: process.env.PREZGEN_BOOTSTRAP_ADMIN_NAME || 'Administrator',
    bootstrapAdminToken: process.env.PREZGEN_BOOTSTRAP_ADMIN_TOKEN || 'prezgen-admin-dev-token',
};

module.exports = { config };
