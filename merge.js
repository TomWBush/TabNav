document.getElementById('merge-all').addEventListener('click', mergeAll);

function mergeAll() {
  chrome.windows.getAll((windows) => {
    if (windows.length > 1) {
      chrome.tabs.query({ currentWindow: true, active: true }, (currentTab) => {
        chrome.tabs.query({}, (allTabs) => {
          const list = [];
          for (let i = 0; i < allTabs.length; i += 1) {
            if (allTabs[i].id !== currentTab[0].id) list.push(allTabs[i].id);
          }
          chrome.tabs.move(list, { windowId: currentTab[0].windowId, index: -1 });
        });
      });
      window.location.reload();
    } else {
      // do nothing
    }
  });
}
