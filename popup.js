// Global variables
let newWinId;
let tabsToMove = [];
let curTab;
// dictionary that maps windowId to last tab index (for keydown keyup usage)
const d = {};
// let curTabId;
// let curWinId;

// Helper function to filter search result
function filterResults() {
  const input = document.getElementById('input-search');
  const filter = input.value.toUpperCase();
  const ul = document.getElementById('tabs_results');
  const li = ul.getElementsByTagName('li');

  for (let i = 0; i < li.length; i += 1) {
    const aTag = li[i].getElementsByTagName('a')[0];
    const txtValue = aTag.textContent || aTag.innerText;
    li[i].style.display = (txtValue.toUpperCase().indexOf(filter) > -1) ? '' : 'none';
  }

  // filter windows
  chrome.windows.getAll({ populate: true }, (windows) => {
    for (let i = 0; i < windows.length; i += 1) {
      let counter = 0;
      for (let j = 0; j < windows[i].tabs.length; j += 1) {
        let str = '';
        str = str.concat(i, ' ', j);
        if (document.getElementById(str).style.display === '') {
          counter += 1;
        }
      }
      document.getElementById(i).style.display = (counter === 0) ? 'none' : '';
    }
  });
}

document.getElementById('input-search').addEventListener('keyup', filterResults);

// Helper function to switch between tabs according to id (in active window)
function switchTab(tabsIn, idIn) {
  chrome.tabs.update(tabsIn[idIn].id, { active: true }, () => {
    chrome.windows.update(tabsIn[idIn].windowId, { focused: true });
  });
}

function closeTab(tabsIn, winId, tabId, curLi) {
  chrome.tabs.query({}, () => {
    chrome.tabs.remove(tabsIn[tabId].id);
  });
  curLi.remove();
  let str = '';
  str = str.concat(winId, ' ', tabId);
  const storedId = str;
  if (tabsToMove.includes(storedId)) {
    tabsToMove.splice(tabsToMove.indexOf(storedId), 1);
  }

  if (tabsToMove.length > 0) {
    tabsToMove = [];
    setTimeout(() => {}, 1000);
    window.location.reload();
  }
  event.stopPropagation();
}

// Helper for parsing html. Counting occurence.
function count(string, char) {
  const re = new RegExp(char, 'gi');
  return string.match(re).length;
}

// Return promise using asynchronous query
function getCurTabId() {
  const promise = new Promise((resolve) => {
    chrome.tabs.query({ highlighted: true, lastFocusedWindow: true }, (tabs) => {
      resolve(tabs[0]);
    });
  });
  return promise;
}

// Chain the promise to solve asynchronous problem
getCurTabId().then((result) => {
  curTab = result;
});

function newWindow() {
  chrome.windows.create({}, (win) => {
    newWinId = win.id;
  });
}

function moveTabs() {
  chrome.windows.getAll({ populate: true }, (windows) => {
    const list = [];
    for (let k = 0; k < tabsToMove.length; k += 1) {
      const windowIndex = Number(tabsToMove[k].split(' ')[0]);
      const tabIndex = Number(tabsToMove[k].split(' ')[1]);
      list.push(windows[windowIndex].tabs[tabIndex].id);
    }
    chrome.tabs.move(list, { windowId: newWinId, index: -1 });
    tabsToMove = [];
  });
}

function removeBlank() {
  chrome.tabs.query({ windowId: newWinId }, (newWinTabs) => {
    chrome.tabs.remove(newWinTabs[newWinTabs.length - 1].id);
  });
  window.location.reload();
}

// Focus onto merge-selected windows
function focus() {
  chrome.windows.getAll((windows) => {
    for (let i = 0; i < windows.length; i += 1) {
      chrome.windows.update(windows[i].id, { focused: true });
    }
  });
}
/*
Use event handler to open a new window
(instead of a new tab to get around behavior from chrome.windows.create)
*/
function Event() {
  this.eventHandlers = [];
}

Event.prototype.addHandler = function pushHandler(eventHandler) {
  this.eventHandlers.push(eventHandler);
};

Event.prototype.execute = function setHandler() {
  for (let i = 0; i < this.eventHandlers.length; i += 1) {
    this.eventHandlers[i]();
  }
};

const openWindow = new Event();
// Add handler.
openWindow.addHandler(newWindow);
openWindow.addHandler(moveTabs);
openWindow.addHandler(removeBlank);
openWindow.addHandler(focus);
// Regiser one listener on some object.
document.getElementById('merge-selected').addEventListener('click', () => {
  if (tabsToMove.length > 0) { // do nothing if no tab is selected
    openWindow.execute();
  }
}, true);


