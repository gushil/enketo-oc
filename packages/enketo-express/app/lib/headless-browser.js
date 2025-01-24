const puppeteer = require('puppeteer');

const args = ['--no-startup-window'];
const userDataDir = './chromium-cache';

/**
 * This class approach makes it easy to open multiple browser instances with
 * different arguments in case that is ever required.
 */
class BrowserHandler {
    constructor() {
        const launchBrowser = async () => {
            this.browser = false;
            try {
                this.browser = await puppeteer.launch({
                    headless: 'new',
                    devtools: false,
                    args,
                    userDataDir,
                });
                this.browser.on('disconnected', launchBrowser);
            } catch (error) {
                console.error('Failed to launch browser:', error);
                this.browser = false;
                setTimeout(launchBrowser, 5000);
            }
        };

        (async () => {
            await launchBrowser();
        })();
    }
}

const getBrowser = (handler) =>
    new Promise((resolve, reject) => {
        let attempts = 0;
        const timeout = 30000;
        const interval = 100;

        const browserCheck = setInterval(() => {
            attempts++;
            if (handler.browser !== false) {
                clearInterval(browserCheck);
                resolve(handler.browser);
            } else if (attempts * interval >= timeout) {
                clearInterval(browserCheck);
                const error = new Error('Browser launch timeout exceeded');
                error.status = 500;
                reject(error);
            }
        }, interval);
    });

module.exports = { BrowserHandler, getBrowser };
