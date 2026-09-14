*** Settings ***
Documentation    Native navigation smoke test for the Turkish UI on the dedicated Android emulator. Preserves app data; does not test notifications or sync.
Library          AppiumLibrary    run_on_failure=No Operation
Library          OperatingSystem
Suite Setup      Open Reminder Application
Suite Teardown   Close All Applications
Test Template    Tab Opens
Test Tags        android    smoke

*** Variables ***
${APP}           ${CURDIR}/../../mobile-app/android/app/build/outputs/apk/release/app-release.apk

*** Test Cases ***                           TAB          SCREEN MARKER         SCREENSHOT
Medication List Opens                       İlaçlarım    Tedavi Planı          medications.png
History Opens                               Geçmiş       Son 7 Gün             history.png
Settings Opens                              Ayarlar      Kullanıcı Profili     settings.png
Today Opens                                 Bugün        Günün Kalanı          today.png

*** Keywords ***
Open Reminder Application
    Open Application    http://127.0.0.1:4723
    ...    platformName=Android
    ...    automationName=UiAutomator2
    ...    udid=emulator-5554
    ...    appPackage=com.itmarti.reminder
    ...    appActivity=com.itmarti.reminder.MainActivity
    ...    noReset=${TRUE}
    ...    fullReset=${FALSE}
    ...    autoGrantPermissions=${TRUE}
    ...    forceAppLaunch=${TRUE}
    ...    newCommandTimeout=${120}
    Handle Android Permission Dialogs
    Wait Until Page Contains Element    android=new UiSelector().descriptionContains(", İlaçlarım").clickable(true)    30s

Handle Android Permission Dialogs
    FOR    ${index}    IN RANGE    0    4
        ${allow_visible}=    Run Keyword And Return Status    Wait Until Page Contains Element    id=com.android.permissioncontroller:id/permission_allow_button    3s
        IF    ${allow_visible}
            Click Element    id=com.android.permissioncontroller:id/permission_allow_button
        ELSE
            RETURN
        END
    END

Tab Opens
    [Arguments]    ${tab}    ${marker}    ${screenshot}
    ${locator}=    Set Variable    android=new UiSelector().className("android.view.ViewGroup").descriptionContains(", ${tab}").clickable(true)
    Wait Until Page Contains Element    ${locator}    15s
    Click Element    ${locator}
    Wait Until Page Contains Element    android=new UiSelector().text("${marker}")    15s
    ${source}=    Get Source
    Create File    ${OUTPUTDIR}/${tab}-source.xml    ${source}
    Capture Page Screenshot    ${screenshot}
