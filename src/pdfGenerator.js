import puppeteer from 'puppeteer';
import path from 'path';
import { mkdir } from 'fs/promises';
import sharp from 'sharp';
import { PDFDocument } from 'pdf-lib';
import { readFile, writeFile } from 'fs/promises';

const VIEWPORT_CONFIG = {
  width: 1920,
  height: 1080,
  deviceScaleFactor: 1,
  isMobile: false,
  hasTouch: false,
  isLandscape: true
};

const BROWSER_CONFIG = {
  headless: "new",
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--window-size=1920,1080',
    '--start-maximized',
  ]
};

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

function getDomainFromUrl(url) {
  try {
    const domain = new URL(url).hostname.replace('www.', '');
    return domain.replace(/\./g, '_'); // Capturar el dominio completo y reemplazar los . por _
  } catch {
    return 'unknown';
  }
}

async function setupPage(page) {
  await page.setUserAgent(USER_AGENT);
  await page.setViewport(VIEWPORT_CONFIG);

  // Capturar TODOS los logs del navegador
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

  // CSS más específico basado en el DOM actual
  await page.addStyleTag({
    content: `
      /* Selectores específicos del popup de cookies */
      .dialog-message.dialog-lightbox-message,
      .elementor-1777,
      [data-elementor-id="1777"],
      [data-elementor-id="3201"],
      [data-elementor-type="popup"],
      .elementor-location-popup,
      .elementor-popup-modal,
      [data-elementor-settings*="page_load"],
      [data-elementor-post-type="elementor_library"],
      .elementor-section-content-middle[data-id="19c02f2b"],
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

      /* Prevenir scroll lock y overlay */
      body {
        overflow: auto !important;
        position: static !important;
      }
    `
  });

  // Remover elementos usando JavaScript
  await page.evaluate(() => {
    function removePopups() {
      console.log('🔍 Buscando popups para remover...');
      
      const selectors = [
        '.dialog-message.dialog-lightbox-message',
        '.elementor-1777',
        '[data-elementor-id="1777"]',
        '[data-elementor-id="3201"]',
        '[data-elementor-type="popup"]',
        '.elementor-location-popup',
        '[data-elementor-settings*="page_load"]',
        '[data-elementor-post-type="elementor_library"]',
        '.elementor-section-content-middle[data-id="19c02f2b"]',
        'div[class*="elementor-popup"]',
        'div[class*="dialog-lightbox"]',
        'div[class*="dialog-message"]'
      ];

      selectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          console.log(`🗑️ Encontrados ${elements.length} elementos con selector: ${selector}`);
          elements.forEach(el => {
            console.log(`   - Removiendo: ${el.className}`);
            el.remove();
          });
        }
      });

      // Limpiar atributos del body
      document.body.style.overflow = 'auto';
      document.body.style.position = 'static';
      document.body.classList.remove('elementor-popup-modal');
      document.body.classList.remove('dialog-prevent-scroll');
    }

    // Ejecutar inmediatamente
    console.log('🚀 Primera ejecución de removePopups');
    removePopups();

    // Observer con logs
    console.log('👀 Iniciando observer...');
    const observer = new MutationObserver((mutations) => {
      console.log(`🔄 Observer detectó ${mutations.length} cambios`);
      mutations.forEach(mutation => {
        console.log(`   - Tipo de cambio: ${mutation.type}`);
        if (mutation.addedNodes.length) {
          console.log(`   - Nodos añadidos: ${mutation.addedNodes.length}`);
        }
      });
      removePopups();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style']
    });
    console.log('✅ Observer configurado y activo');
  });
}

async function captureScreenshot(page, url, outputPath) {
  try {
    console.log('Navigating to URL...');
    
    await page.setDefaultNavigationTimeout(60000);
    await page.setDefaultTimeout(60000);

    await page.goto(url, {
      waitUntil: ['networkidle2', 'domcontentloaded', 'load'],
      timeout: 50000
    });

    // Esperar a que todo el contenido esté cargado
    console.log('Waiting for content to be fully loaded...');
    await page.evaluate(() => {
      return new Promise((resolve) => {
        const checkContent = () => {
          // Verificar imágenes
          const images = Array.from(document.images);
          const allImagesLoaded = images.every(img => img.complete);
          
          // Verificar contenido principal
          const main = document.querySelector('main, #main, .main, article, .content');
          const hasContent = main && main.offsetHeight > 0;
          
          // Verificar header
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

          // Timeout de seguridad más largo
          setTimeout(() => {
            observer.disconnect();
            resolve();
          }, 15000);
        }
      });
    });

    // Esperar un momento adicional
    await delay(3000);

    // Remover popup y preparar para captura
    console.log('Preparing for screenshot...');
    await page.evaluate(() => {
      // Remover popup
      const popup = document.querySelector('.dialog-message.dialog-lightbox-message');
      if (popup) popup.remove();
      
      // Asegurar scroll al inicio
      window.scrollTo(0, 0);
      
      // Asegurar que el header esté bien posicionado
      const header = document.querySelector('header');
      if (header) {
        header.style.position = 'fixed';
        header.style.top = '0';
        header.style.left = '0';
        header.style.right = '0';
        header.style.zIndex = '1000';
      }

      // Desbloquear scroll
      document.body.style.overflow = 'visible';
      document.body.style.position = 'static';
      document.documentElement.style.overflow = 'visible';
      document.documentElement.style.position = 'static';
    });

    // Esperar un momento para que el scroll se estabilice
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

async function convertToPDF(imagePath, pdfPath) {
  try {
    // Leer la imagen PNG
    const imageBytes = await readFile(imagePath);
    
    // Crear nuevo documento PDF
    const pdfDoc = await PDFDocument.create();
    
    // Cargar la imagen PNG
    const image = await pdfDoc.embedPng(imageBytes);
    
    // Obtener dimensiones de la imagen
    const { width, height } = image.scale(1);
    
    // Crear página con las dimensiones de la imagen
    const page = pdfDoc.addPage([width, height]);
    
    // Dibujar la imagen en la página
    page.drawImage(image, {
      x: 0,
      y: 0,
      width: width,
      height: height
    });

    // Guardar el PDF
    const pdfBytes = await pdfDoc.save();
    await writeFile(pdfPath, pdfBytes);

    return true;
  } catch (error) {
    console.error(`Error converting to PDF: ${error.message}`);
    return false;
  }
}

function getTimestamp() {
  const now = new Date();
  return now.toISOString()
    .replace(/[:.]/g, '-')
    .replace('T', '_')
    .slice(0, -5);
}

export async function generatePDF(urls, options = {}) {
  const timestamp = getTimestamp();
  const domain = getDomainFromUrl(urls[0]); // Obtener dominio de la primera URL
  const outputDir = path.join('output', `${domain}_${timestamp}`);
  const pdfsDir = path.join(outputDir, 'pdfs');
  const screenshotsDir = path.join(outputDir, 'screenshots');

  await mkdir(pdfsDir, { recursive: true });
  await mkdir(screenshotsDir, { recursive: true });
  console.log(`Created output directories in: ${outputDir}`);

  const browser = await puppeteer.launch(BROWSER_CONFIG);
  const pdfFiles = [];

  try {
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      console.log(`\nProcessing (${i + 1}/${urls.length}): ${url}`);

      const page = await browser.newPage();
      
      try {
        await setupPage(page);

        // Capturar screenshot
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