*** Settings ***
Documentation    Verifies a real medication plan reminder on emulator, not the settings test notification:
...              1. A dose planned a few minutes ahead is posted by Android at its slot while the
...                 app is in background and the screen is off; delivery lag is measured from
...                 the system notification record.
...              2. "İlaç İçildi" on that reminder reduces stock and prevents the +3 min repeat.
...              3. Control: an untaken dose does post the +3 min repeat.
...              4. A deleted medication does not post its planned reminder.
...              Times come from the emulator clock; runs within 5 minutes of midnight are refused.
Library          AppiumLibrary    run_on_failure=No Operation
Library          Collections
Library          EmulatorNotificationProbe.py    ${UDID}
Test Setup       Open Clean Reminder Application
Test Teardown    Close Reminder And Restore Screen
Test Tags        android    notification    schedule    slow

*** Variables ***
${UDID}          emulator-5554
${MEDICATION}    Plan Test İlacı
${MAX_LAG_MS}    ${60000}
${TAB_TODAY}     android=new UiSelector().descriptionContains(", Bugün").clickable(true)
${TAB_MEDS}      android=new UiSelector().descriptionContains(", İlaçlarım").clickable(true)
${ACTION_TAKEN}  android=new UiSelector().resourceId("android:id/action0").text("✅ İlaç İçildi")

*** Test Cases ***
Planned Dose Reminder Arrives On Time And Taken Action Stops Repeats
    ${target}=    Schedule Target    3
    Add Medication At Time    ${MEDICATION}    ${target}[hour]    ${target}[minute]
    Stock Should Be    30
    ${main_tag}=    Set Variable    dose-*-${target}[date]-${target}[time]-main
    Press Keycode    3
    Reminder Should Be In Background
    Turn Screen Off
    ${posted}=    Wait For Reminder Notification    ${main_tag}    ${target}[epoch_ms]
    ${lag}=    Evaluate    ${posted} - ${target}[epoch_ms]
    Log    Planned reminder posted ${lag} ms after its slot (screen off, app in background).    console=True
    Should Be True    ${lag} >= 0    Reminder was posted before its slot.
    Should Be True    ${lag} <= ${MAX_LAG_MS}    Reminder was ${lag} ms late.
    Wake And Dismiss Keyguard
    Press Keycode    83
    Wait Until Page Contains Element    android=new UiSelector().packageName("com.android.systemui").text("⏰ İlaç Vakti")    15s
    Wait Until Page Contains Element    ${ACTION_TAKEN}    10s
    Click Element    ${ACTION_TAKEN}
    Reminder Should Reach Foreground
    Stock Should Be    29
    # The first repeat is due 3 minutes after the slot; wait past it with slack.
    Press Keycode    3
    ${repeat_deadline}=    Evaluate    ${target}[epoch_ms] + 225000
    Wait Until Device Time    ${repeat_deadline}
    ${tags}=    Active Reminder Notification Tags
    ${repeats}=    Get Matches    ${tags}    dose-*-repeat-*
    Should Be Empty    ${repeats}    Repeat reminder was posted after the dose was taken: ${repeats}

Untaken Planned Dose Posts Repeat Reminder
    [Documentation]    Control for the test above: without an action the +3 min repeat must appear,
    ...                otherwise "no repeat after taken" would pass vacuously.
    ${target}=    Schedule Target    3
    Add Medication At Time    ${MEDICATION}    ${target}[hour]    ${target}[minute]
    Press Keycode    3
    Reminder Should Be In Background
    Turn Screen Off
    ${repeat_slot}=    Evaluate    ${target}[epoch_ms] + 180000
    ${posted}=    Wait For Reminder Notification    dose-*-${target}[date]-${target}[time]-repeat-1    ${repeat_slot}
    ${lag}=    Evaluate    ${posted} - ${repeat_slot}
    Log    First repeat posted ${lag} ms after slot +3 min.    console=True
    Should Be True    0 <= ${lag} <= ${MAX_LAG_MS}    First repeat lag was ${lag} ms.
    Stock Should Stay Untouched After Wake

