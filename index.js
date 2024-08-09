// unique id
let count = 0, info = console.log;
const _hid = () => `hid-${++count}`;

/**
 * return element when body does not found the corresponding elements
 * @param element
 * @param body
 */
const _targetIn = (element, body) => body.querySelector(
    `[data-dom-id="${element.getAttribute('data-dom-id')}"]`
) || element;

const _escape = str => str.replace(/:/g, '-');

// inherited css properties
const inherited = [
    // https://stackoverflow.com/a/5612360
    'azimuth',
    'border-collapse',
    'border-spacing',
    'caption-side',
    'color',
    'caret-color', '-webkit-text-emphasis-color', '-webkit-text-fill-color', '-webkit-text-stroke-color',
    'cursor',
    'direction',
    'elevation',
    'empty-cells',
    'font-family',
    'font-size',
    'font-style',
    'font-variant',
    'font-weight',
    'font',
    'letter-spacing',
    'line-height',
    'list-style-image',
    'list-style-position',
    'list-style-type',
    'list-style',
    'orphans',
    'pitch-range',
    'pitch',
    'quotes',
    'richness',
    'speak-header',
    'speak-numeral',
    'speak-punctuation',
    'speak',
    'speech-rate',
    'stress',
    'text-align',
    'text-indent',
    'text-transform',
    'visibility',
    'voice-family',
    'volume',
    'white-space',
    'widows',
    'word-spacing',

    // TODO: 还有多少继承新属性?
    'border-block-start-color',
    'border-block-end-color',
];

const unnecessary = /inline-|inset-|block-size|appearance/;

function scrollbarWidth(doc) { // https://stackoverflow.com/a/16771535
    let div = doc.createElement('div');
    div.innerHTML = '<div style="width:50px;height:50px;position:absolute;left:-50px;top:-50px;overflow:auto;">'
                    + '<div style="width:1px;height:100px;"></div>'
                    + '</div>';
    div = div.firstChild;
    doc.body.appendChild(div);
    const width = div.offsetWidth - div.clientWidth;
    doc.body.removeChild(div);
    return width;
}

async function toDataURL(url) {
    return new Promise(resolve => {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', url);
        xhr.responseType = 'blob';
        xhr.onreadystatechange = function () {
            if (xhr.readyState === XMLHttpRequest.DONE) {
                if (xhr.status === 200) {
                    const fileReader = new FileReader();
                    fileReader.onload = e => resolve(e.target.result);
                    fileReader.readAsDataURL(xhr.response);
                } else {
                    resolve(url);
                }
            }
        };
        xhr.send();
    });
}

// get defined @font-face stylesheet
async function getFontFace(doc) {
    async function _replaceAsync(str, regex, asyncFn) { // https://stackoverflow.com/a/48032528
        const promises = [];
        str.replace(regex, (match, ...args) => {
            promises.push(asyncFn(match, ...args));
        });
        const data = await Promise.all(promises);
        return str.replace(regex, () => data.shift());
    }

    const fontFaces = [];

    function parseSheet(sheet) {
        try {
            const {rules, cssRules} = sheet;
            Array.from(rules || cssRules || []).map(rule => {
                const constructorName = rule.constructor.name;
                if (constructorName === 'CSSFontFaceRule') {
                    const href = rule.parentStyleSheet.href;
                    const basePath = href.slice(0, href.lastIndexOf('/') + 1);
                    fontFaces.push(rule.cssText.replace(
                        /url\("(.*?)"\)/g,
                        // https://stackoverflow.com/a/47615503
                        (s, url) => `url("${(new URL(url, basePath)).href}")`
                    ));
                } else if (constructorName === 'CSSImportRule') {
                    parseSheet(rule.styleSheet);
                }
            });
        } catch (e) {
            console.warn(e.message);
        }
    }

    Array.from(doc.styleSheets).map(parseSheet);
    const result = [];
    for await (const fontFace of fontFaces) {
        result.push(
            await _replaceAsync(fontFace, /url\("(.*?)"\)/g, async (s, url) => `url("${await toDataURL(url)}")`)
        );
    }
    return result.join('');
}

