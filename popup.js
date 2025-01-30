import { Event } from './eventHandler.js';

// Global variables
let newWinId = -1;
let tabsToMove = [];
let curTab = null;
let winidToLastab = {};  // maps windowId to last tab index (for keydown keyup usage)
let last_clientY = -100; // last drag event coordinate
let targetWinId = -2;    // target window of dropped tab
let targetTabIdx = -2;   // tab index inside the target window of dropped tab

// Update button count, if selected tab is closed.
chrome.tabs.onRemoved.addListener(updateButtonCount);

document.getElementById('input-search').addEventListener('keyup', filterResults);

document.addEventListener('DOMContentLoaded', async () => {
	curTab = await getCurTabId(); 
    updateTabResults();
});


const openWindow = new Event();
openWindow.addHandler(newWindow);
openWindow.addHandler(moveTabs);
openWindow.addHandler(removeBlank);
openWindow.addHandler(focus);

// Regiser one listener on some object.
document.getElementById('merge-selected').addEventListener('click', () => {
  if (tabsToMove.length > 0) { // do nothing if no tab is selected
    openWindow.execute();
  }
});


/** ***************
  Helper Functions
 ***************** */

/**
 * Filter search result
 */
function filterResults() {
  const input = document.getElementById('input-search');
  const filter = input.value.toUpperCase();
  const ul = document.getElementById('tabs-results');
  const li = ul.getElementsByTagName('li');

  for (const element of li) {
    const aTag = element.querySelector('a');
    const txtValue = aTag.textContent || aTag.innerText;
    element.style.display = txtValue.toUpperCase().includes(filter) ? '' : 'none';
  }

  // filter windows
  chrome.windows.getAll({ populate: true }).then(windows => {
    windows.forEach((win, i) => {
		const visibleTabs = win.tabs.filter(tab => {
			const str = `${i} ${win.tabs.indexOf(tab)}`;
			const element = document.getElementById(str);
			return element && element.style.display === ''; // Check if element exists
		});
      document.getElementById(i).style.display = visibleTabs.length === 0 ? 'none' : '';
    });
  }).catch(console.error);
}

/**
 * Switch between tabs according to id (in active window)
 *
 * @param {Array} tabsIn  Array of tabs in active window
 * @param {int} idIn      The id of tab to switch to
 */
function switchTab(tabsIn, idIn) {
    chrome.tabs.update(tabsIn[idIn].id, { active: true }, () => {
        // Error handling for chrome.windows.update
        try {
            chrome.windows.update(tabsIn[idIn].windowId, { focused: true });
        } catch (error) {
            console.error("Error focusing window:", error);
        }
    });
}

/**
 * Close selected tab
 *
 * @param {Array} tabsIn All tabs in the window that has the tab you want to close
 * @param {int} winId    Window ID of the window that has the tab you want to close
 * @param {int} tabId    Tab ID of the tab you want to close
 * @param {li} curLi      The corresponding list item in popup of the tab you want to close
 */
function closeTab(tabsIn, winId, tabId, curLi, event) {
	if (event) { // Check if event exists (it might not in all cases)
        event.stopPropagation(); // Use event.stopPropagation() if event is available
    }

    if (!tabsIn || !tabsIn[tabId]) { // Check if tabsIn and tabsIn[tabId] are defined
        console.error("Error: tabsIn is undefined or invalid index.");
        return; // Or handle the error appropriately
    }

	chrome.tabs.remove(tabsIn[tabId].id).then(() => {
		curLi.remove();
		const storedId = `${winId} ${tabId}`; // Template literal
		const index = tabsToMove.indexOf(storedId);
		if (index > -1) {
			tabsToMove.splice(index, 1);
		}

		if (tabsToMove.length === 0) {
			updateTabResults();
		}
	}).catch(console.error);
}

/**
 * Asynchronously query the current tab
 */
async function getCurTabId() {
	const tabs = await chrome.tabs.query({ highlighted: true, lastFocusedWindow: true });
	return tabs[0];
}

