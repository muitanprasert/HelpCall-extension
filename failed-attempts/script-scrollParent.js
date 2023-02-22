// list of interactive node types and roles
const interactive_nodes = {
    'a':{ name:'', attr:'href'}, // could be button or link, too confusing
    'audio':{ name:'audio player', attr:'controls'},
    'video':{ name:'video player', attr:'controls'},
    'button':{ name:'button' },
    'details':{ name:'' },
    'embed':{ name:'embedded content' },
    'iframe':{ name:'embedded content' },
    'img':{ name:'image', attr: 'usemap'},
    'input':{ name:'$[type] box' }, // type != hidden
    'select':{ name: 'drop-down list'},
    'textarea':{ name: 'textbox'}
} 
const interactive_roles = ['button', 'checkbox', 'link', 'progressbar', 'searchbox', 'scrollbar', 'slider', 'spinbutton', 'switch', 'textbox', 'tooltip','combobox', 'grid', 'listbox', 'menu', 'menubar', 'radiogroup', 'tablist', 'tree', 'treegrid'];

// constants
const ttHeight = 50;
const ttWidth = 36;
const ttOffsetX = 51;

// global variables
var url = window.location.href;
var new_event = false;  // kept in case we wanna bring mutation observer back
var alldone = true;

// ======= TOOLTIP EVENT LISTENERS =======

// listen for clicks
let timer = null;
document.addEventListener('click', function(e) {
    alldone = false;
    var thisEvent = recordEvent(e);

    // ignore if click in tooltip
    if(inTooltip(e.target) != null){
        e.stopPropagation();
        alldone = true;
    }
    else if (timer) {
        clearTimeout(timer);
        timer = null;
        // Handle double click event
        thisEvent.eventType = 'd';
        new_event = true;
        create_tooltip(thisEvent);
    } else {
        timer = setTimeout(function() {
            timer = null;
            // Handle single click event
            thisEvent.eventType = 'c';
            new_event = true;
            create_tooltip(thisEvent);
        }, 250);
    }
}, true);
document.addEventListener('contextmenu', function(e) {
    alldone = false;
    var thisEvent = recordEvent(e);
    if(inTooltip(e.target) == null){
        thisEvent.eventType = 'r'; // right-click
        create_tooltip(thisEvent);
    }
    else{
        e.preventDefault();
        e.stopPropagation();
        alldone = true;
    }
}, false);

// helper function for any MOUSE event
function recordEvent(e){
    let clone = e.target.cloneNode(true);
    clone.setAttribute('bounds', JSON.stringify(e.target.getBoundingClientRect()));
    e = e || window.event;
    let thisEvent = {
        target: e.target,
        cloned: clone,
        absX: e.pageX,
        absY: e.pageY,
        eventType: 'c',    // default to c = click
        code: null,
        scrollParent: getScrollParent(e.target)
    }
    return thisEvent;
}

// listen for key presses
var tempFocus = null;
document.addEventListener('keyup', function(e){
    alldone = false;
    let focus = document.activeElement;
    let clone = focus.cloneNode(true);
    clone.setAttribute('bounds', JSON.stringify(focus.getBoundingClientRect()));
    let thisEvent = {
        target: focus,
        cloned: clone,
        absX: 0,
        absY: 0,
        eventType: 's',
        code: null,
        scrollParent: getScrollParent(focus)
    }
    new_event = true;

    // if contains special key (excl. shift), keep all
    if(e.ctrlKey || e.metaKey || e.altKey){
        let keys = '';
        if(e.ctrlKey) keys += 'Ctrl+'
        if(e.metaKey) keys += 'Cmd+'
        if(e.altKey) keys += 'Alt+'
        keys += e.key;
        thisEvent['code'] = keys
        create_tooltip(thisEvent);
        return;
    }
    // for normal key presses, create only 1 tt until keypress at another focus
    else if(tempFocus != focus){
        thisEvent.eventType = 'k';
        create_tooltip(thisEvent);
        tempFocus = focus;
    }
});

/**
 * Generate queryStr for selector from a given node or its parent
 * @param {Node} node 
 * @return queryStr
 */
function generateQueryStr(node){
    if(node === null) return "FIXED";
    if(node.parentElement === null)
        return '';
    let queryStr = node.nodeName.toLowerCase();
    const commonAttributes = ["class", "id", "name", "role"];
    for (var i = 0, atts = node.attributes, n = atts.length, arr = []; i < n; i++){
        if(commonAttributes.includes(atts[i].nodeName))
            queryStr += '['+atts[i].nodeName+'="'+atts[i].nodeValue+'"]'
    }
    return generateQueryStr(node.parentElement) + ' ' + queryStr;
}