Deleted Medication Stops Reminding
    [Documentation]    A deleted medicine stays as a sync tombstone; its planned reminder must be cancelled.
    ${target}=    Schedule Target    3
    Add Medication At Time    ${MEDICATION}    ${target}[hour]    ${target}[minute]
    Click Element    android=new UiSelector().text("${MEDICATION}")
    ${delete}=    Set Variable    android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().text("İlacı Sil"))
    Wait Until Page Contains Element    ${delete}    15s
    Click Element    ${delete}
    Wait Until Page Contains    Bu ilacı silmek istediğinizden emin misiniz?    10s
    Click Element    android=new UiSelector().resourceId("android:id/button1")
    Wait Until Page Does Not Contain Element    android=new UiSelector().text("${MEDICATION}")    15s
    Press Keycode    3
    Reminder Should Be In Background
    ${after_slot}=    Evaluate    ${target}[epoch_ms] + 45000
    Wait Until Device Time    ${after_slot}
    ${tags}=    Active Reminder Notification Tags
    ${reminders}=    Get Matches    ${tags}    dose-*-${target}[date]-${target}[time]-*
    Should Be Empty    ${reminders}    Deleted medication still posted: ${reminders}

*** Keywords ***
Stock Should Stay Untouched After Wake
    Wake And Dismiss Keyguard
    Activate Application    com.itmarti.reminder
    Wait Until Page Contains Element    ${TAB_TODAY}    15s
    Stock Should Be    30

Add Medication At Time
    [Arguments]    ${name}    ${hour}    ${minute}
    Click Element    ${TAB_MEDS}
    Wait Until Page Contains    Tedavi Planı    15s
    Click Element    android=new UiSelector().textContains("Yeni İlaç Ekle")
    Wait Until Page Contains Element    android=new UiSelector().text("Yeni İlaç Ekle")    15s
    Input Text    android=new UiSelector().className("android.widget.EditText").instance(0)    ${name}
    # EditText order in the form: name, amount, slot hour, slot minute.
    Input Text    android=new UiSelector().className("android.widget.EditText").instance(2)    ${hour}
    Input Text    android=new UiSelector().className("android.widget.EditText").instance(3)    ${minute}
    Element Text Should Be    android=new UiSelector().className("android.widget.EditText").instance(2)    ${hour}
    Element Text Should Be    android=new UiSelector().className("android.widget.EditText").instance(3)    ${minute}
    Click Element    accessibility_id=Kaydet
    Wait Until Page Contains    ${name}    15s
    Wait Until Page Contains    ${hour}:${minute}    10s

Stock Should Be
    [Arguments]    ${expected}
    Click Element    ${TAB_MEDS}
    Wait Until Page Contains    Tedavi Planı    15s
    Click Element    android=new UiSelector().text("Stok & Envanter")
    Wait Until Page Contains Element    android=new UiSelector().text("${expected}")    15s

Wait For Reminder Notification
    [Arguments]    ${tag_pattern}    ${slot_epoch_ms}
    ${now}=    Device Epoch Ms
    ${timeout_s}=    Evaluate    max(30, int((${slot_epoch_ms} - ${now}) / 1000) + 90)
    ${tag}=    Wait Until Keyword Succeeds    ${timeout_s}s    2s    Reminder Notification Should Be Active    ${tag_pattern}
    ${posted}=    Reminder Notification Posted Ms    ${tag}
    RETURN    ${posted}

Reminder Notification Should Be Active
    [Arguments]    ${tag_pattern}
    ${tags}=    Active Reminder Notification Tags
    ${matches}=    Get Matches    ${tags}    ${tag_pattern}
    Should Not Be Empty    ${matches}
    RETURN    ${matches}[0]

Wait Until Device Time
    [Arguments]    ${epoch_ms}
    ${now}=    Device Epoch Ms
    ${remaining}=    Evaluate    max(0, (${epoch_ms} - ${now}) / 1000)
    Sleep    ${remaining}s

Reminder Should Be In Background
    ${state}=    Execute Script    mobile: queryAppState    appId=com.itmarti.reminder
    Should Be Equal As Integers    ${state}    3

Reminder Should Reach Foreground
    Wait Until Keyword Succeeds    15s    500ms    Reminder State Should Be Foreground

Reminder State Should Be Foreground
    ${state}=    Execute Script    mobile: queryAppState    appId=com.itmarti.reminder
    Should Be Equal As Integers    ${state}    4

Open Clean Reminder Application
    Collapse Status Bar
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
    ...    newCommandTimeout=${600}
    Handle Android Permission Dialogs
    Wait Until Page Contains Element    ${TAB_TODAY}    30s

Close Reminder And Restore Screen
    Run Keyword And Ignore Error    Wake And Dismiss Keyguard
    Run Keyword And Ignore Error    Collapse Status Bar
    Close All Applications

Handle Android Permission Dialogs
    FOR    ${index}    IN RANGE    0    4
        ${allow_visible}=    Run Keyword And Return Status    Wait Until Page Contains Element    id=com.android.permissioncontroller:id/permission_allow_button    3s
        IF    ${allow_visible}
            Click Element    id=com.android.permissioncontroller:id/permission_allow_button
        ELSE
            RETURN
        END
    END