function initClonedBody(body) {
    const container = body.ownerDocument.createElement('div');
    container.style.display = 'none';
    container.innerHTML = body.innerHTML;

    body.appendChild(container);

    // avoid frame reloading
    Array.from(container.getElementsByTagName('iframe'))
        .map(frame => frame.setAttribute('src', 'about:blank'));

    // remove invisible tags
    Array.from(container.getElementsByTagName('*'))
        .map(tag => {
            const DOMTag = _targetIn(tag, body);
            const nodeName = DOMTag.nodeName.toLowerCase();
            if (['style', 'script'].includes(nodeName)) {
                // remove all script or style tags
                tag.parentNode.removeChild(tag);
            } else if (DOMTag.offsetWidth <= 0 && DOMTag.offsetHeight <= 0) {
                if (nodeName === 'li') return; // side effect on parent list element when removed
                if (nodeName === 'option') return; // hidden option
                if (nodeName === 'a') return; // anchor wrapper
                if (DOMTag.innerText === '') return; // occupied elements?
                tag.parentNode.removeChild(tag);
            }
        });

    return Object.assign(container, {_destroy : () => body.removeChild(container)});
}

function initFakeIframe(doc) {
    const fakeIframe = doc.createElement('iframe');
    // register on the document
    doc.fakeIframe = fakeIframe;
    // keep it hidden
    fakeIframe.style.display = 'none';

    doc.body.parentNode.appendChild(fakeIframe);

    // copy
    const body = fakeIframe.contentDocument.body;
    const container = document.createElement('div');
    container.innerHTML = doc.body.innerHTML;

    // avoid frame reloading
    Array.from(container.getElementsByTagName('iframe'))
        .map(frame => frame.setAttribute('src', 'about:blank'));

    Array.from(container.getElementsByTagName('*'))
        .map(tag => {
            if (tag.tagName === 'STYLE') {
                // without style tags
                tag.parentNode.removeChild(tag);
            } else {
                // without inline style
                tag.removeAttribute('style');
            }
        });

    // remove side-effected styles injected by other plugins
    Array.from(fakeIframe.contentDocument.getElementsByTagName('style')).map(tag => tag.parentNode.removeChild(tag));

    body.innerHTML = container.innerHTML;
    return Object.assign(fakeIframe, {_destroy : () => doc.body.parentNode.removeChild(fakeIframe)});
}

function getDefaultStyles(element, pseudo) {
    const doc = element.ownerDocument;
    const nodeName = element.nodeName.toLowerCase();

    // get default styles from fake IFrame
    const fakeIframe = doc.fakeIframe;
    const fakeDocument = fakeIframe.contentDocument;

    let target;
    if (nodeName === 'html') {
        target = fakeDocument.body.parentNode;
    } else if (nodeName === 'body') {
        target = fakeDocument.body;
    } else if (nodeName === 'head') {
        target = fakeDocument.head;
    } else {
        target = _targetIn(element, fakeDocument.body);
    }

    return fakeIframe.contentWindow.getComputedStyle(target, pseudo);
}