window.addEventListener('beforeunload', async (event) => {
    //const mode = await readSessionStorage('mode');
    //if (mode == 'write' && !alldone) {
        for(var i = 0; i < 2000; i++){
            if(alldone){
                break;
            }
            console.log(i);     // a hack to delay it bc Promise, setTimeout don't work in beforeunload
        }
    //}
});

// ========== MANAGING TOOLTIPS =========

/** 
 * Write new tooltip into session storage
 * 
 * @param {number} num Tooltip's number
 * @param {string} css Tooltip's CSS (static position)
 * @param {string} desc Tooltip's text description
*/ 
function writeSessionTooltip(num, css, desc, parentStr){
    var obj = {}
    obj[num.toString()] = {
            "url":url,
            "desc":desc,
            "css":css,
            "scrollParent":parentStr
        }
    console.log("writing down", obj);
    setVariable(obj);
}

/** 
 * Inject HTML code of a tooltip (new or saved) into the page
 * 
 * @param {number} num Tooltip's number
 * @param {string} css Tooltip's CSS (static position)
 * @param {string} desc Tooltip's text description
 * @param {string} parentQuery query string for the parent
 * @param {string} stepUrl URL associated with the Tooltip (to prevent errors from async functions & delays)
*/
function injectTooltipHTML(num, css, desc, parentQuery, stepUrl){
    let divID = 'HelpCall_'+num;
    var div = document.createElement('div');
    div.style.cssText = css;
    div.id = divID;
    div.className = "HelpCallTT";

    // add inner elements & event listener
    var divClosed = document.createElement('div')
    divClosed.className = "closedTT";
    divClosed.innerHTML = '<svg class="HelpCall closedTT-shape" width="'+ttWidth+'px" \
        viewbox="0 0 30 42"> \
        <path stroke="#fffae7" fill="#61187c" stroke-width="2" \
          d="M15 3 \
             Q16.5 6.8 25 18 \
             A12.8 12.8 0 1 1 5 18 \
             Q13.5 6.8 15 3z" /> \
    </svg> \
    <p class="HelpCall closedTT-text">'+num+'</p>'
    divClosed.addEventListener('mousedown', function(e){
        e.preventDefault();
        e.stopPropagation();
        let n = this.innerText;
        if(e.button == 0)
            document.getElementById('HelpCall-ttB_'+n).style.display = 'block';
    });
    divClosed.addEventListener('mouseup', function(e){
        e.preventDefault();
        e.stopPropagation();
        let n = this.innerText;
        if(e.button == 2){
            chrome.storage.session.remove(n);
            window.setTimeout(function(){
                document.body.removeChild(document.getElementById("HelpCall_"+n));
            }, 100);
        }
    })
    div.appendChild(divClosed);
    
    var divOpen = document.createElement('div')
    divOpen.className = 'HelpCall openTT'
    divOpen.id = 'HelpCall-ttB_'+num
    divOpen.innerHTML = desc;
    divOpen.addEventListener('mousedown', function(e){
        e.preventDefault();
        e.stopPropagation();
        if(e.button == 0)
            this.style.display = 'none';
    });
    divOpen.addEventListener('mouseup', function(e){
        e.preventDefault();
        e.stopPropagation();
        let n = this.id.split("_")[1];
        if(e.button == 2){
            chrome.storage.session.remove(n);
            window.setTimeout(function(){
                document.body.removeChild(document.getElementById("HelpCall_"+n));
            }, 100);
        }
    })
    div.appendChild(divOpen);

    // check right before actually injecting if it should still be injected
    if(stepUrl == window.location.href && document.getElementById(divID) == null){
        console.log(parentQuery);
        if(parentQuery == "" || parentQuery == "FIXED"){
            document.body.appendChild(div);
            return;
        }
        let parentDOM = document.querySelector(parentQuery)
        console.log(parentDOM);
        parentDOM.appendChild(div);
    }
}

/** 
 * Populate this page with its Tooltips (both while writing & reading)
*/
async function onPageLoad(){
    console.log("PAGE LOADING");
    var mode = await readSessionStorage('mode');
    if(mode == 'write' || mode == 'read'){
        let nextNum = Number(await readSessionStorage('num'));
        cleanSlate();
        for(let i=1; i<nextNum; i++){
            let curStep = await readSessionStorage(i.toString());
            if(curStep['url'] == window.location.href)
                injectTooltipHTML(i, curStep.css, curStep.desc, curStep.scrollParent, curStep['url']);
        }
    }
}
window.onload = onPageLoad;

