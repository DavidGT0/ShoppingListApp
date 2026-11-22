from appium import webdriver
from appium.options.android import UiAutomator2Options
from appium.webdriver.common.appiumby import AppiumBy
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import os
import time

import pytest

TEST_USERNAME = os.environ.get("SHOPLI_TEST_USERNAME")
TEST_PASSWORD = os.environ.get("SHOPLI_TEST_PASSWORD")


def test_e2e_full_flow():
    if not TEST_USERNAME or not TEST_PASSWORD:
        pytest.skip("Set SHOPLI_TEST_USERNAME and SHOPLI_TEST_PASSWORD to run this test")

    options = UiAutomator2Options()
    options.platform_name = 'Android'
    options.automation_name = 'UIAutomator2'
    options.app = r'C:\SLA\ShoppingListFront\android\app\build\outputs\apk\debug\app-debug.apk'
    options.set_capability('appium:ignoreHiddenApiPolicyError', True)
    options.set_capability('appium:uiautomator2ServerInstallTimeout', 60000)

    print("\nמתחבר לשרת ופותח אפליקציה...")
    driver = webdriver.Remote('http://127.0.0.1:4723', options=options)

    try:
        # הגדלנו את ההמתנה ל-60 שניות כי יש בקשות רשת
        wait = WebDriverWait(driver, 60)

        # ----------------- שלב 1: מסך התחברות -----------------
        print("מקליד שם משתמש...")
        username_field = wait.until(EC.presence_of_element_located((AppiumBy.ACCESSIBILITY_ID, 'username_input')))
        username_field.send_keys(TEST_USERNAME)

        print("מקליד סיסמה...")
        password_field = wait.until(EC.presence_of_element_located((AppiumBy.ACCESSIBILITY_ID, 'password_input')))
        password_field.send_keys(TEST_PASSWORD)

        print("לוחץ על 'התחבר' וממתין לתשובת שרת...")
        login_btn = wait.until(EC.presence_of_element_located((AppiumBy.ACCESSIBILITY_ID, 'login_button')))
        login_btn.click()

        # ----------------- שלב 2: מסך בחירת רשימה (MyListsScreen) -----------------
        print("ממתין למעבר למסך הרשימות ובוחר רשימה...")
        # הרובוט ימתין עד שיופיע כרטיס רשימה וי לחץ עליו כדי להיכנס אליה
        list_card = wait.until(EC.presence_of_element_located((AppiumBy.ACCESSIBILITY_ID, 'list_card')))
        list_card.click()

        # ----------------- שלב 3: מסך הוספת מוצר (ShoppingListItems) -----------------
        print("נכנסנו לרשימה! מחפש שדה הוספת מוצר...")
        add_item_input = wait.until(EC.presence_of_element_located((AppiumBy.ACCESSIBILITY_ID, 'add_item_input')))

        print("מוסיף מוצר 'חלב שקדים'...")
        add_item_input.send_keys("חלב שקדים")

        add_button = wait.until(EC.presence_of_element_located((AppiumBy.ACCESSIBILITY_ID, 'add_item_button')))
        add_button.click()

        print("הטסט E2E המלא עבר בהצלחה מושלמת!")
        time.sleep(4)

    finally:
        driver.quit()