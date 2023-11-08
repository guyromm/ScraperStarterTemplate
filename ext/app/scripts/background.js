import {setConfig,
	cliAuthLogic,
	select,
	selectOne,
	insert,
	update,
	del,
	upsert}
from '../../../common/postgrest-cli.js';
import {sleep,DEBUGGER_ATTACH,whatsNext} from './funcs.js';

setConfig({authLogic:cliAuthLogic})

browser.runtime.onInstalled.addListener((details) => {
  console.log('previousVersion', details.previousVersion)
})

browser.tabs.onUpdated.addListener(async (tabId) => {
  browser.pageAction.show(tabId)
})

const callback = (arg1,arg2) => {
  console.log('callback',arg1,arg2);
}
const COLLECTION_ON=true;
const CAPTCHA_SOLVING_ON=true;


function px(port) {
    return {

	mode: "fixed_servers",
	rules: {
	    singleProxy: {
		scheme: "http",
		host: "127.0.0.1",
		port,
	    },
	    bypassList: ["127.0.0.1:3488",
			 "127.0.0.1:3589",
			 "127.0.0.1:3490",
			 "localhost:*",
			 process.env.POSTGRESTHOST+':*',
			 "127.0.0.1:8080",
			 "127.0.0.1:8081",
			 "127.0.0.1:8082",
			 "127.0.0.1:8083",
			 "127.0.0.1*"]
	}
    }
}

var proxies = {
    none:{
	mode:'system'
    },
    gb:px(8080),
    fr:px(8081),
    de:px(8082),
    it:px(8083),
};

let proxy;

async function setProxy() {
    const p = (await selectOne('settings',{id:'eq.proxy'},true));
    l('setProxy',p)
    if (p && p.value)
    {
	proxy= p.value;	
	chrome.proxy.settings.set(
	    {value: proxies[proxy], scope: 'regular'},
	    function() {}
	);
    }
    else
	chrome.proxy.settings.set({value:{mode:'system'}})
}
setProxy();


// test change 1

const pat = '('+process.env.TARGET_DOMAIN+')'
const apiBaseRg = new RegExp(pat)

//how to block a given type of request:

/*chrome.webRequest.onBeforeRequest.addListener(
  function(details) {
    const u = details.url;
    const doCancel = u.endsWith('/initexposure') ||
	  //u.includes('getMedia') ||
	  u.includes('getUserData') ||
	  u.includes('yad1-products/');
    //l('doCancel of',details.url,'=>',doCancel);
    return {cancel: doCancel};
  },
  {urls: urls},
  ["blocking"]);*/

/*chrome.webRequest.onCompleted.addListener(
  callback,
  {urls:urls}, //filter,
  //opt_extraInfoSpec
);

*/

var version = "1.0";

const l = console.log;

let attached={};

function onAttach(tabId) {
    l('enabling network debugging on',tabId);
    chrome.debugger.sendCommand({ //first enable the Network
        tabId: tabId
    }, "Network.enable");
    chrome.debugger.sendCommand({tabId},
				'Network.setCacheDisabled',
				{cacheDisabled:true});
    chrome.debugger.onEvent.addListener(allEventHandler);
}

const sendMessage = (tabId,message,options,responseCallback) => {
  l('sendMessage',tabId,'=>',message);
  return chrome.tabs.sendMessage(tabId,message,options,responseCallback);
  l('sendMessage',tabId,'out.');
}

const processTab = async (currentTab) => {
  if (DEBUGGER_ATTACH && !attached[currentTab.id])
    {
	//reloader()	
    l('attaching debugger to tab',currentTab);
    chrome.debugger.attach({ //debug at current tab
      tabId: currentTab.id
    }, version, onAttach.bind(null, currentTab.id));
    l('ATTACHED DEBUGGER TO TAB',currentTab.id,currentTab.url);
  }
  if (DEBUGGER_ATTACH)
    attached[currentTab.id]=currentTab;
}

const filterTabs = (tabArray,newOnly=true) => {
    let rt=[];
  let rg = new RegExp('^http(s|):\/\/.*');
  for (const t of tabArray) {
    if (t.url &&
	(rg.exec(t.url) || t.url.includes('https://validate.perfdrive.com'))
	&& (!newOnly || !attached[t.id]))
      rt.push(t);
  }
  return rt;
}

