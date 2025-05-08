document.addEventListener('DOMContentLoaded', function() {
  loadData();
  
  // Set up refresh button
  document.getElementById('refreshData').addEventListener('click', function() {
    refreshData();
  });
});

// Helper function to format data size with appropriate unit
function formatDataSize(sizeInTB) {
  if (sizeInTB >= 0.1) {
    // Keep as TB if >= 0.1 TB
    return sizeInTB.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " TB";
  } else if (sizeInTB >= 0.0001) {
    // Convert to GB if between 0.1 TB and 0.0001 TB
    const sizeInGB = sizeInTB * 1024;
    return sizeInGB.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " GB";
  } else {
    // Convert to MB for very small values
    const sizeInMB = sizeInTB * 1024 * 1024;
    return sizeInMB.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + " MB";
  }
}

// Load stored data and display it
function loadData() {
  chrome.storage.local.get([
    'currentBonusDisplay', 
    'surplusUploadDisplay', 
    'currentBonusValue',
    'surplusUploadValue',
    'efficiencyResults', 
    'lastUpdated'
  ], function(result) {
    // Update the current bonus and surplus display
    if (result.currentBonusDisplay) {
      document.getElementById('currentBonus').textContent = result.currentBonusDisplay;
    }
    
    if (result.surplusUploadDisplay) {
      document.getElementById('surplusUpload').textContent = result.surplusUploadDisplay;
    }
    
    // Update efficiency results if available
    updateEfficiencyResults(result.efficiencyResults, result.currentBonusValue, result.surplusUploadValue);
  });
}

// Refresh data from the current tab
function refreshData() {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    if (tabs[0].url.includes('iptorrents.com/seeding_required.php')) {
      // Get the data and efficiency analysis
      chrome.tabs.sendMessage(tabs[0].id, {action: "getData"}, function(response) {
        if (response && response.success) {
          document.getElementById('currentBonus').textContent = response.currentBonus;
          document.getElementById('surplusUpload').textContent = response.surplusUpload;
          
          // Re-check efficiency after a short delay to allow for data processing
          setTimeout(() => {
            chrome.storage.local.get(['efficiencyResults', 'currentBonusValue', 'surplusUploadValue'], function(result) {
              updateEfficiencyResults(result.efficiencyResults, result.currentBonusValue, result.surplusUploadValue);
            });
          }, 500);
        } else {
          console.log("Failed to get data from page");
        }
      });
    } else {
      // Update message for users not on the right page
      document.getElementById('efficiencyStatus').textContent = 
        "Please navigate to the IPTorrents seeding required page to analyze efficiency.";
      
      alert("Please navigate to the IPTorrents seeding required page first.");
    }
  });
}

