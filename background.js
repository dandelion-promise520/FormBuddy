chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'copyToClipboard') {
        const tabId = request.tabId || (sender.tab && sender.tab.id);
        if (!tabId) {
            sendResponse({success: false, error: 'No tabId'});
            return;
        }
        chrome.scripting.executeScript({
            target: {tabId: tabId, frameIds: [0]},
            func: (text) => {
                navigator.clipboard.writeText(text);
            },
            args: [request.text]
        }, () => {
            sendResponse({success: true});
        });
        return true;
    }
});
