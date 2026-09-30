import { createXSLTPolyfillLoader } from '../../public/js/src/module/xslt-polyfill-loader';

describe('XSLT polyfill loader (OC-28872)', () => {
    const src = 'http://localhost/xslt-polyfill-test.min.js';

    /** @type {import('sinon').SinonSandbox} */
    let sandbox;

    /** @type {HTMLScriptElement[]} */
    let scripts;

    beforeEach(() => {
        sandbox = sinon.createSandbox();
        scripts = [];
        sandbox
            .stub(document.head, 'append')
            .callsFake((script) => scripts.push(script));
    });

    afterEach(() => {
        sandbox.restore();
    });

    it('adds the script once and resolves when it loads', async () => {
        const load = createXSLTPolyfillLoader(src);
        const first = load();
        const second = load();

        expect(scripts.length).to.equal(1);
        expect(scripts[0].src).to.equal(src);

        scripts[0].onload();

        await first;
        await second;
        await load();

        expect(scripts.length).to.equal(1);
    });

    it('rejects when the script fails, and tries again on the next call', async () => {
        const load = createXSLTPolyfillLoader(src);
        const first = load();

        scripts[0].onerror();

        let caught = null;

        try {
            await first;
        } catch (error) {
            caught = error;
        }

        expect(caught).to.be.an('error');
        expect(caught.message).to.contain(src);

        const retry = load();

        expect(scripts.length).to.equal(2);

        scripts[1].onload();

        await retry;
    });

    it('rejects after the timeout, and tries again on the next call', async () => {
        const clock = sandbox.useFakeTimers();
        const load = createXSLTPolyfillLoader(src, 1000);
        const first = load();

        clock.tick(1000);

        let caught = null;

        try {
            await first;
        } catch (error) {
            caught = error;
        }

        expect(caught).to.be.an('error');
        expect(caught.message).to.contain('Timed out');

        load();

        expect(scripts.length).to.equal(2);
    });

    it('ignores a late error from a script it gave up on', async () => {
        const clock = sandbox.useFakeTimers();
        const load = createXSLTPolyfillLoader(src, 1000);

        load().catch(() => {});
        clock.tick(1000);

        const retry = load();

        // the abandoned first script fails later
        scripts[0].onerror?.();
        load();

        expect(scripts.length).to.equal(2);

        scripts[1].onload();

        await retry;
    });
});