async function getAppliedStyle(element) {
    const doc = element.ownerDocument;
    const win = doc.defaultView || doc.parentWindow;
    const parent = element.parentNode !== doc && element.parentNode;
    const pStyleText = parent ? parent['data-style'] || (parent['data-style'] = await getAppliedStyle(parent)) : '';
    const styles = win.getComputedStyle(element);

    if (styles.getPropertyValue('display') === 'none') return 'display:none';
    if (styles.getPropertyValue('visibility') === 'hidden') return 'visibility:hidden';

    const defaultStyles = getDefaultStyles(element);

    const properties = [];
    const _ignoreDefault = property => {
        let match;
        // font-style has side effects
        if (['font-size', 'font-family', 'font-style'].includes(property)) return true;
        // inherited but not same
        if (inherited.includes(property) && pStyleText && pStyleText.includes(property)) return true;
        // outline-style default none value not works
        if (property === 'outline-style') return true;
        // border-width need to judge according to border-style
        if ((match = /border-(top|right|bottom|left)-width/.exec(property))) {
            return styles.getPropertyValue(`border-${match[1]}-style`) !== 'none';
        }
        return false;
    };

    for await (const property of Array.from(styles)) {
        const style = styles.getPropertyValue(property);
        const defaultStyle = defaultStyles.getPropertyValue(property);
        const text = `${property}:${style}`;
        if (style
            && !(inherited.includes(property) && pStyleText && pStyleText.includes(text)) // inherited
            && (_ignoreDefault(property) || defaultStyle !== style)
        ) {
            let url;
            if (property === 'background-image' && (url = (/url\("(.*?)"\)/.exec(style) || [])[1])) {
                properties.push(`${property}:url("${await toDataURL(url)}")`);
            } else if (/^(?:width|height)$/.test(property) && /px$/.test(style)) {
                const innerProperty = property.replace(/^[a-z]/, $0 => $0.toUpperCase());
                const currentVal = parseFloat(style);
                const parentVal = element.parentNode === doc
                    ? window[`inner${innerProperty}`]
                    : element.parentNode[`client${innerProperty}`];
                if (currentVal === parentVal) {
                    // TODO: not accurate
                    properties.push(`${property}:100%`); // keep responsive
                } else {
                    const anti = property === 'width' ? 'Height' : 'Width';
                    const scrollable = element[`scroll${anti}`] > element[`client${anti}`];
                    const sameOfDoc = element.getBoundingClientRect()[property] - currentVal === scrollbarWidth(doc);
                    // scrollWidth | scrollHeight | clientWidth | clientHeight
                    const scrollbarOffset = scrollable && sameOfDoc ? scrollbarWidth(doc) : 0;
                    // avoid side effects of the scrollbar
                    properties.push(`${property}:${currentVal + scrollbarOffset}px`);
                }
            } else if (/^(?:left|right|top|bottom)$/.test(property) && /px$/.test(style)) {
                const anti = ({left : 'right', right : 'left', top : 'bottom', bottom : 'top'})[property];
                const innerProperty = ({left : 'Width', right : 'Width', top : 'Height', bottom : 'Height'})[property];
                const currentVal = parseFloat(style);
                const antiVal = parseFloat(styles.getPropertyValue(anti));
                const sum = currentVal + parseFloat(element[`client${innerProperty}`]) + antiVal;
                // TODO: how to detect whether current value is a percentage value?
                if (sum !== window[`inner${innerProperty}`] || currentVal <= antiVal) {
                    properties.push(text);
                }
            } else if (/^margin-(?:left|right|top|bottom)$/.test(property) && /px$/.test(style)) {
                // TODO: refactor above
                const p = /^margin-(left|right|top|bottom)$/.exec(property)[1];
                const anti = ({left : 'right', right : 'left', top : 'bottom', bottom : 'top'})[p];
                const innerProperty = ({left : 'Width', right : 'Width', top : 'Height', bottom : 'Height'})[p];
                const currentVal = parseFloat(style);
                const antiVal = parseFloat(styles.getPropertyValue(`margin-${anti}`));
                const sum = currentVal + parseFloat(element[`client${innerProperty}`]) + antiVal;
                // try to calculate "auto"
                if (sum === window[`inner${innerProperty}`] && (currentVal || Infinity) >= (antiVal || Infinity)) {
                    properties.push(`${property}:auto`);
                } else {
                    properties.push(text);
                }
            } else {
                if (!unnecessary.test(property)) {
                    // TODO: ignore unnecessary properties?
                    properties.push(text);
                }
            }
        }
    }

    return properties.join(';');
}

/**
 *
 * @param element
 * @param pseudo - :after
 *               - :before
 *               - :disabled
 * @returns {string}
 */
