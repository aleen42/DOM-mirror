(async function () {
    let loading;

    function toggleLoading(toggle = true) {
        if (!loading) {
            // initialize
            loading = document.createElement('div');
            loading.className = 'loading-area';

            // style
            const style = document.createElement('style');
            // language=CSS
            style.innerHTML = `
                .loading-area {
                    opacity: 0;
                    position: fixed;
                    background-color: rgba(0, 0, 0, 0.8);
                    width: 100%;
                    height: 100%;
                    transition: opacity 0.8s;
                    -webkit-transition: opacity 0.8s;
                    z-index: 999;
                    top: 0;
                }

                .loading-info {
                    color: #fff;
                    position: absolute;
                    left: 10%;
                    bottom: 10%;
                    max-height: 400px;
                }

                .loading-info > p {
                    margin: 0;
                }

                .loading-container {
                    width: 30px;
                    height: 50px;
                    position: absolute;
                    left: 50%;
                    top: 50%;
                    margin-top: -25px;
                    margin-left: -15px;
                }

                .loading-container .rect {
                    background-color: #fff;
                    height: 100%;
                    width: 3px;
                    display: inline-block;
                    -webkit-animation: stretchdelay 1.2s infinite ease-in-out;
                    animation: stretchdelay 1.2s infinite ease-in-out;
                }

                .loading-container .rect2 {
                    -webkit-animation-delay: -1.1s;
                    animation-delay: -1.1s;
                }

                .loading-container .rect3 {
                    -webkit-animation-delay: -1.0s;
                    animation-delay: -1.0s;
                }

                .loading-container .rect4 {
                    -webkit-animation-delay: -0.9s;
                    animation-delay: -0.9s;
                }

                @-webkit-keyframes stretchdelay {
                    0%,
                    40%,
                    100% {
                        -webkit-transform: scaleY(0.4)
                    }
                    20% {
                        -webkit-transform: scaleY(1.0)
                    }
                }

                @keyframes stretchdelay {
                    0%,
                    40%,
                    100% {
                        transform: scaleY(0.4);
                        -webkit-transform: scaleY(0.4);
                    }
                    20% {
                        transform: scaleY(1.0);
                        -webkit-transform: scaleY(1.0);
                    }
                }
            `;


            // content
            // language=HTML
            loading.innerHTML = `
                <div class="loading-info"></div>
                <div class="loading-container">
                    <div class="rect rect1"></div>
                    <div class="rect rect2"></div>
                    <div class="rect rect3"></div>
                    <div class="rect rect4"></div>
                </div>`;

            document.body.after(loading);
            loading.before(style);
        }

        toggle && (loading.style.display = 'block');
        loading.style.opacity = toggle ? '1' : '0';
        !toggle && setTimeout(function () {
            loading.style.display = 'none';
            // empty info area
            loading.querySelector('.loading-info').innerHTML = '';
        }, 800);
    }

    function info(message, replace) {
        if (replace) {
            const p = loading.querySelector('.loading-info').lastChild;
            p.innerText = message;
        } else {
            const p = document.createElement('p');
            p.innerText = message;
            loading.querySelector('.loading-info').appendChild(p);
        }
    }

    // Listen for messages
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
        toggleLoading();
        info('[INFO] start to scrap the whole DOM...');
        setTimeout(async () => {
            sendResponse(await (await import('./index.js')).default(document, 0, info));
            toggleLoading(false);
        });
        return true; // keep channel open // https://stackoverflow.com/a/53024910
    });
})();