//initial attach
chrome.tabs.query( //get current Tab
  {
      // currentWindow: true,
      // active: true
  },
    async function(tabArray) {
	let gotTargetDomain=false;
	let gotReload=false;
	let activeTab=null;
	l('currentab query returned',tabArray);
	let relevant = filterTabs(tabArray);
	for (const currentTab of relevant) {
	    if (currentTab.url.includes(process.env.TARGET_DOMAIN || currentTab.url.includes('mail.google.com'))) gotTargetDomain=true;
	    if (currentTab.url.includes('http://reload.extensions')) gotReload=true;
	    if (currentTab.active) activeTab=currentTab;
	    processTab(currentTab);
	}
	if (!gotTargetDomain )
	{

	    await cleanData()
	    const url = 'https://www.'+process.env.TARGET_DOMAIN+'/';
	    const urls = [await whatsNext(true),
			  await whatsNext(true),
			  await whatsNext(true),
			  await whatsNext(true),
			 ];
	    l('urls=',urls);
	    for (const url of urls)
	    {
		if (activeTab && (activeTab.url==="chrome://newtab/" || activeTab.url==='' || activeTab.url==null))
		{
		    l('OPENING TARGET DOMAIN ON EMPTY ACTIVETAB.',url)
		    chrome.tabs.update(activeTab,{url})
		    activeTab.url = url;
		}
		else
		{
		    l('DO NOT HAVE A TARGET DOMAIN TAB. CREATING.',url)
		    chrome.tabs.create({url,active:true})
		    //await sleep(10000);
		}
	    }

	}
    }
)

const addNewListener = (tab) => {
  l('addnewListener triggered for tab',tab.id);
  let rel = filterTabs([tab]);
  for (const t of rel) processTab(t);
}

chrome.tabs.onCreated.addListener(addNewListener);

const tabUrls={};

chrome.tabs.onUpdated.addListener((tabId,changeInfo) => {
    if (changeInfo.url && 
    changeInfo.url.includes(process.env.TARGET_DOMAIN))
    {
	if (new RegExp('/(user|live)/').exec(changeInfo.url))
	{
	    l('tab',tabId,'now at',changeInfo.url)
	    tabUrls[tabId]=changeInfo.url;
	}
	
    chrome.tabs.get(tabId,(tab) => {
      let rel = filterTabs([tab],false);
	for (const t of rel)
	    processTab(t);
	//l('NOT sending pagelogic to',tabId,'which is on',changeInfo.url);
	//sendMessage(tabId,{message:'pagelogic'});
	
	cleanData();
    });
  }
})

let watchedRequests={};
async function removeTab(tabId,item_id,error) {
    if (item_id) {
	l('TODO: perform any side effects associated with tab removal.')
    }
  chrome.tabs.remove(tabId);
}

