import puppeteer from 'puppeteer';
import path from 'path';
import { mkdir } from 'fs/promises';
import sharp from 'sharp';
import { PDFDocument } from 'pdf-lib';
import { readFile, writeFile } from 'fs/promises';

/**
 * Configuration for the browser viewport
 * You can modify these values to change the resolution of the captured screenshots
 * Higher values will result in larger, more detailed PDFs but may consume more memory
 */
const VIEWPORT_CONFIG = {
  width: 1920,
  height: 1080,
  deviceScaleFactor: 1,
  isMobile: false,
  hasTouch: false,
  isLandscape: true
};

/**
 * Configuration for the headless Chrome browser
 * These settings ensure stable operation across different environments
 * Add additional arguments here if you need to customize browser behavior
 */
const BROWSER_CONFIG = {
  headless: "new",
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--window-size=1920,1080',
    '--start-maximized',
  ]
};

/**
 * User agent string to mimic a standard desktop browser
 * Change this if you need to emulate a different browser or device
 */
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/**
 * Helper function to create a delay
 * @param {number} ms - Milliseconds to delay
 */
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Extracts the domain from a URL and formats it for use in filenames
 * @param {string} url - The URL to process
 * @returns {string} - Formatted domain name with dots replaced by underscores
 */
function getDomainFromUrl(url) {
  try {
    const domain = new URL(url).hostname.replace('www.', '');
    return domain.replace(/\./g, '_'); // Capture the full domain and replace dots with underscores
  } catch {
    return 'unknown';
  }
}

/**
 * Sets up the browser page with necessary configurations
 * @param {Page} page - Puppeteer page object
 */
async function setupPage(page) {
  await page.setUserAgent(USER_AGENT);
  await page.setViewport(VIEWPORT_CONFIG);

  // Uncomment to capture ALL browser logs
  // This is useful for debugging issues with specific websites
  // page.on('console', msg => {
  //   const type = msg.type();
  //   switch (type) {
  //     case 'log':
  //       console.log('BROWSER LOG:', msg.text());
  //       break;
  //     case 'error':
  //       console.error('BROWSER ERROR:', msg.text());
  //       break;
  //     case 'warning':
  //       console.warn('BROWSER WARN:', msg.text());
  //       break;
  //     default:
  //       console.log(`BROWSER ${type.toUpperCase()}:`, msg.text());
  //   }
  // });

  // Add custom CSS to hide cookie popups and other intrusive elements
  // You can modify these selectors to target specific elements on websites you're converting
  await page.addStyleTag({
    content: `
      /* Specific selectors for cookie popups and overlays */
      .dialog-message.dialog-lightbox-message,
      [data-elementor-type="popup"],
      .elementor-location-popup,
      .elementor-popup-modal,
      [data-elementor-settings*="page_load"],
      [data-elementor-post-type="elementor_library"],
      div[class*="elementor-popup"],
      div[class*="dialog-lightbox"],
      div[class*="dialog-message"] {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        pointer-events: none !important;
        position: fixed !important;
        z-index: -99999 !important;
        max-height: 0 !important;
        max-width: 0 !important;
        transform: scale(0) !important;
        clip: rect(0, 0, 0, 0) !important;
        margin: -1px !important;
        padding: 0 !important;
        border: 0 !important;
        overflow: hidden !important;
      }

      /* Prevent scroll lock and overlay */
      body {
        overflow: auto !important;
        position: static !important;
      }
    `
  });

  // Remove elements using JavaScript
  // This provides a more dynamic approach to removing popups that might appear after page load
  await page.evaluate(() => {
    function removePopups() {
      console.log('🔍 Looking for popups to remove...');
      
      // Add or modify these selectors to target specific elements on websites you're converting
      const selectors = [
        '.dialog-message.dialog-lightbox-message',
        '[data-elementor-type="popup"]',
        '.elementor-location-popup',
        '[data-elementor-settings*="page_load"]',
        '[data-elementor-post-type="elementor_library"]',
        'div[class*="elementor-popup"]',
        'div[class*="dialog-lightbox"]',
        'div[class*="dialog-message"]'
      ];

      selectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          console.log(`🗑️ Found ${elements.length} elements with selector: ${selector}`);
          elements.forEach(el => {
            console.log(`   - Removing: ${el.className}`);
            el.remove();
          });
        }
      });

      // Clean up body attributes
      document.body.style.overflow = 'auto';
      document.body.style.position = 'static';
      document.body.classList.remove('elementor-popup-modal');
      document.body.classList.remove('dialog-prevent-scroll');
    }

    // Execute immediately
    console.log('🚀 First execution of removePopups');
    removePopups();

    // Set up observer with logs
    console.log('👀 Starting observer...');
    const observer = new MutationObserver((mutations) => {
      console.log(`🔄 Observer detected ${mutations.length} changes`);
      mutations.forEach(mutation => {
        console.log(`   - Change type: ${mutation.type}`);
        if (mutation.addedNodes.length) {
          console.log(`   - Nodes added: ${mutation.addedNodes.length}`);
        }
      });
      removePopups();
    });

    // Configure the observer to watch for DOM changes
    // This ensures popups that appear after initial page load are also removed
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style']
    });
    console.log('✅ Observer configured and active');
  });
}

