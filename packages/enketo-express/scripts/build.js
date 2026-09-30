/* eslint-env node */

const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');
const config = require('../config/build.js');

esbuild.build(config).then(() => {
    // OC-28872: loaded at runtime by public/js/src/module/xslt-polyfill-loader.js
    const packageDir = path.dirname(
        require.resolve('xslt-polyfill/package.json')
    );

    fs.copyFileSync(
        require.resolve('xslt-polyfill'),
        path.join(config.outdir, 'xslt-polyfill.min.js')
    );
    fs.copyFileSync(
        path.join(packageDir, 'LICENSE'),
        path.join(config.outdir, 'xslt-polyfill.LICENSE.txt')
    );
});