/**
 * Listen to changes in session storage to:
 * 1. Update this page if the mode is changed in the extension's popup
 * 2. Update all tooltips, both in HTML & session storage, after deletion
 */
chrome.storage.onChanged.addListener(async function(changes, _) {
    if('mode' in changes){
        let newMode = changes['mode']['newValue'];
        if(newMode === 'sleep' || newMode === 'write'){
            cleanSlate();
        }
        else if(newMode === 'read'){
            // assume the guide is in storage.session
            console.log("reading new guide", newMode)
            onPageLoad();
        }
    }

    // handle tooltip deletion
    // TODO should users be allowed to delete the tooltip while reading? should the deletions be save/discardable too? -- right now it's deletable but changes are not saved
    else if(!('num' in changes)){
        let ttID = Object.keys(changes)[0]
        if('oldValue' in changes[ttID] && !('newValue' in changes[ttID])){  // tooltip removed
            let nextNum = Number(await readSessionStorage('num'));
            setVariable({'num':nextNum-1})
            console.log("DELETING", ttID);

            // update tooltips after it
            for(let i=Number(ttID)+1; i<=nextNum; i++){     // goes to nextNum just in case
                let storedStep = await readSessionStorage(i.toString());
                let prevNum = (i-1).toString();
                if(storedStep != undefined){
                    let temp = {}
                    temp[prevNum] = storedStep;
                    setVariable(temp);
                }
                let div = document.getElementById("HelpCall_"+i)
                if(div){
                    document.getElementById('HelpCall-ttB_'+i).id = 'HelpCall-ttB_'+prevNum
                    div.getElementsByTagName('p')[0].textContent = prevNum;
                    div.id = "HelpCall_"+prevNum;
                }
                //console.log("UPDATED STEP", prevNum, await readSessionStorage(prevNum.toString()))
            }
        }
    }
});

/** 
 * Remove all Tooltips in this page's HTML
*/
function cleanSlate(){
    var TTs = document.querySelectorAll('div.HelpCallTT');
    TTs.forEach(function(tt){
        document.body.removeChild(tt);
    });
}

/** 
 * Retrieve value by key from session storage
 * @param {string} key
 */
const readSessionStorage = async (key) => {
    return new Promise((resolve, reject) => {
      chrome.storage.session.get([key], function (result) {
          resolve(result[key]);
      });
    });
};

/** 
 * Retrieve value by key from local storage
 * @param {string} key
 */
const readLocalStorage = async (key) => {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get([key], function (result) {
          resolve(result[key]);
      });
    });
};

/** 
 * Write a JSON-serializable object into session storage
 * @param {object} variable object to write
*/
function setVariable(variable){
    chrome.storage.session.set(variable);
}

// ========== CREATING TOOLTIPS =========

/** 
 * Inject HTML code of a tooltip (new or saved) into the page
 * @param {string} code keycode when a key is pressed
*/
async function create_tooltip(e) {
    // prevent a new tooltip from triggering a new mutation and a chain of tooltips
    if(!new_event || inTooltip(e.target)){ return; }
    new_event = false;

    // create a new tooltip only if in writing mode
    let mode = await readSessionStorage('mode');
    if(mode === undefined || mode != "write") { return; }

    var num = await readSessionStorage('num');
    console.log("creating tooltip on ", e.cloned);
    let result = findInteractiveRole(e.target, e.cloned);
    var desc = generateDesc(result, e);
    css = nodeToCSS(e.target, e.scrollParent, e.cloned, e.absX, absY=e.absY);
    let parentStr = generateQueryStr(e.scrollParent);
    injectTooltipHTML(num, css, desc, parentStr, url);
    writeSessionTooltip(num, css, desc, parentStr);
    setVariable({'num':num+1});
    alldone = true;
    
    /* id is unusable. so many sites don't use ids or use non-unique ids. gotta find another way to id for anchoring.
    Q: how do we make tooltips show at the same z-index as its target?
    Q: (related) how do we make the right tooltips show on state changes & url changes?
    Q: before that, how do I make it stick on fixed elements when the page is scrolled?
    A: now checking whether the target is an element that would move when scrolled and define it as either fixed or absolute accordingly (certainly wouldn't work in more complex interfaces).
    */
}

function nodeToCSS(node, scrollParent, cloned=null, absX=0, absY=0){
    var loc = calcTooltipLoc(node, cloned, absX, absY);
    if(scrollParent != null)
        var css = 'position:absolute; ';
    else
        var css = 'position:fixed; ';
    css += 'z-index:1000000; left:'+loc.left+'px; top:'+loc.top+'px;';
    return css;
}

