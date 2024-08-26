import init, {transform} from 'lightningcss-wasm';

export const cssMinify = async code => {
    await init();
    return new TextDecoder().decode(transform({
        code   : new TextEncoder().encode(code),
        minify : true,
    }).code);
};
export {minify as htmlMinify} from 'html-minifier-terser/dist/htmlminifier.esm.bundle';