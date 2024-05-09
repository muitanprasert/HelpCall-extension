// switch page on gray tooltip's clicks
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse){
    chrome.tabs.query({}, function(tabs){
        var found = false;
        for(const i in tabs){
            if(tabs[i]['url'] == message['url']){
                found = true;
                chrome.tabs.update(tabs[i].id, {selected: true});
            }
        };
        if(!found){
            chrome.tabs.create({ url: message['url'] });
        }
    });
    return true;
});