/**
 * Captures a full-page screenshot of the given URL
 * @param {Page} page - Puppeteer page object
 * @param {string} url - URL to capture
 * @param {string} outputPath - Path to save the screenshot
 * @returns {boolean} - Success status
 */
async function captureScreenshot(page, url, outputPath) {
  try {
    console.log('Navigating to URL...');
    
    // Set longer timeouts for complex pages
    await page.setDefaultNavigationTimeout(60000);
    await page.setDefaultTimeout(60000);

    // Navigate to the URL with multiple wait conditions
    await page.goto(url, {
      waitUntil: ['networkidle2', 'domcontentloaded', 'load'],
      timeout: 50000
    });

    // Wait for all content to be fully loaded
    console.log('Waiting for content to be fully loaded...');
    await page.evaluate(() => {
      return new Promise((resolve) => {
        const checkContent = () => {
          // Check images
          const images = Array.from(document.images);
          const allImagesLoaded = images.every(img => img.complete);
          
          // Check main content
          const main = document.querySelector('main, #main, .main, article, .content');
          const hasContent = main && main.offsetHeight > 0;
          
          // Check header
          const header = document.querySelector('header');
          const headerLoaded = header && header.offsetHeight > 0;

          return allImagesLoaded && hasContent && headerLoaded;
        };

        if (checkContent()) {
          resolve();
        } else {
          const observer = new MutationObserver(() => {
            if (checkContent()) {
              observer.disconnect();
              resolve();
            }
          });

          observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true
          });

          // Longer safety timeout
          // Increase this value for complex pages that take longer to load
          setTimeout(() => {
            observer.disconnect();
            resolve();
          }, 15000);
        }
      });
    });

    // Additional delay to ensure everything is rendered
    // Adjust this value if you notice incomplete page rendering
    await delay(3000);

    // Remove popup and prepare for capture
    console.log('Preparing for screenshot...');
    await page.evaluate(() => {
      // Remove popup
      const popup = document.querySelector('.dialog-message.dialog-lightbox-message');
      if (popup) popup.remove();
      
      // Ensure scroll to top
      window.scrollTo(0, 0);
      
      // Ensure header is properly positioned
      // Modify this if you need different header behavior
      const header = document.querySelector('header');
      if (header) {
        header.style.position = 'fixed';
        header.style.top = '0';
        header.style.left = '0';
        header.style.right = '0';
        header.style.zIndex = '1000';
      }

      // Unlock scroll
      document.body.style.overflow = 'visible';
      document.body.style.position = 'static';
      document.documentElement.style.overflow = 'visible';
      document.documentElement.style.position = 'static';
    });

    // Wait for scroll to stabilize
    await delay(1000);

    console.log('Taking screenshot...');
    await page.screenshot({
      path: outputPath,
      fullPage: true,
      type: 'png'
    });

    return true;
  } catch (error) {
    console.error(`Error capturing screenshot: ${error.message}`);
    return false;
  }
}