function getPseudoStyle(element, pseudo) {
    const defaultStyles = getDefaultStyles(element, pseudo);

    if (pseudo === '::-webkit-scrollbar-thumb:hover') {
        // todo: how to calculate ::-webkit-scrollbar-thumb:hover style content?
        pseudo = '::-webkit-scrollbar-thumb';
    }

    const doc = element.ownerDocument;
    const win = doc.defaultView || doc.parentWindow;
    const styles = win.getComputedStyle(element, pseudo);

    const properties = [];

    // concern content property
    if ([':after', ':before'].includes(pseudo) && styles.getPropertyValue('content') === 'none') return '';
    // concern disabled attribute
    if (pseudo === ':disabled' && !element.getAttribute('disabled')) return '';
    // concern width or height
    if (/-webkit-scrollbar/.test(pseudo)) {
        const pseudoElt = '::-webkit-scrollbar';
        const sc = win.getComputedStyle(element, pseudoElt);
        const scDefault = getDefaultStyles(element, pseudoElt);
        const bodySc = win.getComputedStyle(doc.body, pseudoElt);
        if (['width', 'height'].every(property => !diff(sc, scDefault, property))) return ''
        if (element !== doc.body && ['width', 'height'].every(property => !diff(sc, bodySc, property))) return '';
    }

    Array.from(styles).map(property => {
        const style = diff(styles, defaultStyles, property);
        style && !unnecessary.test(property) && properties.push(`${property}:${style}`);
    });

    return properties.join(';');

    function diff(styles, defaultStyles, property) {
        const style = styles.getPropertyValue(property);
        const defaultStyle = defaultStyles && defaultStyles.getPropertyValue(property);
        return (!defaultStyle || defaultStyle !== style) && style;
    }
}

const scrollbarPseudos = [
    '::-webkit-scrollbar',
    '::-webkit-scrollbar-thumb',
    '::-webkit-scrollbar-thumb:hover',
    '::-webkit-scrollbar-track',
    '::-webkit-scrollbar-button',
];

// get scrollbar style
function getScrollbarStyle(doc) {
    return `${scrollbarPseudos.map(pseudo => `${pseudo} {${getPseudoStyle(doc.body, pseudo)}}`).join('')}`;
}

