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
        bt.textContent = "Resume recording";
        document.getElementById("guide-name").style.display = "inline-block";
        document.getElementById("after-stop").style.display = "inline-block";
    }
    else if(bt.textContent.startsWith("Resume")){
        bt.textContent = "Stop recording";
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
    
    if("1" in sessionStorage)     // write only if not empty
        chrome.storage.local.set(temp);

    // keep temp in session but set mode to read
    setToRead();
}
document.getElementById("save-button").onclick = saveSteps;

/**
 * Set the popup's HTML and session storage's variables when changed to sleep mode
 */
function setToSleep(){
    document.getElementById("delimiter").textContent = "Start recording";
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
    document.getElementById("delimiter").textContent = "Close the guide"
    chrome.storage.session.set({"mode":"read"});
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
    for (const [gname, url] of Object.entries(savedGuides)){
        if(thisUrl == url){
            addGuideToList(gname);
            foundOne = true;
        }
    }
    if(foundOne)
        document.getElementById("guide-heading").textContent = "This page's guides:"
    else{
        try{
            document.getElementById("guide-heading").textContent = "No guides recorded in "+thisUrl.split("://")[1]+" yet."
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
        document.getElementById('saved-steps').removeChild(document.getElementById(itemID));
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
        try {
            temp[key] = storage[key]["1"]["url"]
        }
        catch(e){
            console.log("WARNING: First step's URL not found")
            temp[key] = ''
        }
    });
    console.log(temp);
    return temp;
}

/**
 * Helper function to hide everything except the main button
 */
function hideAllDivs(){
    document.getElementById('recorded-div').style.display = "none";
    document.getElementById("guide-name").style.display = "none";
    document.getElementById("after-stop").style.display = "none";
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