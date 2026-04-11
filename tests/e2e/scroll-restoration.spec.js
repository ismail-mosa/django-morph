import { test, expect } from "@playwright/test";

test.describe("Scroll restoration", () => {
    test("forward morph navigation scrolls to top", async ({ page }) => {
        await page.goto("/long/");
        await page.evaluate(() => window.scrollTo(0, 2000));
        await page.waitForTimeout(100);

        await page.evaluate(() => {
            document.querySelector('a[href="/about/"]').click();
        });
        await page.waitForURL("/about/");
        await page.waitForTimeout(300);

        expect(await page.evaluate(() => window.scrollY)).toBe(0);
    });

    test("browser back restores scroll position", async ({ page }) => {
        await page.goto("/long/");
        await page.waitForTimeout(300);

        await page.evaluate(() => window.scrollTo(0, 1500));
        await page.waitForTimeout(100);

        await page.evaluate(() => {
            document.querySelector('a[href="/about/"]').click();
        });
        await page.waitForURL("/about/");
        await page.waitForTimeout(300);

        await page.goBack();
        await page.waitForURL("/long/");
        await page.waitForTimeout(500);

        const scrollY = await page.evaluate(() => window.scrollY);
        expect(scrollY).toBeGreaterThan(500);
    });

    test("browser forward restores scroll position", async ({ page }) => {
        await page.goto("/long/");
        await page.waitForTimeout(300);

        await page.evaluate(() => window.scrollTo(0, 1500));
        await page.waitForTimeout(100);

        await page.evaluate(() => {
            document.querySelector('a[href="/about/"]').click();
        });
        await page.waitForURL("/about/");
        await page.waitForTimeout(300);

        await page.goBack();
        await page.waitForURL("/long/");
        await page.waitForTimeout(300);

        await page.goForward();
        await page.waitForURL("/about/");
        await page.waitForTimeout(300);

        expect(await page.evaluate(() => window.scrollY)).toBe(0);
    });

    test("navigating to same page resets scroll to top", async ({ page }) => {
        await page.goto("/long/");
        await page.evaluate(() => window.scrollTo(0, 1000));
        await page.waitForTimeout(100);

        await page.evaluate(() => {
            document.querySelector('a[href="/about/"]').click();
        });
        await page.waitForURL("/about/");

        await page.evaluate(() => {
            document.querySelector('a[href="/long/"]').click();
        });
        await page.waitForURL("/long/");
        await page.waitForTimeout(300);

        expect(await page.evaluate(() => window.scrollY)).toBe(0);
    });
});
