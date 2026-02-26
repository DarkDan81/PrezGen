const { createApp } = require('../backend/app');
const { migrate } = require('../backend/db/migrate');

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function jsonRequest(url, method, body) {
    const resp = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
    });
    let data = null;
    try {
        data = await resp.json();
    } catch (_e) {
        data = null;
    }
    return { resp, data };
}

async function run() {
    migrate();
    const app = createApp();
    const server = app.listen(3100);

    try {
        const { resp: pResp, data: pData } = await jsonRequest(
            'http://localhost:3100/api/v1/presentations',
            'POST',
            { name: 'Verify Deck', themeId: 'theme-eurofoods' },
        );
        assert(pResp.status === 201, `presentation create failed: ${pResp.status}`);
        const presentationId = pData.data.id;

        const { resp: sResp, data: sData } = await jsonRequest(
            `http://localhost:3100/api/v1/presentations/${presentationId}/slides`,
            'POST',
            { type: 'content', title: 'Verify Slide' },
        );
        assert(sResp.status === 201, `slide create failed: ${sResp.status}`);
        const slideId = sData.data.id;

        const invalidChart = await jsonRequest(
            `http://localhost:3100/api/v1/slides/${slideId}/blocks`,
            'POST',
            { type: 'chart', config: { kind: 'line' } },
        );
        assert(invalidChart.resp.status === 400, `invalid chart should be 400, got ${invalidChart.resp.status}`);

        const dangerousHtml = '<h3>Hello</h3><script>alert(1)</script><img src=x onerror=alert(2) />';
        const { resp: tResp } = await jsonRequest(
            `http://localhost:3100/api/v1/slides/${slideId}/blocks`,
            'POST',
            { type: 'text', config: { html: dangerousHtml } },
        );
        assert(tResp.status === 201, `text block create failed: ${tResp.status}`);

        const previewBuild = await jsonRequest(
            `http://localhost:3100/api/v1/presentations/${presentationId}/render/preview`,
            'POST',
            { mode: 'latest_draft' },
        );
        assert(previewBuild.resp.status === 200, `preview build failed: ${previewBuild.resp.status}`);

        const htmlResp = await fetch(`http://localhost:3100${previewBuild.data.data.previewUrl}`);
        const html = await htmlResp.text();
        assert(htmlResp.status === 200, `preview html failed: ${htmlResp.status}`);
        assert(!html.includes('alert(1)'), 'sanitizer failed: injected script content present in preview');
        assert(!html.toLowerCase().includes('onerror=alert(2)'), 'sanitizer failed: injected onerror attribute present in preview');

        const csvForm = new FormData();
        csvForm.append('name', 'verify_csv');
        csvForm.append('file', new Blob(['x,y\n1,2\n'], { type: 'text/csv' }), 'verify.csv');
        const csvResp = await fetch(`http://localhost:3100/api/v1/presentations/${presentationId}/datasets/upload-csv`, {
            method: 'POST',
            body: csvForm,
        });
        assert(csvResp.status === 201, `csv upload failed: ${csvResp.status}`);

        const { resp: pdfStartResp, data: pdfData } = await jsonRequest(
            `http://localhost:3100/api/v1/presentations/${presentationId}/render/pdf`,
            'POST',
            {},
        );
        assert(pdfStartResp.status === 202, `pdf start failed: ${pdfStartResp.status}`);
        const jobId = pdfData.data.id;

        let finalStatus = 'queued';
        for (let i = 0; i < 40; i += 1) {
            const { resp: jobResp, data: jobData } = await jsonRequest(
                `http://localhost:3100/api/v1/render-jobs/${jobId}`,
                'GET',
            );
            assert(jobResp.status === 200, `job poll failed: ${jobResp.status}`);
            finalStatus = jobData.data.status;
            if (finalStatus === 'done') break;
            if (finalStatus === 'failed') throw new Error('pdf job failed');
            await sleep(250);
        }
        assert(finalStatus === 'done', `pdf job timeout, status=${finalStatus}`);

        console.log('API verify: OK');
    } finally {
        server.close();
    }
}

run().catch((error) => {
    console.error(error.message);
    process.exit(1);
});
