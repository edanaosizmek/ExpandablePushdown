// Usage:
//	Should be used as a custom script with an expandable ad.
//	The panels should always expand to the south of the banner.
//  * supports clipping
// Params:
//  1. adid - ad id of the ad. adid=[%tp_adid%]
//	2. panels - the panels that will have the pushdown functionality.For exmaple:
// 		panels = panel1|panel2|panel3;
//
//	3. animTime - the total time for the animation in milliseconds. The default value is 300 and 0 for no animation. For example, to make the animation last 1 second:
//		var animTime = 1000;
//	4. easingType - the animation easing type. Accepted values are 1=linear, 2=ease in, 3=ease out, 4=ease in out. Default is 4. For example, to set the easing type to "ease out":
// 		easingType = 3;
//
// The script creates an empty DIV (mmPushDiv) inside the ebBannerDiv (after the flash OBJECT) and uses it to push the page by manipulating its height.
// Using this approch instead of resizing the ebBannerDiv's height because it creates a smoother animation (the browser is slower when resizing a div that has visual contents)

// EB_PushdownExpandable_ALL.js
// OAD_EB_Pushdown_ALL.js
// OAD_EB_PushdownExpandable_ALL.js

var ebScriptFileName = "EB_PushdownExpandable_ALL.js";

var ebScriptQuery = function(scriptPath) {
    this.scriptPath = scriptPath;
};

