const { createApp } = require('../backend/app');
const { migrate } = require('../backend/db/migrate');

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function jsonRequest(url, method, body) {
    const resp = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
    });
    const data = await resp.json();
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
            { name: 'Smoke Deck', themeId: 'theme-eurofoods' },
        );
        if (pResp.status !== 201) throw new Error(`presentation create failed: ${pResp.status}`);
        const presentationId = pData.data.id;

        const form = new FormData();
        form.append('name', 'csv_ds');
        form.append('file', new Blob(['month,value\nJan,10\nFeb,12\n'], { type: 'text/csv' }), 'metrics.csv');
        const csvResp = await fetch(`http://localhost:3100/api/v1/presentations/${presentationId}/datasets/upload-csv`, {
            method: 'POST',
            body: form,
        });
        const csvData = await csvResp.json();
        if (csvResp.status !== 201) throw new Error(`csv upload failed: ${csvResp.status}`);
        const datasetId = csvData.data.id;

        const { data: sData } = await jsonRequest(
            `http://localhost:3100/api/v1/presentations/${presentationId}/slides`,
            'POST',
            { type: 'content', title: 'Smoke Slide' },
        );
        const slideId = sData.data.id;

        const { resp: bResp } = await jsonRequest(
            `http://localhost:3100/api/v1/slides/${slideId}/blocks`,
            'POST',
            {
                type: 'chart',
                config: {
                    datasetId,
                    kind: 'line',
                    xField: 'month',
                    valueField: 'value',
                },
            },
        );
        if (bResp.status !== 201) throw new Error(`block create failed: ${bResp.status}`);

        const previewBuildResp = await fetch(
            `http://localhost:3100/api/v1/presentations/${presentationId}/render/preview`,
            { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' },
        );
        const previewBuildData = await previewBuildResp.json();
        if (previewBuildResp.status !== 200) throw new Error(`preview build failed: ${previewBuildResp.status}`);
        const previewHtmlResp = await fetch(`http://localhost:3100${previewBuildData.data.previewUrl}`);
        if (previewHtmlResp.status !== 200) throw new Error(`preview html failed: ${previewHtmlResp.status}`);

        const pdfStartResp = await fetch(
            `http://localhost:3100/api/v1/presentations/${presentationId}/render/pdf`,
            { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' },
        );
        const pdfStartData = await pdfStartResp.json();
        if (pdfStartResp.status !== 202) throw new Error(`pdf start failed: ${pdfStartResp.status}`);
        const jobId = pdfStartData.data.id;

        let status = 'queued';
        for (let i = 0; i < 30; i += 1) {
            const jobResp = await fetch(`http://localhost:3100/api/v1/render-jobs/${jobId}`);
            const jobData = await jobResp.json();
            status = jobData.data.status;
            if (status === 'done') break;
            if (status === 'failed') throw new Error('pdf job failed');
            await sleep(250);
        }
        if (status !== 'done') throw new Error(`pdf job timeout, last status=${status}`);

        const pptxStartResp = await fetch(
            `http://localhost:3100/api/v1/presentations/${presentationId}/render/pptx`,
            { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' },
        );
        const pptxStartData = await pptxStartResp.json();
        if (pptxStartResp.status !== 202) throw new Error(`pptx start failed: ${pptxStartResp.status}`);
        const pptxJobId = pptxStartData.data.id;

        let pptxStatus = 'queued';
        for (let i = 0; i < 60; i += 1) {
            const jobResp = await fetch(`http://localhost:3100/api/v1/render-jobs/${pptxJobId}`);
            const jobData = await jobResp.json();
            pptxStatus = jobData.data.status;
            if (pptxStatus === 'done') {
                const fileResp = await fetch(`http://localhost:3100${jobData.data.result.path}`);
                if (fileResp.status !== 200) throw new Error(`pptx artifact fetch failed: ${fileResp.status}`);
                break;
            }
            if (pptxStatus === 'failed') throw new Error('pptx job failed');
            await sleep(500);
        }
        if (pptxStatus !== 'done') throw new Error(`pptx job timeout, last status=${pptxStatus}`);

        console.log('API smoke: OK');
    } finally {
        server.close();
    }
}

run().catch((error) => {
    console.error(error.message);
    process.exit(1);
});

