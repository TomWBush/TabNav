// Update number of tabs currently opened.
chrome.tabs.onUpdated.addListener(updateBadge);
chrome.tabs.onRemoved.addListener(updateBadge);
chrome.tabs.onCreated.addListener(updateBadge);

chrome.tabs.query({}, updateBadge);

function updateBadge() {
	chrome.tabs.query({}, tabs => {
        chrome.action.setBadgeText({ text: tabs.length.toString() });
    });
}

chrome.declarativeContent.onPageChanged.removeRules(undefined, () => {
	chrome.declarativeContent.onPageChanged.addRules([{
		conditions: [new chrome.declarativeContent.PageStateMatcher({})],
		actions: [new chrome.declarativeContent.ShowPageAction()],
	}]);
});

// Set badge background color (do this only once, ideally on extension install)
chrome.runtime.onInstalled.addListener(() => {
    chrome.action.setBadgeBackgroundColor({ color: '#909090' });
});