/**
 * Converts a PNG screenshot to a PDF document
 * @param {string} imagePath - Path to the PNG image
 * @param {string} pdfPath - Path to save the PDF
 * @returns {boolean} - Success status
 */
async function convertToPDF(imagePath, pdfPath) {
  try {
    // Read the PNG image
    const imageBytes = await readFile(imagePath);
    
    // Create new PDF document
    const pdfDoc = await PDFDocument.create();
    
    // Load the PNG image
    const image = await pdfDoc.embedPng(imageBytes);
    
    // Get image dimensions
    const { width, height } = image.scale(1);
    
    // Create page with image dimensions
    // You can modify this to use standard page sizes like A4 instead
    const page = pdfDoc.addPage([width, height]);
    
    // Draw the image on the page
    page.drawImage(image, {
      x: 0,
      y: 0,
      width: width,
      height: height
    });

    // Save the PDF
    const pdfBytes = await pdfDoc.save();
    await writeFile(pdfPath, pdfBytes);

    return true;
  } catch (error) {
    console.error(`Error converting to PDF: ${error.message}`);
    return false;
  }
}

/**
 * Generates a timestamp string for file naming
 * @returns {string} - Formatted timestamp
 */
function getTimestamp() {
  const now = new Date();
  return now.toISOString()
    .replace(/[:.]/g, '-')
    .replace('T', '_')
    .slice(0, -5);
}

/**
 * Main function to generate PDFs from a list of URLs
 * @param {string[]} urls - Array of URLs to process
 * @param {Object} options - Configuration options
 * @returns {Object} - Result containing file paths and output directory
 */
export async function generatePDF(urls, options = {}) {
  const timestamp = getTimestamp();
  const domain = getDomainFromUrl(urls[0]); // Get domain from the first URL
  const outputDir = path.join('output', `${domain}_${timestamp}`);
  const pdfsDir = path.join(outputDir, 'pdfs');
  const screenshotsDir = path.join(outputDir, 'screenshots');

  // Create output directories
  await mkdir(pdfsDir, { recursive: true });
  await mkdir(screenshotsDir, { recursive: true });
  console.log(`Created output directories in: ${outputDir}`);

  // Launch browser
  const browser = await puppeteer.launch(BROWSER_CONFIG);
  const pdfFiles = [];

  try {
    // Process each URL sequentially
    // To implement parallel processing, you could use Promise.all with a limited batch size
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      console.log(`\nProcessing (${i + 1}/${urls.length}): ${url}`);

      const page = await browser.newPage();
      
      try {
        await setupPage(page);

        // Capture screenshot
        const screenshotPath = path.join(screenshotsDir, `page-${i + 1}.png`);
        const pdfPath = path.join(pdfsDir, `page-${i + 1}.pdf`);

        const screenshotSuccess = await captureScreenshot(page, url, screenshotPath);
        
        if (screenshotSuccess) {
          console.log(`✓ Screenshot captured for ${url}`);
          
          const pdfSuccess = await convertToPDF(screenshotPath, pdfPath);
          
          if (pdfSuccess) {
            pdfFiles.push(pdfPath);
            console.log(`✓ PDF generated for ${url}`);
          }
        }
      } catch (error) {
        console.error(`❌ Failed to process ${url}:`, error.message);
      } finally {
        await page.close();
      }

      // Delay between processing URLs to avoid overloading the system
      // Adjust this value based on your system's capabilities
      await delay(2000);
    }

    return {
      pdfFiles,
      timestamp,
      outputDir
    };
  } finally {
    await browser.close();
  }
}