// Content script that runs on the IPTorrents seeding required page
console.log("IPTea4theStingy extension loaded");

// Define styles for highlighting buttons
const highlightStyles = {
  efficient: "2px solid green",
  inefficient: "1px solid red",
  neutral: "1px solid orange"
};

// Function to highlight a button with a specific style
function highlightButton(button, style, tooltipText) {
  // Reset any previous styling
  button.style.border = '';
  button.style.position = 'relative';
  button.style.outline = highlightStyles[style];
  
  // Remove any existing tooltip
  const existingTooltip = button.querySelector('.iptea-tooltip');
  if (existingTooltip) {
    button.removeChild(existingTooltip);
  }
  
  // Add tooltip with efficiency information
  const tooltip = document.createElement('div');
  tooltip.className = 'iptea-tooltip';
  tooltip.style.position = 'absolute';
  tooltip.style.bottom = '100%';
  tooltip.style.left = '50%';
  tooltip.style.transform = 'translateX(-50%)';
  tooltip.style.backgroundColor = '#333';
  tooltip.style.color = 'white';
  tooltip.style.padding = '5px';
  tooltip.style.borderRadius = '4px';
  tooltip.style.fontSize = '12px';
  tooltip.style.whiteSpace = 'nowrap';
  tooltip.style.zIndex = '1000';
  tooltip.style.display = 'none';
  tooltip.textContent = tooltipText;
  
  button.appendChild(tooltip);
  
  // Show/hide tooltip on hover
  button.addEventListener('mouseenter', () => {
    tooltip.style.display = 'block';
  });
  
  button.addEventListener('mouseleave', () => {
    tooltip.style.display = 'none';
  });
}

// Initialize storage if needed
chrome.storage.local.get(['currentBonusDisplay', 'surplusUploadDisplay'], function(result) {
  if (!result.currentBonusDisplay || !result.surplusUploadDisplay) {
    extractAndStoreData();
  }
});

