const { getDb } = require('../db/connection');

function mapRenderJob(row) {
    return {
        id: row.id,
        ownerUserId: row.owner_user_id || null,
        presentationId: row.presentation_id,
        type: row.type,
        status: row.status,
        result: row.result_json ? JSON.parse(row.result_json) : null,
        error: row.error_json ? JSON.parse(row.error_json) : null,
        options: row.options_json ? JSON.parse(row.options_json) : null,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

function createRenderJob(job) {
    const db = getDb();
    db.prepare(`
        INSERT INTO render_jobs (
            id, owner_user_id, presentation_id, type, status, result_json, error_json, options_json, created_at, updated_at
        ) VALUES (
            @id, @owner_user_id, @presentation_id, @type, @status, @result_json, @error_json, @options_json, @created_at, @updated_at
        )
    `).run({
        id: job.id,
        owner_user_id: job.ownerUserId || null,
        presentation_id: job.presentationId,
        type: job.type,
        status: job.status,
        result_json: job.result ? JSON.stringify(job.result) : null,
        error_json: job.error ? JSON.stringify(job.error) : null,
        options_json: job.options ? JSON.stringify(job.options) : null,
        created_at: job.createdAt,
        updated_at: job.updatedAt,
    });
    return job;
}

function getRenderJobById(jobId) {
    const db = getDb();
    const row = db.prepare('SELECT * FROM render_jobs WHERE id = ?').get(jobId);
    return row ? mapRenderJob(row) : null;
}

function updateRenderJob(jobId, patch) {
    const db = getDb();
    const clauses = [];
    const params = { id: jobId };

    if (patch.status !== undefined) {
        clauses.push('status = @status');
        params.status = patch.status;
    }
    if (patch.result !== undefined) {
        clauses.push('result_json = @result_json');
        params.result_json = patch.result ? JSON.stringify(patch.result) : null;
    }
    if (patch.error !== undefined) {
        clauses.push('error_json = @error_json');
        params.error_json = patch.error ? JSON.stringify(patch.error) : null;
    }
    if (patch.options !== undefined) {
        clauses.push('options_json = @options_json');
        params.options_json = patch.options ? JSON.stringify(patch.options) : null;
    }
    clauses.push('updated_at = @updated_at');
    params.updated_at = patch.updatedAt;

    db.prepare(`UPDATE render_jobs SET ${clauses.join(', ')} WHERE id = @id`).run(params);
    return getRenderJobById(jobId);
}

function listRenderJobsByOwner(ownerUserId) {
    const db = getDb();
    return db.prepare('SELECT * FROM render_jobs WHERE owner_user_id = ? ORDER BY created_at DESC').all(ownerUserId).map(mapRenderJob);
}

module.exports = {
    createRenderJob,
    getRenderJobById,
    listRenderJobsByOwner,
    updateRenderJob,
};