const unwatchedRequests={};
async function allEventHandler(debuggeeId, message, params) {
    //l(message);    
    const tab = attached[debuggeeId.tabId];
    if (params && params.headers && params.headers.Host===`${process.env.POSTGRESTHOST}:${process.env.POSTGRESTPORT}`)
    {
	//l('UNWATCHED',message,params);
	unwatchedRequests[params.requestId]=params;
	for (let [k,v] of Object.entries(unwatchedRequests))
	    if (v.ts<=(new Date()-1000*300))
		delete unwatchedRequests[k];
    }
    
    const unwatched = unwatchedRequests[params.requestId]
    if (unwatched)
    {
	//l('unwatched',message,{debuggeeId,params,atch,unwatched})
	return;
    }
    l('MSG',message);

    if (['Network.webSocketFrameReceived',
	 'Network.webSocketFrameSent',
	 'Network.webSocketWillSendHandshakeRequest',
	 'Network.webSocketCreated'].includes(message))
	return;

    const url = (params&&params.request?params.request.url:
	   watchedRequests[params.requestId]?watchedRequests[params.requestId].request.url:
	   undefined);
    //l('allEventHandler',message,url,{debuggeeId,params,tab})
    
    const info = {message,debuggeeId,params,tab,url,}
    if (!tab) {
	l('unrelated tab',debuggeeId,info);
	return;
    }
    const t = attached[debuggeeId.tabId];
    //l('attached tab',t,'message is',message);
    //l('message from',t.url,'is',message,'params',params);
    //l(message,params && params.request && params.request.url)
    if (message=='Network.requestWillBeSent'){
	//l('request',params.requestId,'will be sent with',params.request.url);
	if (apiBaseRg.exec(params.request.url) &&
	    !params.request.url.includes(`${process.env.POSTGRESTHOST}:${process.env.POSTGRESTPORT}`))
	{
	    l('GOING TO WATCH',debuggeeId,url)
	    watchedRequests[params.requestId]={'request':params.request};
	    const insargs = {request:params.request,
			     page_url:t.url,
			     url:params.request.url,
			     id:params.requestId,
			     proxy,
			     visit_id:visits[debuggeeId.tabId],
			    };
	    let res = await upsert('r',insargs);
	    //l('inserting',insargs.id,insargs.url,'=>',(await res.json()))
	}
	else
	{
	    //l('UNWATCHING',params.request.url,info);
	    unwatchedRequests[params.requestId]={...params,ts:new Date()};
	    if (!/(png|jpeg|jpg|gif|woff2|js|css|svg|ico)$/i.exec(params.request.url))
	    {
		//l('NOT WATCHING',params.request.url);
	    }
	}
    }
/*    else if (['Network.responseReceivedExtraInfo'].includes(message)) {
	chrome.debugger.sendCommand({
	    tabId: debuggeeId.tabId
	}, "Network.getResponseBody", { //ForInterception", {
	    "requestId": params.requestId
	}, async function(response,arg2,arg3,arg4) {
	    l(message,'GOTTEN BODY',response);
	})
	const upd = {id:params.requestId,
		     resp_headers:params.headers,
		     s:params.statusCode,
		    }
	//l('updating3',upd,info)
	await upsert('r',upd)
    }*/
    else if (["Network.responseReceived",'Network.dataReceived','Network.responseReceivedExtraInfo'].includes(message)) { //response return
	l('getting response body')
	chrome.debugger.sendCommand({
	    tabId: debuggeeId.tabId
	}, "Network.getResponseBody", { //ForInterception", {
	    "requestId": params.requestId
	}, async function(response,arg2,arg3,arg4) {
	    l('response body arrived',response && response.body?response.body.length:undefined,params.requestId)
	    if (watchedRequests[params.requestId])
	    {
		const wr = watchedRequests[params.requestId];
		l('THE BODY THAT ARRIVED BELONGS TO A WATCHED REQUST ON',wr.request.url);
		//l('resp',message,wr.request.url,':',Object.keys(response),arg2,arg3,arg4) // wr.response,'entire obj is',wr,'arg2',arg2,'arg3',arg3);	
		wr.response=response;
		//if (wr.request.url.includes('additionalinfo'))
		let body;
		if (wr.response && !wr.response.base64Encoded && wr.response.body)
		{
		    body = ((wr.response &&
			     !wr.response.base64Encoded &&
			     wr.response.body) ?
			    wr.response.body:
			    wr.response
			   );
		    try {
			body = JSON.parse(body)
		    }
		    catch (e) {
			//l('body not json!',body)
		    }
		}

		if (body && body.games)
		    body.games = body.games.map((g,idx)=>({...g,idx}))
		const upd = {id:params.requestId,
				  //s:response.status,
				  v:body,
				  proxy,
			     ts_resp:new Date()}
		await upsert('r',upd);
	    }
	    else
		l('BODY',params,'not in watchedRequests')
	});
    }
    else if (message==='Network.requestServedFromCache')
    {
	const wr = watchedRequests[params.requestId];
	//l('CACHE',wr&&wr.request&&wr.request.url);
    }
    else if (['Network.loadingFinished','Network.loadingFailed'].includes(message))
    {
	const wr = watchedRequests[params.requestId];
	const upd = {id:params.requestId,
		     proxy,
		     lmsg:message}
	await upsert('r',upd)
    }
}

async function cleanData() {
    new Promise(callback => function () {

	let toclean = Object.fromEntries([
	    "appcache",
	    "cache",
	    "cacheStorage",
	    //"cookies", // DO NOT LOG OUT!
	    "downloads",
	    "fileSystems",
	    //"formData",
	    "history",
	    "indexedDB",
	    "localStorage",
	    "pluginData",
	    "serviceWorkers",
	    "webSQL",
	].map(x=>([x,true])));

	chrome.browsingData.remove({
	    //"origins": ["https://www.yad2.co.il","https://yad2.co.il"]
	}, toclean, callback);
	
    });
};

const visits={};
async function reloader() {
    l('reloader')
    while (true) {
	l('reloader sleeping')
	await sleep(5000);
	l('reloading ext')

	chrome.runtime.reload();
    }
}
//setTimeout(() => chrome.runtime.reload(),1000)

chrome.runtime.onMessage.addListener(async (req,sender,resp) => {
  const t = sender.tab;  
    if (req.message==='visit') {
	visits[sender.tab.id]=req.visitId;
    }
  if (req.message==='stuck')
  {
    await removeTab(t.id,
		    req.item_id,
		    {"reason":"stuck",
		     "url":req.url});
  }
});


cleanData(() => { l('done cleaning data callback.') });


