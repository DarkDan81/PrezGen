const crypto = require('crypto');
const { config } = require('../config');

function hashToken(token) {
    return crypto.createHash('sha256').update(String(token || '')).digest('hex');
}

function generateRawToken() {
    return crypto.randomBytes(24).toString('hex');
}

function issueAuthCookie(res, token) {
    const cookieParts = [
        `${config.authCookieName}=${encodeURIComponent(token)}`,
        'Path=/',
        'HttpOnly',
        'SameSite=Lax',
    ];
    if (config.isProduction) cookieParts.push('Secure');
    res.setHeader('Set-Cookie', cookieParts.join('; '));
}

function clearAuthCookie(res) {
    const cookieParts = [
        `${config.authCookieName}=`,
        'Path=/',
        'HttpOnly',
        'SameSite=Lax',
        'Max-Age=0',
    ];
    if (config.isProduction) cookieParts.push('Secure');
    res.setHeader('Set-Cookie', cookieParts.join('; '));
}

function parseCookieHeader(header) {
    return String(header || '')
        .split(';')
        .map((chunk) => chunk.trim())
        .filter(Boolean)
        .reduce((acc, part) => {
            const eqIndex = part.indexOf('=');
            if (eqIndex <= 0) return acc;
            const key = part.slice(0, eqIndex).trim();
            const value = decodeURIComponent(part.slice(eqIndex + 1).trim());
            acc[key] = value;
            return acc;
        }, {});
}

function extractAuthToken(req) {
    const authHeader = req.headers.authorization;
    if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
        return authHeader.slice('Bearer '.length).trim();
    }
    const cookies = parseCookieHeader(req.headers.cookie);
    return cookies[config.authCookieName] || '';
}

module.exports = {
    clearAuthCookie,
    extractAuthToken,
    generateRawToken,
    hashToken,
    issueAuthCookie,
};
