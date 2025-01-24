const { BrowserHandler, getBrowser } = require('./headless-browser');
const config = require('../models/config-model').server;

const { timeout } = config.headless;
const browserHandler = new BrowserHandler();

async function run(url) {
    if (!url) {
        throw new Error('No url provided');
    }

    // Validate URL
    let urlObj;
    try {
        urlObj = new URL(url);
    } catch (e) {
        const error = new Error('Invalid URL provided');
        error.status = 400;
        throw error;
    }

    let browser;
    try {
        browser = await getBrowser(browserHandler);
    } catch (e) {
        const error = new Error('Failed to launch browser');
        error.status = 500;
        throw error;
    }

    const page = await browser.newPage();

    try {
        // Turns request interceptor on
        await page.setRequestInterception(true);

        // Ignore certain resources
        const ignoreTypes = ['image', 'stylesheet', 'media', 'font'];
        page.on('request', (request) => {
            if (ignoreTypes.includes(request.resourceType())) {
                request.abort();
            } else {
                request.continue();
            }
        });

        let fieldsubmissions;

        await page
            .goto(urlObj.href, { waitUntil: 'networkidle0', timeout })
            .catch((e) => {
                // Martijn has not been able to actually reach this code.
                e.status = 400;
                throw e;
            });

        const element = await page
            .waitForSelector('#headless-result', { timeout })
            .catch((e) => {
                e.status = /timeout/i.test(e.message) ? 408 : 400;
                throw e;
            });

        const errorEl = await element.$('#error');
        // Load or submission errors caught by Enketo
        if (errorEl) {
            const msg = await errorEl.getProperty('textContent');
            const error = new Error(await msg.jsonValue());
            error.status = 400;
            throw error;
        }

        const fsEl = await element.$('#fieldsubmissions');
        if (fsEl) {
            const fs = await fsEl.getProperty('textContent');
            fieldsubmissions = Number(await fs.jsonValue());
        }
        return fieldsubmissions;
    } catch (e) {
        e.status = e.status || 500;
        await page.close();
        throw e;
    } finally {
        await page.close();
    }
}

module.exports = { run };
