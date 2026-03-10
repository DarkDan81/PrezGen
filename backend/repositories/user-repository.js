const { getDb } = require('../db/connection');

function mapUser(row) {
    return {
        id: row.id,
        login: row.login,
        name: row.name,
        role: row.role,
        isActive: row.is_active === 1,
        quotas: row.quotas_json ? JSON.parse(row.quotas_json) : {},
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

function countUsers() {
    const db = getDb();
    const row = db.prepare('SELECT COUNT(*) AS count FROM users').get();
    return Number(row?.count || 0);
}

function listUsers() {
    const db = getDb();
    return db.prepare('SELECT * FROM users ORDER BY role DESC, created_at ASC').all().map(mapUser);
}

function getUserById(id) {
    const db = getDb();
    const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    return row ? mapUser(row) : null;
}

function getUserByLogin(login) {
    const db = getDb();
    const row = db.prepare('SELECT * FROM users WHERE login = ?').get(String(login || '').trim().toLowerCase());
    return row ? mapUser(row) : null;
}

function createUser(user) {
    const db = getDb();
    db.prepare(`
        INSERT INTO users (
            id, login, name, role, is_active, quotas_json, created_at, updated_at
        ) VALUES (
            @id, @login, @name, @role, @is_active, @quotas_json, @created_at, @updated_at
        )
    `).run({
        id: user.id,
        login: String(user.login || '').trim().toLowerCase(),
        name: user.name,
        role: user.role,
        is_active: user.isActive === false ? 0 : 1,
        quotas_json: JSON.stringify(user.quotas || {}),
        created_at: user.createdAt,
        updated_at: user.updatedAt,
    });
    return getUserById(user.id);
}

function updateUserById(userId, patch) {
    const db = getDb();
    const clauses = [];
    const params = { id: userId };

    if (patch.login !== undefined) {
        clauses.push('login = @login');
        params.login = String(patch.login || '').trim().toLowerCase();
    }
    if (patch.name !== undefined) {
        clauses.push('name = @name');
        params.name = patch.name;
    }
    if (patch.role !== undefined) {
        clauses.push('role = @role');
        params.role = patch.role;
    }
    if (patch.isActive !== undefined) {
        clauses.push('is_active = @is_active');
        params.is_active = patch.isActive ? 1 : 0;
    }
    if (patch.quotas !== undefined) {
        clauses.push('quotas_json = @quotas_json');
        params.quotas_json = JSON.stringify(patch.quotas || {});
    }
    clauses.push('updated_at = @updated_at');
    params.updated_at = patch.updatedAt;

    db.prepare(`UPDATE users SET ${clauses.join(', ')} WHERE id = @id`).run(params);
    return getUserById(userId);
}

module.exports = {
    countUsers,
    createUser,
    getUserById,
    getUserByLogin,
    listUsers,
    updateUserById,
};
