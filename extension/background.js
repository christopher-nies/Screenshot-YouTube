chrome.webNavigation.onHistoryStateUpdated.addListener(function(data) {
	chrome.tabs.get(data.tabId, function(tab) {
		chrome.tabs.executeScript(data.tabId, {code: 'if (typeof AddScreenshotButton !== "undefined") { AddScreenshotButton(); }', runAt: 'document_start'});
	});
}, {url: [{hostSuffix: '.youtube.com'}]});

// Listen for messages from content script to show notifications
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
	if (request.type === "notification") {
		chrome.notifications.create({
			type: "basic",
			iconUrl: "icon-128.png",
			title: request.title || "Screenshot YouTube",
			message: request.message || "",
			priority: 1
		});
	}
});