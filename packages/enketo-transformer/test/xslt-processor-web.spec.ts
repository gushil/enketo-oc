import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * OC-28872: the web build's choice between the XSLT polyfill and the
 * browser's native XSLTProcessor.
 */

class NativeProcessor {}

class PolyfillProcessor {}

type Load = () => Promise<void>;

const scope = globalThis as unknown as Record<string, unknown>;

/** What the polyfill script does when it runs and its WebAssembly starts. */
const installPolyfill = (start: () => Promise<void> = async () => {}) => {
    scope.xsltPolyfillReady = async () => {
        await start();
        scope.XSLTProcessor = PolyfillProcessor;
    };
};

const importModule = async (native: unknown, load: Load) => {
    vi.resetModules();
    scope.XSLTProcessor = native;
    vi.doMock('xslt-polyfill', () => ({ default: load }));

    return import('../src/dom/web/XSLTProcessor');
};

describe('web XSLTProcessor (OC-28872)', () => {
    afterEach(() => {
        vi.doUnmock('xslt-polyfill');
        vi.restoreAllMocks();
        delete scope.xsltPolyfillReady;
        delete scope.XSLTProcessor;
    });

    it('uses the polyfill when it starts', async () => {
        const load = vi.fn(async () => installPolyfill());
        const { xsltReady, XSLTProcessor } = await importModule(
            NativeProcessor,
            load
        );

        await xsltReady();

        expect(new XSLTProcessor()).toBeInstanceOf(PolyfillProcessor);
    });

    it('uses the native processor when the polyfill loads but cannot start', async () => {
        vi.spyOn(console, 'warn').mockImplementation(() => {});

        const load = vi.fn(async () =>
            installPolyfill(async () => {
                throw new RangeError('WebAssembly.Compile is disallowed');
            })
        );
        const { xsltReady, XSLTProcessor } = await importModule(
            NativeProcessor,
            load
        );

        await xsltReady();

        expect(new XSLTProcessor()).toBeInstanceOf(NativeProcessor);
    });

    it('rejects when the polyfill script fails to load, even with a native processor, and tries again', async () => {
        const load = vi
            .fn<Parameters<Load>, ReturnType<Load>>()
            .mockRejectedValueOnce(new Error('Failed to load'))
            .mockImplementation(async () => installPolyfill());
        const { xsltReady, XSLTProcessor } = await importModule(
            NativeProcessor,
            load
        );

        await expect(xsltReady()).rejects.toThrow('Failed to load');

        await xsltReady();

        expect(load).toHaveBeenCalledTimes(2);
        expect(new XSLTProcessor()).toBeInstanceOf(PolyfillProcessor);
    });

    it('rejects without a native processor, and tries again', async () => {
        const load = vi
            .fn<Parameters<Load>, ReturnType<Load>>()
            .mockImplementationOnce(async () =>
                installPolyfill(async () => {
                    throw new RangeError('WebAssembly.Compile is disallowed');
                })
            )
            .mockImplementation(async () => installPolyfill());
        const { xsltReady, XSLTProcessor } = await importModule(
            undefined,
            load
        );

        await expect(xsltReady()).rejects.toThrow('WebAssembly');

        delete scope.xsltPolyfillReady;
        await xsltReady();

        expect(new XSLTProcessor()).toBeInstanceOf(PolyfillProcessor);
    });

    it('does not load the script again when the polyfill is already installed', async () => {
        installPolyfill();

        const load = vi.fn(async () => {});
        const { xsltReady, XSLTProcessor } = await importModule(
            NativeProcessor,
            load
        );

        await xsltReady();

        expect(load).not.toHaveBeenCalled();
        expect(new XSLTProcessor()).toBeInstanceOf(PolyfillProcessor);
    });
});
