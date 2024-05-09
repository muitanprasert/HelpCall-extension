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
    'textarea':{ name: 'textbox' }
} 
//const interactive_roles = ['button', 'checkbox', 'link', 'progressbar', 'searchbox', 'scrollbar', 'slider', 'spinbutton', 'switch', 'textbox', 'tooltip','combobox', 'grid', 'listbox', 'menu', 'menuitem', 'menubar', 'radiogroup', 'tablist', 'tree', 'treeitem', 'treegrid'];
const includedAttr = ['role', 'aria-label', 'name', 'type'] //,'id']

// constants
const ttHeight = 50;
const ttWidth = 36;

// global variables
var url = window.location.href;
var new_event = false;  // kept in case we wanna bring mutation observer back
var alldone = true;
var mode = "sleep";
var hideAll = false;
var holdingCtrl = false;

// ======= OVERVIEW BAR =======
// Modified from https://github.com/stefanvd/Browser-Extensions/blob/master/Proper-Menubar/Proper-Menubar-Edge-extension/js/content.js
var taskchangepositiontop = false;

var skipPositionedChild = function( node ) {
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
        // make sure parent is shifted too
        shiftForTopbar(parent);

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
let topbarHeight = '40px';
let topbarHeightInt = parseInt(topbarHeight, 10);
function addtopbar(){
    // create topbar or update bar if it already exists
    var topbar = document.getElementById('HelpCall-topbar-div');
    if(topbar){
        updateBarTooltips();
    }
    else{
        var Children = document.body.getElementsByTagName("*");
        for (var i = 0, len = Children.length; i < len; i++) {
            shiftForTopbar(Children[i]);
        }
        if(!document.getElementById('HelpCall-topbar-block')){
            var divblock = createDOMElement("div", "", {"id":"HelpCall-topbar-block"});
            document.body.prepend(divblock);
            if(getComputedStyle(document.querySelector('#HelpCall-topbar-block')).height == 0){
                document.querySelector('#HelpCall-topbar-block').style.paddingTop = topbarHeight;
            }
        }

        // Add content to the bar
        var frame = createDOMElement("div", "", {'id':"HelpCall-topbar-div"});
        frame.appendChild(createDOMElement("img", "", {"style":"height:25px; width:25px; padding:0 5px 0 0; float:left;", "src":"https://i.ibb.co/Sdt9nTc/favicon.png"}));
        frame.appendChild(createDOMElement("span", "Recording guide tooltips: ", {"id":"HelpCall-topbar-div-guidename"})); // TODO change this text according to the guide name when reading

        let div = createDOMElement("div", "", {"id":"HelpCall-listOfTT"});
        frame.appendChild(div);

        var toggle = createDOMElement("div", "", {"id":"HelpCall-toggleTT"});
        toggle.appendChild(createDOMElement("span", "Show tooltips on this page"));
        var toggleLabel = createDOMElement("label", "", {"class":"switch"});
        var toggleInput = createDOMElement("input", "", {"type":"checkbox"});
        toggleInput.checked = true;
        toggleInput.addEventListener('change', function() {
            hideAll = !this.checked;
            setTooltipsVisibility();
          });
        toggleLabel.appendChild(toggleInput);
        toggleLabel.appendChild(createDOMElement("span", "", {"class":"slider"}));
        toggle.appendChild(toggleLabel);
        
        frame.appendChild(toggle);
        document.documentElement.appendChild(frame);

        window.setTimeout(function(){
            updateBarTooltips();
        }, 500);
    }
}

function shiftForTopbar(elm){
    if(elm.getAttribute("data-helpcalltopbar")) { return; }
    if(elm.currentStyle){
        var x = elm.currentStyle["position"];
        var w = elm.currentStyle["margin-top"];
        var v = elm.currentStyle["margin-bottom"];
        var y = elm.currentStyle["top"];
        var z = elm.currentStyle["bottom"];
        var q = elm.currentStyle["height"];
    }
    else if(window.getComputedStyle){
        var st = document.defaultView.getComputedStyle(elm, null);
        var x = st.getPropertyValue("position");
        var w = st.getPropertyValue("margin-top");
        var v = st.getPropertyValue("margin-bottom");
        var y = st.getPropertyValue("top");
        var z = st.getPropertyValue("bottom");
        var q = st.getPropertyValue("height");
    }
    
    const exemptSites = ["mail.google"];

    // TOFIX: not sure why VPL stopped working, temporary solution
    if(elm.className == "dialog-off-canvas-main-canvas"){
        elm.setAttribute("data-helpcalltopbar",true);
        elm.setAttribute("data-spmtop",0);
        elm.style.marginTop = topbarHeightInt + "px";
    }

    else if((x == "absolute" || x == "fixed") && y !== 'auto'){
        // exempt some sites that we know force-changing position will break
        let exempt = false;
        exemptSites.forEach(site => {
            if(window.location.href.includes(site))
                exempt = true;
        });

        if(exempt || inTooltip(elm))
            taskchangepositiontop = false;
        else if (x === 'absolute' && skipPositionedChild(elm) ) {
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
            elm.setAttribute("data-helpcalltopbar",true);
            if(w != ""){
                elm.setAttribute("data-spmtop",w);
                elm.style.marginTop = parseInt(w, 10) + topbarHeightInt + "px";
            }else if(v != ""){
                elm.setAttribute("data-spmbottom",w);
                elm.style.marginBottom = parseInt(w, 10) + topbarHeightInt + "px";
            }

            // if "top" and "bottom" is 0 => then calc height
            if((q != "0px") && (y=="0px" && z=="0px")){
                elm.setAttribute("data-spmheight",q);
                elm.style.height = "calc( " + q + " - " + topbarHeight + ")";
            }
        }
    }

    // other exceptions: don't forget to revert in removetopbar too
    if(elm.tagName == 'YTD-VIDEO-PREVIEW'){
        elm.style.marginTop = "-"+topbarHeight;
    }
    else if(elm.tagName == 'YTD-PLAYLIST-HEADER-RENDERER')
        elm.style.marginTop = "0";
    else if(elm.id == 'header' && elm.className == "style-scope ytd-rich-grid-renderer"){
        elm.style.marginTop = "-"+topbarHeight;
        elm.style.marginBottom = topbarHeight;
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
			//var a = document.body.getElementsByTagName("*");
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
					a[i].removeAttribute("data-helpcalltopbar");
			}

	}

    var checkc = document.getElementById('HelpCall-topbar-block');
	if(checkc){
        console.log("removing topbar");
		document.body.removeChild(checkc);
	}

    // exceptions
    if(window.location.href.includes("youtube")){
        try{
            document.querySelector('ytd-video-preview').style.marginTop = 0;
            document.querySelector('div#header.ytd-rich-grid-renderer').style.marginTop = 0;
            document.querySelector('div#header.ytd-rich-grid-renderer').style.marginBottom = 0;
        }
        catch(e){ /* Do nothing */ }
    }
}

