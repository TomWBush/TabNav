function mergeAll() {
  chrome.windows.getAll((windows) => {
    if (windows.length > 1) {
      chrome.tabs.query({ currentWindow: true, active: true }, (currentTab) => {
        console.log(currentTab.length);
        currentTab = currentTab[0];
        chrome.tabs.query({}, (allTabs) => {
          const list = [];
          for (let i = 0; i < allTabs.length; ++i) {
            if (allTabs[i].id != currentTab.id) list.push(allTabs[i].id);
          }
          chrome.tabs.move(list, { windowId: currentTab.windowId, index: -1 });
        });
      });
      window.location.reload();
    } else {
      // do nothing
    }
  });
}

document.getElementById('mergeAll').addEventListener('click', mergeAll);
