# IPTea4theStingy

A browser extension for Chromium-based browsers that optimizes your resource management on IPTorrents by analyzing which payment method (bonus points or upload credit) is more efficient for each torrent.

![IPTea4theStingy Logo](./images/icon128.svg)

## 🔍 What It Does

IPTea4theStingy helps you make smarter decisions about resource usage on IPTorrents by:

- Automatically parsing your Current Bonus points and Surplus Upload Credit
- Calculating which payment method uses a smaller percentage of your total resources
- Visually highlighting efficient options with green outlines and inefficient ones with red
- Providing detailed tooltips with percentage calculations
- Displaying a summary of the best options in the extension popup

## 📊 How It Works

1. The extension reads your current stats from the page:
   ```
   parachan (Current Bonus: 73610.0) (Surplus Upload Credit: 17.10 TB)
   ```

2. For each torrent with both bonus point and upload credit options, it calculates:
   - What percentage the bonus cost is of your total bonus points
   - What percentage the upload cost is of your total upload credit

3. The option that uses a smaller percentage of your total is highlighted as more efficient.

For example, if using points would cost 1.20% of your total points, but using upload credit would cost 1.26% of your total upload, the extension will recommend using points.

## 🔧 Installation

### Chrome

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" using the toggle in the top-right corner
4. Click "Load unpacked"
5. Select the `IPTea4theStingy` folder
6. The extension should appear in your extensions list with the Triforce icon

### Microsoft Edge

1. Download or clone this repository
2. Open Edge and navigate to `edge://extensions/`
3. Enable "Developer mode" using the toggle in the bottom-left corner
4. Click "Load unpacked"
5. Select the `IPTea4theStingy` folder
6. The extension should appear in your extensions list with the Triforce icon

### Other Chromium Browsers (Brave, Opera, etc.)

Similar steps apply to other Chromium-based browsers, though the exact location of the extensions page may vary.

## 📋 Usage

1. Navigate to `https://iptorrents.com/seeding_required.php`
2. The extension will automatically:
   - Parse your current stats
   - Find and analyze all torrent options
   - Highlight efficient options in green
   - Add tooltips showing detailed calculations

3. Click the extension icon to see:
   - Your current stats
   - A summary of up to 5 analyzed torrents
   - Clear recommendations for which option to use

## 🛡️ Privacy

This extension:
- Only activates on the specific IPTorrents seeding required page
- Processes all data locally in your browser
- Does not send any data to external servers
- Does not track your browsing activity

## 🔮 Future Plans

- Option to automatically select the most efficient buttons
- Historical tracking of resource usage
- Customizable efficiency thresholds
- Dark mode support

## ⚖️ License

MIT License - Feel free to modify and share!

## 🙏 Acknowledgements

Created with a passion for optimizing resource usage and making better data-driven decisions.
