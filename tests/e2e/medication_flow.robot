*** Settings ***
Documentation    Creates one isolated medication, records today's dose, and verifies the history entry on the dedicated Android emulator.
Library          AppiumLibrary    run_on_failure=No Operation
Suite Setup      Open Clean Reminder Application
Suite Teardown   Close All Applications
Test Tags        android    medication    smoke

*** Variables ***
${APP}           ${CURDIR}/../../mobile-app/android/app/build/outputs/apk/release/app-release.apk
${MEDICATION}    E2E Test İlacı

*** Test Cases ***
Add Medication And Record Dose
    Click Element    android=new UiSelector().descriptionContains(", İlaçlarım").clickable(true)
    Wait Until Page Contains    Tedavi Planı    15s
    Click Element    android=new UiSelector().textContains("Yeni İlaç Ekle")
    Wait Until Page Contains Element    android=new UiSelector().text("Yeni İlaç Ekle")    15s
    Input Text    android=new UiSelector().className("android.widget.EditText").instance(0)    ${MEDICATION}
    Click Element    accessibility_id=Kaydet
    Wait Until Page Contains    ${MEDICATION}    15s
    Click Element    android=new UiSelector().text("Stok & Envanter")
    Wait Until Page Contains Element    android=new UiSelector().text("Stok & Envanter")    15s
    Wait Until Page Contains Element    android=new UiSelector().text("30")    15s
    Page Should Contain Text    ${MEDICATION}
    Page Should Contain Text    30
    Click Element    android=new UiSelector().descriptionContains(", Bugün").clickable(true)
    Wait Until Page Contains    ${MEDICATION}    15s
    ${late_take}=    Set Variable    android=new UiSelector().text("Şimdi Al (Geç)")
    ${late_visible}=    Run Keyword And Return Status    Wait Until Page Contains Element    ${late_take}    5s
    IF    ${late_visible}
        Click Element    ${late_take}
    ELSE
        Click Element    android=new UiSelector().text("Al")
    END
    Click Element    android=new UiSelector().descriptionContains(", Geçmiş").clickable(true)
    Wait Until Page Contains    Bugünün Kayıtları    15s
    Page Should Contain Text    ${MEDICATION}
    Page Should Contain Text    Alındı
    Click Element    android=new UiSelector().descriptionContains(", İlaçlarım").clickable(true)
    Wait Until Page Contains    Tedavi Planı    15s
    Click Element    android=new UiSelector().text("Stok & Envanter")
    Wait Until Page Contains Element    android=new UiSelector().text("29")    15s
    Page Should Contain Text    ${MEDICATION}
    Page Should Contain Text    29
    Capture Page Screenshot    medication-flow.png

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
