import {dirname, resolve} from 'path';
import {fileURLToPath} from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
export default ({
    mode         : 'production',
    devtool      : false,
    entry        : {
        main : resolve(__dirname, 'lib/index.mjs'),
    },
    experiments  : {
        outputModule : true,
    },
    output       : {
        path    : resolve(__dirname, 'dist'),
        library : {
            type : 'module',
        },
    },
    module       : {
        rules : [{test : /\.wasm$/, type : 'asset/inline'}],
    },
    optimization : {minimize : true},
});