/**
 * Create a new window
 */
function newWindow() {
    chrome.windows.create({}).then(win => {
        newWinId = win.id;
    }).catch(console.error);
}

async function moveTabs() {
    const windows = await chrome.windows.getAll({ populate: true });
    const list = tabsToMove.map(tabId => {
		const [windowIndex, tabIndex] = tabId.split(' ').map(Number);
		return windows[windowIndex].tabs[tabIndex].id;
	})

    await chrome.tabs.move(list, { windowId: newWinId, index: -1 });
    tabsToMove = [];
	updateTabResults();
}

function removeBlank() {
	chrome.tabs.query({ windowId: newWinId }).then(newWinTabs => {
		chrome.tabs.remove(newWinTabs[newWinTabs.length - 1].id).then(() => {
			updateTabResults(); // Update instead of reload
		}).catch(console.error);
	}).catch(console.error);
}

/**
 * Focus onto merge-selected windows
 */
function focus() {
    chrome.windows.getAll().then(windows => {
        windows.forEach(window => {
            chrome.windows.update(window.id, { focused: true });
        });
    }).catch(console.error);
}

/**
 * Update the list of all open tabs inside popup
 */
async function updateTabResults() {
	const windows = await chrome.windows.getAll({ populate: true });
	const tabsResults = document.getElementById('tabs-results');
	tabsResults.innerHTML = ''; // Clear previous results

	windows.forEach((window, i) => {
		const title = document.createElement('div');
		title.className = "window";
		title.id = i;
		title.innerHTML = `Window ${i + 1}`;
		tabsResults.appendChild(title);
		winidToLastab[i] = window.tabs.length - 1;
		
		const fragment = document.createDocumentFragment(); // Use a fragment for better performance

		window.tabs.forEach((tab, j) => {
			const li = document.createElement('li');
			li.id = `${i} ${j}`;

			const a = document.createElement('a');
			a.id = `${i} ${j}`;
			a.draggable = true;

			const img = document.createElement('img');
			img.id = `${i} ${j}`;
			img.src = tab.favIconUrl || 'images/grey-chrome.png';
			img.className = 'favicon';

			const span = document.createElement('span');
			span.id = `${i} ${j}`;
			span.ariaHidden = true;
			span.innerHTML = '&times;';

			const closeButton = document.createElement('button');
			closeButton.className = 'close';
			closeButton.type= 'button';
			closeButton.ariaLabel= 'close';
			closeButton.appendChild(span);
			closeButton.addEventListener('click', (event) => closeTab(window.tabs, i, j, li, event));

			// used span to avoid two hyperlinks.
			const name = document.createElement('span');
			name.className = 'web-name';
			name.innerHTML = tab.title.length > 35 ? `${tab.title.substring(0, 35)}...<br/>` : `${tab.title}<br/>`;

			const url = document.createElement('span');
			url.className = 'web-url';

			// Parse address before the third slash.
			const urlToDisplay = tab.url.substring(0, tab.url.indexOf('/', 8));
      url.innerHTML =  tab.url.split('/').length <= 3 ? tab.url : urlToDisplay;

			a.appendChild(name);
			a.appendChild(url);
			a.appendChild(closeButton);
			// curTab from getCurTabId. Used promise to solve asynchronous problem.
			if (curTab  && tab.id === curTab.id) {
				a.style.backgroundColor = '#A7E8FF';
			}
			a.addEventListener('dragover', (event) => {
				dragHandler(event, windows);
			});
			a.addEventListener('dragend', (event) => {
				dropHandler(event, windows);
				chrome.tabs.reload();
			});

			li.appendChild(img);
			li.appendChild(a);
			li.addEventListener('contextmenu', (event) => {
				event.preventDefault();
				const li = event.target.closest('li'); // Use closest() to find the li
        if (!li) { // Check if li was found
            console.error("Error: Could not find the <li> element.");
            return;
        }
        const tab = li.id; // Get the id from the li
				if (tabsToMove.includes(tab)) {
					tabsToMove.splice(tabsToMove.indexOf(tab), 1);
					li.querySelector('a').style.backgroundColor = '#f6f6f6';
				} else {
					tabsToMove.push(tab);
					li.querySelector('a').style.backgroundColor = '#ffd27f'
				}
				updateButtonCount();
			});

			li.addEventListener('click', switchTab.bind(null, window.tabs, j));
			fragment.appendChild(li);
		});
		tabsResults.appendChild(fragment);
	});
}

