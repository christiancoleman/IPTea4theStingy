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
  console.log(`Found ${rows.length} total rows in the table`);
  rows.forEach((row, index) => {
    // Try to find the points and surplus buttons in this row
    // Only consider visible buttons (those with text and not hidden by CSS)
    const allButtons = row.querySelectorAll('input[type="submit"], button');
    const buttons = Array.from(allButtons).filter(btn => {
      const style = window.getComputedStyle(btn);
      const isVisible = style.display !== 'none' && style.visibility !== 'hidden';
      const hasText = (btn.value || btn.textContent || '').trim().length > 0;
      return isVisible && hasText;
    });
    console.log(`Row ${index}: Found ${buttons.length} buttons`);
    
    // Skip if no buttons found
    if (buttons.length === 0) return;
    
    // Try to extract the torrent name if available (for better identification)
    let torrentName = `Torrent Option ${index + 1}`;
    const nameCell = row.querySelector('td:nth-child(1)');
    if (nameCell) {
      const nameText = nameCell.textContent.trim();
      if (nameText && nameText.length > 0) {
        torrentName = nameText;
        // Limit length of torrent name to avoid UI issues
        if (torrentName.length > 40) {
          torrentName = torrentName.substring(0, 37) + '...';
        }
      }
    }
    
    // Try to extract the point and surplus values from the buttons
    let pointsButton = null;
    let surplusButton = null;
    let pointsValue = null;
    let surplusValue = null;
    
    buttons.forEach(button => {
      const buttonText = button.value || button.textContent;
      console.log(`Button text: "${buttonText}", type: ${button.tagName}`);
      
      // Look for points button (could be labeled as "points", "bonus", etc.)
      if (buttonText && buttonText.match(/points|bonus/i)) {
        pointsButton = button;
        // Try to extract the number from the button text or surrounding elements
        const pointsMatch = buttonText.match(/(\d+[,\d]*\.?\d*)/);
        if (pointsMatch) {
          pointsValue = parseFloat(pointsMatch[1].replace(/,/g, ''));
        }
      }
      
      // Look for surplus button (could be labeled as "upload", "credit", "GB", "TB", "MB", etc.)
      if (buttonText && buttonText.match(/upload|credit|gb|tb|mb/i)) {
        surplusButton = button;
        // Try to extract the number from the button text or surrounding elements
        const surplusMatch = buttonText.match(/(\d+[,\d]*\.?\d*)/i);
        if (surplusMatch) {
          surplusValue = parseFloat(surplusMatch[1].replace(/,/g, ''));
          
          // Check if there's a unit and convert to TB for consistent comparison
          if (buttonText.match(/\bMB\b/i)) {
            surplusValue = surplusValue / (1024 * 1024); // Convert MB to TB
            console.log(`Converting ${surplusMatch[1]} MB to ${surplusValue} TB`);
          } else if (buttonText.match(/\bGB\b/i)) {
            surplusValue = surplusValue / 1024; // Convert GB to TB
            console.log(`Converting ${surplusMatch[1]} GB to ${surplusValue} TB`);
          }
          // If it's already TB or no unit specified, keep as is
        }
      }
    });
    
    // If we found both types of buttons and their values, calculate efficiency
    if (pointsButton && surplusButton && pointsValue !== null && surplusValue !== null) {
      console.log(`Both buttons found in row ${index} with values: Points=${pointsValue}, Surplus=${surplusValue} TB`);
      processedButtons += 2;
      
      // Calculate percentages of total
      const pointsPercentage = (pointsValue / totalBonus) * 100;
      const surplusPercentage = (surplusValue / totalSurplus) * 100;
      console.log(`Calculated percentages: Points=${pointsPercentage.toFixed(6)}%, Surplus=${surplusPercentage.toFixed(6)}%`);
      
      // Calculate basis points (1 bp = 0.01%) for very small percentages
      const pointsBasisPoints = pointsPercentage * 100;
      const surplusBasisPoints = surplusPercentage * 100;
      
      // Calculate relative efficiency (how many times more efficient one option is)
      // Handle division by zero or very small numbers
      let efficiencyRatio = 1;
      let inverseEfficiencyRatio = 1;
      let relativeEfficiency = '';
      
      if (pointsPercentage > 0 && surplusPercentage > 0) {
        efficiencyRatio = surplusPercentage / pointsPercentage;
        inverseEfficiencyRatio = pointsPercentage / surplusPercentage;
        // Protect against infinity
        efficiencyRatio = isFinite(efficiencyRatio) ? efficiencyRatio : 100;
        inverseEfficiencyRatio = isFinite(inverseEfficiencyRatio) ? inverseEfficiencyRatio : 100;
        
        relativeEfficiency = pointsPercentage < surplusPercentage ? 
          `${efficiencyRatio.toFixed(2)}x more efficient` : 
          `${inverseEfficiencyRatio.toFixed(2)}x more efficient`;
      } else {
        // Safe fallback values if one percentage is zero
        relativeEfficiency = 'Significantly more efficient';
      }
      
      console.log("Found buttons:", {
        points: { value: pointsValue, percentage: pointsPercentage.toFixed(4) + "%" },
        surplus: { value: surplusValue, percentage: surplusPercentage.toFixed(4) + "%" }
      });
      
      // Store the results
      efficiencyResults.push({
        row: row,
        torrentName: torrentName,
        pointsButton: pointsButton,
        surplusButton: surplusButton,
        pointsValue: pointsValue,
        surplusValue: surplusValue,
        pointsPercentage: pointsPercentage,
        surplusPercentage: surplusPercentage,
        pointsBasisPoints: pointsBasisPoints,
        surplusBasisPoints: surplusBasisPoints,
        efficiencyRatio: efficiencyRatio,
        inverseEfficiencyRatio: inverseEfficiencyRatio,
        relativeEfficiency: relativeEfficiency
      });
      
      // Determine which button is more efficient
      if (pointsPercentage < surplusPercentage) {
        // Points button is more efficient (uses less of total)
        let tooltipText = '';
        // For very small percentages, use basis points
        if (pointsPercentage < 0.01) {
          tooltipText = `Efficient: ${pointsBasisPoints.toFixed(2)} basis points (${pointsPercentage.toFixed(6)}%) vs ${surplusBasisPoints.toFixed(2)} basis points`;
        } else {
          tooltipText = `Efficient: ${pointsPercentage.toFixed(4)}% of your points vs ${surplusPercentage.toFixed(4)}% of your surplus`;
        }
        tooltipText += `\n${efficiencyRatio.toFixed(2)}x more efficient than upload option`;
        
        highlightButton(pointsButton, 'efficient', tooltipText);
        highlightButton(surplusButton, 'inefficient', 
          `Less efficient: ${surplusPercentage.toFixed(4)}% of your surplus vs ${pointsPercentage.toFixed(4)}% of your points`);
      } else if (surplusPercentage < pointsPercentage) {
        // Surplus button is more efficient
        let tooltipText = '';
        // For very small percentages, use basis points
        if (surplusPercentage < 0.01) {
          tooltipText = `Efficient: ${surplusBasisPoints.toFixed(2)} basis points (${surplusPercentage.toFixed(6)}%) vs ${pointsBasisPoints.toFixed(2)} basis points`;
        } else {
          tooltipText = `Efficient: ${surplusPercentage.toFixed(4)}% of your surplus vs ${pointsPercentage.toFixed(4)}% of your points`;
        }
        tooltipText += `\n${inverseEfficiencyRatio.toFixed(2)}x more efficient than points option`;
        
        highlightButton(surplusButton, 'efficient', tooltipText);
        highlightButton(pointsButton, 'inefficient', 
          `Less efficient: ${pointsPercentage.toFixed(4)}% of your points vs ${surplusPercentage.toFixed(4)}% of your surplus`);
      } else {
        // Both are equally efficient
        highlightButton(pointsButton, 'neutral', `Equal efficiency: ${pointsPercentage.toFixed(4)}%`);
        highlightButton(surplusButton, 'neutral', `Equal efficiency: ${surplusPercentage.toFixed(4)}%`);
      }
    }
  });
  
  console.log(`Processed ${processedButtons} buttons on the page`);
  
  // Store the results - ensure all values are serializable
  const serializedResults = efficiencyResults.map(result => {
    // Clean up values to ensure they're serializable
    return {
      torrentName: result.torrentName || 'Unknown Torrent',
      pointsValue: isFinite(result.pointsValue) ? result.pointsValue : 0,
      surplusValue: isFinite(result.surplusValue) ? result.surplusValue : 0,
      pointsPercentage: isFinite(result.pointsPercentage) ? result.pointsPercentage : 0,
      surplusPercentage: isFinite(result.surplusPercentage) ? result.surplusPercentage : 0,
      pointsBasisPoints: isFinite(result.pointsBasisPoints) ? result.pointsBasisPoints : 0,
      surplusBasisPoints: isFinite(result.surplusBasisPoints) ? result.surplusBasisPoints : 0,
      efficiencyRatio: isFinite(result.efficiencyRatio) ? result.efficiencyRatio : 1,
      inverseEfficiencyRatio: isFinite(result.inverseEfficiencyRatio) ? result.inverseEfficiencyRatio : 1,
      relativeEfficiency: result.relativeEfficiency || 'More efficient',
      moreEfficient: result.pointsPercentage < result.surplusPercentage ? 'points' : 'surplus'
    };
  });
  
  console.log('Serialized results before storage:', serializedResults);
  
  // Store the results
  chrome.storage.local.set({
    efficiencyResults: JSON.stringify(serializedResults)
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