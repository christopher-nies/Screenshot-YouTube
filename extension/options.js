'use strict';

chrome.storage.sync.get(['screenshotKey', 'downloadKey', 'uploadKey', 'playbackSpeedButtons', 'screenshotFunctionality', 'screenshotFileFormat', 'UploadUrl', 'UploadAuth'], function (result) {
	// For backwards compatibility
	if (result.downloadKey === undefined && result.uploadKey === undefined && result.screenshotKey !== undefined) {
		DownloadKeyCheck.checked = result.screenshotKey;
		UploadKeyCheck.checked = result.screenshotKey;
		// Save the new settings format
		chrome.storage.sync.set({ 
			'downloadKey': result.screenshotKey,
			'uploadKey': result.screenshotKey
		});
	} else {
		// Use the new separate settings
		DownloadKeyCheck.checked = result.downloadKey;
		UploadKeyCheck.checked = result.uploadKey;
	}
	
	PlaybackSpeedButtonsCheck.checked = result.playbackSpeedButtons;
	PlaybackSpeedButtonsChange();

	if (result.screenshotFunctionality === undefined) {
		chrome.storage.sync.set({ screenshotFunctionality: 2 });
		result.screenshotFunctionality = 2;
	}
	var radios = document.getElementsByName("ScreenshotFunctionalityCheck");
	radios[result.screenshotFunctionality].checked = true;

	ScreenshotFileFormat.value = result.screenshotFileFormat;
	
	// Set upload URL and auth values if they exist
	if (result.UploadUrl) {
		document.getElementById('UploadUrl').value = result.UploadUrl;
	}
	if (result.UploadAuth) {
		document.getElementById('UploadAuth').value = result.UploadAuth;
	}
});

// Replace old keyboard shortcut handler with new ones
DownloadKeyCheck.oninput = function () {
	chrome.storage.sync.set({ 'downloadKey': this.checked });
};

UploadKeyCheck.oninput = function () {
	chrome.storage.sync.set({ 'uploadKey': this.checked });
};

function ScreenshotFunctionalitySet(value) {
	chrome.storage.sync.set({ screenshotFunctionality: parseInt(value) });
};

SFCSave.oninput = function () {
	ScreenshotFunctionalitySet(this.value);
};
SFCCopy.oninput = function () {
	ScreenshotFunctionalitySet(this.value);
};
SFCBoth.oninput = function () {
	ScreenshotFunctionalitySet(this.value);
};

PlaybackSpeedButtonsCheck.oninput = function () {
	chrome.storage.sync.set({ 'playbackSpeedButtons': this.checked });
	PlaybackSpeedButtonsChange();
};

function PlaybackSpeedButtonsChange() {
	PlaybackSpeedHelp.hidden = !PlaybackSpeedButtonsCheck.checked;
}

ScreenshotFileFormat.onchange = function () {
	chrome.storage.sync.set({ 'screenshotFileFormat': this.value });
}

// Add event listeners for upload URL and auth inputs
document.getElementById('UploadUrl').oninput = function () {
	chrome.storage.sync.set({ 'UploadUrl': this.value });
};

document.getElementById('UploadAuth').oninput = function () {
	chrome.storage.sync.set({ 'UploadAuth': this.value });
};