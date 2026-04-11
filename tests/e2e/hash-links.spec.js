import { test, expect } from "@playwright/test";

test.describe("Hash / anchor links", () => {
    test("clicking anchor link scrolls to section without triggering morph", async ({ page }) => {
        await page.goto("/anchors/");

        page.on("request", (req) => {
            if (req.url().includes("/anchors/") && req.url() !== page.url()) {
                throw new Error("Unexpected fetch request during hash navigation");
            }
        });

        await page.click('a[href="#section-gamma"]');
        await page.waitForTimeout(500);

        await expect(page).toHaveURL(/#section-gamma$/);
        expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(100);
    });

    test("clicking multiple anchor links updates URL and scroll position", async ({ page }) => {
        await page.goto("/anchors/");

        await page.click('a[href="#section-beta"]');
        await page.waitForTimeout(300);
        await expect(page).toHaveURL(/#section-beta$/);
        const betaY = await page.evaluate(() => window.scrollY);
        expect(betaY).toBeGreaterThan(100);

        await page.click('a[href="#section-gamma"]');
        await page.waitForTimeout(300);
        await expect(page).toHaveURL(/#section-gamma$/);
        const gammaY = await page.evaluate(() => window.scrollY);
        expect(gammaY).toBeGreaterThan(betaY);
    });

    test("browser back from anchor restores previous hash", async ({ page }) => {
        await page.goto("/anchors/");

        await page.click('a[href="#section-gamma"]');
        await page.waitForTimeout(300);
        await page.click('a[href="#section-beta"]');
        await page.waitForTimeout(300);

        await page.goBack();
        await page.waitForTimeout(300);
        await expect(page).toHaveURL(/#section-gamma$/);
    });

    test("hash-only back/forward does not trigger a morph fetch", async ({ page }) => {
        await page.goto("/anchors/");

        let morphRequests = 0;
        page.on("request", (req) => {
            const headers = req.headers();
            if (headers["x-django-morph"] === "true") {
                morphRequests++;
            }
        });

        await page.click('a[href="#section-gamma"]');
        await page.waitForTimeout(300);
        await page.click('a[href="#section-beta"]');
        await page.waitForTimeout(300);
        await page.goBack();
        await page.waitForTimeout(300);

        expect(morphRequests).toBe(0);
    });
});
