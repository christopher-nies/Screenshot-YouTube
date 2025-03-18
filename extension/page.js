'use strict';

var activePBRButton;
var downloadKey = false;
var uploadKey = false;
var playbackSpeedButtons = false;
var screenshotFunctionality = 0;
var screenshotFormat = "png";
var extension = 'png';

// Common screenshot capture function that returns canvas and title
function CaptureFrame() {
	var appendixTitle = "screenshot." + extension;
	var title;
	var headerEls = document.querySelectorAll("h1.title.ytd-video-primary-info-renderer");

	function SetTitle() {
		if (headerEls.length > 0) {
			title = headerEls[0].innerText.trim();
			return true;
		} else {
			return false;
		}
	}

	if (SetTitle() == false) {
		headerEls = document.querySelectorAll("h1.watch-title-container");

		if (SetTitle() == false)
			title = '';
	}

	var player = document.getElementsByClassName("video-stream")[0];
	var time = player.currentTime;

	title += " ";

	let minutes = Math.floor(time / 60)
	time = Math.floor(time - (minutes * 60));

	if (minutes > 60) {
		let hours = Math.floor(minutes / 60)
		minutes -= hours * 60;
		title += hours + "-";
	}

	title += minutes + "-" + time;
	title += " " + appendixTitle;

	var canvas = document.createElement("canvas");
	canvas.width = player.videoWidth;
	canvas.height = player.videoHeight;
	canvas.getContext('2d').drawImage(player, 0, 0, canvas.width, canvas.height);

	return { canvas, title };
}

// Helper functions for screenshot processing
function createDownloadLink(title) {
	var downloadLink = document.createElement("a");
	downloadLink.download = title;
	return downloadLink;
}

function DownloadBlob(blob, title) {
	var downloadLink = createDownloadLink(title);
	downloadLink.href = URL.createObjectURL(blob);
	downloadLink.click();
}

async function ClipboardBlob(blob) {
	const clipboardItemInput = new ClipboardItem({ "image/png": blob });
	await navigator.clipboard.write([clipboardItemInput]);
}

// Function to show a notification
function showNotification(title, message) {
	chrome.runtime.sendMessage({
		type: "notification",
		title: title,
		message: message
	});
}

async function UploadScreenshot(blob, title) {
	const formData = new FormData();
	let Url = "";
	let Auth = "";
	
	// Get the stored upload URL and Auth from chrome.storage
	await new Promise((resolve) => {
		chrome.storage.sync.get(['UploadUrl', 'UploadAuth'], function(result) {
			Url = result.UploadUrl || "";
			Auth = result.UploadAuth || "";
			resolve();
		});
	});
	
	// Only proceed if URL is provided
	if (!Url) {
		showNotification("Upload Error", "Upload URL not configured in options");
		return;
	}
	
	formData.append("file", blob, title); // Append the blob as a file

	try {
		const response = await fetch(Url, {
			method: "POST",
			headers: {
				"Authorization": Auth,
				// Note: Do not manually set content-type for FormData
				"x-zipline-image-compression-percent": "80"
			},
			body: formData
		});

		if (!response.ok) {
			throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
		}

		const data = await response.json();
		
		// Extract just the URL (equivalent to jq -r .files[0].url)
		if (data && data.files && data.files.length > 0 && data.files[0].url) {
			const fileUrl = data.files[0].url;
			await navigator.clipboard.writeText(fileUrl);
			
			// Show notification with the URL
			showNotification("Screenshot Uploaded", "URL copied to clipboard");
		} else {
			showNotification("Upload Error", "Could not extract image URL from response");
		}
	} catch (error) {
		console.error("Upload error:", error);
		showNotification("Upload Error", error.message || "Failed to upload screenshot");
	}
}

// Original screenshot function - handles saving based on user settings
function CaptureScreenshot() {
	const { canvas, title } = CaptureFrame();

	// If clipboard copy is needed generate png (clipboard only supports png)
	if (screenshotFunctionality == 1 || screenshotFunctionality == 2) {
		canvas.toBlob(async function (blob) {
			await ClipboardBlob(blob);
			// Also download it if it's needed and it's in the correct format
			if (screenshotFunctionality == 2 && screenshotFormat === 'png') {
				DownloadBlob(blob, title);
			}
		}, 'image/png');
	}

	// Create and download image in the selected format if needed
	if (screenshotFunctionality == 0 || (screenshotFunctionality == 2 && screenshotFormat !== 'png')) {
		canvas.toBlob(async function (blob) {
			DownloadBlob(blob, title);
		}, 'image/' + screenshotFormat);
	}
}

// New function specifically for the upload functionality triggered by 'O' key
function CaptureAndUploadScreenshot() {
	const { canvas, title } = CaptureFrame();
	
	// Always use PNG for upload
	canvas.toBlob(async function (blob) {
		await UploadScreenshot(blob, title);
		// Also copy to clipboard for convenience
		// await ClipboardBlob(blob);
	}, 'image/png');
}

