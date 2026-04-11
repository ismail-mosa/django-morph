import { test, expect } from "@playwright/test";

test.describe("Script ordering after morph", () => {
    test("inline scripts have access to data-morph-static libraries after morph", async ({ page }) => {
        await page.goto("/");
        await page.click('a[href="/js-test/"]');
        await page.waitForURL("/js-test/");
        await page.waitForTimeout(1000);

        const checks = await page.evaluate(() => ({
            Sortable: typeof window.Sortable !== "undefined",
            Chart: typeof window.Chart !== "undefined",
            flatpickr: typeof window.flatpickr !== "undefined",
            toastr: typeof window.toastr !== "undefined",
        }));

        expect(checks.Sortable).toBe(true);
        expect(checks.Chart).toBe(true);
        expect(checks.flatpickr).toBe(true);
        expect(checks.toastr).toBe(true);
    });

    test("Chart.js canvas renders after morph to js-test page", async ({ page }) => {
        await page.goto("/about/");
        await page.waitForTimeout(500);

        await page.click('a[href="/js-test/"]');
        await page.waitForURL("/js-test/");
        await page.waitForTimeout(1000);

        const rendered = await page.evaluate(() => {
            const canvas = document.getElementById("chartjs-bar");
            if (!canvas) return false;
            return canvas.toDataURL().length > 100;
        });

        expect(rendered).toBe(true);
    });

    test("no console errors from undefined libraries after morph", async ({ page }) => {
        const errors = [];
        page.on("console", (msg) => {
            if (msg.type() === "error") errors.push(msg.text());
        });

        await page.goto("/");
        await page.click('a[href="/js-test/"]');
        await page.waitForURL("/js-test/");
        await page.waitForTimeout(1500);

        const scriptErrors = errors.filter(
            (e) => e.includes("is not defined") || e.includes("ReferenceError")
        );
        expect(scriptErrors).toHaveLength(0);
    });
});
