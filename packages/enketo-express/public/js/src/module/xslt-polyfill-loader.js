/**
 * OC-28872: loads xslt-polyfill (libxslt compiled to WebAssembly) as a separate
 * script, only when a preview-by-URL transform needs it, instead of putting
 * about 1.4 MB into every bundle. scripts/build.js copies the file next to
 * the bundles.
 */

/**
 * @param {string} src - polyfill script URL
 * @param {number} [timeout] - milliseconds before the load is given up
 * @return {() => Promise<void>} loads the script once; a failed or timed-out
 * load is not kept, so the next call tries again
 */
export const createXSLTPolyfillLoader = (src, timeout = 30000) => {
    /** @type {Promise<void> | undefined} */
    let loaded;

    return () => {
        if (loaded) {
            return loaded;
        }

        const attempt = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            let timer;

            const fail = (message) => {
                clearTimeout(timer);
                // ignore late callbacks from this script after giving up on it
                script.onload = null;
                script.onerror = null;
                script.remove();

                loaded = undefined;

                reject(new Error(message));
            };

            timer = setTimeout(
                () => fail(`Timed out loading the XSLT polyfill from ${src}`),
                timeout
            );

            script.src = src;
            script.onload = () => {
                clearTimeout(timer);
                resolve();
            };
            script.onerror = () =>
                fail(`Failed to load the XSLT polyfill from ${src}`);
            document.head.append(script);
        });

        loaded = attempt;

        return attempt;
    };
};

export default createXSLTPolyfillLoader(
    new URL('xslt-polyfill.min.js', import.meta.url).href
);
