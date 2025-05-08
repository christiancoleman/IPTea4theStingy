document.addEventListener('DOMContentLoaded', function() {
  loadData();
  
  // Set up refresh button
  document.getElementById('refreshData').addEventListener('click', function() {
    refreshData();
  });
});

// Helper function to format data size with appropriate unit
function formatDataSize(sizeInTB) {
  // Ensure we have a valid number
  sizeInTB = parseFloat(sizeInTB) || 0;
  
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

// Format very small percentages appropriately
function formatSmallPercentage(percentage) {
  // Ensure we have a valid number
  percentage = parseFloat(percentage) || 0;
  
  if (percentage < 0.0001) {
    // For extremely small percentages, use ppm (parts per million)
    return (percentage * 1000000).toFixed(2) + " ppm";
  } else if (percentage < 0.01) {
    // For small percentages, use basis points (1 bp = 0.01%)
    return (percentage * 100).toFixed(2) + " bp";
  } else {
    // Normal percentage display
    return percentage.toFixed(4) + "%";
  }
}

// Create a visual scale to represent comparison between two percentages
function createComparisonScale(value1, value2) {
  // Ensure we have valid numbers
  value1 = parseFloat(value1) || 0.0001; // Default to a small value if invalid
  value2 = parseFloat(value2) || 0.0001;
  
  const container = document.createElement('div');
  container.className = 'scale-container';
  
  // Create logarithmic scale for better visualization of small differences
  const logValue1 = value1 > 0 ? Math.log10(value1) : -6; // minimum log value for 0
  const logValue2 = value2 > 0 ? Math.log10(value2) : -6;
  
  // Normalize to 0-100 scale for display
  const minLog = -6; // 0.000001%
  const maxLog = 2;  // 100%
  const range = maxLog - minLog;
  
  const normValue1 = ((logValue1 - minLog) / range) * 100;
  const normValue2 = ((logValue2 - minLog) / range) * 100;
  
  // Create scale
  const scale = document.createElement('div');
  scale.className = 'log-scale';
  
  // Marker for first value
  const marker1 = document.createElement('div');
  marker1.className = 'scale-marker marker1';
  marker1.style.left = normValue1 + '%';
  marker1.title = value1.toFixed(6) + '%';
  
  // Marker for second value
  const marker2 = document.createElement('div');
  marker2.className = 'scale-marker marker2';
  marker2.style.left = normValue2 + '%';
  marker2.title = value2.toFixed(6) + '%';
  
  // Labels
  const label1 = document.createElement('div');
  label1.className = 'scale-label';
  label1.textContent = 'Points: ' + formatSmallPercentage(value1);
  
  const label2 = document.createElement('div');
  label2.className = 'scale-label';
  label2.textContent = 'Upload: ' + formatSmallPercentage(value2);
  
  scale.appendChild(marker1);
  scale.appendChild(marker2);
  container.appendChild(scale);
  container.appendChild(label1);
  container.appendChild(label2);
  
  return container;
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
    console.log('Parsing results:', efficiencyResultsJson);
    const results = JSON.parse(efficiencyResultsJson);
    
    if (!Array.isArray(results) || results.length === 0) {
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
      
      // Ensure we have valid numbers for all calculations
      const pointsPercentage = parseFloat(result.pointsPercentage) || 0.0001;
      const surplusPercentage = parseFloat(result.surplusPercentage) || 0.0001;
      
      // Calculate efficiency ratios if they don't exist
      let efficiencyRatio = 1;
      let inverseEfficiencyRatio = 1;
      
      if (pointsPercentage > 0 && surplusPercentage > 0) {
        efficiencyRatio = result.efficiencyRatio || (surplusPercentage / pointsPercentage);
        inverseEfficiencyRatio = result.inverseEfficiencyRatio || (pointsPercentage / surplusPercentage);
      }
      
      // Determine which option is more efficient
      const moreEfficient = pointsPercentage < surplusPercentage ? 'points' : 'surplus';
      
      // Container for the comparison
      const comparisonContainer = document.createElement('div');
      comparisonContainer.className = 'comparison-container';
      
      // Format percentages appropriately based on their size
      const pointsPercentageFormatted = formatSmallPercentage(pointsPercentage);
      const surplusPercentageFormatted = formatSmallPercentage(surplusPercentage);
      
      // Points option
      const pointsOption = document.createElement('div');
      pointsOption.className = 'option-row ' + (moreEfficient === 'points' ? 'winner' : 'loser');
      pointsOption.innerHTML = `
        <div class="option-details">
          <span class="points">Points: ${(parseFloat(result.pointsValue) || 0).toLocaleString()}</span>
          <span>${pointsPercentageFormatted}</span>
        </div>
      `;
      
      // VS label with efficiency ratio
      const vsLabel = document.createElement('div');
      vsLabel.className = 'vs-label';
      
      // Add the relative efficiency information
      const efficiencyMultiplier = moreEfficient === 'points' ? 
          efficiencyRatio : inverseEfficiencyRatio;
      
      vsLabel.innerHTML = `
        <div>VS</div>
        <div class="efficiency-ratio">${efficiencyMultiplier.toFixed(2)}x</div>
      `;
      
      // Surplus option with appropriate units
      const surplusFormatted = formatDataSize(result.surplusValue);
      const surplusOption = document.createElement('div');
      surplusOption.className = 'option-row ' + (moreEfficient === 'surplus' ? 'winner' : 'loser');
      surplusOption.innerHTML = `
        <div class="option-details">
          <span class="surplus">Upload: ${surplusFormatted}</span>
          <span>${surplusPercentageFormatted}</span>
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
      
      // Add visual comparison scale (logarithmic)
      try {
        const scaleContainer = createComparisonScale(pointsPercentage, surplusPercentage);
        resultItem.appendChild(scaleContainer);
      } catch (scaleError) {
        console.error("Error creating scale:", scaleError);
        // If scale creation fails, continue without it
      }
      
      // Add recommendation text with more detailed info
      const recommendation = document.createElement('div');
      recommendation.className = 'small-text';
      recommendation.style.marginTop = '8px';
      recommendation.style.textAlign = 'center';
      
      if (moreEfficient === 'points') {
        recommendation.innerHTML = `<strong>Recommendation:</strong> Use Points (${efficiencyMultiplier.toFixed(2)}x more efficient)`;
      } else {
        recommendation.innerHTML = `<strong>Recommendation:</strong> Use Upload (${efficiencyMultiplier.toFixed(2)}x more efficient)`;
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
    console.error("JSON data that caused error:", efficiencyResultsJson);
    efficiencyStatusDiv.textContent = "Error displaying efficiency data: " + error.message;
    
    // Attempt to display raw data as a fallback
    try {
      const plainResults = document.createElement('div');
      plainResults.className = 'small-text';
      plainResults.style.marginTop = '16px';
      plainResults.textContent = 'Raw data is available but cannot be displayed properly.';
      efficiencyResultsDiv.appendChild(plainResults);
    } catch (displayError) {
      console.error("Even fallback display failed:", displayError);
    }
  }
}