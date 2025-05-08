// Background script for the extension
chrome.runtime.onInstalled.addListener(function() {
  console.log("IPTea4theStingy extension installed");
});

// Add icon click handler
chrome.action.onClicked.addListener((tab) => {
  // Only enable on the specific page
  if (tab.url.includes('iptorrents.com/seeding_required.php')) {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: () => {
        // This function runs in the context of the page
        console.log("Checking IPTorrents data...");
      }
    });
  }
});