// Function to analyze and highlight buttons based on efficiency
function analyzeButtonEfficiency(totalBonus, totalSurplus) {
  console.log("Analyzing button efficiency...");
  console.log("Total Bonus:", totalBonus);
  console.log("Total Surplus:", totalSurplus);
  
  // Find all the rows in the table
  const rows = document.querySelectorAll('tr');
  
  // Results tracking
  let processedButtons = 0;
  let efficiencyResults = [];
  
  // Process each row
  rows.forEach(row => {
    // Try to find the points and surplus buttons in this row
    const buttons = row.querySelectorAll('input[type="submit"], button');
    
    // Skip if no buttons found
    if (buttons.length === 0) return;
    
    // Try to extract the point and surplus values from the buttons
    let pointsButton = null;
    let surplusButton = null;
    let pointsValue = null;
    let surplusValue = null;
    
    buttons.forEach(button => {
      const buttonText = button.value || button.textContent;
      
      // Look for points button (could be labeled as "points", "bonus", etc.)
      if (buttonText && buttonText.match(/points|bonus/i)) {
        pointsButton = button;
        // Try to extract the number from the button text or surrounding elements
        const pointsMatch = buttonText.match(/(\d+[,\d]*\.?\d*)/);
        if (pointsMatch) {
          pointsValue = parseFloat(pointsMatch[1].replace(/,/g, ''));
        }
      }
      
      // Look for surplus button (could be labeled as "upload", "credit", "GB", "TB", etc.)
      if (buttonText && buttonText.match(/upload|credit|gb|tb/i)) {
        surplusButton = button;
        // Try to extract the number from the button text or surrounding elements
        const surplusMatch = buttonText.match(/(\d+[,\d]*\.?\d*)/);
        if (surplusMatch) {
          surplusValue = parseFloat(surplusMatch[1].replace(/,/g, ''));
          
          // Check if there's a unit (GB vs TB) and convert if needed
          if (buttonText.includes('GB')) {
            surplusValue = surplusValue / 1024; // Convert GB to TB
          }
        }
      }
    });
    
    // If we found both types of buttons and their values, calculate efficiency
    if (pointsButton && surplusButton && pointsValue !== null && surplusValue !== null) {
      processedButtons += 2;
      
      // Calculate percentages of total
      const pointsPercentage = (pointsValue / totalBonus) * 100;
      const surplusPercentage = (surplusValue / totalSurplus) * 100;
      
      console.log("Found buttons:", {
        points: { value: pointsValue, percentage: pointsPercentage.toFixed(4) + "%" },
        surplus: { value: surplusValue, percentage: surplusPercentage.toFixed(4) + "%" }
      });
      
      // Store the results
      efficiencyResults.push({
        row: row,
        pointsButton: pointsButton,
        surplusButton: surplusButton,
        pointsValue: pointsValue,
        surplusValue: surplusValue,
        pointsPercentage: pointsPercentage,
        surplusPercentage: surplusPercentage
      });
      
      // Determine which button is more efficient
      if (pointsPercentage < surplusPercentage) {
        // Points button is more efficient (uses less of total)
        highlightButton(pointsButton, 'efficient', 
          `Efficient: ${pointsPercentage.toFixed(2)}% of your points vs ${surplusPercentage.toFixed(2)}% of your surplus`);
        highlightButton(surplusButton, 'inefficient', 
          `Less efficient: ${surplusPercentage.toFixed(2)}% of your surplus vs ${pointsPercentage.toFixed(2)}% of your points`);
      } else if (surplusPercentage < pointsPercentage) {
        // Surplus button is more efficient
        highlightButton(surplusButton, 'efficient', 
          `Efficient: ${surplusPercentage.toFixed(2)}% of your surplus vs ${pointsPercentage.toFixed(2)}% of your points`);
        highlightButton(pointsButton, 'inefficient', 
          `Less efficient: ${pointsPercentage.toFixed(2)}% of your points vs ${surplusPercentage.toFixed(2)}% of your surplus`);
      } else {
        // Both are equally efficient
        highlightButton(pointsButton, 'neutral', `Equal efficiency: ${pointsPercentage.toFixed(2)}%`);
        highlightButton(surplusButton, 'neutral', `Equal efficiency: ${surplusPercentage.toFixed(2)}%`);
      }
    }
  });
  
  console.log(`Processed ${processedButtons} buttons on the page`);
  
  // Store the results
  chrome.storage.local.set({
    efficiencyResults: JSON.stringify(efficiencyResults.map(result => ({
      pointsValue: result.pointsValue,
      surplusValue: result.surplusValue,
      pointsPercentage: result.pointsPercentage,
      surplusPercentage: result.surplusPercentage,
      moreEfficient: result.pointsPercentage < result.surplusPercentage ? 'points' : 'surplus'
    })))
  });
  
  return efficiencyResults;
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === "getData") {
    const data = extractAndStoreData();
    sendResponse(data);
    return true; // Keep the message channel open for async response
  } else if (request.action === "analyzeButtons") {
    chrome.storage.local.get(['currentBonusValue', 'surplusUploadValue'], function(result) {
      if (result.currentBonusValue && result.surplusUploadValue) {
        analyzeButtonEfficiency(result.currentBonusValue, result.surplusUploadValue);
        sendResponse({success: true});
      } else {
        sendResponse({success: false, error: "No stored values found"});
      }
    });
    return true; // Keep the message channel open for async response
  }
});

// Main function to extract and store the required data
function extractAndStoreData() {
  try {
    // Look for the text in the page
    const pageContent = document.body.innerText;
    const regex = /parachan \(Current Bonus: ([\d.]+)\) \(Surplus Upload Credit: ([\d.]+) TB\)/;
    const match = pageContent.match(regex);
    
    if (match && match.length >= 3) {
      const currentBonusValue = parseFloat(match[1]);
      const surplusUploadValue = parseFloat(match[2]);
      
      // Display format with units
      const currentBonusDisplay = currentBonusValue.toLocaleString();
      const surplusUploadDisplay = surplusUploadValue.toLocaleString() + " TB";
      
      // Log to console (as requested)
      console.log("Current Bonus:", currentBonusDisplay, "(", currentBonusValue, ")");
      console.log("Surplus Upload Credit:", surplusUploadDisplay, "(", surplusUploadValue, ")");
      
      // Store the data (both display values and numeric values)
      chrome.storage.local.set({
        currentBonusDisplay: currentBonusDisplay,
        surplusUploadDisplay: surplusUploadDisplay,
        currentBonusValue: currentBonusValue,
        surplusUploadValue: surplusUploadValue,
        lastUpdated: new Date().toISOString()
      });
      
      // Now scan the page for buttons and analyze efficiency
      analyzeButtonEfficiency(currentBonusValue, surplusUploadValue);
      
      return {
        success: true,
        currentBonus: currentBonusDisplay,
        surplusUpload: surplusUploadDisplay,
        currentBonusValue: currentBonusValue,
        surplusUploadValue: surplusUploadValue
      };
    } else {
      console.error("Could not find the required information on the page");
      return { success: false, error: "Data not found" };
    }
  } catch (error) {
    console.error("Error extracting data:", error);
    return { success: false, error: error.message };
  }
}