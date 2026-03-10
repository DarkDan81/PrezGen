const { getDb } = require('../db/connection');

function mapAuthToken(row) {
    return {
        id: row.id,
        userId: row.user_id,
        label: row.label,
        tokenHash: row.token_hash,
        isActive: row.is_active === 1,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        lastUsedAt: row.last_used_at || null,
    };
}

function createAuthToken(token) {
    const db = getDb();
    db.prepare(`
        INSERT INTO auth_tokens (
            id, user_id, label, token_hash, is_active, last_used_at, created_at, updated_at
        ) VALUES (
            @id, @user_id, @label, @token_hash, @is_active, @last_used_at, @created_at, @updated_at
        )
    `).run({
        id: token.id,
        user_id: token.userId,
        label: token.label || 'default',
        token_hash: token.tokenHash,
        is_active: token.isActive === false ? 0 : 1,
        last_used_at: token.lastUsedAt || null,
        created_at: token.createdAt,
        updated_at: token.updatedAt,
    });
    return getAuthTokenById(token.id);
}

function getAuthTokenById(id) {
    const db = getDb();
    const row = db.prepare('SELECT * FROM auth_tokens WHERE id = ?').get(id);
    return row ? mapAuthToken(row) : null;
}

function getActiveAuthTokenByHash(tokenHash) {
    const db = getDb();
    const row = db.prepare('SELECT * FROM auth_tokens WHERE token_hash = ? AND is_active = 1').get(tokenHash);
    return row ? mapAuthToken(row) : null;
}

function touchAuthToken(authTokenId, timestamp) {
    const db = getDb();
    db.prepare(`
        UPDATE auth_tokens
        SET last_used_at = @last_used_at, updated_at = @updated_at
        WHERE id = @id
    `).run({
        id: authTokenId,
        last_used_at: timestamp,
        updated_at: timestamp,
    });
    return getAuthTokenById(authTokenId);
}

function listAuthTokensByUser(userId) {
    const db = getDb();
    return db.prepare('SELECT * FROM auth_tokens WHERE user_id = ? ORDER BY created_at DESC').all(userId).map(mapAuthToken);
}

function deactivateAuthTokensByUser(userId, timestamp) {
    const db = getDb();
    db.prepare(`
        UPDATE auth_tokens
        SET is_active = 0, updated_at = @updated_at
        WHERE user_id = @user_id
    `).run({
        user_id: userId,
        updated_at: timestamp,
    });
}

module.exports = {
    createAuthToken,
    deactivateAuthTokensByUser,
    getActiveAuthTokenByHash,
    getAuthTokenById,
    listAuthTokensByUser,
    touchAuthToken,
};