// ======= HELPER FUNCTIONS =======

/**
 * Use MutationObserver to watch for URL change to update all Tooltips
 * Update immediately but wait 1s before updating URL to avoid changing it while a Tooltip is still being written
 */
var futureUrl;
var callback = function(mutations){
    if(url !== window.location.href && futureUrl !== window.location.href){
        console.log("url changed");
        futureUrl = window.location.href;
        onPageLoad();
        window.setTimeout(function(){
            url = window.location.href;
        }, 1000);
    }
};
var urlObserver = new MutationObserver(callback);
urlObserver.observe(document.body, { childList: true, subtree: true });

/** 
 * Find an element's parent Tooltip div if exists
 * 
 * @param {Node} elm element to check
 * @return {Node} Parent Tooltip element or NULL if not found
*/
function inTooltip( elm ) {
    var i = 0;
    while(elm.parentNode && i<5){       // stop before document or 5 levels
        if(elm.className == "HelpCallTT")
            return elm;
        i++;
        elm = elm.parentNode;
    }
    return null;
}

/** 
 * Calculate position and orientation of a Tooltip based on its target DOM element
 * If not possible, use the event's mouse position instead.
 * 
 * @param {Node} elm element that triggered the event
 * @param {Node} cloned deep copy version of the element
 * @param {number} absX default position X
 * @param {number} absY default position Y
 * @return {object} An object containing 'top', 'left' and 'dir' values of the Tooltip
*/
function calcTooltipLoc( elm, cloned, absX, absY ) {
    dimensions = JSON.parse(cloned.getAttribute('bounds'));
    var y = dimensions.top;
    var x = Math.max(0, dimensions.left - ttOffsetX + dimensions.width/2 - ttWidth/2);
    var maxX = window.innerWidth;
    var maxY = window.innerHeight;
    if(scrollWithWindow(elm)){
        y += window.scrollY;
        x += window.scrollX;
        maxX = document.documentElement.scrollWidth;
        maxY = document.documentElement.scrollHeight;
    }

    // if the dimension is unretrievable (e.g., with svg) or the element is too big, use mouse position instead
    if(dimensions.height == 0 && dimensions.width == 0 || 
        y - ttHeight < 0 && y + dimensions.height + ttHeight > maxY
        || elm === document.body){
        return { top: absY, left: Math.max(0, absX - ttOffsetX - ttWidth/2), dir: 0}
    }
    // place below the element
    if(y - ttHeight < 0){
        return { top: y + dimensions.height, left: x, dir: 1 };
    }
    // place above the element
    while(overlap(x, y - ttHeight)){        // move right until it doesn't overlap with any tooltip
        x += ttWidth/2;
    }
    return { top: y - ttHeight, left: x, dir: 0 };

    // TODO be more strategic with the positioning not to cover anything incl. other tooltips (or add some opacity with hover effects)
    // haven't really accounted for horizontal tts either
}

/**
 * Check if the given coordinates overlap with any existing tooltips
 * @param {number} x 
 * @param {number} y 
 */
function overlap(x, y){
    var TTs = document.querySelectorAll('div.HelpCallTT');
    var overlapped = false;
    TTs.forEach(function(tt){
        ttBounds = tt.getBoundingClientRect();
        overlapped = overlapped || (Math.abs(x-ttBounds.left) < ttWidth) && (Math.abs(y-ttBounds.top) < ttHeight);
    });
    return overlapped
}

/** 
 * Check if a given element scrolls with the window
 * @param {Node} elm element to check
 * @return {boolean}
*/
function scrollWithWindow( elm ) {
    before = elm.getBoundingClientRect();
    window.scrollBy(1,1);
    after = elm.getBoundingClientRect();
    window.scrollBy(-1,-1);
    if(before.top != after.top || before.left != after.left)
        return document.scrollingElement;
    return null;
}

/**
 * Find the scrollable parent if exists
 * @param {Node} element 
 * @param {boolean} includeHidden 
 * @returns 
 */
function getScrollParent(element, includeHidden) {
    var style = getComputedStyle(element);
    var excludeStaticParent = style.position === "absolute";
    var overflowRegex = includeHidden ? /(auto|scroll|hidden)/ : /(auto|scroll)/;

    if (style.position === "fixed")
        return scrollWithWindow(element);
    for (var parent = element; (parent = parent.parentElement);) {
        style = getComputedStyle(parent);
        if (excludeStaticParent && style.position === "static") {
            continue;
        }
        if (overflowRegex.test(style.overflow + style.overflowY + style.overflowX)) return parent;
    }

    return scrollWithWindow(element);
}

