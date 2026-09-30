/// <reference path="./xslt-polyfill.d.ts" />
import type { DOM } from '../abstract';

type XSLTProcessorConstructor = new () => DOM.XSLTProcessor;

/** The globals this module uses, typed here so it also builds without DOM types. */
const scope = globalThis as typeof globalThis & {
    XSLTProcessor?: XSLTProcessorConstructor;
    xsltPolyfillReady?: () => Promise<void>;
};

/** Captured before the polyfill replaces `XSLTProcessor`. */
const NativeXSLTProcessor = scope.XSLTProcessor;

let Processor: XSLTProcessorConstructor | undefined;

let polyfillReady: Promise<void> | undefined;

/**
 * Loads the polyfill script. A bundler may map `xslt-polyfill` to a loader
 * whose default export adds the script (enketo-express does). Without that,
 * importing the package has already run the script.
 */
const loadPolyfill = async () => {
    const module = await import('xslt-polyfill');
    const load = module.default;

    if (
        typeof scope.xsltPolyfillReady !== 'function' &&
        typeof load === 'function'
    ) {
        await load();
    }
};

/**
 * Starts the polyfill's WebAssembly.
 */
const startPolyfill = async () => {
    if (typeof scope.xsltPolyfillReady !== 'function') {
        throw new Error('The XSLT polyfill did not load.');
    }

    await scope.xsltPolyfillReady();

    Processor = scope.XSLTProcessor;
};

const choosePolyfillOrNative = async () => {
    try {
        await loadPolyfill();
    } catch (error) {
        // Let the next call try again, e.g. after a network error.
        polyfillReady = undefined;
        throw error;
    }

    try {
        await startPolyfill();
    } catch (error) {
        if (NativeXSLTProcessor == null) {
            polyfillReady = undefined;
            throw error;
        }

        console.warn(
            'The XSLT polyfill could not start, using the native XSLTProcessor.',
            error
        );
        Processor = NativeXSLTProcessor;
    }
};

/**
 * OC-28872: browsers are removing XSLT (Edge already corrupts its output), so
 * use the libxslt WASM polyfill instead of the native processor. It is loaded
 * on first use, so importing this module outside a browser is safe.
 *
 * If the polyfill script fails to load, this rejects, and the next call tries
 * again. It never falls back to the native processor in that case, because
 * that processor is the broken one in current Edge and Chrome.
 *
 * If the script loads but the polyfill cannot start, the native processor is
 * used, which still works in those browsers. For example, Chromium before
 * about version 141 rejects the polyfill's synchronous WebAssembly compile on
 * the main thread.
 *
 * @package
 */
export const xsltReady = () => {
    polyfillReady ??= choosePolyfillOrNative();

    return polyfillReady;
};

/**
 * Constructs the processor chosen by {@link xsltReady}.
 *
 * @package
 */
export const XSLTProcessor = function XSLTProcessor() {
    const Constructor = Processor ?? scope.XSLTProcessor;

    if (Constructor == null) {
        throw new Error('No XSLTProcessor is available.');
    }

    return new Constructor();
} as unknown as XSLTProcessorConstructor;
