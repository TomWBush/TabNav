chrome.declarativeContent.onPageChanged.removeRules(undefined, () => {
  chrome.declarativeContent.onPageChanged.addRules([{
    conditions: [new chrome.declarativeContent.PageStateMatcher({})],
    actions: [new chrome.declarativeContent.ShowPageAction()],
  }]);
});

chrome.tabs.query({}, (tabs) => {
  chrome.browserAction.setBadgeBackgroundColor({ color: '#909090' });
  chrome.browserAction.setBadgeText({ text: tabs.length.toString() });
});

function updateBadge() {
  chrome.tabs.query({}, (tabs) => {
    chrome.browserAction.setBadgeText({ text: tabs.length.toString() });
  });
}

// Update number of tabs currently opened.
chrome.tabs.onUpdated.addListener(updateBadge.bind());
chrome.tabs.onRemoved.addListener(updateBadge.bind());
chrome.tabs.onCreated.addListener(updateBadge.bind());
