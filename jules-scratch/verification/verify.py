from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()
    page.goto("http://localhost:5174/", timeout=60000)

    page.screenshot(path="jules-scratch/verification/before_signin_click.png")

    # Wait for the sign in button to be visible
    sign_in_button = page.get_by_role("button", name="Sign In")
    sign_in_button.wait_for(state="visible")
    sign_in_button.click()

    # Fill in the email and password
    page.get_by_placeholder("your@email.com").fill("test@test.com")
    page.get_by_placeholder("••••••••").fill("12345678")

    # Click the sign in button
    page.get_by_role("button", name="Sign In").click()

    # Wait for the page to load after login
    expect(page.get_by_text("Your Shelf")).to_be_visible()

    page.screenshot(path="jules-scratch/verification/after_login.png")
    browser.close()

with sync_playwright() as playwright:
    run(playwright)
