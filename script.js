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
    'input':{ name:'$[type] field' }, // type != hidden
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

// ======= OVERVIEW BAR =======
// Modified from https://github.com/stefanvd/Browser-Extensions/blob/master/Proper-Menubar/Proper-Menubar-Edge-extension/js/content.js
var taskchangepositiontop = false;

var skipPositionedChild = function( node, style ) {
    if ( this.offsetParent &&
         this.offsetParent.tagName !== 'BODY') return true;
    if ( hasPositionedParent(node) ) return true;
    return false;
};
var hasPositionedParent = function( node ){
    if ( node.tagName === 'BODY') return false;
    var parent = node.parentNode;
    if ( parent.tagName === 'BODY') return false; // added
    var position = getComputedStyle(parent).position;
    if (position !== 'static') {
      return true;
    }
    return hasPositionedParent( parent );
};

/**
 * Helper function to streamline DOM element creation
 * @param {string} tag 
 * @param {string} innerText 
 * @param {object} attrs 
 * @returns 
 */
function createDOMElement(tag, innerText, attrs){
    let elm = document.createElement(tag);
    elm.innerText = innerText;
    for(a in attrs){
        elm.setAttribute(a, attrs[a]);
    }
    return elm;
}

/**
 * Add topbar and (try to) move every element in the page down regardless of its positioning style.
 */
let topbarHeight = '45px';
let topbarHeightInt = parseInt(topbarHeight, 10);
function addtopbar(){
    var topbar = document.getElementById('HelpCall-topbar-div');
    if(topbar){}
    else{
        var Children = document.body.getElementsByTagName("*");
        for (var i = 0, len = Children.length; i < len; i++) {

            if(Children[i].currentStyle){
                var x = Children[i].currentStyle["position"];
                var w = Children[i].currentStyle["margin-top"];
                var v = Children[i].currentStyle["margin-bottom"];
                var y = Children[i].currentStyle["top"];
                var z = Children[i].currentStyle["bottom"];
                var q = Children[i].currentStyle["height"];
            }
            else if(window.getComputedStyle){
                var st = document.defaultView.getComputedStyle(Children[i], null);
                var x = st.getPropertyValue("position");
                var w = st.getPropertyValue("margin-top");
                var v = st.getPropertyValue("margin-bottom");
                var y = st.getPropertyValue("top");
                var z = st.getPropertyValue("bottom");
                var q = st.getPropertyValue("height");
            }

            const exemptSites = ["mail.google"];
            if((x == "absolute" || x == "fixed") && y !== 'auto'){
                // exempt some sites that we know force-changing position will break
                let exempt = false;
                exemptSites.forEach(site => {
                    if(window.location.href.includes(site))
                        exempt = true;
                });

                if(exempt)
                    taskchangepositiontop = false;
                else if (x === 'absolute' && skipPositionedChild(Children[i]) ) {
                    taskchangepositiontop = false;
                }else{
                    if(x === 'fixed'){
                        if(y != topbarHeight){
                            taskchangepositiontop = true;
                        }
                    }else{
                        taskchangepositiontop = true;   // absolute
                    }
                }

                if(taskchangepositiontop == true){
                    Children[i].setAttribute("data-helpcalltopbar",true);
                    if(w != ""){
                        Children[i].setAttribute("data-spmtop",w);
                        Children[i].style.marginTop = parseInt(w, 10) + topbarHeightInt + "px";
                    }else if(v != ""){
                        Children[i].setAttribute("data-spmbottom",w);
                        Children[i].style.marginBottom = parseInt(w, 10) + topbarHeightInt + "px";
                    }

                    // if "top" and "bottom" is 0 => then calc height
                    if((q != "0px") && (y=="0px" && z=="0px")){
                        Children[i].setAttribute("data-spmheight",q);
                        Children[i].style.height = "calc( " + q + " - " + topbarHeight + ")";
                    }
                }
            }

        }
        var divblock = createDOMElement("div", "", {"id":"HelpCall-topbar-block"});
        document.body.prepend(divblock);

        // Add content to the bar
        var frame = createDOMElement("div", "", {'id':"HelpCall-topbar-div"});
        frame.appendChild(createDOMElement("img", "", {"style":"height:25px; width:25px; padding:0 10px 0 0; float:left;", "src":"https://i.ibb.co/Sdt9nTc/favicon.png"}));
        frame.appendChild(createDOMElement("span", "Showing guide tooltips: "));

        let div = createDOMElement("div", "", {"id":"HelpCall-listOfTT"});
        div.style.position = "relative";
        frame.appendChild(div);

        var toggle = createDOMElement("div", "", {"style":"float:right; width:265px; height:100%;"});
        toggle.appendChild(createDOMElement("span", "Show tooltips on this page"));
        var toggleLabel = createDOMElement("label", "", {"class":"switch"});
        var toggleInput = createDOMElement("input", "", {"type":"checkbox"});
        toggleInput.checked = true;
        toggleInput.addEventListener('change', function() {
            if (this.checked) {
                setTooltipsVisibility();
            } else {
                setTooltipsVisibility(true); // hide all tooltips
            }
          });
        toggleLabel.appendChild(toggleInput);
        toggleLabel.appendChild(createDOMElement("span", "", {"class":"slider"}));
        toggle.appendChild(toggleLabel);
        
        frame.appendChild(toggle);
        document.documentElement.appendChild(frame);

        updateBarTooltips();
    }
}

