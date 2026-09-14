*** Settings ***
Documentation    Verifies the required medication-name validation and recovery after the alert.
Library          AppiumLibrary    run_on_failure=No Operation
Suite Setup      Open Clean Reminder Application
Suite Teardown   Close All Applications
Test Tags        android    medication    validation

*** Variables ***
${APP}           ${CURDIR}/../../mobile-app/android/app/build/outputs/apk/release/app-release.apk
${MEDICATION}    E2E Validation İlacı

*** Test Cases ***
Medication Name Is Required
    Click Element    android=new UiSelector().descriptionContains(", İlaçlarım").clickable(true)
    Wait Until Page Contains    Tedavi Planı    15s
    Click Element    android=new UiSelector().textContains("Yeni İlaç Ekle")
    Wait Until Page Contains Element    android=new UiSelector().text("Yeni İlaç Ekle")    15s
    Click Element    accessibility_id=Kaydet
    Wait Until Page Contains    Eksik Bilgi    10s
    Wait Until Page Contains    Lütfen ilaç adını giriniz.    10s
    Click Element    android=new UiSelector().resourceId("android:id/button1")
    Wait Until Page Contains Element    android=new UiSelector().text("Yeni İlaç Ekle")    10s
    Input Text    android=new UiSelector().className("android.widget.EditText").instance(0)    ${MEDICATION}
    Click Element    accessibility_id=Kaydet
    Wait Until Page Contains    ${MEDICATION}    15s
    Page Should Not Contain Text    Eksik Bilgi

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
