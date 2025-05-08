document.addEventListener('DOMContentLoaded', function() {
  loadData();
  
  // Set up refresh button
  document.getElementById('refreshData').addEventListener('click', function() {
    refreshData();
  });
});

// Load stored data and display it
function loadData() {
  chrome.storage.local.get([
    'currentBonusDisplay', 
    'surplusUploadDisplay', 
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
    updateEfficiencyResults(result.efficiencyResults);
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
            chrome.storage.local.get(['efficiencyResults'], function(result) {
              updateEfficiencyResults(result.efficiencyResults);
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

// Update the efficiency results section
function updateEfficiencyResults(efficiencyResultsJson) {
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
    
    // We have results, update the status
    efficiencyStatusDiv.textContent = 
      `Found ${results.length} torrent options to analyze. Green border indicates the more efficient option.`;
    
    // Display up to 5 results
    const maxDisplay = Math.min(5, results.length);
    
    for (let i = 0; i < maxDisplay; i++) {
      const result = results[i];
      
      // Create a result item
      const resultItem = document.createElement('div');
      resultItem.className = 'efficiency-item';
      
      // Add item content
      const header = document.createElement('div');
      header.className = 'efficiency-header';
      
      // More efficient indicator
      const moreEfficient = result.moreEfficient;
      
      // Create points row
      const pointsRow = document.createElement('div');
      pointsRow.className = 'option-row';
      pointsRow.innerHTML = `
        <span class="points">Points: ${result.pointsValue.toLocaleString()}</span>
        <span>${result.pointsPercentage.toFixed(4)}% of total</span>
      `;
      
      // Create surplus row
      const surplusRow = document.createElement('div');
      surplusRow.className = 'option-row';
      surplusRow.innerHTML = `
        <span class="surplus">Surplus: ${result.surplusValue.toLocaleString()} TB</span>
        <span>${result.surplusPercentage.toFixed(4)}% of total</span>
      `;
      
      // Recommendation
      const recommendation = document.createElement('div');
      recommendation.className = 'small-text';
      recommendation.style.marginTop = '8px';
      
      if (moreEfficient === 'points') {
        // Points is more efficient
        resultItem.classList.add('efficient');
        recommendation.textContent = 'Recommendation: Use Points (more efficient)';
        pointsRow.style.fontWeight = 'bold';
      } else {
        // Surplus is more efficient
        resultItem.classList.add('efficient');
        recommendation.textContent = 'Recommendation: Use Surplus Upload (more efficient)';
        surplusRow.style.fontWeight = 'bold';
      }
      
      // Add all elements to the result item
      resultItem.appendChild(pointsRow);
      resultItem.appendChild(surplusRow);
      resultItem.appendChild(recommendation);
      
      // Add the item to results container
      efficiencyResultsDiv.appendChild(resultItem);
    }
    
    // If there are more results than we display
    if (results.length > maxDisplay) {
      const moreInfo = document.createElement('div');
      moreInfo.className = 'small-text';
      moreInfo.style.marginTop = '8px';
      moreInfo.textContent = `+ ${results.length - maxDisplay} more options. View all on the seeding required page.`;
      efficiencyResultsDiv.appendChild(moreInfo);
    }
    
  } catch (error) {
    console.error("Error parsing efficiency results:", error);
    efficiencyStatusDiv.textContent = "Error displaying efficiency data.";
  }
}