/**
 * Populate the HelpCall-listOfTT div, assuming it has been created
 * Pretty expensive, should be used only for creation and tooltip deletion
 */
var updatingBarTooltips = false;
async function updateBarTooltips(){
    if(updatingBarTooltips){ return; }
    updatingBarTooltips = true;
    updateTopbarGuidename();

    let div = document.getElementById("HelpCall-listOfTT");
    if(!div) return null;
    div.replaceChildren();
    let nextNum = Number(await readSessionStorage('num'));
    console.log("# tooltips when updating bar ", nextNum-1);
    for(let i=1; i<nextNum; i++){
        await addBarTooltip(i);
    }

    // sort by id
    if(div){
        [].map.call( div.children, Object ).sort( function ( a, b ) {
            return +a.id.match( /\d+/ ) - +b.id.match( /\d+/ );
        }).forEach( function ( elem ) {
            div.appendChild( elem );
        });
    }

    updatingBarTooltips = false;
    return div;
}

const grayedColor = "#99929B";
const defaultColor = "#61187c";

async function addBarTooltip(i, stepUrl = ""){
    let div = document.getElementById("HelpCall-listOfTT");
    if(div == null) return;

    var divBar = document.createElement('div')
    divBar.className = "HelpCall HelpCall-barTT aboveTT";
    divBar.id = 'HelpCall-bar_'+i;
    let color = "#61187c";
    if(document.getElementById('HelpCall_'+i) == null || document.getElementById('HelpCall_'+i).style.display == "none"){
        color = grayedColor;
        //divBar.style.cursor = "default";
    }
    divBar.style.cursor = "pointer";    // always grabbable for deletion
    divBar.innerHTML = '<svg class="closedTT-shape" width="25px" \
        viewbox="0 0 30 42"> \
        <path stroke="#fffae7" fill="'+color+'" stroke-width="2" \
        d="M15 3 \
            Q16.5 6.8 25 18 \
            A12.8 12.8 0 1 1 5 18 \
            Q13.5 6.8 15 3z" /> \
    </svg> \
    <p class="closedTT-text">'+i+'</p>';

    if(stepUrl == ""){
        let obj = await readSessionStorage(i.toString());
        if(!obj)
            console.log("WARNING: failed to read tooltip", i);
        else
            stepUrl = obj['url'];
    }

    createContextMenu(divBar, false);
    divBar.addEventListener("mousedown", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if(e.button == 0 && !contextMenuOn){
            if(document.querySelector('#HelpCall-bar_'+i+' path').getAttribute('fill') == defaultColor){ // scroll when purple
                let TT = document.getElementById('HelpCall_'+i);
                let elm = queryStrToDOM(TT.getAttribute("data-querystr"));
                let ttPos = TT.getBoundingClientRect().top;
                let parent = getScrollParent(elm);
                let parentPos = parent.getBoundingClientRect().top;
                parent.scrollTo({'top': ttPos - parentPos - 150, 'behavior': 'smooth'});
            
                //document.getElementById('HelpCall_'+i).scrollIntoView({ behavior: "smooth", block: "center" });*/
            }
            /*else {
                chrome.runtime.sendMessage(message={ url : stepUrl }, function(response){   // open new page
                    console.log(response);
                });
            }*/
        }
        else if(e.button == 2){ //} && mode.startsWith('write')){ // uncomment to edit only in write mode
            // if another context menu is on, hide it first
            if(contextMenuOn){
                contextMenuOn.style.display = "none";
            }

            // display this context menu
            let contextmenu = e.target.closest('.HelpCall-barTT').querySelector('.HelpCall-context-menu');
            contextmenu.style.display = "block";
            contextMenuOn = contextmenu;
        }
    });

    if(document.getElementById('HelpCall-bar_'+i) == null){
        // failsafe: if it gets called when that tooltip is already there, just don't add it.
        div.appendChild(divBar);
    }
}
async function updateColorBarTooltips(){
    let nextNum = Number(await readSessionStorage('num'));
    for(let i=1; i<nextNum; i++){
        let thisTT = document.getElementById('HelpCall-bar_'+i);
            if(thisTT){
            if(document.getElementById('HelpCall_'+i) == null || document.getElementById('HelpCall_'+i).style.display == "none"){
                thisTT.querySelector('path').setAttribute('fill', grayedColor);
                thisTT.style.cursor = "default";
            }
            else{
                thisTT.querySelector('path').setAttribute('fill', defaultColor);
                thisTT.style.cursor = "pointer";
            }
        }
    }
}
/**
 * Update guidename in the topbar when reading
 */
async function updateTopbarGuidename(){
    var span = document.getElementById('HelpCall-topbar-div-guidename')
    if(span){
        let gname = await readSessionStorage('_guidename')
        console.log("guidename:", gname);
        if(gname){
            span.textContent = 'Showing "' + gname + '":'
        }
        else{
            span.textContent = 'Recording guide tooltips: '
        }
    }
}

