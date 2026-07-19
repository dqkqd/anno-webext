import { type BrowserContext, test as base, chromium, firefox } from '@playwright/test';
import { randomUUID } from 'crypto';
import path from 'path';
import { withExtension } from 'playwright-webextext';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const pathToExtension = path.join(__dirname, './dist');

type HtmlWithUrl = {
	html: string;
	url: string;
};

type Fixtures = {
	context: BrowserContext;
	extensionId: string;
	popupUrl: string;
	annotatedUrls: (...htmls: (string | HtmlWithUrl)[]) => Promise<string[]>;
};

export const test = base.extend<Fixtures>({
	// eslint-disable-next-line no-empty-pattern
	context: async ({}, use, testInfo) => {
		if (testInfo.project.name === 'firefox') {
			const browserTypeWithExtension = withExtension(firefox, pathToExtension);
			const browser = await browserTypeWithExtension.launch();
			const context = await browser.newContext();
			await use(context);
			await context.close();
			await browser.close();
		} else {
			const context = await chromium.launchPersistentContext('', {
				channel: 'chromium',
				args: [
					`--disable-extensions-except=${pathToExtension}`,
					`--load-extension=${pathToExtension}`,
				],
			});
			await use(context);
			await context.close();
		}
	},
	extensionId: async ({ context }, use, testInfo) => {
		if (testInfo.project.name === 'firefox') {
			throw new Error('Not supported');
		}
		let [serviceWorker] = context.serviceWorkers();
		if (!serviceWorker) {
			serviceWorker = await context.waitForEvent('serviceworker');
		}
		const extensionId = serviceWorker.url().split('/')[2];
		await use(extensionId);
	},
	popupUrl: async ({ extensionId }, use, testInfo) => {
		if (testInfo.project.name === 'firefox') {
			throw new Error('Not supported');
		}
		await use(`chrome-extension://${extensionId}/index.html`);
	},
	annotatedUrls: ({ context }, use) => {
		async function annotatedUrls(...htmls: (string | HtmlWithUrl)[]) {
			const urls: string[] = [];
			for (const html of htmls) {
				const { url, body } =
					typeof html === 'string'
						? { url: `http://localhost:3000/${randomUUID().toString()}`, body: html }
						: { url: html.url, body: html.html };

				await context.route(
					(routeUrl) => routeUrl.toString().startsWith(url),
					(route) => route.fulfill({ contentType: 'text/html', body }),
				);
				urls.push(url);
			}
			return urls;
		}
		return use(annotatedUrls);
	},
});

export const expect = base.expect;
