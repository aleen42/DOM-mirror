// When the browser-action button is clicked...
chrome.action.onClicked.addListener(tab => {
    chrome.tabs.sendMessage(tab.id, {}, binary => {
        // not support for lookup last location, ref: https://stackoverflow.com/a/23122847
        if (binary) {
            // ref: https://stackoverflow.com/a/76187608/5698182
            const blob = new Blob([binary], {type : 'text/html'});
            // use BlobReader object to read Blob data
            const reader = new FileReader();
            reader.onload = () => {
                const blobUrl = `data:${blob.type};base64,${btoa(new Uint8Array(reader.result).reduce((data, byte) =>
                    data + String.fromCharCode(byte), ''))}`;
                chrome.downloads.download({
                    url      : blobUrl,
                    filename : 'index.html',
                    saveAs   : true,
                });
            };
            reader.readAsArrayBuffer(blob);
        }
    });
});
