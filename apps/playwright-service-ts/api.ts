// index.ts

import express, { Request, Response } from 'express';
import bodyParser from 'body-parser';
import { chromium, Page, Browser, BrowserContext } from 'playwright';
import * as dotenv from 'dotenv';
import UserAgent from 'user-agents';
import { getError } from './helpers/get_error';
import { getProxyForCountry } from './firecrawl-proxy-manager';

dotenv.config();

const app = express();
const port = process.env.PORT || 3003;

app.use(bodyParser.json());

const BLOCK_MEDIA = (process.env.BLOCK_MEDIA || 'False').toUpperCase() === 'TRUE';

const AD_SERVING_DOMAINS = [
	'doubleclick.net',
	'adservice.google.com',
	'googlesyndication.com',
	'googletagservices.com',
	'googletagmanager.com',
	'google-analytics.com',
	'adsystem.com',
	'adservice.com',
	'adnxs.com',
	'ads-twitter.com',
	'facebook.net',
	'fbcdn.net',
	'amazon-adsystem.com'
];

interface UrlModel {
	url: string;
	wait_after_load?: number;
	timeout?: number;
	headers?: Record<string, string>;
	check_selector?: string;
	proxy?: string;
	proxy_username?: string;
	proxy_password?: string;
	country?: string;
}

const isValidUrl = (urlString: string): boolean => {
	console.log("isValidUrl | urlString: ", urlString);
	try {
		new URL(urlString);
		return true;
	} catch {
		return false;
	}
};

const scrapePage = async (
	page: Page,
	url: string,
	waitUntil: 'load' | 'networkidle',
	waitAfterLoad: number,
	timeout: number,
	checkSelector?: string
): Promise<{ content: string; status: number | null }> => {
	console.log(`Navigating to ${url} with waitUntil: ${waitUntil} and timeout: ${timeout}ms`);
	const response = await page.goto(url, { waitUntil, timeout });
	
	if (waitAfterLoad > 0) {
		await page.waitForTimeout(waitAfterLoad);
	}

	if (checkSelector) {
		try {
			await page.waitForSelector(checkSelector, { timeout });
		} catch {
			throw new Error('Required selector not found');
		}
	}

	return {
		content: await page.content(),
		status: response ? response.status() : null,
	};
};

app.post('/scrape', async (req: Request, res: Response) => {
	const {
		url,
		wait_after_load = 0,
		timeout = 15000,
		headers,
		check_selector,
		country,
		proxy,
		proxy_username,
		proxy_password,
	}: UrlModel = req.body;

	console.log(`================= Scrape Request =================`);
	console.log(`URL: ${url}`);
	console.log(`Wait After Load: ${wait_after_load}`);
	console.log(`Timeout: ${timeout}`);
	console.log(`Headers: ${headers ? JSON.stringify(headers) : 'None'}`);
	console.log(`Check Selector: ${check_selector ? check_selector : 'None'}`);
	console.log(`Passed Proxy: ${proxy ? proxy : 'None'}`);
	console.log(`Passed Proxy Country: ${country ? country : 'None'}`);
	console.log(`==================================================`);

	if (!url) {
		return res.status(400).json({ error: 'URL is required' });
	}

	if (!isValidUrl(url)) {
		return res.status(400).json({ error: 'Invalid URL' });
	}

	let browser: Browser | null = null;
	let context: BrowserContext | null = null;
	let page: Page | null = null;

	try {
		browser = await chromium.launch({
			headless: true,
			args: [
				'--no-sandbox',
				'--disable-setuid-sandbox',
				'--disable-dev-shm-usage',
				'--disable-accelerated-2d-canvas',
				'--no-first-run',
				'--no-zygote',
				'--single-process',
				'--disable-gpu',
			],
		});

		const userAgent = new UserAgent().toString();
		const viewport = { width: 1280, height: 800 };

		const contextOptions: Record<string, any> = {
			userAgent,
			viewport,
		};

		if (!proxy) {
			throw new Error("Proxy is required");
		}

		// Example: if your proxy is "http://192.168.150.80:1088"
		const parsed = new URL(proxy);

		// Fix: Properly call getProxyForCountry
		const upstreamProxy: string = getProxyForCountry(country || "US");

		if (!upstreamProxy) {
			throw new Error("Upstream proxy is required");
		}

		contextOptions.proxy = {
			server: upstreamProxy,
			username: proxy_username ?? '',
			password: proxy_password ?? '',
		};

		console.log("Proxy: ", proxy);
		console.log("contextOptions: ", contextOptions);
		console.log("contextOptions.proxy: ", contextOptions.proxy);

		if (!contextOptions.proxy) {
			throw new Error("Proxy is required");
		}

		context = await browser.newContext(contextOptions);

		// Optionally block images/audio if BLOCK_MEDIA is true
		if (BLOCK_MEDIA) {
			await context.route('**/*.{png,jpg,jpeg,gif,svg,mp3,mp4,avi,flac,ogg,wav,webm}', async route => {
				await route.abort();
			});
		}

		// Block ads
		await context.route('**/*', route => {
			const requestUrl = route.request().url();
			const hostname = new URL(requestUrl).hostname;
			if (AD_SERVING_DOMAINS.some(domain => hostname.includes(domain))) {
				console.log(`Blocking ad: ${hostname}`);
				return route.abort();
			}
			return route.continue();
		});

		page = await context.newPage();

		if (headers) {
			await page.setExtraHTTPHeaders(headers);
		}

		let content: string | undefined;
		let statusCode: number | null = null;

		try {
			console.log('Attempting strategy 1: Normal load');
			const result = await scrapePage(page, url, 'load', wait_after_load, timeout, check_selector);
			content = result.content;
			statusCode = result.status;
		} catch (error) {
			console.log('Strategy 1 failed, attempting strategy 2: Wait until networkidle');
			const result = await scrapePage(page, url, 'networkidle', wait_after_load, timeout, check_selector);
			content = result.content;
			statusCode = result.status;
		}

		const pageError = statusCode !== 200 ? getError(statusCode) : undefined;

		if (!pageError) {
			console.log(`✅ Scrape successful!`);
		} else {
			console.log(`🚨 Scrape failed with status code: ${statusCode} ${pageError}`);
		}

		res.json({
			content,
			pageStatusCode: statusCode,
			...(pageError && { pageError }),
		});
	} catch (err) {
		console.error('Uncaught error during scraping:', err);
		res.status(500).json({ error: 'An error occurred while fetching the page.' });
	} finally {
		// Clean up
		if (page) {
			await page.close().catch(() => {});
		}
		if (context) {
			await context.close().catch(() => {});
		}
		if (browser) {
			await browser.close().catch(() => {});
		}
	}
});

app.listen(port, () => {
	console.log(`Server is running on port ${port}`);
});
