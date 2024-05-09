// NOTE gotta click on popup to open access to session storage to content script
chrome.storage.session.setAccessLevel({ accessLevel: 'TRUSTED_AND_UNTRUSTED_CONTEXTS' });

/**
 * Handle click events on the main button
 */
function switchState(){
    let bt = document.getElementById("delimiter");
    if(bt.textContent.startsWith("Start")){
        bt.textContent = "Stop recording";
        hideAllDivs();
        chrome.storage.session.set({'mode':'write'});
        chrome.storage.session.set({'num':1});
    }
    else if(bt.textContent.startsWith("Stop")){
        setToPause();
    }
    else if(bt.textContent.startsWith("Resume")){
        bt.textContent = "Stop recording";
        chrome.storage.session.set({'mode':'write'});
        hideAllDivs();
    }
    else if(bt.textContent.startsWith("Close")){
        setToSleep();
    }
}
document.getElementById("delimiter").onclick = switchState;

/**
 * Save steps into local storage when the SAVE STEPS button is clicked on and call setToRead()
 */
async function saveSteps(){
    var temp = {}
    let guidename = document.getElementById("enter-guide-name").value;

    // if the key already exists, add (1), (2), etc.
    for(let i=1; await readLocalStorage(guidename) != undefined; i++){
        guidename += " ("+i+")"
    }

    // copy guide in session into temp and paste into local storage
    let sessionStorage = await chrome.storage.session.get(null);
    delete sessionStorage['mode'];
    temp[guidename] = sessionStorage;
    
    // write guidename back into session storage too
    chrome.storage.session.set({_guidename: guidename});
    
    if("1" in sessionStorage)     // write only if not empty
        chrome.storage.local.set(temp);

    // keep temp in session but set mode to read
    setToRead();
}
document.getElementById("save-button").onclick = saveSteps;

async function saveChanges(){
    let sessionStorage = await chrome.storage.session.get(null);
    if('_guidename' in sessionStorage){
        let temp = {};
        let gname = sessionStorage['_guidename'];
        delete sessionStorage['mode'];
        delete sessionStorage['_guidename'];
        temp[gname] = sessionStorage;
        
        chrome.storage.local.set(temp);

        document.getElementById("update-guide").textContent = 'All Changes Saved!';
        document.getElementById("update-guide").className = "astext";
        await new Promise(resolve => setTimeout(resolve, 5000));
    }
    setToRead();
}
document.getElementById("update-guide").onclick = saveChanges;

/**
 * Set the popup's HTML and session storage's variables when changed to sleep mode
 */
function setToSleep(){
    document.getElementById("delimiter").textContent = "Start recording";
    document.getElementById("update-guide").classList.add("inactive");
    document.getElementById("guide-name").style.display = "none";
    document.getElementById("after-stop").style.display = "none";
    populateGuideList();
    chrome.storage.session.clear();
    chrome.storage.session.set({'mode':'sleep'});
}
document.getElementById("discard-button").onclick = setToSleep;

/**
 * Load the popup's HTML based on the current mode
 */
async function setState(){
    let bt = document.getElementById("delimiter");
    let mode = await readSessionStorage('mode');
    if(mode == "read"){
        setToRead();
    }
    else if(mode == "write-paused"){
        setToPause();
    }
    else if(mode == "write"){
        bt.textContent = "Stop recording";
        hideAllDivs();
    }
    else{
        setToSleep();
    }
    //console.log(await listSavedGuides());
}
document.body.onload = setState;

/**
 * Set the popup's HTML and session storage's variables when changed to read mode
 */
function setToRead(){
    hideAllDivs();
    document.getElementById("delimiter").textContent = "Close the guide";
    chrome.storage.session.set({"mode":"read"});
}

/**
 * Set the popup's HTML and session storage's variables when changed to paused mode
 */
async function setToPause(){
    chrome.storage.session.set({"mode":"write-paused"});
    document.getElementById("recorded-div").style.display = "none";

    let gname = await readSessionStorage('_guidename');
    if(gname){
        document.getElementById("delimiter").textContent = "Close the guide";
        document.getElementById('update-guide').classList.remove("inactive");
    }
    else{
        document.getElementById("delimiter").textContent = "Resume recording";
        document.getElementById("update-guide").classList.add("inactive");
        document.getElementById("guide-name").style.display = "inline-block";
        document.getElementById("after-stop").style.display = "inline-block";
    }
}

