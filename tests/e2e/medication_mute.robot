*** Settings ***
Documentation    Per-medicine mute on the dedicated Android emulator:
...              1. A new medicine schedules reminder alarms.
...              2. Muting it in the editor shows the "Sessiz" badge and removes all of its alarms.
...              3. Unmuting it brings the alarms back.
...              Uses a fresh app with a single medicine, so every pending alarm belongs to it.
Library          AppiumLibrary    run_on_failure=No Operation
Library          EmulatorNotificationProbe.py    ${UDID}
Suite Setup      Open Clean Reminder Application
Suite Teardown   Close All Applications
Test Tags        android    medication    notification

*** Variables ***
${UDID}          emulator-5554
${MEDICATION}    E2E Sessiz İlaç
${TAB_MEDS}      android=new UiSelector().descriptionContains(", İlaçlarım").clickable(true)
${MUTE_SWITCH}   accessibility_id=Bildirimleri sessize al

*** Test Cases ***
Muting A Medicine Removes Its Reminders Until Unmuted
    Click Element    ${TAB_MEDS}
    Wait Until Page Contains    Tedavi Planı    15s
    Click Element    android=new UiSelector().textContains("Yeni İlaç Ekle")
    Wait Until Page Contains Element    android=new UiSelector().text("Yeni İlaç Ekle")    15s
    Input Text    android=new UiSelector().className("android.widget.EditText").instance(0)    ${MEDICATION}
    Click Element    accessibility_id=Kaydet
    Wait Until Page Contains    ${MEDICATION}    15s
    Wait Until Keyword Succeeds    15s    1s    Reminder Alarms Should Exist
    Page Should Not Contain Element    android=new UiSelector().text("Sessiz")

    Set Mute    ${TRUE}
    Wait Until Page Contains Element    android=new UiSelector().text("Sessiz")    15s
    Wait Until Keyword Succeeds    15s    1s    Reminder Alarms Should Be Empty
    Capture Page Screenshot    muted-list.png

    Set Mute    ${FALSE}
    Wait Until Page Does Not Contain Element    android=new UiSelector().text("Sessiz")    15s
    Wait Until Keyword Succeeds    15s    1s    Reminder Alarms Should Exist

*** Keywords ***
Set Mute
    [Arguments]    ${state}
    Click Element    android=new UiSelector().text("${MEDICATION}")
    Wait Until Page Contains Element    accessibility_id=Kaydet    15s
    FOR    ${index}    IN RANGE    0    10
        ${visible}=    Run Keyword And Return Status    Element Should Be Visible    ${MUTE_SWITCH}
        IF    ${visible}    BREAK
        Swipe Screen Up
    END
    ${checked}=    Get Element Attribute    ${MUTE_SWITCH}    checked
    IF    '${checked}' != '${state}'.lower()    Click Element    ${MUTE_SWITCH}
    Capture Page Screenshot    mute-${state}-editor.png
    Click Element    accessibility_id=Kaydet
    Wait Until Page Contains    Tedavi Planı    15s

Reminder Alarms Should Exist
    ${times}=    Reminder Alarm Times
    Should Not Be Empty    ${times}

Reminder Alarms Should Be Empty
    ${times}=    Reminder Alarm Times
    Should Be Empty    ${times}

Open Clean Reminder Application
    Open Application    http://127.0.0.1:4723
    ...    platformName=Android
    ...    automationName=UiAutomator2
    ...    udid=${UDID}
    ...    appPackage=com.itmarti.reminder
    ...    appActivity=com.itmarti.reminder.MainActivity
    ...    noReset=${FALSE}
    ...    fullReset=${FALSE}
    ...    autoGrantPermissions=${TRUE}
    ...    forceAppLaunch=${TRUE}
    ...    newCommandTimeout=${300}
    Handle Android Permission Dialogs
    Wait Until Page Contains Element    ${TAB_MEDS}    30s

Handle Android Permission Dialogs
    FOR    ${index}    IN RANGE    0    4
        ${allow_visible}=    Run Keyword And Return Status    Wait Until Page Contains Element    id=com.android.permissioncontroller:id/permission_allow_button    3s
        IF    ${allow_visible}
            Click Element    id=com.android.permissioncontroller:id/permission_allow_button
        ELSE
            RETURN
        END
    END