/**
 * Remove the topbar and move everything in the page back in place
 */
function removetopbar(){
	var checkb = document.getElementById('HelpCall-topbar-div');
	if(checkb){
		document.documentElement.removeChild(checkb);

			var a = document.querySelectorAll('[data-helpcalltopbar]');

			var a = document.body.getElementsByTagName("*");
			for (var i = 0, len = a.length; i < len; i++) {
					if(a[i].hasAttribute("data-spmtop")){
						a[i].style.marginTop = a[i].getAttribute("data-spmtop");
					}
					if(a[i].hasAttribute("data-spmbottom")){
						a[i].style.bottom = a[i].getAttribute("data-spmbottom");
					}
					if(a[i].hasAttribute("data-spmheight")){
						a[i].style.height = a[i].getAttribute("data-spmheight");
					}
					a[i].setAttribute("data-helpcalltopbar",false);
			}

	}

	var checkc = document.getElementById('HelpCall-topbar-block');
	if(checkc){
		document.body.removeChild(checkc);
	}
}

/**
 * Populate the HelpCall-listOfTT div, assuming it has been created
 * Pretty expensive, should be used only for creation and tooltip deletion
 */
async function updateBarTooltips(){
    let div = document.getElementById("HelpCall-listOfTT");
    div.replaceChildren();
    let nextNum = Number(await readSessionStorage('num'));
    for(let i=1; i<nextNum; i++){
        await addBarTooltip(i);
    }
    return div;
}

const grayedColor = "#99929B";
const defaultColor = "#61187c";
async function addBarTooltip(i){
    let div = document.getElementById("HelpCall-listOfTT");
    if(div == null || document.getElementById('HelpCall-bar_'+i) != null){
        // failsafe: if it gets called when the bar list isn't there yet or that tooltip is already there, just abort.
        return;
    }
    let obj = await readSessionStorage(i.toString());
    var divClosed = document.createElement('div')
    divClosed.className = "HelpCall HelpCall-barTT aboveTT";
    divClosed.id = 'HelpCall-bar_'+i;
    let color = "#61187c";
    console.log('Creating bar tooltip HelpCall_'+i, document.getElementById('HelpCall_'+i));
    if(document.getElementById('HelpCall_'+i) == null || document.getElementById('HelpCall_'+i).style.display == "none"){
        color = grayedColor;
        divClosed.style.cursor = "default";
    }
    divClosed.innerHTML = '<svg class="closedTT-shape" width="25px" \
        viewbox="0 0 30 42"> \
        <path stroke="#fffae7" fill="'+color+'" stroke-width="2" \
        d="M15 3 \
            Q16.5 6.8 25 18 \
            A12.8 12.8 0 1 1 5 18 \
            Q13.5 6.8 15 3z" /> \
    </svg> \
    <p class="closedTT-text">'+i+'</p>';
    divClosed.addEventListener("mousedown", () => {
        if(document.querySelector('#HelpCall-bar_1 path').getAttribute('fill') == defaultColor) // for some technical reason, "this" is undefined here
            document.getElementById('HelpCall_'+i).scrollIntoView({ behavior: "smooth", block: "center" });
    });

    div.appendChild(divClosed);
}
async function updateColorBarTooltips(){
    let nextNum = Number(await readSessionStorage('num'));
    for(let i=1; i<nextNum; i++){
        let thisTT = document.getElementById('HelpCall-bar_'+i);
        if(document.getElementById('HelpCall_'+i) == null || document.getElementById('HelpCall_'+i).style.display == "none"){
            thisTT.querySelector('path').fill = grayedColor;
            thisTT.style.cursor = "default";
        }
        else{
            thisTT.querySelector('path').fill = defaultColor;
            thisTT.style.cursor = "pointer";
        }
    }
}

