*** Settings ***
Documentation    Navigation checks on an explicitly selected physical Android phone using its installed app and existing data.
Library          AppiumLibrary
Suite Setup      Open Installed Reminder Application
Suite Teardown   Close All Applications
Test Template    Tab Opens On Phone
Test Tags        android    physical-device    smoke

*** Variables ***
${UDID}          %{ANDROID_UDID=}
${APPIUM_URL}    http://127.0.0.1:4723

*** Test Cases ***                           TAB          SCREEN MARKER
Medication List Opens On Phone              İlaçlarım    Tedavi Planı
History Opens On Phone                      Geçmiş       Son 7 Gün
Settings Opens On Phone                     Ayarlar      Kullanıcı Profili
Today Opens On Phone                        Bugün        Günün Kalanı

*** Keywords ***
Open Installed Reminder Application
    Should Not Be Empty    ${UDID}    Set ANDROID_UDID to the physical phone serial shown by adb devices -l.
    Should Not Start With    ${UDID}    emulator-    This suite requires an explicitly selected physical phone.
    Open Application    ${APPIUM_URL}
    ...    platformName=Android
    ...    automationName=UiAutomator2
    ...    udid=${UDID}
    ...    appPackage=com.itmarti.reminder
    ...    appActivity=com.itmarti.reminder.MainActivity
    ...    noReset=${TRUE}
    ...    fullReset=${FALSE}
    ...    autoGrantPermissions=${FALSE}
    ...    forceAppLaunch=${FALSE}
    ...    dontStopAppOnReset=${TRUE}
    ...    shouldTerminateApp=${FALSE}
    ...    newCommandTimeout=${120}
    Activate Application    com.itmarti.reminder
    Wait Until Page Contains Element    android=new UiSelector().descriptionContains(", İlaçlarım").clickable(true)    30s

Tab Opens On Phone
    [Arguments]    ${tab}    ${marker}
    ${locator}=    Set Variable    android=new UiSelector().className("android.view.ViewGroup").descriptionContains(", ${tab}").clickable(true)
    Wait Until Page Contains Element    ${locator}    15s
    Click Element    ${locator}
    Wait Until Page Contains Element    android=new UiSelector().text("${marker}")    15s