// ======= TOOLTIP EVENT LISTENERS =======

// listen for clicks
let timer = null;
document.addEventListener('click', function(e) {
    alldone = false;
    var thisEvent = recordEvent(e);
    let focus = thisEvent.target;

    // exception: forced modal to stay on in gmail
    let gmail_modal = document.querySelectorAll('div.ZF-Av');
    if(window.location.href.includes("mail.google") && gmail_modal.length > 0){
        if((thisEvent.absY > 460 || thisEvent.absX < 250) && focus.innerText != "Create filter"){
            gmail_modal.forEach(modal => modal.remove());
        }
        else if(focus.innerText != "Search" && focus.innerText != "Create filter"){
            gmail_modal[gmail_modal.length-1].style.visibility = "visible";
            gmail_modal[gmail_modal.length-1].style.display = "initial";
            console.log("forced modal to stay on");
        }
    }

    if(contextMenuOn){              // hide context menu if click outside & don't record it
        if(!e.target.className.includes("HelpCall-context")){
            e.stopPropagation();
            contextMenuOn.style.display = "none";
            contextMenuOn = null;
        }
        alldone = true;
    }
    else if((document.getElementById('HelpCall-topbar-div') && e.clientY < topbarHeightInt)     // ignore if click in tooltip
            || inTooltip(focus) != null || focus.tagName == "BODY"
            || editingTextDesc){
        e.stopPropagation();
        alldone = true;
    }
    else if(!ignoreMove(tempFocus, focus)){    // ignore if it's on the same target as last event
        if (timer) {
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
            }, 300);
        }
        tempFocus = focus;
    }
    else{
        alldone = true;
    }
    // wait until nothing is getting written, then update location
    if(document.getElementById('HelpCall-topbar-div')){
        window.setTimeout(function(){
            console.log("relocing...");
            setTooltipsVisibility(reLoc = true);
        }, 500);
    }
}, true);

function ignoreMove(prevFocus, focus){
    if(prevFocus == focus)
        return true;
    if(window.location.href.includes("twitter") && focus && prevFocus && ((focus.contains(prevFocus) || prevFocus.contains(focus)
        || (prevFocus.className == focus.className && prevFocus.name == focus.name && prevFocus.getAttribute("data-testid") == focus.getAttribute("data-testid")))
    ))
        return true;
    if(window.location.href.includes("expedia") && prevFocus
        && ( prevFocus.getAttribute("aria-label") == "Going to"
        || prevFocus.getAttribute("aria-label") == "Leaving from")){
            tempFocus = focus;
            return true;
    }
    return false;
}