function AddScreenshotButton() {
	var ytpRightControls = document.getElementsByClassName("ytp-right-controls")[0];
	if (ytpRightControls) {
		ytpRightControls.prepend(screenshotButton);
		// ytpRightControls.prepend(uploadButton);
	}

	chrome.storage.sync.get('playbackSpeedButtons', function (result) {
		if (result.playbackSpeedButtons) {
			ytpRightControls.prepend(speed3xButton);
			ytpRightControls.prepend(speed25xButton);
			ytpRightControls.prepend(speed2xButton);
			ytpRightControls.prepend(speed15xButton);
			ytpRightControls.prepend(speed1xButton);

			var playbackRate = document.getElementsByTagName('video')[0].playbackRate;
			switch (playbackRate) {
				case 1:
					speed1xButton.classList.add('SYTactive');
					activePBRButton = speed1xButton;
					break;
				case 2:
					speed2xButton.classList.add('SYTactive');
					activePBRButton = speed2xButton;
					break;
				case 2.5:
					speed25xButton.classList.add('SYTactive');
					activePBRButton = speed25xButton;
					break;
				case 3:
					speed3xButton.classList.add('SYTactive');
					activePBRButton = speed3xButton;
					break;
			}
		}
	});
}

var screenshotButton = document.createElement("button");
screenshotButton.className = "screenshotButton ytp-button";
screenshotButton.style.width = "auto";
screenshotButton.innerHTML = "Screenshot";
screenshotButton.style.cssFloat = "left";
screenshotButton.onclick = CaptureScreenshot;

var uploadButton = document.createElement("button");
uploadButton.className = "uploadButton ytp-button";
uploadButton.style.width = "auto";
uploadButton.innerHTML = "Upload";
uploadButton.style.cssFloat = "left";
uploadButton.onclick = CaptureAndUploadScreenshot;

var speed1xButton = document.createElement("button");
speed1xButton.className = "ytp-button SYText";
speed1xButton.innerHTML = "1×";
speed1xButton.onclick = function () {
	document.getElementsByTagName('video')[0].playbackRate = 1;
	activePBRButton.classList.remove('SYTactive');
	this.classList.add('SYTactive');
	activePBRButton = this;
};

var speed15xButton = document.createElement("button");
speed15xButton.className = "ytp-button SYText";
speed15xButton.innerHTML = "1.5×";
speed15xButton.onclick = function () {
	document.getElementsByTagName('video')[0].playbackRate = 1.5;
	activePBRButton.classList.remove('SYTactive');
	this.classList.add('SYTactive');
	activePBRButton = this;
};

var speed2xButton = document.createElement("button");
speed2xButton.className = "ytp-button SYText";
speed2xButton.innerHTML = "2×";
speed2xButton.onclick = function () {
	document.getElementsByTagName('video')[0].playbackRate = 2;
	activePBRButton.classList.remove('SYTactive');
	this.classList.add('SYTactive');
	activePBRButton = this;
};

var speed25xButton = document.createElement("button");
speed25xButton.className = "ytp-button SYText";
speed25xButton.innerHTML = "2.5×";
speed25xButton.onclick = function () {
	document.getElementsByTagName('video')[0].playbackRate = 2.5;
	activePBRButton.classList.remove('SYTactive');
	this.classList.add('SYTactive');
	activePBRButton = this;
};

var speed3xButton = document.createElement("button");
speed3xButton.className = "ytp-button SYText";
speed3xButton.innerHTML = "3×";
speed3xButton.onclick = function () {
	document.getElementsByTagName('video')[0].playbackRate = 3;
	activePBRButton.classList.remove('SYTactive');
	this.classList.add('SYTactive');
	activePBRButton = this;
};

activePBRButton = speed1xButton;

chrome.storage.sync.get(['screenshotKey', 'downloadKey', 'uploadKey', 'playbackSpeedButtons', 'screenshotFunctionality', 'screenshotFileFormat', 'UploadUrl', 'UploadAuth'], function (result) {
	// Handle backwards compatibility
	if (result.downloadKey === undefined && result.uploadKey === undefined && result.screenshotKey !== undefined) {
		downloadKey = result.screenshotKey;
		uploadKey = result.screenshotKey;
	} else {
		downloadKey = result.downloadKey;
		uploadKey = result.uploadKey;
	}
	
	playbackSpeedButtons = result.playbackSpeedButtons;
	if (result.screenshotFileFormat === undefined) {
		screenshotFormat = 'png'
	} else {
		screenshotFormat = result.screenshotFileFormat
	}

	if (result.screenshotFunctionality === undefined) {
		screenshotFunctionality = 0;
	} else {
		screenshotFunctionality = result.screenshotFunctionality;
	}

	if (screenshotFormat === 'jpeg') {
		extension = 'jpg';
	} else {
		extension = screenshotFormat;
	}
});

document.addEventListener('keydown', function (e) {
	if (document.activeElement.contentEditable === 'true' || document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA' || document.activeElement.contentEditable === 'plaintext')
		return true;

	if (playbackSpeedButtons) {
		switch (e.key) {
			case 'q':
				speed1xButton.click();
				e.preventDefault();
				return false;
			case 's':
				speed15xButton.click();
				e.preventDefault();
				return false;
			case 'w':
				speed2xButton.click();
				e.preventDefault();
				return false;
			case 'e':
				speed25xButton.click();
				e.preventDefault();
				return false;
			case 'r':
				speed3xButton.click();
				e.preventDefault();
				return false;
		}
	}

	if (downloadKey && e.key === 'p') {
		CaptureScreenshot();
		e.preventDefault();
		return false;
	}
	
	// Separate shortcut for upload functionality
	if (uploadKey && e.key === 'u') {
		CaptureAndUploadScreenshot();
		e.preventDefault();
		return false;
	}
});

AddScreenshotButton();