/**
 * Update the open tab count on the extension icon
 */
function updateButtonCount() {
	document.getElementById('merge-selected').textContent = `Merge selected (${tabsToMove.length})`;
}

/**
 * Remove the green line in drag and drop
 * Called at the beginning of DragHandler
 */
function resetDragHighlight() {
  const liArray = $('#tabs-results')[0].getElementsByTagName('li');
  for (let k = 0; k < liArray.length; k += 1) {
    liArray[k].setAttribute('style', 'border: none');
  }
}

/**
 * Reorder the tab using drag and drop
 * Get the drop location 
 * @param {*} event    the drag event
 * @param {*} windows  all open windows
 */
function dragHandler(event, windows) {
  // Prevent the line from blinking
  if (Math.abs(event.clientY - last_clientY) > 1) {
    last_clientY = event.clientY;
    resetDragHighlight();
  }

  const tabs = $('#tabs-results')[0].getElementsByTagName('li');
  if (event.clientY < tabs[0].offsetTop) {
    targetWinId = windows[0].id;
    targetTabIdx = 0;
    tabs[0].setAttribute('style', 'border-top: solid green;');
    return;
  }

  if (event.clientY + 15 > tabs[tabs.length - 1].getBoundingClientRect().bottom) {
    targetWinId = windows[windows.length - 1].id;
    targetTabIdx = -1;
    tabs[tabs.length - 1].setAttribute('style', 'border-bottom: solid green;');
    return;
  }

  let winId = 0;
  // If more than 1 window, check which window is target window
  let windowMiddle = (tabs[0].getBoundingClientRect().top - document.getElementById(0).offsetTop) / 2;
  let tabMiddle = (tabs[0].getBoundingClientRect().bottom - tabs[0].getBoundingClientRect().top) / 2;
  if (windows.length > 1) {
    for (let i = 1; i < windows.length; i += 1) {
      if (event.clientY + 10 > document.getElementById(i - 1).offsetTop
          && event.clientY < document.getElementById(i).offsetTop) {
        winId = i - 1;
      }
    }
    if (event.clientY + 10 > document.getElementById(windows.length - 1).offsetTop
        && event.clientY < tabs[tabs.length - 1].getBoundingClientRect().bottom) {
      winId = windows.length - 1;
    }
  }
  // Then check where in target window
  chrome.tabs.query({ windowId: windows[winId].id }, (targetWindowTabs) => {
    if (winId != 0 && document.getElementById(winId).offsetTop + windowMiddle + 0.01 < event.clientY
        && document.getElementById(winId + ' ' + 0).getBoundingClientRect().top + tabMiddle - 0.01 > event.clientY) {
          document.getElementById(winId + ' ' + 0).setAttribute('style', 'border-top: solid green;');
          targetWinId = windows[winId].id;
          targetTabIdx = 0;
        }
    else if (winId != windows.length - 1 && document.getElementById(winId + 1).offsetTop + windowMiddle - 0.01 > event.clientY
             && document.getElementById(winId + ' ' + (targetWindowTabs.length - 1)).getBoundingClientRect().top + tabMiddle + 0.01 < event.clientY) {
          document.getElementById(winId + ' ' + (targetWindowTabs.length - 1)).setAttribute('style', 'border-bottom: solid green;');
          targetWinId = windows[winId].id;
          targetTabIdx = -1;
    }
    else {
      for (let i = 1; i < targetWindowTabs.length; i += 1) {
        if (document.getElementById(winId + ' ' + (i - 1)).getBoundingClientRect().top + tabMiddle + 0.01 < event.clientY
            && document.getElementById(winId + ' ' + i).getBoundingClientRect().top + tabMiddle - 0.01 > event.clientY) {
              document.getElementById(winId + ' ' + i).setAttribute('style', 'border-top: solid green;');
              targetWinId = windows[winId].id;
              targetTabIdx = i;
              break;
            }
      }
    }
  });
}