// Update the efficiency results section with improved layout
function updateEfficiencyResults(efficiencyResultsJson, totalBonus, totalSurplus) {
  const efficiencyResultsDiv = document.getElementById('efficiencyResults');
  const efficiencyStatusDiv = document.getElementById('efficiencyStatus');
  
  // Clear previous results
  efficiencyResultsDiv.innerHTML = '';
  
  // Handle no results
  if (!efficiencyResultsJson) {
    efficiencyStatusDiv.textContent = 
      "No efficiency data available. Visit the seeding required page to analyze button efficiency.";
    return;
  }
  
  try {
    const results = JSON.parse(efficiencyResultsJson);
    
    if (results.length === 0) {
      efficiencyStatusDiv.textContent = 
        "No torrent buttons found to analyze. Please visit the seeding required page.";
      return;
    }
    
    // De-duplicate torrents by name (in case there are multiple rows with the same name)
    const uniqueTorrents = [];
    const uniqueTorrentNames = new Set();
    
    results.forEach(result => {
      if (!uniqueTorrentNames.has(result.torrentName)) {
        uniqueTorrentNames.add(result.torrentName);
        uniqueTorrents.push(result);
      }
    });
    
    // Update the status with the count of unique torrents
    efficiencyStatusDiv.textContent = 
      `Found ${uniqueTorrents.length} torrent${uniqueTorrents.length === 1 ? '' : 's'} to analyze.`;
    
    // Display up to 5 unique results
    const maxDisplay = Math.min(5, uniqueTorrents.length);
    
    for (let i = 0; i < maxDisplay; i++) {
      const result = uniqueTorrents[i];
      
      // Create a result item with improved layout
      const resultItem = document.createElement('div');
      resultItem.className = 'efficiency-item';
      
      // Add torrent title/identifier
      const title = document.createElement('div');
      title.className = 'torrent-title';
      title.textContent = result.torrentName || `Torrent ${i + 1}`;
      resultItem.appendChild(title);
      
      // Determine which option is more efficient
      const moreEfficient = result.pointsPercentage < result.surplusPercentage ? 'points' : 'surplus';
      
      // Container for the comparison
      const comparisonContainer = document.createElement('div');
      comparisonContainer.className = 'comparison-container';
      
      // Points option
      const pointsOption = document.createElement('div');
      pointsOption.className = 'option-row ' + (moreEfficient === 'points' ? 'winner' : 'loser');
      pointsOption.innerHTML = `
        <div class="option-details">
          <span class="points">Points: ${result.pointsValue.toLocaleString()}</span>
          <span>${result.pointsPercentage.toFixed(4)}%</span>
        </div>
      `;
      
      // VS label
      const vsLabel = document.createElement('div');
      vsLabel.className = 'vs-label';
      vsLabel.textContent = 'VS';
      
      // Surplus option with appropriate units
      const surplusFormatted = formatDataSize(result.surplusValue);
      const surplusOption = document.createElement('div');
      surplusOption.className = 'option-row ' + (moreEfficient === 'surplus' ? 'winner' : 'loser');
      surplusOption.innerHTML = `
        <div class="option-details">
          <span class="surplus">Upload: ${surplusFormatted}</span>
          <span>${result.surplusPercentage.toFixed(4)}%</span>
        </div>
      `;
      
      // Add winner indicator
      if (moreEfficient === 'points') {
        const badge = document.createElement('div');
        badge.className = 'option-badge';
        badge.textContent = 'Better';
        pointsOption.appendChild(badge);
      } else {
        const badge = document.createElement('div');
        badge.className = 'option-badge';
        badge.textContent = 'Better';
        surplusOption.appendChild(badge);
      }
      
      // Add all elements to the comparison container
      comparisonContainer.appendChild(pointsOption);
      comparisonContainer.appendChild(vsLabel);
      comparisonContainer.appendChild(surplusOption);
      resultItem.appendChild(comparisonContainer);
      
      // Add recommendation text
      const recommendation = document.createElement('div');
      recommendation.className = 'small-text';
      recommendation.style.marginTop = '8px';
      recommendation.style.textAlign = 'center';
      
      if (moreEfficient === 'points') {
        recommendation.innerHTML = `<strong>Recommendation:</strong> Use Points (uses less of your total)`;
      } else {
        recommendation.innerHTML = `<strong>Recommendation:</strong> Use Upload (uses less of your total)`;
      }
      
      resultItem.appendChild(recommendation);
      
      // Add the item to results container
      efficiencyResultsDiv.appendChild(resultItem);
    }
    
    // If there are more unique results than we display
    if (uniqueTorrents.length > maxDisplay) {
      const moreInfo = document.createElement('div');
      moreInfo.className = 'small-text';
      moreInfo.style.marginTop = '8px';
      moreInfo.style.textAlign = 'center';
      moreInfo.textContent = `+ ${uniqueTorrents.length - maxDisplay} more torrents. View all on the seeding required page.`;
      efficiencyResultsDiv.appendChild(moreInfo);
    }
    
  } catch (error) {
    console.error("Error parsing efficiency results:", error);
    efficiencyStatusDiv.textContent = "Error displaying efficiency data.";
  }
}