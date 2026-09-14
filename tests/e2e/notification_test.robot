*** Settings ***
Documentation    Verifies the in-app test notification scheduling and foreground delivery callback on Android.
Library          AppiumLibrary    run_on_failure=No Operation
Suite Setup      Open Clean Reminder Application
Suite Teardown   Close All Applications
Test Tags        android    notification

*** Variables ***
${APP}           ${CURDIR}/../../mobile-app/android/app/build/outputs/apk/release/app-release.apk

*** Test Cases ***
Test Notification Is Delivered In Foreground
    Click Element    android=new UiSelector().descriptionContains(", Ayarlar").clickable(true)
    Wait Until Page Contains    Kullanıcı Profili    15s
    Click Element    android=new UiSelector().text("Gizlilik & Kilit Ekranı")
    Wait Until Page Contains    İlaç Adını Gizle    15s
    ${test_notification}=    Set Variable    android=new UiSelector().text("3 Sn Sonra Test Bildirimi Gönder")
    Scroll Down    ${test_notification}    20s    1s
    Click Element    ${test_notification}
    Wait Until Page Contains    Test bildirimi zamanlandı    5s
    Wait Until Page Contains    RUTİN · BİLDİRİM    10s
    Page Should Contain Text    ⏰ İlaç Vakti

*** Keywords ***
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
