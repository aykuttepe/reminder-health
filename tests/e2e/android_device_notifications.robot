*** Settings ***
Documentation    Fresh native test notifications on an installed physical app, preserving data and settings. Lock test runs last.
Library          AppiumLibrary    run_on_failure=No Operation
Library          AndroidNotificationProbe.py    ${UDID}
Suite Setup      Open Installed Reminder For Notifications
Suite Teardown   Close All Applications
Test Setup       Open Notification Test Settings
Test Teardown    Restore Phone After Notification Test
Test Tags        android    physical-device    notification

*** Variables ***
${UDID}          %{ANDROID_UDID=}
${APPIUM_URL}    http://127.0.0.1:4723

*** Test Cases ***
Fresh Native Notification Arrives In Background
    Trigger And Verify Native Test Notification

Fresh Native Notification Arrives While Locked
    [Tags]    lock-screen
    Trigger And Verify Native Test Notification    locked=${TRUE}

*** Keywords ***
Open Installed Reminder For Notifications
    Phone Should Be Unlocked
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
    ...    skipUnlock=${TRUE}
    ...    newCommandTimeout=${120}

Open Notification Test Settings
    Phone Should Be Unlocked
    Bring Installed Reminder To Foreground
    Wait Until Page Contains Element    android=new UiSelector().descriptionContains(", Ayarlar").clickable(true)    15s
    Click Element    android=new UiSelector().descriptionContains(", Ayarlar").clickable(true)
    ${privacy}=    Run Keyword And Return Status    Page Should Contain Text    İlaç Adını Gizle
    IF    not ${privacy}
        Wait Until Page Contains    Kullanıcı Profili    15s
        Click Element    android=new UiSelector().text("Görünüm")
        Wait Until Page Contains    İlaç Adını Gizle    15s
    END
    Scroll Down    android=new UiSelector().text("3 Sn Sonra Test Bildirimi Gönder")    20s    1s