/**
 * Get the comparable part of the URL (e.g., before the query)
 * @param {string} url
 */
function shortUrl(url){
    if(url)
        return url.split("?")[0].split("/").slice(0,6).join("/").replace(".ca", ".com")
    return 'URL UNDEFINED'
}

/**
 * Display recorded-div and populate saved-steps with guides in this tab
 */
async function populateGuideList(){
    document.getElementById('saved-steps').innerHTML = "";
    document.getElementById('recorded-div').style.display = "inline-block";
    var thisUrl = ''
    chrome.tabs.query({
        active: true,
        lastFocusedWindow: true
    }, function(tabs) {
        thisUrl = tabs[0].url;
    });

    let foundOne = false;
    let savedGuides = await listSavedGuides();
    console.log(savedGuides);
    for (const [gname, urls] of Object.entries(savedGuides)){
        for(var i=0; i<urls.length; i++){
            if(shortUrl(thisUrl) == shortUrl(urls[i])){
                addGuideToList(gname);
                foundOne = true;
                break;
            }
        }
    }
    if(foundOne)
        document.getElementById("guide-heading").textContent = "This page's guides:"
    else{
        try{
            document.getElementById("guide-heading").textContent = "No guides recorded in "+shortUrl(thisUrl)+" yet."
        }
        catch(e){
            document.getElementById("guide-heading").textContent = "No guides recorded in this page yet."
        }
    }
}

/**
 * Helper function to inject HTML of a guide into the list of guides
 * @param {string} guideName needed to set each guide's event listener
 */
function addGuideToList(guideName){
    // inject html <li> into ul saved-steps
    let div = document.createElement('div')
    div.className = "guide-options";
    let itemID = "details-"+guideName;

    let openButton = document.createElement('button')
    openButton.className = "inline-option";
    openButton.setAttribute("name", "open");
    openButton.textContent = "Open guide";
    openButton.addEventListener('mousedown', async function(e){
        e.preventDefault();
        let temp = await readLocalStorage(guideName)
        console.log("Retrieved guide", temp);
        temp['_guidename'] = guideName;
        chrome.storage.session.set(temp);
        setToRead();
    });
    div.appendChild(openButton);

    let deleteButton = document.createElement('button')
    deleteButton.className = "inline-option";
    deleteButton.setAttribute("name", "delete");
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener('mousedown', function(e){
        e.preventDefault();
        chrome.storage.local.remove(guideName);
        populateGuideList();
        //document.getElementById('saved-steps').removeChild(document.getElementById(itemID));
    });
    div.appendChild(deleteButton);

    let item = document.createElement('details')
    item.id = itemID;
    let summary = document.createElement('summary')
    summary.innerHTML = guideName;
    item.appendChild(summary);
    item.appendChild(div);
    document.getElementById('saved-steps').appendChild(item);
}

/**
 * Retrieve all saved guides in local storage
 * @returns An object of all guides in the form of { guideName : firstStepUrl, ... }
 */
async function listSavedGuides(){
    let storage = await chrome.storage.local.get(null);
    let keys = Object.keys(storage);
    let temp = {}
    keys.forEach(function(key){
        Object.keys(storage[key]).forEach(function(stepNum){
            if(key in temp){
                temp[key].push(storage[key][stepNum]["url"]);
            }
            else
                temp[key] = [ storage[key][stepNum]["url"] ]
        });
        /*try {
            temp[key] = storage[key]["1"]["url"]
        }
        catch(e){
            console.log("WARNING: First step's URL not found")
            temp[key] = ''
        }*/
    });
    return temp;
}

/**
 * Helper function to hide everything except the main button
 */
function hideAllDivs(){
    document.getElementById('recorded-div').style.display = "none";
    document.getElementById("guide-name").style.display = "none";
    document.getElementById("after-stop").style.display = "none";
    document.getElementById("update-guide").classList.add("inactive");
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