const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function exportPDF() {
    const exportDir = path.join(__dirname, '../dist/export');
    if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir, { recursive: true });

    console.log('Запуск экспорта...');

    // Запускаем браузер
    const browser = await puppeteer.launch({
        headless: "new" // Используем новый стабильный режим headless
    });
    
    const page = await browser.newPage();
    
    // 1. Устанавливаем вьюпорт ровно под размер слайда
    await page.setViewport({
        width: 1920,
        height: 1080,
        deviceScaleFactor: 1,
    });

    // 2. Оставляем 'screen', чтобы CSS рендерился как в браузере (со всеми фонами)
    await page.emulateMediaType('screen');

    try {
        await page.goto('http://localhost:3000', { 
            waitUntil: 'load', // Ждем только загрузки основного контента, а не конца всех сетевых запросов
            timeout: 0         // Отключаем ограничение по времени (таймаут)
        });
        
        console.log('Страница загружена, готовим PDF...');
        
        // Даем время на выполнение скриптов (Chart.js, autoFit)
        await new Promise(r => setTimeout(r, 50000));

        await page.pdf({
            path: path.join(exportDir, 'presentation.pdf'),
            width: '1920px',
            height: '1080px',
            printBackground: true,
            displayHeaderFooter: false,
            preferCSSPageSize: true, // ИСПОЛЬЗОВАТЬ РАЗМЕР ИЗ CSS (уберет микро-ошибки округления)
            margin: { top: 0, right: 0, bottom: 0, left: 0 }
        });

        console.log('✅ PDF сохранен без полос: 1 слайд = 1 страница.');
    } catch (e) {
        console.error('❌ Ошибка:', e.message);
    } finally {
        await browser.close();
        process.exit();
    }
}

exportPDF();