ebScriptQuery.prototype = {
    get: function() {
        var lastQuery = '';
        var srcRegex = new RegExp(this.scriptPath.replace('.', '\\.') + '(\\?.*)?$','i');
        var scripts = document.getElementsByTagName("script");
        var i;
		for (i = 0; i < scripts.length; i++) {
            var script = scripts[i];
            if (script.src && script.src.match(srcRegex)) {
                var query = script.src.match(/\?([^#]*)(#.*)?/);
                lastQuery = !query ? '': query[1];
            }
        }
        return lastQuery;
    },
    parse: function() {
        var result = {};
        var query = this.get();
        var components = query.split('&');
		var i;
        for (i = 0; i < components.length; i++) {
            var pair = components[i].split('=');
            var name = pair[0],
            value = pair[1];

            if (!result[name]) { result[name] = []; }
            // decode
            if (!value) {
                value = 'true';
            } else {
                try {
                    value = decodeURIComponent(value);
                } catch(e) {
                    value = unescape(value);
                }
            }

            // MacIE way
            var values = result[name];
            values[values.length] = value;
        }
        return result;
    },
    flatten: function() {
        var queries = this.parse();
        var name;
		for (name in queries) {
            queries[name] = queries[name][0];
        }
        return queries;
    },
    toString: function() {
        return 'ebScriptQuery [path=' + this.scriptPath + ']';
    }
};

//verify by Ad ID or Flight ID
try {
    var gEbQueries = new ebScriptQuery(ebScriptFileName).flatten();
	if (gEbQueries.type == 'oob') { // out-of-banner/floating ad
        if (typeof(gEbEyes) != "undefined") {
            // check is the same as the ad is defined in the script
            if (gEbQueries.adid) {
                for (i = gEbEyes.length - 1; i > -1; i--) {
                    if (gEbEyes[i].adData.nAdID == gEbQueries.adid) {
                        gEbEyes[i].adData.customEventHandler = new ebCCustomEventHandlers();
                        break;
                    }
                }
            }
            if (gEbQueries.flightid) {
                for (i = gEbEyes.length - 1; i > -1; i--) {
                    if (gEbEyes[i].adData.nFlightID == gEbQueries.flightid) {
                        gEbEyes[i].adData.customEventHandler = new ebCCustomEventHandlers();
                        break;
                    }
                }
            }
        }
    } else { //rich banner / default
        if (typeof(gEbBanners) != "undefined") {
            if (gEbQueries.adid) {
                for (i = gEbBanners.length - 1; i > -1; i--) {
                    if (gEbBanners[i].adData.nAdID == gEbQueries.adid) {
                        gEbBanners[i].adData.customEventHandler = new ebCCustomEventHandlers();
                        break;
                    }
                }
            }
            if (gEbQueries.flightid) {
                for (i = gEbBanners.length - 1; i > -1; i--) {
                    if (gEbBanners[i].adData.nFlightID == gEbQueries.flightid) {
                        gEbBanners[i].adData.customEventHandler = new ebCCustomEventHandlers();
                        break;
                    }
                }
            }

        }
    }
} catch(e) {}

// class to hold all global variables
function ebCCustomPushdown()
{
	this.adid = gEbQueries.adid;	// ad id
	this.animStartTime;				// animation start timestamp for easing calculations
	this.animInterval;				// animation interval id
	this.bannerHeight;				// banner height
	this.bannerWidth;				// banner width
	this.panels = (gEbQueries.panels) ? gEbQueries.panels: 0;	// panels that will have the pushdown functionality. default is 0 (index)
	this.panelsArr = [];		
	this.ebDU;	
	this.animTime = (gEbQueries.animTime) ? gEbQueries.animTime : 300;			// time to complete animation
	this.animIntervalTime = 10;		// animation interval
	this.pushDiv;					// ref to "mmPushDiv"
	this.easingType = (gEbQueries.easingType) ? gEbQueries.easingType : 4;			// easing type. 1=linear, 2=ease in, 3=ease out, 4=ease in out
	this.isIE6 = false;				// IE6 has a bug with empty divs (sets a default height of 8px). this flash helps avoid the bug where needed.
	
	this.isClipSupported = false;	// clipping is not supported in Safari and in FF/Wmode=window
}

var objCustomPushdown = new ebCCustomPushdown();

function ebCCustomEventHandlers() {
    this.onClientScriptsLoaded = function(objName) {};
    this.onBeforeAddRes = function(objName) {};
    this.onBeforeAddPanelRes = function(objName, panelName) {};
    this.onHandleInteraction = function(objName, intName, strObjID) {};
    this.onBeforeDefaultBannerShow = function(objName) {};
    this.onAfterDefaultBannerShow = function(objName) 
	{
		gEbDbg.delimiter("================= Start 'pushdown' expandable initialization =====================");
		try{
			
			objCustomPushdown.ebDU = eval(objName);
			objCustomPushdown.isIE6 = (gEbBC.isIE() && gEbBC.getVersion()=="6");
			//create the mmPushDiv for all browser except IE6
			if(!objCustomPushdown.isIE6) createMMPushDiv(); // create the push div once for all browsers except IE6
			
			if(objCustomPushdown.panelName == 0)
			{
				for(var i in objCustomPushdown.ebDU.ad.panels)
				{
					objCustomPushdown.panels = i; // get the first panel name if there are no panels assigned to the paramter
					break;
				}
			}
			
			objCustomPushdown.bannerHeight = objCustomPushdown.ebDU.adData.nHeight; // setting the bannerheight
			objCustomPushdown.bannerWidth  = objCustomPushdown.ebDU.adData.nWidth; // setting the bannerwidth

			var ebPushPanels = objCustomPushdown.panels.split('|');
			
			for(i = 0; ebPushPanels != null && i < ebPushPanels.length; i++) 
			{				
				var panelParamName = ebPushPanels[i].toLowerCase();
				var panelObj = {};
				panelObj.panelHeight = objCustomPushdown.ebDU.ad.panels[panelParamName].nHeight;
				panelObj.panelY = parseInt(objCustomPushdown.ebDU.ad.panels[panelParamName].nYPos);
				panelObj.animDistance = parseInt(panelObj.panelHeight) - parseInt(objCustomPushdown.bannerHeight) + panelObj.panelY;
				objCustomPushdown.isClipSupported = objCustomPushdown.ebDU.ad.panels[panelParamName].isClipSupported();
				
				objCustomPushdown.panelsArr[panelParamName] = panelObj;		
			}		
		}catch(e) {gEbDbg.error("Error in Expandable_Pushdown_OCM.js:onAfterDefaultBannerShow(): " + e.description)}
		
	};
    this.onBeforeRichFlashShow = function(objName) {};
    this.onAfterRichFlashShow = function(objName) {};
    this.onBeforePanelShow = function(objName, panelName) 
	{
		if (objCustomPushdown.animTime > 0 && objCustomPushdown.panelsArr[panelName.toLowerCase()].isClipSupported)
			objCustomPushdown.ebDU.ad.panels[panelName.toLowerCase()].panelDiv.style.clip="rect(0px," + objCustomPushdown.bannerWidth + "px,0px,0px)";
	};
    this.onAfterPanelShow = function(objName, panelName) 
	{
		var panelName = panelName.toLowerCase();
		try{
			if(typeof(objCustomPushdown.panelsArr[panelName]) == "undefined" || objCustomPushdown.panelsArr[panelName] == null)
		    {
			    return; // the calling panel is not the relevant panel, so , return.
		    }
			
			if(objCustomPushdown.isIE6) createMMPushDiv();				
			clearInterval(objCustomPushdown.animInterval); // clear the interval if the user expanded again while the closing animatio is playing	

			if (objCustomPushdown.animTime > 0){ // expand with animation
				objCustomPushdown.animStartTime = new Date();
				objCustomPushdown.animInterval = setInterval(doCustomExpand, objCustomPushdown.animIntervalTime,objCustomPushdown.panelsArr[panelName].animDistance,panelName);
			}
			else objCustomPushdown.pushDiv.style.height = objCustomPushdown.panelsArr[panelName].animDistance + "px";
			
    
		}catch(e) {gEbDbg.error("Error in Expandable_Pushdown_OCM.js:onAfterPanelShow(): " + e.description)}
	};
    this.onBeforePanelHide = function(objName, panelName) {};
    this.onAfterPanelHide = function(objName, panelName) 
	{
		var panelName = panelName.toLowerCase();		
		try
	    {
			if(typeof(objCustomPushdown.panelsArr[panelName]) == "undefined" || objCustomPushdown.panelsArr[panelName] == null)
		    {
			    return; // the calling panel is not the relevant panel, so , return.
		    }
			if (objCustomPushdown.animTime > 0){ // collapse with animation
				objCustomPushdown.animStartTime = new Date();
				objCustomPushdown.animInterval = setInterval(doCustomCollapse, objCustomPushdown.animIntervalTime,objCustomPushdown.panelsArr[panelName].animDistance,panelName);
			}else{
				objCustomPushdown.pushDiv.style.height = "0px";
			}
		    
		    if(objCustomPushdown.isIE6) objCustomPushdown.pushDiv.style.lineHeight = "0px";
		}
		catch(e) {}gEbDbg.error("Error in Expandable_Pushdown_OCM.js:onAfterPanelHide(): " + e.description)
	};
    this.onBeforeAdClose = function(objName) {};
    this.onAfterAdClose = function(objName) {};
    this.onBeforeIntroShow = function(objName) {};
    this.onAfterIntroShow = function(objName) {};
    this.onBeforeIntroHide = function(objName) {};
    this.onAfterIntroHide = function(objName) {};
    this.onBeforeRemShow = function(objName) {};
    this.onAfterRemShow = function(objName) {};
    this.onBeforeRemHide = function(objName) {};
    this.onAfterRemHide = function(objName) {};
    this.onBeforeMiniSiteShow = function(objName) {};
    this.onAfterMiniSiteShow = function(objName) {};
    this.onBeforeMiniSiteHide = function(objName) {};
    this.onAfterMiniSiteHide = function(objName) {};
}

function ebEasing(t, b, c, d)
{
	switch(objCustomPushdown.easingType)
	{
		case 1: // Linear
			return c*t/d + b;
			break;
		case 2: // ease in quad
			t = t/d;
			return c*t*t + b;
			break;
		case 3: // ease out quad
			t = t/d;
			return -c * t*(t-2) + b;
		case 4: // ease in out Quad
			t = t/(d/2);
			if (t < 1) return c/2*t*t + b;
			t--;
			return -c/2 * (t*(t-2) - 1) + b;
			break;
		default: return c*t/d + b;
	}
}

function createMMPushDiv()
{
    try
    {
	    var bannerDiv = objCustomPushdown.ebDU.bannerDiv;
	    // create an empty div after the banner flash object. this div will be used as the spacer that will change its height.
	    // this allows for a smoother animation than changing the banner div's height
	    if(!objCustomPushdown.pushDiv) // create the DIV once and keep a reference to it
	    {
		    var pushDivElem = gEbDisplayPage.TI.getWin().document.createElement("div");
		    pushDivElem.setAttribute("id","mmPushDiv");
		    bannerDiv.appendChild(pushDivElem);
		    objCustomPushdown.pushDiv = pushDivElem;
			// setting the lineHeight & fontSize to 0 keeps the empty div to get a hight of 0px (overrides a cross browser issue)
			objCustomPushdown.pushDiv.style.lineHeight = "0px"; 
			objCustomPushdown.pushDiv.style.fontSize = "0px";
		    gEbDbg.attention("Added 'mmPushDiv' in ebBannerDiv for the first time.");
	    }
	    else
	    {
		    bannerDiv.appendChild(objCustomPushdown.pushDiv);
		    gEbDbg.attention("Adding 'mmPushDiv' in ebBannerDiv from previously created DIV element.");
	    }
	}
	catch(e) {"Error in Expandable_Pushdown_OCM.js:createMMPushDiv(): " + e.description}
}

// called on every objCustomPushdown.animIntervalTime to create the animation effect (mmPushDiv resizing)
function doCustomCollapse(animDistance, panelName)
{	
	var currentTime = new Date();
	var timePassed = currentTime.getTime() - objCustomPushdown.animStartTime.getTime();
	var panelHeight = objCustomPushdown.panelsArr[panelName].panelHeight;
	
	if(timePassed < objCustomPushdown.animTime)
	{
		try
		{
			var nextHeight = Math.floor(ebEasing(timePassed, 0, animDistance, objCustomPushdown.animTime));
			if(objCustomPushdown.isClipSupported){
				objCustomPushdown.ebDU.ad.panels[panelName].panelDiv.style.clip="rect(0px," + objCustomPushdown.bannerWidth + "px," + nextHeight + "px,0px)";
			}else{
				objCustomPushdown.ebDU.ad.panels[panelName].panelDiv.style.clip="rect(0px," + objCustomPushdown.bannerWidth + "px," + panelHeight + "px,0px)";
			}
			
			objCustomPushdown.pushDiv.style.height = (animDistance - nextHeight) + "px";
		}
		catch(e) {gEbDbg.error("Error in Expandable_Pushdown_OCM.js:doCustomCollapse(): " + e.description)}
	}
	else
	{
		try
		{
			clearInterval(objCustomPushdown.animInterval);			
			if(objCustomPushdown.isIE6) 
			{
			    objCustomPushdown.ebDU.bannerDiv.removeChild(objCustomPushdown.pushDiv);
			    gEbDbg.always("Removed 'mmPushDiv'. Only on IE6.");
			}
			
		}
		catch(e) {gEbDbg.error("Error in Expandable_Pushdown_OCM.js:doCustomCollapse(): " + e.description)}
	}
}

function doCustomExpand(animDistance, panelName)
{
	var currentTime = new Date();
	var timePassed = currentTime.getTime() - objCustomPushdown.animStartTime.getTime();
	var panelHeight = objCustomPushdown.panelsArr[panelName].panelHeight;
	
	if(timePassed <= objCustomPushdown.animTime)
	{
		try
		{
			var nextHeight = Math.floor(ebEasing(timePassed, 0, panelHeight, objCustomPushdown.animTime)) + 1; // added extra 1 pixel for chrome issue
			if(objCustomPushdown.isClipSupported){
				objCustomPushdown.ebDU.ad.panels[panelName].panelDiv.style.clip="rect(0px," + objCustomPushdown.bannerWidth + "px," + nextHeight + "px,0px)";
			}else{
				objCustomPushdown.ebDU.ad.panels[panelName].panelDiv.style.clip="rect(0px," + objCustomPushdown.bannerWidth + "px," + panelHeight + "px,0px)";
			}
			if(nextHeight >= objCustomPushdown.bannerHeight - objCustomPushdown.panelsArr[panelName].panelY)
			{
				objCustomPushdown.pushDiv.style.height = (nextHeight - objCustomPushdown.bannerHeight + objCustomPushdown.panelsArr[panelName].panelY) + "px";
			}
			
		}
		catch(e) {gEbDbg.error("Error in " + ebScriptFileName + ":ebDoCustomExpand(): " + e.description)}
	}else
	{
		try
		{
			clearInterval(objCustomPushdown.animInterval);
			if(objCustomPushdown.isClipSupported){
				objCustomPushdown.ebDU.ad.panels[panelName].panelDiv.style.clip="rect(0px," + objCustomPushdown.bannerWidth + "px," + panelHeight + "px,0px)";
			}else{
				objCustomPushdown.ebDU.ebshowHandler(panelName);
			}
		}
		catch(e) {gEbDbg.error("Error in Expandable_Pushdown_OCM.js:doCustomCollapse(): " + e.description)}
	}
}
