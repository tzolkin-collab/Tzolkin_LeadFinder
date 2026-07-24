import { CoreLogger } from '../utils/logger.js';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import puppeteerExtra from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

const puppeteer = (puppeteerExtra as any).default ?? puppeteerExtra;
if (typeof puppeteer.use === 'function') {
  puppeteer.use(StealthPlugin());
}

export interface ScraperResult {
  screenshotUrl: string | null;
  codeUrl: string | null;
}

export class ScraperTool {
  private readonly logger = new CoreLogger('ScraperTool');
  private readonly uploadsDir: string;
  private readonly apiKey: string | undefined;

  constructor(scrapingBeeApiKey?: string) {
    this.uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    this.apiKey = scrapingBeeApiKey;
  }

  private async ensureUploadsDir() {
    await fs.mkdir(this.uploadsDir, { recursive: true });
  }

  private generateFilename(prefix: string, ext: string) {
    const hash = crypto.randomBytes(8).toString('hex');
    return `${prefix}_${Date.now()}_${hash}.${ext}`;
  }

  async scrapeWebsite(url: string): Promise<ScraperResult> {
    this.logger.info(`Iniciando scrape do site: ${url}`);
    await this.ensureUploadsDir();

    // Se temos a chave da ScrapingBee, usamos a API Premium
    if (this.apiKey) {
      try {
        const screenshotApiUrl = `https://app.scrapingbee.com/api/v1/?api_key=${this.apiKey}&url=${encodeURIComponent(url)}&screenshot=true&screenshot_full_page=true&window_width=1280&window_height=1080`;
        const screenshotRes = await fetch(screenshotApiUrl);
        if (screenshotRes.ok) {
          const screenshotBuffer = await screenshotRes.arrayBuffer();
          const screenshotName = this.generateFilename('web_screenshot', 'png');
          const screenshotPath = path.join(this.uploadsDir, screenshotName);
          await fs.writeFile(screenshotPath, Buffer.from(screenshotBuffer));

          const jsSnippet = `return { html: document.documentElement.outerHTML, styleTags: Array.from(document.querySelectorAll('style')).map(s => s.innerHTML) };`;
          const codeApiUrl = `https://app.scrapingbee.com/api/v1/?api_key=${this.apiKey}&url=${encodeURIComponent(url)}&js_snippet=${encodeURIComponent(jsSnippet)}`;
          const codeRes = await fetch(codeApiUrl);
          const codeHtml = await codeRes.text();
          
          const codeName = this.generateFilename('web_code', 'json');
          const codePath = path.join(this.uploadsDir, codeName);
          await fs.writeFile(codePath, JSON.stringify({ rawCode: codeHtml }, null, 2), 'utf-8');

          return { screenshotUrl: `/uploads/${screenshotName}`, codeUrl: `/uploads/${codeName}` };
        }
      } catch (err) {
        this.logger.warn('ScrapingBee falhou para website, usando fallback Puppeteer local...', { error: String(err) });
      }
    }

    // Fallback Puppeteer Local
    let browser = null;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,1080'],
      });
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 1080 });
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await new Promise(r => setTimeout(r, 3000));

      const screenshotName = this.generateFilename('web_screenshot', 'png');
      const screenshotPath = path.join(this.uploadsDir, screenshotName);
      await page.screenshot({ path: screenshotPath, fullPage: true });

      const data = await page.evaluate(() => {
        const html = document.documentElement.outerHTML;
        const styleTags = Array.from(document.querySelectorAll('style')).map(s => (s as HTMLStyleElement).innerHTML);
        return { html, styleTags };
      });

      const codeName = this.generateFilename('web_code', 'json');
      const codePath = path.join(this.uploadsDir, codeName);
      await fs.writeFile(codePath, JSON.stringify(data, null, 2), 'utf-8');

      return { screenshotUrl: `/uploads/${screenshotName}`, codeUrl: `/uploads/${codeName}` };
    } catch (error) {
      this.logger.error(`Erro no scrape do site (fallback): ${url}`, error);
      return { screenshotUrl: null, codeUrl: null };
    } finally {
      if (browser) await browser.close();
    }
  }

  async scrapeInstagramProfile(handle: string): Promise<ScraperResult> {
    this.logger.info(`Iniciando scrape do Instagram: @${handle}`);
    await this.ensureUploadsDir();

    const instagramUrl = `https://www.instagram.com/${handle}/`;

    // Se temos a chave da ScrapingBee, usamos a API Premium
    if (this.apiKey) {
      try {
        const screenshotApiUrl = `https://app.scrapingbee.com/api/v1/?api_key=${this.apiKey}&url=${encodeURIComponent(instagramUrl)}&screenshot=true&stealth_proxy=true&window_width=1280&window_height=1080&wait_browser=networkidle2`;
        const res = await fetch(screenshotApiUrl);
        if (res.ok) {
          const buffer = await res.arrayBuffer();
          const screenshotName = this.generateFilename('ig_screenshot', 'png');
          const screenshotPath = path.join(this.uploadsDir, screenshotName);
          await fs.writeFile(screenshotPath, Buffer.from(buffer));
          return { screenshotUrl: `/uploads/${screenshotName}`, codeUrl: null };
        }
      } catch (err) {
        this.logger.warn('ScrapingBee falhou para Instagram, usando fallback local...', { error: String(err) });
      }
    }

    // Fallback Puppeteer Local (via Instagram Embed URL)
    let browser = null;
    try {
      const embedUrl = `https://www.instagram.com/${handle}/embed/`;
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,1080'],
      });
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 1080 });
      await page.goto(embedUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      await new Promise(r => setTimeout(r, 2000));

      const screenshotName = this.generateFilename('ig_screenshot', 'png');
      const screenshotPath = path.join(this.uploadsDir, screenshotName);
      await page.screenshot({ path: screenshotPath, fullPage: false });

      return { screenshotUrl: `/uploads/${screenshotName}`, codeUrl: null };
    } catch (error) {
      this.logger.error(`Erro no scrape do Instagram (fallback): @${handle}`, error);
      return { screenshotUrl: null, codeUrl: null };
    } finally {
      if (browser) await browser.close();
    }
  }
}