function updateTabResults() {
  chrome.windows.getAll({ populate: true }, (windows) => {
    for (let i = 0; i < windows.length; i += 1) {
      let str = '';
      const title = document.createElement('div');
      title.setAttribute('class', 'window');
      title.setAttribute('id', i);
      str = str.concat('Window ', (i + 1).toString());
      title.innerHTML = str;
      document.getElementById('tabs_results').appendChild(title);
      d[i] = windows[i].tabs.length - 1;
      for (let j = 0; j < windows[i].tabs.length; j += 1) {
        const img = document.createElement('img');
        const newli = document.createElement('li');
        const newa = document.createElement('a');
        const x = document.createElement('button');
        const span = document.createElement('span');

        str = '';
        str = str.concat(i, ' ', j);
        newli.setAttribute('id', str);
        newa.setAttribute('id', str);
        span.setAttribute('id', str);
        img.setAttribute('id', str);

        if (windows[i].tabs[j].favIconUrl) {
          img.setAttribute('src', windows[i].tabs[j].favIconUrl);
        } else {
          img.setAttribute('src', 'images/grey-chrome.png');
        }
        img.width = 30;
        img.height = 30;
        img.setAttribute('style', 'float: left; vertical-align: middle;');
        img.setAttribute('class', 'favicon');
        span.setAttribute('aria-hidden', 'true');
        span.innerHTML = '&times;';

        x.className = 'closeSpan';
        x.width = 15;
        x.height = 15;
        x.setAttribute('type', 'button');
        x.setAttribute('class', 'close');
        x.setAttribute('aria-label', 'close');
        x.setAttribute('style', 'float: right; vertical-align: middle;');
        x.appendChild(span);
        x.addEventListener('click', closeTab.bind(null, windows[i].tabs, i, j, newli));

        // used span to avoid two hyperlinks.
        const name = document.createElement('span');
        const url = document.createElement('span');
        name.setAttribute('id', 'web-name');
        url.setAttribute('id', 'web-url');
        if (windows[i].tabs[j].title.length > 35) {
          str = '';
          str = str.concat(windows[i].tabs[j].title.substring(0, 35), '...', '<br />');
          name.innerHTML = str;
        } else {
          str = '';
          str = str.concat(windows[i].tabs[j].title, '<br />');
          name.innerHTML = str;
        }

        name.setAttribute('style', 'font-size: 80%;');
        url.setAttribute('style', 'color: grey; font-size: 60%;');

        // Parse address before the third slash.
        if (count(windows[i].tabs[j].url.substring(0, windows[i].tabs[j].url.length - 1), '/') <= 2) {
          url.innerHTML = windows[i].tabs[j].url;
        } else {
          url.innerHTML = windows[i].tabs[j].url
            .substring(0, windows[i].tabs[j].url.indexOf('/', 8));
        }

        newa.appendChild(name);
        newa.appendChild(url);
        newa.appendChild(x);
        newa.setAttribute('draggable', true);

        // curTab from getCurTabId. Used promise to solve asynchronous problem.
        if (windows[i].tabs[j].id === curTab.id) {
          newa.setAttribute('style', 'background-color: #A7E8FF;');
          /*
          curWinId = i;
          curTabId = j;
          */
        }
        newli.appendChild(img);
        newli.appendChild(newa);
        newli.addEventListener('contextmenu', function rightClick(e) {
          const tab = e.path[1].id;
          if (tabsToMove.includes(tab)) {
            tabsToMove.splice(tabsToMove.indexOf(tab), 1);
            const aCol = this.getElementsByTagName('a');
            aCol[0].style.backgroundColor = '#f6f6f6';
          } else {
            tabsToMove.push(tab);
            const aCol = this.getElementsByTagName('a');
            aCol[0].style.backgroundColor = '#ffd27f';
          }
          str = '';
          str = str.concat('Merge selected (', tabsToMove.length, ')');
          document.getElementById('merge-selected').innerHTML = str;
          e.preventDefault();
        }, false);

        newli.addEventListener('click', switchTab.bind(null, windows[i].tabs, j));
        newli.setAttribute('style', 'display: block');
        document.getElementById('tabs_results').appendChild(newli);
      }
    }
  });
}

function updateButtonCount() {
  let str = '';
  str = str.concat('Merge selected (', tabsToMove.length, ')');
  document.getElementById('merge-selected').innerHTML = str;
}

// Update button count, if selected tab is closed.
chrome.tabs.onRemoved.addListener(updateButtonCount.bind());

updateTabResults();

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
  else if( document.getElementById((curWinId - 1) + ' ' + d[curWinId - 1]) ){
    document.getElementById(curWinId + ' ' + curTabId).childNodes[1]
    .setAttribute('style', 'background-color: #f6f6f6;');
    document.getElementById((curWinId - 1) + ' ' + d[curWinId - 1])
    .childNodes[1].setAttribute('style', 'background-color: #A7E8FF;');
    curTabId = d[curWinId - 1];
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
