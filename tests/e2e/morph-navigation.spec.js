import { test, expect } from "@playwright/test";

test.describe("Morph navigation basics", () => {
    test("clicking a nav link updates URL without full reload", async ({ page }) => {
        await page.goto("/");

        let fullReloads = 0;
        page.on("framenavigated", (frame) => {
            if (frame === page.mainFrame()) fullReloads++;
        });

        await page.click('a[href="/about/"]');
        await page.waitForURL("/about/");

        await expect(page).toHaveURL("/about/");
        await expect(page.locator("h1")).toContainText("About");

        expect(fullReloads).toBeLessThanOrEqual(1);
    });

    test("page title updates after morph", async ({ page }) => {
        await page.goto("/");
        await expect(page).toHaveTitle("Home - Django Morph Test");

        await page.click('a[href="/about/"]');
        await page.waitForURL("/about/");
        await expect(page).toHaveTitle("About - Django Morph Test");
    });

    test("morph script execution increments counter", async ({ page }) => {
        await page.goto("/");

        const count1 = await page.evaluate(() => window.__morphCount || 0);

        await page.click('a[href="/about/"]');
        await page.waitForURL("/about/");
        await page.waitForTimeout(200);

        await page.click('a[href="/"]');
        await page.waitForURL("/");
        await page.waitForTimeout(200);

        const count2 = await page.evaluate(() => window.__morphCount || 0);
        expect(count2).toBeGreaterThan(count1);
    });

    test("data-morph=false link does not morph-navigate on click", async ({ page }) => {
        await page.goto("/");
        await page.waitForTimeout(300);

        let navigatedViaMorph = false;
        page.on("request", (req) => {
            if (req.url().includes("/error/") && req.headers()["x-django-morph"] === "true") {
                navigatedViaMorph = true;
            }
        });

        const hasMorphFalseLink = await page.evaluate(() => {
            const link = document.querySelector('a[href="/error/"]');
            return link ? link.getAttribute("data-morph") : null;
        });

        if (hasMorphFalseLink === "false") {
            await page.locator('a[href="/error/"]').dispatchEvent("click");
            await page.waitForTimeout(500);
            expect(navigatedViaMorph).toBe(false);
        }
    });

    test("browser back/forward updates URL and content", async ({ page }) => {
        await page.goto("/");
        await page.click('a[href="/about/"]');
        await page.waitForURL("/about/");

        await page.goBack();
        await page.waitForURL("/");
        await expect(page.locator("h1")).toContainText("Home");

        await page.goForward();
        await page.waitForURL("/about/");
        await expect(page.locator("h1")).toContainText("About");
    });

    test("X-Django-Morph header is sent on navigation", async ({ page }) => {
        let captured = false;
        page.on("request", (req) => {
            if (req.url().includes("/about/")) {
                if (req.headers()["x-django-morph"] === "true") {
                    captured = true;
                }
            }
        });

        await page.goto("/");
        await page.click('a[href="/about/"]');
        await page.waitForURL("/about/");

        expect(captured).toBe(true);
    });
});
