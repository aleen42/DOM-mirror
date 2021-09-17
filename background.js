// When the browser-action button is clicked...
chrome.browserAction.onClicked.addListener(tab => {
    chrome.tabs.sendMessage(tab.id, {}, blob => {
        // not support for lookup last location // https://stackoverflow.com/a/23122847
        blob && chrome.downloads.download({ // https://stackoverflow.com/a/35840502
            url: URL.createObjectURL(new Blob([blob], {type: 'text/html'})),
            filename: 'index.html',
            saveAs: true,
        });
    });
});
