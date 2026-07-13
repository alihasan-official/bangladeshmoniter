import asyncio
from playwright.async_api import async_playwright

async def verify():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        # Set viewport
        await page.set_viewport_size({"width": 1920, "height": 1080})

        # Navigate
        print("Navigating to local site...")
        await page.goto("http://localhost:3000")
        await page.wait_for_timeout(4000)

        # Take a snapshot to verify pins are visible on map
        screenshot_path = "/home/jules/verification/verification_rss_pins.png"
        await page.screenshot(path=screenshot_path)
        print(f"Screenshot taken: {screenshot_path}")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(verify())