// ======= TOOLTIP EVENT LISTENERS =======

// listen for clicks
let timer = null;
document.addEventListener('click', function(e) {
    alldone = false;
    var thisEvent = recordEvent(e);

    // ignore if click in tooltip
    if((document.getElementById('HelpCall-topbar-div') && e.clientY < topbarHeightInt)
            || inTooltip(e.target) != null){
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
    let queryStr = generateQueryStr(e.target);
    //console.log(queryStr);
    //console.log(document.querySelector(queryStr));

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
        queryStr: queryStr
    }
    return thisEvent;
}

/**
 * Generate queryStr for selector from a given node or its parent
 * @param {Node} node 
 * @return queryStr
 */
function generateQueryStr(node){
    let parent = findInteractiveRole(node).elm;
    if(parent !== null && node.innerText == undefined)
        node = parent;
    let queryStr = '';
    while(node.parentElement != null){
        let tempStr = node.nodeName.toLowerCase();
        if(node.hasAttribute('id'))
            tempStr += '[id="'+node['id']+'"]';
        if(node.hasAttribute('role') && typeof node.role =="string")
            tempStr += '[role="'+node.role+'"]';
        /*if(node.hasAttribute('class') && typeof node.className=="string" && !node.className.includes(' ')) // class changes too often
            tempStr += '[class="'+node.className+'"]';*/
        queryStr = tempStr + ' ' + queryStr;
        node = node.parentElement;
    }
    return queryStr;
}

// listen for key presses
var tempFocus = null;
document.addEventListener('keyup', function(e){
    alldone = false;
    let focus = document.activeElement;
    let clone = focus.cloneNode(true);
    clone.setAttribute('bounds', JSON.stringify(focus.getBoundingClientRect()));
    let queryStr = generateQueryStr(focus);
    let thisEvent = {
        target: focus,
        cloned: clone,
        absX: 0,
        absY: 0,
        eventType: 's',
        code: null,
        queryStr: queryStr
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
 * @param {tuple} css Tooltip's CSS (static position)
 * @param {string} desc Tooltip's text description
*/ 
function writeSessionTooltip(num, css, desc, queryStr){
    var obj = {}
    obj[num.toString()] = {
            "url":url,
            "desc":desc,
            "css":css,
            "queryStr":queryStr
        }
    console.log("writing down", obj);
    setVariable(obj);
}

/** 
 * Inject HTML code of a tooltip (new or saved) into the page
 * 
 * @param {number} num Tooltip's number
 * @param {tuple} style Tooltip's CSS and direction
 * @param {string} desc Tooltip's text description
 * @param {string} stepUrl URL associated with the Tooltip (to prevent errors from async functions & delays)
 * @param {string} queryStr selectors for the target element
*/
function injectTooltipHTML(num, style, desc, stepUrl, queryStr){
    let divID = 'HelpCall_'+num;
    var div = document.createElement('div');
    div.style.cssText = style[0];
    div.id = divID;
    div.className = "HelpCallTT";
    if(style[1] == 0){
        div.classList.add('aboveTT')
    } else {
        div.classList.add('belowTT')
    }
    div.setAttribute('data-querystr', queryStr);

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
    // if(stepUrl == window.location.href && document.getElementById(divID) == null) // url-based
    document.body.appendChild(div);

    // add scroller
    let target = visibleDOM(queryStr);
    let scroller = getScrollParent(target);
    if(scroller){
        console.log(scroller);
        scroller.addEventListener("scroll", (e) => {
            console.log("scrolled", e);
            let tt = document.getElementById(divID);
            tt.style.marginLeft = (-1)*e.target.scrollLeft + 'px';
            tt.style.marginTop = (-1)*e.target.scrollTop + 'px';
        });
    }
}

/**
 * Find a visible DOM from the given queryStr
 * @param {string} queryStr 
 */
function visibleDOM(queryStr){
    let targetElm = document.querySelector(queryStr);
    if (targetElm != null && targetElm.offsetParent != null)
        return targetElm
    let oneStepUp = document.querySelector(queryStr.split(' ').slice(0, -1).join(' '))
    if (oneStepUp != null && oneStepUp.offsetParent != null)
        return oneStepUp
    return null
}

function setTooltipsVisibility(hideAll = false){
    var TTs = document.querySelectorAll('div.HelpCallTT');
    TTs.forEach(function(tt){
        if(!hideAll && visibleDOM(tt.getAttribute('data-querystr')) != null){
            // console.log("visible", tt);
            tt.style.display = "inline-block";
        }
        else{
            tt.style.display = "none";
        }
    });
    //updateColorBarTooltips();
}

/** 
 * Populate this page with its Tooltips (both while writing & reading)
*/
async function onPageLoad(){
    console.log("PAGE LOADING");
    var mode = await readSessionStorage('mode');
    if((mode != undefined && mode.startsWith('write')) || mode == 'read'){
        let nextNum = Number(await readSessionStorage('num'));
        cleanSlate();
        for(let i=1; i<nextNum; i++){
            let curStep = await readSessionStorage(i.toString());
            if(equivalentUrl(curStep['url'], window.location.href))
                injectTooltipHTML(i, curStep.css, curStep.desc, curStep['url'], curStep.queryStr);
        }
        addtopbar();
    }
}
window.onload = onPageLoad;

/**
 * Helper function that decides whether two URLs should be considered the same page
 * For example, two google search results should be the same page even if their URLs differ
 * IMPORTANT: has dependent functions in popup.js
 * @param {string} url1 
 * @param {string} url2 
 */
function equivalentUrl(url1, url2){
    return url1.split("?")[0] == url2.split("?")[0]
}

/**
 * Listen to changes in session storage to:
 * 1. Update this page if the mode is changed in the extension's popup
 * 2. Update all tooltips, both in HTML & session storage, after deletion
 */
chrome.storage.onChanged.addListener(async function(changes, _) {
    if('mode' in changes){
        let oldMode = changes['mode']['oldValue'];
        let newMode = changes['mode']['newValue'];
        if(newMode === 'sleep' || (oldMode != 'write-paused' && newMode === 'write')){
            cleanSlate();
        }
        else if(newMode === 'read' || newMode === 'write-paused'){
            // assume the guide is in storage.session
            console.log("reading new guide", newMode)
            await onPageLoad();
        }
        if(newMode != 'sleep')
            addtopbar();
        else
            removetopbar();
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
        updateBarTooltips();    // clean out the bar tooltips and repopulate based on storage
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
    style = nodeToCSS(e.target, e.cloned, e.absX, absY=e.absY);
    console.log(style);
    injectTooltipHTML(num, style, desc, url, e.queryStr);
    addBarTooltip(num);
    writeSessionTooltip(num, style, desc, e.queryStr);
    setVariable({'num':num+1});
    alldone = true;
}

/**
 * 
 * @param {Node} node the target element in the current DOM tree
 * @param {Node} cloned a cloned version of the target element (no position on window, no parent)
 * @param {number} absX x position of the user's action (e.g., click)
 * @param {number} absY y position of the user's action (e.g., click)
 * @returns 
 */
function nodeToCSS(node, cloned=null, absX=0, absY=0){
    var loc = calcTooltipLoc(node, cloned, absX, absY);
    if(scrollWithThis(node))
        var css = 'position:absolute; ';
    else
        var css = 'position:fixed; ';
    css += 'z-index:1000000; left:'+loc.left+'px; top:'+loc.top+'px;'
    return [css, loc.dir];
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
    setTooltipsVisibility();
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
        if(elm.classList.contains("HelpCallTT"))
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
    if(scrollWithThis(elm)){
        y += window.scrollY;
        x += window.scrollX;
        maxX = document.documentElement.scrollWidth;
        maxY = document.documentElement.scrollHeight;
    }

    let dir = 0;
    // if the dimension is unretrievable (e.g., with svg) or the element is too big, use mouse position instead
    if(dimensions.height == 0 && dimensions.width == 0 || 
        y - ttHeight < 0 && y + dimensions.height + ttHeight > maxY
        || elm === document.body){
        y = absY;
        x = Math.max(0, absX - ttOffsetX - ttWidth/2);
    }
    // place below the element
    else if(y - ttHeight < topbarHeightInt){
        y = y + dimensions.height;
        dir = 1;
    }
    // place above the element
    else{
        y = y - ttHeight
    }

    // move right until it doesn't overlap with any tooltip
    while(overlap(x, y)){        
        x += ttWidth/2;
    }
    return { top: y, left: x, dir: dir };

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
 * Find the scrollable parent if exists
 * @param {Node} element 
 * @param {boolean} includeHidden 
 * @returns 
 */
function getScrollParent(element, includeHidden = false) {
    if(!element){
        return null;
    }

    if (getComputedStyle(element).position === "fixed")
        return scrollWithThis(element);
    let scrollParent = null;
    for(var parent = element.parentElement; !scrollParent; parent = parent.parentElement){
        if(!parent)
            return null;
        scrollParent = scrollWithThis(element, parent);
    }
    return scrollParent;
    /*var style = getComputedStyle(element);
    var excludeStaticParent = style.position === "absolute";
    var overflowRegex = includeHidden ? /(auto|scroll|hidden)/ : /(auto|scroll)/;

    
    for (var parent = element; (parent = parent.parentElement);) {
        style = getComputedStyle(parent);
        if (excludeStaticParent && style.position === "static") {
            continue;
        }
        if (overflowRegex.test(style.overflow + style.overflowY + style.overflowX)) return parent;
    }

    return scrollWithThis(element);*/
}

/** 
 * Check if a given element scrolls with the window (position fixed or not)
 * @param {Node} elm element to check
 * @return {boolean}
*/
function scrollWithThis ( elm, parent=document.scrollingElement ) {
    before = elm.getBoundingClientRect();
    parent.scrollBy(1,1);
    after = elm.getBoundingClientRect();
    parent.scrollBy(-1,-1);
    if(before.top != after.top || before.left != after.left)
        return parent;
    return null;
}

/** 
 * Generate a Tooltip's text description
 * 
 * @param {Node} obj parent interactive element
 * @param {Node} e dict recording info about the element that triggered the event
 * @return {string}
*/
function generateDesc(obj, e){
    let desc = 'Click'
    if(e.eventType == 'd')
        desc = 'Double-click'
    else if(e.eventType == 'r')
        desc = 'Right (secondary) click on'
    else if(e.eventType == 'k')
        desc = 'Enter/select with'
    else if(e.eventType == 's'){
        // special case, no target desc (but positioned there)
        return 'Press  '+e.code;    // if e isn't passed we get an error
    }
    let visible_text = ''
    if(e.cloned.innerText != undefined)
        visible_text = e.cloned.innerText.trim();
    else if(obj.elm.innerText != undefined)     // try the parent's text instead
        visible_text = obj.elm.innerText.trim();
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
                return { elm: el, role:'text field'};
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