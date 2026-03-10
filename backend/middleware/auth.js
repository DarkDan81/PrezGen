const { getUserById } = require('../repositories/user-repository');
const { getActiveAuthTokenByHash, touchAuthToken } = require('../repositories/auth-token-repository');
const { unauthorized, forbidden } = require('../utils/errors');
const { extractAuthToken, hashToken } = require('../services/auth-service');

function authenticateRequest(req, _res, next) {
    try {
        req.user = null;
        const rawToken = extractAuthToken(req);
        if (!rawToken) return next();
        const authToken = getActiveAuthTokenByHash(hashToken(rawToken));
        if (!authToken) return next();
        const user = getUserById(authToken.userId);
        if (!user || !user.isActive) return next();
        touchAuthToken(authToken.id, new Date().toISOString());
        req.user = user;
        req.authToken = authToken;
        return next();
    } catch (error) {
        return next(error);
    }
}

function requireAuth(req, _res, next) {
    if (!req.user) return next(unauthorized('Authentication required'));
    return next();
}

function requireAdmin(req, _res, next) {
    if (!req.user) return next(unauthorized('Authentication required'));
    if (req.user.role !== 'admin') return next(forbidden('Admin access required'));
    return next();
}

module.exports = {
    authenticateRequest,
    requireAdmin,
    requireAuth,
};