document.addEventListener('contextmenu', function(e) {
    alldone = false;
    var thisEvent = recordEvent(e);
    if(inTooltip(e.target) == null){
        new_event = true;
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
    let targetElm = e.target;

    // exception: checkbox days in whenisgood
    if(window.location.href.includes("whenisgood") && targetElm && targetElm.type == "checkbox" && targetElm.name.includes('showDay')){
        targetElm = targetElm.parentElement.parentElement;
        console.log("bumping up to", targetElm);
    }

    // if checkbox, try to replace with its label (since checkboxes are hard to distinguish)
    if(targetElm.type == "checkbox"){
        let itsLabel = targetElm.parentElement.querySelector("label");
        if(itsLabel)
            targetElm = itsLabel;
    }

    let queryStr = generateQueryStr(targetElm);
    //console.log(queryStr);
    //console.log(document.querySelector(queryStr));

    let clone = targetElm.cloneNode(true);
    clone.setAttribute('bounds', JSON.stringify(targetElm.getBoundingClientRect()));
    e = e || window.event;
    let thisEvent = {
        target: targetElm,
        cloned: clone,
        absX: e.pageX,
        absY: e.pageY,
        eventType: 'c',    // default to c = click
        code: null,
        queryStr: queryStr,
        url: window.location.href
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
    if(parent && parent.tagName != "BODY")
        node = parent;
    let queryStr = " || ";
    let attrs = includedAttr;

    // start with textContent if the node has it
    if(node.textContent != '' && node.textContent.length < 50){
        queryStr = " || " + node.textContent;
    }

    // exception cases
    else if(window.location.href.includes("whenisgood") && node.tagName=='IMG' && node.hasAttribute('onclick')){
        if(node.getAttribute("onclick").includes("startDate"))
            queryStr = " || " + "$DATE:startDate";
        else if(node.getAttribute("onclick").includes("endDate"))
            queryStr = " || " + "$DATE:endDate";
    }
    else if(window.location.href.includes("mail.google"))

    if(window.location.href.includes("expedia")){
        attrs.pop("aria-label");
        attrs.push("data-stid");
    }
    else if(window.location.href.includes("whenisgood")){
        attrs.push("class");
    }

    // append the selector
    while(node.parentElement != null){
        let tempStr = node.nodeName.toLowerCase();
        attrs.forEach(attr =>{
            if(node.hasAttribute(attr) && typeof node.getAttribute(attr) == "string")
                tempStr += '['+attr+'="'+node.getAttribute(attr)+'"]';
        });
        
        queryStr = tempStr + ' ' + queryStr;
        node = node.parentElement;
    }
    //console.log(queryStr);
    return queryStr;
}

// listen for key presses
var tempFocus = null;
document.addEventListener('keyup', function(e){
    if(editingTextDesc) { return; }
    if(e.key == "Control"){
        holdingCtrl = false;
        return;     // don't record empty ctrl (without another key press)
    }

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
        queryStr: queryStr,
        url: window.location.href
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
        thisEvent['absX'] = 1;    // place in the center, bottom of page
        thisEvent['absY'] = window.innerHeight - 100;
        create_tooltip(thisEvent);
        return;
    }
    // for normal key presses, create only 1 tt until keypress at another focus
    else if(!ignoreMove(tempFocus, focus)){
        thisEvent.eventType = 'k';
        create_tooltip(thisEvent);
        tempFocus = focus;
    }
});
document.addEventListener('keydown', function(e){
    if(e.ctrlKey) holdingCtrl = true;
});

window.addEventListener('beforeunload', function(e){
    if(mode && mode != "sleep" && !alldone){
        let delay = 2000;
        var start = Date.now();
        while (Date.now() - start < delay) {
            if(alldone)
                break;
        }
        /*for(var i = 0; i < 2000; i++){
            if(alldone){
                break;
            }
            console.log(i);     // a hack to delay it bc Promise, setTimeout don't work in beforeunload
        }*/
    }
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
 * Add context menu (hidden by default) to tt
 * @param {*} tt 
 */
function createContextMenu(tt, mainTT = true){
    var div = createDOMElement("div", "", {"class":"HelpCall HelpCall-context-menu"});
    var div1 = createDOMElement("div", "Delete this tooltip", {"class":"HelpCall-context-item"});
    div1.addEventListener("click", (e) => {
        let num = e.target.parentElement.parentElement.id.split("_")[1];
        
        /*// delete bar tooltip
        let barTT = document.getElementById("HelpCall-bar_"+num);
        barTT.parentElement.removeChild(barTT);

        // delete main tooltip*/
        alldone = false;
        if(document.getElementById("HelpCall_"+num))
            document.body.removeChild(document.getElementById("HelpCall_"+num));
        chrome.storage.session.remove(num);
        contextMenuOn.style.display = "none";
        contextMenuOn = null;
    })
    div.appendChild(div1);
    if(mainTT){
        var div2 = createDOMElement("div", "Edit this tooltip's text", {"class":"HelpCall-context-item"});
        div2.addEventListener("click", (e) => {
            let num = e.target.parentElement.parentElement.id.split("_")[1];
            let textDesc = document.querySelector('#HelpCall-ttB_'+num+' span');
            textDesc.contentEditable = true;
            textDesc.focus();
            editingTextDesc = true;

            // open tooltip
            openTooltipTxt(num);

            // hide context menu
            contextMenuOn.style.display = "none";
            contextMenuOn = null;
        })
        div.appendChild(div2);
    }
    tt.appendChild(div);
}

/**
 * Open tooltip by number and close the rest
 */
function openTooltipTxt(num){
    document.getElementById('HelpCall_'+num).style.zIndex = "1000000";
    document.querySelectorAll('div.HelpCall.openTT').forEach(txt => txt.style.display = "none"); // close all
    document.getElementById('HelpCall-ttB_'+num).style.display = 'block';   // open one
}

var editingTextDesc = false;
var contextMenuOn = null;
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
    div.id = divID;
    div.className = "HelpCallTT";
    setStyle(div, style);
    console.log(num, desc, stepUrl, queryStr);
    div.setAttribute('data-querystr', queryStr);

    // add inner elements & event listener
    var divClosed = document.createElement('div')
    divClosed.id = 'HelpCall-ttA_'+num
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
    divClosed.addEventListener('mouseup', function(e){
        e.preventDefault();
        e.stopPropagation();
        let n = this.innerText;
        if(e.button == 0){  // open text, copied to createContextMenu
            openTooltipTxt(n);
        }
    });
    div.appendChild(divClosed);
    
    var divOpen = document.createElement('div')
    divOpen.className = 'HelpCall openTT'
    divOpen.id = 'HelpCall-ttB_'+num
    let textDesc = document.createElement("span")
    textDesc.innerHTML = desc;
    divOpen.appendChild(textDesc);
    divOpen.addEventListener('mouseup', function(e){
        e.preventDefault();
        e.stopPropagation();
        let n = this.id.split("_")[1];
        let textDesc = document.querySelector('#HelpCall-ttB_'+n+' span');
        if(!textDesc.isContentEditable && e.button == 0){
            if(holdingCtrl && mode.startsWith('write')){    // ctrl + click to enter edit mode (click again to edit)
                textDesc.contentEditable = true;
                editingTextDesc = true;
            }
            else{                                           // normal click to close the description
                document.getElementById('HelpCall_'+n).style.zIndex = "999999";
                this.style.display = 'none';
            }
            
        }
    });

    // update in session storage
    const updateText = async (num, text) => {
        let storedStep = await readSessionStorage(num);
        if(storedStep != undefined){
            storedStep["desc"] = text
            let temp = {}
            temp[num] = storedStep
            console.log("updating tooltip", temp);
            setVariable(temp);
        }
        window.setTimeout(function(){
            editingTextDesc = false;
        }, 500);
    }
    // exit edit mode when lost focus
    textDesc.addEventListener('blur', function(){
        let target = this;
        window.setTimeout(async function(){
            target.contentEditable = false;
            updateText(target.parentElement.id.split("_")[1], target.innerHTML);
        }, 200);
    });
    textDesc.addEventListener('keydown', function(e){
        e.stopPropagation();
        if (e.key === "Enter" && e.shiftKey === false){
            this.contentEditable = false;
            updateText(this.parentElement.id.split("_")[1], this.innerHTML);
        }
    });

    // event listener for contextmenu
    createContextMenu(div);
    div.addEventListener('mousedown', function(e){
        if(e.button == 2 && mode.startsWith('write')){

            // if another context menu is on, hide it first
            if(contextMenuOn){
                contextMenuOn.style.display = "none";
            }

            // display this context menu
            let contextmenu = this.querySelector('.HelpCall-context-menu')
            contextmenu.style.display = "block";
            contextMenuOn = contextmenu;
        }
    });
    div.appendChild(divOpen);

    // set visibility
    if(hideAll){
        div.style.display = "none";
    }

    // check right before actually injecting if it should still be injected
    if(equivalentUrl(stepUrl, window.location.href) && document.getElementById(divID) == null)
        document.body.appendChild(div);

    // add scroller
    addScroller(div);
}

/**
 * Find parent scroller element of a tooltip and add scroll event handler to it
 * @param {} div 
 */
function addScroller(div){
    if(div.getAttribute("data-hasScroller") == 'true')  return;

    let target = queryStrToDOM(div.getAttribute("data-querystr"));
    let scroller = getScrollParent(target);
    try{
        scroller.addEventListener("scroll", (e) => {
            let tt = document.getElementById(div.id);
            if(tt){
                tt.style.marginLeft = (-1)*e.target.scrollLeft + 'px';
                tt.style.marginTop = (-1)*e.target.scrollTop + 'px';
            }
        });
        div.setAttribute("data-hasScroller", 'true');
        console.log("added scroller to", div.id, scroller);
    }
    catch(e){
        div.setAttribute("data-hasScroller", 'false');
    }
}

/**
 * Set css and tooltip orientation to the given div
 */
function setStyle(div, style){
    div.style.cssText = style[0];
    div.classList.remove('aboveTT')
    div.classList.remove('belowTT')
    div.classList.remove('rightTT')
    if(style[1] == 0){
        div.classList.add('aboveTT')
    } else if(style[1] == 1){
        div.classList.add('belowTT')
    } else{
        div.classList.add('rightTT')
    }
}

/**
 * Find a visible DOM from the given queryStr
 * @param {string} queryStr 
 */
function queryStrToDOM(queryStr){
    let queryResults = queryStr.split(" || ");
    queryResults[0] = queryResults[0].trim();
    let targetElm = document.querySelector(queryResults[0]);    // default to the first one it can find
    if(queryResults.length > 1){                                // just to prevent error
        queryResults[1] = queryResults[1].trim();

        // exception: textContent of option (gmail)
        if(window.location.href.includes("mail.google") && queryResults[1].includes("... ")){
            try{
                queryResults[1] = queryResults[1].split(": ")[1].split("... ")[0]+"...";
            }
            catch(e){
                queryResults[1] = queryResults[1].split("... ")[0]+"..."
            }
        }

        let selectAll = document.querySelectorAll(queryResults[0]);
        if(selectAll.length > 0){                               // try to match with post-|| text only if there are more than 0 options
            // exception case: whenisgood calendar
            if(queryResults[1].startsWith("$DATE:")){
                let inclTerm = queryResults[1].split(":")[1];
                selectAll.forEach(elm => {
                    if(elm.getAttribute("onclick").includes(inclTerm)){
                        targetElm = elm;
                    }
                });
            }
            // exception case: twitter's 2nd tweet
            else if(window.location.href.includes("twitter.com/compose/tweet") && queryStr.includes("Tweet text") && selectAll.length == 2){
                targetElm = selectAll[1];
            }
            // normal case: match with text
            else{
                let filterRes = Array.from(selectAll).filter(el => el.textContent.trim() === queryResults[1])
                if(filterRes.length > 0)
                    targetElm = filterRes[0];
                else if(window.location.href.includes("mail.google"))
                    targetElm = null;
            }
        }

        // exception case
        if(window.location.href.includes("expedia") 
            && selectAll.length == 0
            && queryResults[1].length > 3){   // relax to include 4+letter text & remove aria-label if cannot find
                selectAll = document.querySelectorAll(queryResults[0].replace(/aria-label="[^=]*"/g, "").replace("[]",""));
                filterRes = Array.from(selectAll).filter(el => el.textContent.includes(queryResults[1]));
                if(filterRes.length == 1)
                    targetElm = filterRes[0];
        }
        if(window.location.href.includes("whenisgood") && targetElm && Number(queryResults[1])){
            targetElm = targetElm.parentElement.parentElement;
        }
    }
    const noOffsetParent = ["svg", "g", "path", "BODY"];
    if (targetElm && (targetElm.offsetParent || noOffsetParent.includes(targetElm.tagName)))
        return targetElm
    
    /*let oneStepUp = queryResults[0].split(' ').slice(0, -1).join(' '))
    if (oneStepUp.length == 1 && oneStepUp[0] != null && oneStepUp[0].offsetParent != null)
        return oneStepUp[0]*/
    return null;
}

function setTooltipsVisibility(reLoc = false){
    if(editingTextDesc)
        return;
    //console.log("refreshing visibility");
    var TTs = document.querySelectorAll('div.HelpCallTT');
    TTs.forEach(function(tt){
        let elm = queryStrToDOM(tt.getAttribute('data-querystr'));
        if(!hideAll && elm && isVisible(elm)){
            // calculate dynamic location
            if(reLoc && relocable(elm) && alldone){      
                elm.setAttribute('bounds', JSON.stringify(elm.getBoundingClientRect()));
                let calcStyle = nodeToCSS(elm, elm, null, null, tt.id);
                console.log("reLoc", tt.id) //, "from", tt.style.left, tt.style.top, "to", calcStyle);
                if(calcStyle){
                    setStyle(tt, calcStyle);
                }
            }
            // if it's about to turn purple, attempt to add scroller
            if(tt.style.display == "none")
                addScroller(tt);

            // set visible
            tt.style.display = "inline-block";
        }
        else{
            tt.style.display = "none";
        }
    });
    updateColorBarTooltips();

    if(reLoc && window.location.href.includes("Flights-Search")){
        let sidePanel = document.querySelector('.uitk-side-sheet.uitk-side-sheet-position-trailing.uitk-sheet')
        if(sidePanel)
            sidePanel.style.paddingTop = topbarHeight;
    }
}

/**
 * Check whether this tooltip is relocable (against exception cases)
 * @param {} elm 
 */
function relocable(elm){
    if(window.location.href.includes("calendar.google.com/calendar/u/0/r/settings/createcalendar")
        && elm.tagName != "LI") //&& elm.innerText != 'Add people and groups' && elm.innerText != 'Create new calendar' )
        return false;
    if(window.location.href.includes("calendar.google") && elm.innerText == "Share with specific people or groups")
        return false;
    if(window.location.href.includes("youtube") && elm.innerText == "Library")
        return false;
    if(window.location.href.includes("mail.google") && elm.tagName == "INPUT")
        return false;
    return true;
}

/**
 * Check whether an element is visible (up to 4 levels of parent).
 * @param {*} element 
 * @returns 
 */
function isVisible(element) {
    // special cases
    if(window.location.href.includes("/u/0/r/settings/calendar/") 
        && element.textContent == "Add people and groups" 
        && document.querySelector('div.VfPpkd-P5QLlc') != null)
            return false;
    if(window.location.href.includes("calendar.google") && element.innerText == "Create new calendar" 
        && document.querySelector('div[aria-label="Add calendar"').getAttribute("aria-expanded") == 'false')
            return false;
    if(window.location.href.includes("whenisgood") && element.tagName == "SELECT" && element.name.includes("Time")
        && document.querySelector('table#jacs') && document.querySelector('table#jacs').style.visibility != 'hidden'){
            return false;
    }
    if(window.location.href.includes("expedia") && document.querySelector('.uitk-calendar') && 
        (element.getAttribute("aria-label").includes("Date") ||  element.innerText.includes("Travellers")
        || element.innerText.includes("Going to") || element.innerText == "Search"))
            return false;
    if(window.location.href.includes("mail.google") && 
        (document.querySelector(".ZF-Av") && (element.innerText == "Filters and Blocked Addresses" || element.innerText == "Create a new filter"))
        || (document.querySelector("[role='alertdialog']") && (element.innerText.includes("label")))){
            return false;
    }
    if(window.location.href.includes("youtube") && document.querySelectorAll('tp-yt-iron-dropdown').length > 0
        && Array.from(document.querySelectorAll('tp-yt-iron-dropdown')).pop().style.display == ''
        && (element.innerText.includes("Privacy") || element.innerText == "Create"))
            return false;

    // check visibility up to 4 levels
    let levelsChecked = 0;
    while (element && levelsChecked < 4) {
        const style = window.getComputedStyle(element);
        if (style.display === 'none' || style.visibility === 'hidden') {
            return false;
        }
        
        const rect = element.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) {    // somehow there are cases where one of them is 0 but children are visible
          return false;
        }

        element = element.parentElement;
        levelsChecked++;
    }
    return true;
}

/** 
 * Populate this page with its Tooltips (both while writing & reading)
*/
async function onPageLoad(){
    console.log("PAGE LOADING");
    mode = await readSessionStorage('mode');
    if((mode != undefined && mode.startsWith('write')) || mode == 'read'){
        let nextNum = Number(await readSessionStorage('num'));
        cleanSlate();
        for(let i=1; i<nextNum; i++){
            let curStep = await readSessionStorage(i.toString());
            if(equivalentUrl(curStep['url'], window.location.href)){
                injectTooltipHTML(i, curStep.css, curStep.desc, curStep['url'], curStep.queryStr);
            }
        }
        addtopbar();
        urlObserver.observe(document.body, { childList: true, subtree: true, attributes: true });
        
        // update location (gives up if not alldone after 10 checks)
        for(var i=0; i<10; i++){
            window.setTimeout(function(){
                if(alldone){
                    //console.log("relocing...");
                    setTooltipsVisibility(reLoc = true);
                }
            }, 300);
        }
    }
    else{
        removetopbar();
        urlObserver.disconnect();
    }

    // exception case: wait for search result to load in expedia
    if(window.location.href.includes("Flights-Search")){
        let checker = window.setInterval(function(){
            if(document.querySelector('div div fieldset div h4')){
                setTooltipsVisibility(reLoc = true);
                clearInterval(checker);
            }
        }, 300);
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
    // exception cases
    if(url1.includes("calendar.google.com/calendar/u/0/r/settings/calendar/")
        && url2.includes("calendar.google.com/calendar/u/0/r/settings/calendar/")){  
        return true
    }
    if(url1.includes("mail.google")){
        if((url1.includes("/#settings/") || url1.includes("/#create-filter/")) &&
        (url2.includes("/#settings/") || url2.includes("/#create-filter/")))
            return true
    }
    url1 = url1.replace(".ca", ".com");
    url2 = url2.replace(".ca", ".com");

    return url1.split("?")[0] == url2.split("?")[0]
}

/**
 * Listen to changes in session storage to:
 * 1. Update this page if the mode is changed in the extension's popup
 * 2. Update all tooltips, both in HTML & session storage, after deletion
 */
chrome.storage.onChanged.addListener(onChangedHandler);
async function onChangedHandler(changes, _) {
    if('mode' in changes){
        updatingBarTooltips = false;    // just in case

        let oldMode = changes['mode']['oldValue'];
        let newMode = changes['mode']['newValue'];
        mode = newMode;
        if(newMode === 'sleep' || (oldMode != 'write-paused' && newMode === 'write')){
            cleanSlate();
        }
        else if(newMode === 'read' || newMode === 'write-paused'){
            // assume the guide is in storage.session
            console.log("reading new guide", newMode)
            await onPageLoad();
        }
        if(newMode != 'sleep'){
            addtopbar();
            urlObserver.observe(document.body, { childList: true, subtree: true, attributes: true });
        }
        else{
            removetopbar();
            urlObserver.disconnect();
        }
    }

    // handle tooltip deletion
    else if(!('num' in changes)){
        let ttID = Object.keys(changes)[0]
        if('oldValue' in changes[ttID] && !('newValue' in changes[ttID])){  // tooltip removed
            console.log("DELETING", ttID);
            if(!alldone){
                window.setTimeout(async function(){
                    let nextNum = Number(await readSessionStorage('num'));
                    setVariable({'num':nextNum-1});

                    // update tooltips after it
                    console.log("# tooltips", nextNum-1);
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
                            document.getElementById('HelpCall-ttA_'+i).id = 'HelpCall-ttA_'+prevNum
                            document.getElementById('HelpCall-ttB_'+i).id = 'HelpCall-ttB_'+prevNum
                            div.getElementsByTagName('p')[0].textContent = prevNum;
                            div.id = "HelpCall_"+prevNum;
                            console.log("main tooltip updated", div);
                        }
                        //console.log("UPDATED STEP", prevNum, await readSessionStorage(prevNum.toString()))
                    }
                }, 750);
            }

            // clean out the bar tooltips and repopulate based on storage
            window.setTimeout(function(){
                updateBarTooltips();
                updateColorBarTooltips();
            }, 1000);
            alldone = true;
        }
    }

    // handle changes while in read mode
    if(mode == 'read'){
        setVariable({'mode':'write-paused'});
    }
}

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
    // create a new tooltip only if in writing mode
    if(!new_event || inTooltip(e.target) || !mode || mode != "write"){
        alldone = true;
        return;
    }
    new_event = false;

    var num = await readSessionStorage('num');
    console.log("creating tooltip on ", e.cloned);
    let result = findInteractiveRole(e.target, e.cloned);
    var desc = generateDesc(result, e);
    style = nodeToCSS(e.target, e.cloned, e.absX, e.absY);
    if(!style){     // if unable to calculate css, just don't create
        alldone = true;
        return;
    }
    injectTooltipHTML(num, style, desc, e.url, e.queryStr);
    addBarTooltip(num, e.url);
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
function nodeToCSS(node, cloned=null, absX=null, absY=null, reLoc=null){
    var loc = calcTooltipLoc(node, cloned, absX, absY, reLoc);
    console.log("loc", loc);
    if(!loc)
        return null;
    if(scrollWithThis(node) && node.tagName != "BODY")
        var css = 'position:absolute; ';
    else
        var css = 'position:fixed; ';
    css += 'z-index:999999; left:'+loc.left+'px; top:'+loc.top+'px;'
    return [css, loc.dir];
}

// ======= HELPER FUNCTIONS =======

/**
 * Use MutationObserver to watch for URL change to update all Tooltips
 * Update immediately but wait 1s before updating URL to avoid changing it while a Tooltip is still being written
 */
var futureUrl;
var callback = function(mutations){
    for (const m of mutations) {
        m.addedNodes.forEach(node => {
            while(!node && node.nodeType === Node.ELEMENT_NODE && node.tagName != "BODY"){
                if(getComputedStyle(node).position == "fixed" || getComputedStyle(node).position == "absolute"){
                    break;
                }
                shiftForTopbar(node); // will explicitly make sure positioned parent of these nodes are shifted too
                node = node.parentNode;
            }
        });
    }
    //console.log("observing")
    if(url !== window.location.href && futureUrl !== window.location.href){
        console.log("url changed");
        futureUrl = window.location.href;
        onPageLoad();
        window.setTimeout(function(){
            url = window.location.href;
        }, 1000);
    }
    setTooltipsVisibility();

    // do it again if the first time was done before alldone unlocks
    if(!alldone){
        window.setTimeout(function(){
            setTooltipsVisibility();
        }, 2000);
    }
};
var urlObserver = new MutationObserver(callback);

/** 
 * Find an element's parent Tooltip div if exists
 * 
 * @param {Node} elm element to check
 * @return {Node} Parent Tooltip element or NULL if not found
*/
function inTooltip( elm ) {
    var i = 0;
    while(elm.parentNode && i<5){       // stop before document or 5 levels
        if(elm.classList.contains("HelpCallTT") || elm.classList.contains("HelpCall-barTT"))
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
 * @param {string} reLoc id of tt getting relocated
 * @return {object} An object containing 'top', 'left' and 'dir' values of the Tooltip
*/
function calcTooltipLoc( elm, cloned, absX, absY, reLoc ) {
    const dimCut = 50;  // length/width for which tooltips should be placed outside
    const ttOffsetX = 60;

    dimensions = JSON.parse(cloned.getAttribute('bounds'));
    try{
        var maxX = document.documentElement.scrollWidth;
        var maxY = document.documentElement.scrollHeight;
    } catch(e){
        var maxX = window.innerWidth;
        var maxY = window.innerHeight;
    }
    var baseY = dimensions.top;
    var baseX = dimensions.left;
    
    let scrollParent = getScrollParent(elm);
    if(scrollParent){
        baseY += scrollParent.scrollTop;
        baseX += scrollParent.scrollLeft;
    }

    let dir = 0;
    let x = baseX, y = baseY;
    let fromCursor = false;
    // if the dimension is unretrievable (e.g., with svg) or the element is too big, use mouse position instead
    if(dimensions.height == 0 && dimensions.width == 0 || 
        baseY - ttHeight < 0 && baseY + dimensions.height + ttHeight > maxY
        || elm === document.body){
        if(!absY || !absX)
            return null;
        y = absY;
        x = Math.max(0, absX - ttOffsetX - ttWidth/2);
        fromCursor = true;
    }
    // vertical
    else{
        x = Math.max(0, baseX - ttOffsetX + dimensions.width/2 - ttWidth/2);
        // place below the element
        if(baseY - ttHeight < topbarHeightInt || forceBottomTT(elm)){
            y = baseY + Math.min(dimensions.height, (dimensions.height/2)+dimCut) // 50px below the center
            dir = 1;
        }
        // place above the element
        else{
            y = baseY - ttHeight + Math.max(0, (dimensions.height/2)-dimCut) // 50px above the center
        }
    }

    // move right until it doesn't overlap with any tooltip
    while(overlap(x, y, reLoc)){        
        x += 7;
    }

    // overwrite with horizontal if it fits (bubble width = 140)
    if(allowHorizontal(elm) && !forceBottomTT(elm) && !fromCursor && x + dimensions.width + 150 < maxX){
        let tempy = Math.max(0, baseY + dimensions.height/2 - 30);
        let tempx = baseX + dimensions.width - 35;

        // try only one shift, otherwise just keep it vertical
        if(overlap(tempx,tempy,reLoc,true)){
            tempy += 7;
            if(window.location.href.includes("whenisgood") && elm.tagName == "TD")
                tempy += ttWidth;
        }

        if(!overlap(tempx,tempy,reLoc,true)){
            x = tempx;
            y = tempy;
            dir = 2;

            // exception case
            if(window.location.href.includes("whenisgood") || window.location.href.includes("google")){
                x = tempx - 20;
                y = tempy;
                dir = 2;
            }
        }
    }

    // exception: move left to avoid covering "one-way"
    if(window.location.href.includes("expedia") && elm.getAttribute("data-stid") == "origin_select-menu-trigger" && dir < 2){
        x -= ttWidth*2;
    }
    if(window.location.href.includes("calendar") && elm.textContent.includes("muitanprasert@gmail.com")){
        x += 100;
    }

    return { top: y, left: x, dir: dir };

    // TODO be more strategic with the positioning not to cover anything incl. other tooltips (or add some opacity with hover effects)
    // haven't really accounted for horizontal tts either
}

/**
 * Check exception cases for horizontal tooltips
 */
function allowHorizontal(elm){
    let thisUrl = window.location.href;
    // twitter & expedia
    if(thisUrl.includes("twitter") || thisUrl.includes("expedia")){
        return false;
    }
    // youtube search bar
    if(thisUrl.includes("youtube") && elm.name == "search_query"){
        return false;
    }
    return true;
}

function forceBottomTT(elm){
    let thisUrl = window.location.href;

    // whenisgood
    if(thisUrl.includes("whenisgood") && (elm.tagName=="SELECT" || elm.name=="duration")){
        return true;
    }
    return false;
}

/**
 * Check if the given coordinates overlap with any existing tooltips
 * @param {number} x 
 * @param {number} y 
 * @param {string} reLoc id of tt getting relocated, null if not relocating
 * @param {boolean} horizontal
 */
function overlap(x, y, reLoc, horizontal=false){
    var TTs = document.querySelectorAll('div.HelpCallTT');
    var overlapped = false;
    if(horizontal){
        TTs.forEach(function(tt){
            if(reLoc != tt.id){
                ttBounds = tt.getBoundingClientRect();
                overlapped = overlapped || (Math.abs(x-ttBounds.left) < ttHeight) && (Math.abs(y-(ttBounds.top+window.scrollY)) < ttWidth);
            }
        });
    }
    else{
        TTs.forEach(function(tt){
            if(reLoc != tt.id){
                ttBounds = tt.getBoundingClientRect();
                overlapped = overlapped || (Math.abs(x-ttBounds.left) < ttWidth) && (Math.abs(y-(ttBounds.top+window.scrollY)) < ttHeight);
            }
        });
    }
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
        if(!parent){
            return scrollParent;
        }
        scrollParent = scrollWithThis(element, parent);
    }

    if(scrollParent && scrollParent.getAttribute("aria-hidden")){
        return getScrollParent(scrollParent);
    }
    return scrollParent;
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
    if(before.top != after.top || before.left != after.left){
        return parent;
    }

    before = elm.getBoundingClientRect();
    parent.scrollBy(-1,-1);
    after = elm.getBoundingClientRect();
    parent.scrollBy(1,1);
    if(before.top != after.top || before.left != after.left){
        return parent;
    }

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
    //console.log("Generating desc from", obj, e);
    let desc = 'Click'
    if(e.eventType == 'd')
        desc = 'Double-click'
    else if(e.eventType == 'r')
        desc = 'Right-click on'
    else if(e.eventType == 'k')
        desc = 'Select with'
    else if(e.eventType == 's'){
        // special case, no target desc (but positioned there)
        return 'Press  '+e.code;    // if e isn't passed we get an error
    }
    let visible_text = findTextDescendant(e.cloned);
    if(visible_text  == '')         // try the parent's text instead
        visible_text = findTextDescendant(obj.elm);
    if(visible_text != '' && e.eventType != 'k'){
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
    
    if(desc.includes("text")){
        desc = desc.replace("Select with", "Type into");
        desc = desc.replace("Click", "Click & type into")
    }
    return desc+" ";
}

/**
 * Find the closest descendant with a text content
 * @param {*} node 
 * @returns text value or null if found none or too many
 */
function findTextDescendant(node) {
    if(node == undefined || node.childNodes == undefined || node.childNodes.length == 0){
        return ''
    }

    // iterate over the child nodes of the parent node
    let textNodes = [];
    node.childNodes.forEach(childNode => {
        if (childNode.nodeType === Node.TEXT_NODE && 
            childNode.textContent.trim() !== '' &&
            !childNode.textContent.includes('_')         // most often not meant to be visible
        ){
            textNodes.push(childNode.textContent.trim());
        }
    });

    // recursively search its descendants if not found
    if(textNodes.length == 0){
        node.childNodes.forEach(childNode => {
            let result = findTextDescendant(childNode);
            if(result != '')
                textNodes.push(result)
        });
    }

    if(textNodes.length == 1){   // found an exact hit
        if(textNodes[0].textContent == undefined)
            return textNodes[0];
        else
            return textNodes[0].textContent.trim();
    }
    else                        // found too many on the same level or none at all
        return '';
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
    
    // check by role (explicit)
    includedAttr.forEach(attr => {
        if(el.hasAttribute(attr)){
            return { elm: el, role: el.getAttribute(attr) };
        }
    })
    
    // check by nodeName (implicit)
    nodeName = el.nodeName.toLowerCase();
    if(nodeName in interactive_nodes){
        if ('attr' in interactive_nodes[nodeName]){
            if(!el.hasAttribute(interactive_nodes[nodeName]['attr']))
                return { elm: initEl, role:''};
        }
        if(nodeName == 'input'){
            if(!el.hasAttribute('type') || el['type']=="text")
                return { elm: el, role:'textbox'};
            if(el['type'] == 'hidden')
                return { elm: initEl, role:''};
            return { elm: el, role: el['type'] + ' input field' };
        }
        return { elm: el, role: interactive_nodes[nodeName]['name'] };
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
function sleep(ms) {
    return new Promise(resolve => window.setTimeout(resolve, ms));
}