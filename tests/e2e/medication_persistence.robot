*** Settings ***
Documentation    Verifies that a medication survives an app relaunch and that edits are persisted.
Library          AppiumLibrary    run_on_failure=No Operation
Suite Setup      Open Clean Reminder Application
Suite Teardown   Close All Applications
Test Tags        android    medication    persistence

*** Variables ***
${APP}           ${CURDIR}/../../mobile-app/android/app/build/outputs/apk/release/app-release.apk
${MEDICATION}    E2E Persistence İlacı
${RENAMED}       E2E Persistence Güncellenmiş

*** Test Cases ***
Medication Persists And Can Be Edited
    Click Element    android=new UiSelector().descriptionContains(", İlaçlarım").clickable(true)
    Wait Until Page Contains    Tedavi Planı    15s
    Click Element    android=new UiSelector().textContains("Yeni İlaç Ekle")
    Wait Until Page Contains Element    android=new UiSelector().text("Yeni İlaç Ekle")    15s
    Input Text    android=new UiSelector().className("android.widget.EditText").instance(0)    ${MEDICATION}
    Click Element    accessibility_id=Kaydet
    Wait Until Page Contains    ${MEDICATION}    15s
    Sleep    2s
    Terminate Application    com.itmarti.reminder
    Activate Application    com.itmarti.reminder
    Click Element    android=new UiSelector().descriptionContains(", İlaçlarım").clickable(true)
    Wait Until Page Contains    Tedavi Planı    15s
    Wait Until Page Contains    ${MEDICATION}    20s
    Click Element    android=new UiSelector().text("${MEDICATION}")
    Wait Until Page Contains Element    android=new UiSelector().text("İlacı Düzenle")    15s
    Clear Text    android=new UiSelector().className("android.widget.EditText").instance(0)
    Input Text    android=new UiSelector().className("android.widget.EditText").instance(0)    ${RENAMED}
    Click Element    accessibility_id=Kaydet
    Wait Until Page Contains    ${RENAMED}    15s
    Page Should Not Contain Text    ${MEDICATION}
    Sleep    2s
    Terminate Application    com.itmarti.reminder
    Activate Application    com.itmarti.reminder
    Click Element    android=new UiSelector().descriptionContains(", İlaçlarım").clickable(true)
    Wait Until Page Contains    Tedavi Planı    15s
    Wait Until Page Contains    ${RENAMED}    20s
    Click Element    android=new UiSelector().text("${RENAMED}")
    ${delete_locator}=    Set Variable    android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().text("İlacı Sil"))
    Wait Until Page Contains Element    ${delete_locator}    15s
    Click Element    ${delete_locator}
    Wait Until Page Contains    Bu ilacı silmek istediğinizden emin misiniz?    10s
    Click Element    android=new UiSelector().resourceId("android:id/button1")
    Wait Until Page Does Not Contain    ${RENAMED}    15s
    Page Should Not Contain Text    ${MEDICATION}

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
