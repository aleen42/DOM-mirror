## DOM-mirror

![chrome extensions](https://badges.aleen42.com/src/chrome_extensions.svg) ![javascript](https://badges.aleen42.com/src/javascript.svg)

A Chrome plugin trying to mirror the whole rendered DOM into single static HTML files without any other stylesheet assets.

### Usages

1. Clone the project:
    ```bash
    git clone https://github.com/aleen42/DOM-mirror.git
    ```
2. Install dependencies:
    ```bash
    cd DOM-mirror && npm i && npm run prepublishOnly
    ```
3. Load unpacked extensions in Chrome and select the cloned folder `DOM-mirror`.

### Motivations

- To generate UI/UX diagrams of existed products.
- To create some demo pages with existed products.
- ...

### Features

- Support for mirroring iFrames.
- Support for mirroring contents defined with `:before`, `:after` and `:disabled`.
- Support for mirroring scrollbars defined with `::-webkit-scrollbar`, `::-webkit-scrollbar-thumb`, `::-webkit-scrollbar-thumb:hover`, `::-webkit-scrollbar-track`, `::-webkit-scrollbar-button`.
- Support for mirroring custom fonts defined with `@font-face`.
- Keep text from input elements.
- Keep images by converting with base64 data urls.

### TODO

- [ ] How to calculate percentage value without manipulating the DOM?
- [ ] How to calculate `::-webkit-scrollbar-thumb:hover` style content?
- [ ] How to minimize the default stylesheets?
- [ ] How to keep media?
