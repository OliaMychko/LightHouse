const fs = require('fs')
const puppeteer = require('puppeteer')
const lighthouse = require('lighthouse/lighthouse-core/fraggle-rock/api.js')

const waitTillHTMLRendered = async (page, timeout = 30000) => {
  const checkDurationMsecs = 1000;
  const maxChecks = timeout / checkDurationMsecs;
  let lastHTMLSize = 0;
  let checkCounts = 1;
  let countStableSizeIterations = 0;
  const minStableSizeIterations = 3;

  while(checkCounts++ <= maxChecks){
    let html = await page.content();
    let currentHTMLSize = html.length; 

    let bodyHTMLSize = await page.evaluate(() => document.body.innerHTML.length);

    //console.log('last: ', lastHTMLSize, ' <> curr: ', currentHTMLSize, " body html size: ", bodyHTMLSize);

    if(lastHTMLSize != 0 && currentHTMLSize == lastHTMLSize) 
      countStableSizeIterations++;
    else 
      countStableSizeIterations = 0; //reset the counter

    if(countStableSizeIterations >= minStableSizeIterations) {
      console.log("Fully Rendered Page: " + page.url());
      break;
    }

    lastHTMLSize = currentHTMLSize;
    await page.waitForTimeout(checkDurationMsecs);
  }  
};

async function captureReport() {
	const browser = await puppeteer.launch({args: ['--allow-no-sandbox-job', '--allow-sandbox-debugging', '--no-sandbox', '--disable-gpu', '--disable-gpu-sandbox', '--display', '--ignore-certificate-errors', '--disable-storage-reset=true']});
	//const browser = await puppeteer.launch({"headless": false, args: ['--allow-no-sandbox-job', '--allow-sandbox-debugging', '--no-sandbox', '--ignore-certificate-errors', '--disable-storage-reset=true']});
	const page = await browser.newPage();
	const baseURL = "http://localhost/";
	
	await page.setViewport({"width":1920,"height":1080});
	await page.setDefaultTimeout(10000);
	
	const navigationPromise = page.waitForNavigation({timeout: 30000, waitUntil: ['domcontentloaded']});
	await page.goto(baseURL);
    await navigationPromise;
		
	const flow = await lighthouse.startFlow(page, {
		name: 'demoblaze',
		configContext: {
		  settingsOverrides: {
			throttling: {
			  rttMs: 40,
			  throughputKbps: 10240,
			  cpuSlowdownMultiplier: 1,
			  requestLatencyMs: 0,
			  downloadThroughputKbps: 0,
			  uploadThroughputKbps: 0
			},
			throttlingMethod: "simulate",
			screenEmulation: {
			  mobile: false,
			  width: 1920,
			  height: 1080,
			  deviceScaleFactor: 1,
			  disabled: false,
			},
			formFactor: "desktop",
			onlyCategories: ['performance'],
		  },
		},
	});

  	//================================NAVIGATE================================
    await flow.navigate(baseURL, {
		stepName: 'open main page'
		});
  	console.log('main page is opened');
	
	
	//================================SELECTORS================================
	const tableTab      = ".main-menu>nav>ul> li:nth-child(2) > a";
	const tableProduct = "div.product-wrap.mb-25 > div.product-img > a > img";
	const addToCartButton = ".pro-details-cart > button";
	const cartIcon="div.same-style.cart-wrap.d-none.d-lg-block > button";
	const viewCart   = ".default-btn[href='/cart']";
	const proceedToCheckout    = ".grand-totall > a";
	const checkout   = "[to='/checkout']";

	//================================PAGE_ACTIONS================================
	await page.waitForSelector(tableTab);
	await flow.startTimespan({ stepName: 'open table tab' });
	    await page.click(tableTab);
	    await waitTillHTMLRendered(page);
	    await page.waitForSelector(tableProduct);
    await flow.endTimespan();
    console.log('table tab is opened');
	
	
	await flow.startTimespan({ stepName: 'open table' });
		await page.click(tableProduct);
        await waitTillHTMLRendered(page);
		await page.waitForSelector(addToCartButton);
    await flow.endTimespan();
    console.log('table product is opened');


	await flow.startTimespan({ stepName: 'add table to cart' });
		await page.click(addToCartButton);
		await waitTillHTMLRendered(page);
		await page.waitForSelector(cartIcon);
	await flow.endTimespan();
	console.log('table is added to cart');

	await flow.startTimespan({ stepName: 'open cart' });
		await page.click(cartIcon);
		await page.waitForSelector(viewCart);
		await waitTillHTMLRendered(page);
		await page.click(viewCart);
		await page.waitForSelector(proceedToCheckout);
	await flow.endTimespan();
	console.log('cart is opened');

	await flow.startTimespan({ stepName: 'proceed to checkout' });
		await page.click(proceedToCheckout);
		await waitTillHTMLRendered(page);
		await page.waitForSelector(checkout);
	await flow.endTimespan();
	console.log('user is on checkout page');



	//================================REPORTING================================
	const reportPath = __dirname + '/user-flow.report.html';
	//const reportPathJson = __dirname + '/user-flow.report.json';

	const report = flow.generateReport();
	//const reportJson = JSON.stringify(flow.getFlowResult()).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
	
	fs.writeFileSync(reportPath, (await report).toString());
	//fs.writeFileSync(reportPathJson, reportJson);
	
    await browser.close();
}
captureReport();