export default async function run(doc, debug, log) {
    info = log || info;

    const body = doc.body;
    // mark id for looking up
    Array.from(body.getElementsByTagName('*')).map(tag => tag.setAttribute('data-dom-id', _hid()));

    // init fake document for isolating from stylesheet
    const fakeIframe = initFakeIframe(doc);
    const bodyHtml = await getStyledContent(body);
    const htmlStyle = (await getAppliedStyle(document.documentElement)).replace(/"/g, '\'');
    const bodyStyle = (await getAppliedStyle(body)).replace(/"/g, '\'');
    const scrollbarStyle = getScrollbarStyle(doc);
    const fontFace = await getFontFace(doc);
    fakeIframe._destroy();

    // clean the id
    Array.from(body.getElementsByTagName('*')).map(tag => tag.removeAttribute('data-dom-id'));

    const content = await (await import('./node_modules/html-minifier-terser/dist/htmlminifier.esm.bundle.js')).minify(`
    <html style="${htmlStyle}">
    <head>
        <!-- title -->
        <title>${doc.title}</title>
        <!-- encoding -->
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
        <!-- @font-face -->
        <style>${fontFace}</style>
        <!-- scrollbar style -->
        <style>${scrollbarStyle}</style>
    </head>
    <body style="${bodyStyle}">${bodyHtml}</body>
    </html>`, {
        collapseBooleanAttributes     : true,
        collapseInlineTagWhitespace   : true,
        collapseWhitespace            : true,
        conservativeCollapse          : true,
        removeAttributeQuotes         : true,
        removeComments                : true,
        removeEmptyAttributes         : true,
        removeOptionalTags            : true,
        removeRedundantAttributes     : true,
        removeScriptTypeAttributes    : true,
        removeStyleLinkTypeAttributes : true,
        removeTagWhitespace           : true,
    });

    if (debug) {
        // rerender content in the same site for debugging
        document.documentElement.setAttribute('style', htmlStyle);
        body.parentNode.innerHTML = content;
    }
    return content;

    async function getStyledContent(body) {
        let start, length;

        const doc = body.ownerDocument;
        // copy
        info('[INFO] clone DOM elements');
        const container = initClonedBody(body);
        // scrape all iframe content at first when they are visible
        info('[INFO] scraping iframe elements...');
        const frames = Array.from(container.getElementsByTagName('iframe'));
        start = 0;
        length = frames.length;
        for await (const frame of frames) {
            info(`[INFO] scraping iframe elements... [${++start}/${length}]`, true);
            const iframeId = _hid();
            // use DOM iframe rather than the copies in order to avoid side effects by `display:none`
            const DOMIframe = _targetIn(frame, body);
            // not allow scripts
            if (DOMIframe.contentDocument) {
                frame.setAttribute('data-iframe-id', iframeId);
                // language=JavaScript
                frame.setAttribute(
                    'onload',
                    'this.contentDocument.body.parentNode.innerHTML'
                    + ` = \`${await run(DOMIframe.contentDocument, debug, log)}\`;`
                );

                removeUnusedAttributes(frame, ['data-iframe-id', 'onload']);
            }
        }
        info('[INFO] scraping iframe elements done.', true);

        info('[INFO] scraping DOM elements...');
        const tags = Array.from(container.getElementsByTagName('*'));
        start = 0;
        length = tags.length;

        const pseudos = [
            ':after', ':before', ':disabled',
            // custom scrollbar
            ...scrollbarPseudos,
        ];

        for await (const tag of tags) {
            info(`[INFO] scraping DOM elements... [${++start}/${length}]`, true);
            const nodeName = tag.nodeName.toLowerCase();
            // use DOM tag rather than the copies in order to avoid side effects by `display:none`
            const DOMTag = _targetIn(tag, body);

            if (nodeName === 'img') {
                // change image source to dataURL when they are image tags
                tag.setAttribute('src', await toDataURL(tag.getAttribute('src')));
            } else if (nodeName === 'input') {
                // keep value of input elements
                tag.setAttribute('value', DOMTag.value);
            }
            removeUnusedAttributes(tag);
            // store in memory and calculated firstly without side effects
            // pseudo
            // data--after | data--before | data--disabled
            // data---webkit-scrollbar | data---webkit-scrollbar-thumb | data---webkit-scrollbar-thumb-hover
            // data---webkit-scrollbar-track | data---webkit-scrollbar-button
            pseudos.map(pseudo => (tag[`data-${_escape(pseudo)}`] = getPseudoStyle(DOMTag, pseudo)));
            // style
            tag['data-style'] = tag['data-style'] || await getAppliedStyle(DOMTag);
        }
        info('[INFO] scraping DOM elements done.', true);

        tags.map(tag => {
            // pseudo
            if (pseudos.some(pseudo => tag[`data-${_escape(pseudo)}`])) {
                let content = '';
                const pseudoId = _hid();
                tag.setAttribute('data-pseudo-id', pseudoId);
                const style = doc.createElement('style');
                pseudos.map(pseudo =>
                    tag[`data-${_escape(pseudo)}`]
                    && (content += `[data-pseudo-id="${pseudoId}"]${pseudo} {${tag[`data-${_escape(pseudo)}`]}}`));
                style.innerHTML = content;
                tag.before(style);
            }
            // style
            tag.setAttribute('style', tag['data-style']);
            removeUnusedAttributes(tag, ['data-pseudo-id', 'style']);
        });

        const content = container.innerHTML;
        container._destroy();
        return content.replace(/&quot;/g, '\'');
    }
}

function removeUnusedAttributes(el, ignored = []) {
    Array.from(el.attributes).map(attr =>
        [
            ...ignored,
            'data-dom-id',
            ...el.tagName === 'IMG' ? ['src'] : [],
            ...el.tagName === 'INPUT' ? ['value'] : [],
        ].includes(attr.name) || el.removeAttribute(attr.name));
}