/**
 * Reorder the tab using drag and drop
 * Use the drop location to move tab 
 */
function dropHandler(event, windows) {
  resetDragHighlight();
  chrome.tabs.query({ windowId: windows[parseInt(event.srcElement.id[0])].id }, (srcTab) => {
    chrome.tabs.move(srcTab[parseInt(event.srcElement.id[2])].id, { windowId: targetWinId, index: targetTabIdx });
    event.stopPropagation();
  });
}



// Unfinished code
/*
$(document).keypress( (event) => {
  if (event.key === 'Enter') {
    // switchTab()
  }
});
*/

/*
$(document).on('keydown.down', function() {
  // document.getElementById(curWinId + ' ' + curTabId).childNodes[1]
  .setAttribute('style', 'background-color: #f6f6f6;');
  if (document.getElementById(curWinId + ' ' + (curTabId + 1))) {
    document.getElementById(curWinId + ' ' + curTabId).childNodes[1]
    .setAttribute('style', 'background-color: #f6f6f6;');
    document.getElementById(curWinId + ' ' + (curTabId + 1)).childNodes[1]
    .setAttribute('style', 'background-color: #A7E8FF;');
    curTabId += 1;
  }
  else if( document.getElementById((curWinId + 1) + ' ' + 0) ){
    document.getElementById(curWinId + ' ' + curTabId).childNodes[1]
    .setAttribute('style', 'background-color: #f6f6f6;');
    document.getElementById((curWinId + 1) + ' ' + 0).childNodes[1]
    .setAttribute('style', 'background-color: #A7E8FF;');
    curWinId += 1;
    curTabId = 0;
  }
});

$(document).on('keydown.up', function() {
  if (document.getElementById(curWinId + ' ' + (curTabId - 1)) ){
    document.getElementById(curWinId + ' ' + curTabId).childNodes[1]
    .setAttribute('style', 'background-color: #f6f6f6;');
    document.getElementById(curWinId + ' ' + (curTabId - 1)).childNodes[1]
    .setAttribute('style', 'background-color: #A7E8FF;');
    curTabId -= 1;
  }
  else if( document.getElementById((curWinId - 1) + ' ' + winidToLastab[curWinId - 1]) ){
    document.getElementById(curWinId + ' ' + curTabId).childNodes[1]
    .setAttribute('style', 'background-color: #f6f6f6;');
    document.getElementById((curWinId - 1) + ' ' + winidToLastab[curWinId - 1])
    .childNodes[1].setAttribute('style', 'background-color: #A7E8FF;');
    curTabId = winidToLastab[curWinId - 1];
    curWinId -= 1;
  }
});
*/

/*
title.addEventListener('click', (e) => {
  if (tabsToMove.size != 0) {
    let window1Index = Number(tabsToMove[0].split(' ')[0]);
    let tab1Index = Number(tabsToMove[0].split(' ')[1]);

    chrome.tabs.query({}, (tabs) => {
      let list = [];
      for(let k = 0; k < tabsToMove.length; k += 1) {
        let windowIndex = Number(tabsToMove[k].split(' ')[0]);
        let tabIndex = Number(tabsToMove[k].split(' ')[1]);
        list.push(windows[windowIndex].tabs[tabIndex].id);
      }
      chrome.tabs.move(list, {windowId : windows[Number(e.path[1].id)].id, index: -1});
      tabsToMove = [];
    });
  }
  switchTab.bind(null, windows[Number(e.path[1].id)].tabs, 0);
}, false);
*/