/** 
 * Generate a Tooltip's text description
 * 
 * @param {Node} obj parent interactive element
 * @param {Node} orig_obj original target element that triggered the event
 * @return {string}
*/
function generateDesc(obj, e){
    let desc = 'Click'
    if(e.eventType == 'd')
        desc = 'Double-click'
    else if(e.eventType == 'r')
        desc = 'Right (secondary) click on'
    else if(e.eventType == 'k')
        desc = 'Enter input into'
    else if(e.eventType == 's'){
        // special case, no target desc (but positioned there)
        return 'Press  '+e.code;    // if e isn't passed we get an error
    }
    let visible_text = ''
    if(e.cloned.innerText != undefined)
        visible_text = e.cloned.innerText.trim();
    if(visible_text != '' && e.eventType != 'k' && obj.elm != document.body){
        words = visible_text.split(" ")
        if(words.length > 4)
            visible_text = words.slice(0,4).join(" ")+"..."; // take first 4 words
        if(visible_text.includes('\n'))
            visible_text = visible_text.split('\n')[0]
        desc += " <i>"+visible_text+"</i>";
    }
    else{
        desc += " this";
    }
    if(obj.role != '')
        desc += " "+obj.role
    return desc;
}

/** 
 * Find an element's parent Tooltip div if exists
 * 
 * @param {Node} el element to find a role for
 * @return {object} An object containing 'elm', the parent Node and 'role' as a string
*/
function findInteractiveRole(el, initEl){
    if(el == null || el.parentNode == null) // stop before document
        return { elm: document.body, role:''};  // return body to just use the click's location directly

    // check by nodeName (implicit)
    nodeName = el.nodeName.toLowerCase();
    if(nodeName in interactive_nodes){
        if ('attr' in interactive_nodes[nodeName]){
            if(!el.hasAttribute(interactive_nodes[nodeName]['attr']))
                return { elm: initEl, role:''};
        }
        if(nodeName == 'input'){
            if(!el.hasAttribute('type'))
                return { elm: el, role:'text input field'};
            if(el['type'] == 'hidden')
                return { elm: initEl, role:''};
            return { elm: el, role: el['type'] + ' input field' };
        }
        return { elm: el, role: interactive_nodes[nodeName]['name'] };
    }

    // check by role (explicit)
    if(el.hasAttribute("role")){
        if(interactive_roles.includes(el["role"])){
            return { elm: el, role: el["role"] };
        }
    }

    // check parent recursively
    return findInteractiveRole(el.parentNode, initEl);
}

/** 
 * Find an element's modal parent element if it exists
 * 
 * @param {Node} el element to check
 * @return {Node} Parent modal element or NULL if not found
 * 
 * @todo Use this function!
*/
function inModal(el) {
    if(el.ariaModal == "true")
        return el;      // return the modal bc we might need it to determine which modal the target is in too
    while (el.parentNode) {
        el = el.parentNode;
        if (el.ariaModal == "true")
            return el;
    }
    return null;
}

/*function moveTillClear(bounds){
    var TTs = document.querySelectorAll('div.HelpCallTT');
    var nrow = Math.round(document.documentElement.scrollHeight/ttHeight)+1;
    var ncol = Math.round(document.documentElement.scrollWidth/ttWidth)+1;
    var matrix = Array(nrow).fill().map(()=>Array(ncol).fill())
    TTs.forEach(function(tt){
        let ttBounds = tt.getBoundingClientRect()
        let row = Math.round(ttBounds.top/ttHeight)
        let col = Math.round(ttBounds.left/ttWidth)
        matrix[row][col] = 1;
    });

    thisRow = Math.round(bounds.top/ttHeight)
    thisCol = Math.round(bounds.left/ttWidth)
    while(matrix[thisRow][thisCol] == 1){
        // move
    }
}*/

// ====== NO LONGER IN USE =====
// observe page mutations from https://stackoverflow.com/a/50493861
var targetNode = document.body;
var config = { attributes: true, childList: true, subtree: true };     // options (which mutations to observe)
var callback = function(mutationsList) {                // callback function to execute when mutations are observed
    window.setTimeout(create_tooltip, 100);
};
var observer = new MutationObserver(callback);          // an observer instance linked to the callback function
//observer.observe(targetNode, config);                   // start observing the target node for configured mutations
// observer.disconnect();

function sleep(ms) {
    return new Promise(resolve => window.setTimeout(resolve, ms));
}