*** Settings ***
Documentation    Verifies native Android notification delivery while the app is in the background.
Library          AppiumLibrary    run_on_failure=No Operation
Suite Setup      Open Clean Reminder Application
Suite Teardown   Close All Applications
Test Tags        android    notification    background

*** Variables ***
${APP}           ${CURDIR}/../../mobile-app/android/app/build/outputs/apk/release/app-release.apk

*** Test Cases ***
Test Notification Reaches Android Notification Shade In Background
    Clear Existing Android Notifications
    Click Element    android=new UiSelector().descriptionContains(", Ayarlar").clickable(true)
    Wait Until Page Contains    Kullanıcı Profili    15s
    Click Element    android=new UiSelector().text("Görünüm")
    Wait Until Page Contains    İlaç Adını Gizle    15s
    ${test_notification}=    Set Variable    android=new UiSelector().text("3 Sn Sonra Test Bildirimi Gönder")
    Scroll Down    ${test_notification}    20s    1s
    Click Element    ${test_notification}
    Press Keycode    3
    Reminder Should Be In Background
    Sleep    5s
    Reminder Should Be In Background
    Press Keycode    83
    Wait Until Page Contains Element    android=new UiSelector().packageName("com.android.systemui").text("⏰ İlaç Vakti")    15s
    ${notification_source}=    Get Source
    Should Contain    ${notification_source}    ⏰ İlaç Vakti
    Should Contain    ${notification_source}    Planlı ilacınızı alma zamanı geldi.
    Press Keycode    4
    Activate Application    com.itmarti.reminder
    Wait Until Page Contains Element    android=new UiSelector().descriptionContains(", Bugün").clickable(true)    10s

*** Keywords ***
Reminder Should Be In Background
    ${state}=    Execute Script    mobile: queryAppState    appId=com.itmarti.reminder
    Should Be Equal As Integers    ${state}    3

Open Clean Reminder Application
    Open Application    http://127.0.0.1:4723
    ...    platformName=Android
    ...    automationName=UiAutomator2
    ...    udid=emulator-5554
    ...    appPackage=com.itmarti.reminder
    ...    appActivity=com.itmarti.reminder.MainActivity
    ...    noReset=${FALSE}
    ...    fullReset=${FALSE}
    ...    autoGrantPermissions=${TRUE}
    ...    forceAppLaunch=${TRUE}
    ...    newCommandTimeout=${180}
    Handle Android Permission Dialogs
    Wait Until Page Contains Element    android=new UiSelector().descriptionContains(", Bugün").clickable(true)    30s

Handle Android Permission Dialogs
    FOR    ${index}    IN RANGE    0    4
        ${allow_visible}=    Run Keyword And Return Status    Wait Until Page Contains Element    id=com.android.permissioncontroller:id/permission_allow_button    3s
        IF    ${allow_visible}
            Click Element    id=com.android.permissioncontroller:id/permission_allow_button
        ELSE
            RETURN
        END
    END

Clear Existing Android Notifications
    Press Keycode    83
    ${clear_visible}=    Run Keyword And Return Status    Wait Until Page Contains Element    id=com.android.systemui:id/dismiss_text    3s
    IF    ${clear_visible}
        Click Element    id=com.android.systemui:id/dismiss_text
    END
    Press Keycode    4
    Wait Until Page Contains Element    android=new UiSelector().descriptionContains(", Bugün").clickable(true)    10s
