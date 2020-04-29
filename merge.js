function mergeAll() {
  chrome.windows.getAll((windows) => {
    if (windows.length > 1) {
      chrome.tabs.query({ lastFocusedWindow: false }, (allTabs) => {
        const list = [];
        for (let i = 0; i < allTabs.length; i += 1) {
          list.push(allTabs[i].id);
        }
        chrome.tabs.query({ active: true, lastFocusedWindow: true }, (lastFocusedTab) => {
          console.log(lastFocusedTab);
          chrome.tabs.move(list, { windowId: lastFocusedTab[0].windowId, index: -1 });
        });
      });
      window.location.reload();
    }
  });
}

document.getElementById('mergeAll').addEventListener('click', mergeAll);
