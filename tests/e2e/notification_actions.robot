*** Settings ***
Documentation    Verifies Android notification action buttons against the first medication on emulator:
...              1. "İlaç İçildi" records the dose, reduces stock and can be undone from Today.
...              2. "Atla" records a skip without touching stock.
...              3. "3 Dk Ertele" delivers a snooze notification with action buttons.
...              4. "İlaç İçildi" still records the dose after the app process was killed.
...              5. Tapping the notification body after a kill offers the dose in the in-app banner.
...              The settings test notification carries the first medication's id and time,
...              so its actions follow the same App.tsx handler as scheduled reminders.
Library          AppiumLibrary    run_on_failure=No Operation
Library          Collections
Library          OperatingSystem
Library          EmulatorNotificationProbe.py    ${UDID}
Test Setup       Open Clean Reminder Application
Test Teardown    Close Reminder And Collapse Status Bar
Test Tags        android    notification    actions

*** Variables ***
${UDID}          emulator-5554
${MEDICATION}    Aksiyon Test İlacı
${TAB_TODAY}     android=new UiSelector().descriptionContains(", Bugün").clickable(true)
${TAB_MEDS}      android=new UiSelector().descriptionContains(", İlaçlarım").clickable(true)
${TAB_HISTORY}   android=new UiSelector().descriptionContains(", Geçmiş").clickable(true)
${TAB_SETTINGS}  android=new UiSelector().descriptionContains(", Ayarlar").clickable(true)
${ACTION_TAKEN}  android=new UiSelector().resourceId("android:id/action0").text("✅ İlaç İçildi")
${ACTION_SKIP}   android=new UiSelector().resourceId("android:id/action0").text("❌ Atla")
${ACTION_SNOOZE}    android=new UiSelector().resourceId("android:id/action0").text("⏱️ 3 Dk Ertele")
# The title sits in the notification's content area; tapping it is a body tap, not an action.
${NOTIFICATION_BODY}    android=new UiSelector().packageName("com.android.systemui").text("⏰ İlaç Vakti")

*** Test Cases ***
Taken Action Records Dose Reduces Stock And Can Be Undone
    Add Medication And Verify Stock    ${MEDICATION}
    Deliver Test Notification In Background
    Click Element    ${ACTION_TAKEN}
    Reminder Should Reach Foreground
    Stock Should Be    29
    History Should Show Today Record    Alındı
    # Correction path from Today must refund the stock taken via the notification.
    Click Element    ${TAB_TODAY}
    Wait Until Page Contains Element    android=new UiSelector().textContains("Alınan Dozlar")    15s
    Click Element    android=new UiSelector().textContains("Alınan Dozlar")
    Wait Until Page Contains Element    android=new UiSelector().descriptionContains(", Kaydı düzelt").clickable(true)    10s
    Click Element    android=new UiSelector().descriptionContains(", Kaydı düzelt").clickable(true)
    Wait Until Page Contains    Bu kayıt geri alınacak    10s
    Click Element    android=new UiSelector().resourceId("android:id/button1")
    Stock Should Be    30

Skip Action Records Skip Without Changing Stock
    Add Medication And Verify Stock    ${MEDICATION}
    Deliver Test Notification In Background
    Click Element    ${ACTION_SKIP}
    Reminder Should Reach Foreground
    History Should Show Today Record    Atlandı
    Stock Should Be    30

Snooze Action Delivers Snooze Notification After Three Minutes
    [Tags]    slow
    Add Medication And Verify Stock    ${MEDICATION}
    Deliver Test Notification In Background
    Click Element    ${ACTION_SNOOZE}
    Reminder Should Reach Foreground
    Wait Until Page Contains    3 dakika ertelendi    10s
    Press Keycode    3
    Reminder Should Be In Background
    Clear Existing Android Notifications From Home
    # Snooze fires three minutes after the tap; allow scheduling and doze slack.
    Press Keycode    83
    Wait Until Page Contains Element    android=new UiSelector().packageName("com.android.systemui").textStartsWith("⏱️ Erteleme:")    240s
    ${tags}=    Active Reminder Notification Tags
    Should Contain Match    ${tags}    dose-*-snooze
    Page Should Contain Element    ${ACTION_TAKEN}
    Click Element    ${ACTION_TAKEN}
    Reminder Should Reach Foreground
    Stock Should Be    29

Taken Action After Process Kill Still Records Dose
    [Documentation]    Cold start through a notification action. The dose list is hydrated
    ...                asynchronously, so a lost action shows up as unchanged stock.
    Add Medication And Verify Stock    ${MEDICATION}
    Deliver Test Notification In Background
    Press Keycode    4
    Kill Reminder Process
    Reminder Process Should Not Be Running
    ${tags}=    Active Reminder Notification Tags
    Should Contain    ${tags}    test-med-main
    Open Shade Until Reminder Is Listed
    Expand Reminder Notification
    Click Element    ${ACTION_TAKEN}
    Reminder Should Reach Foreground
    Wait Until Page Contains Element    ${TAB_TODAY}    30s
    ${source}=    Get Source
    Create File    ${OUTPUT DIR}/cold-start-today.xml    ${source}
    Capture Page Screenshot    cold-start-today.png
    Stock Should Be    29
    History Should Show Today Record    Alındı

Tapping Notification Body After Process Kill Offers Dose Actions
    [Documentation]    Tapping the notification itself only opens the app. The dose must then be offered
    ...                in the in-app banner instead of silently staying unmarked. Only the killed-process
    ...                case is meaningful: with the app alive, the settings test notification opens the
    ...                same banner from its own JS timer, so a warm variant would pass without the fix.
    Add Medication And Verify Stock    ${MEDICATION}
    Deliver Test Notification In Background
    Press Keycode    4
    Kill Reminder Process
    Reminder Process Should Not Be Running
    Open Shade Until Reminder Is Listed
    Click Element    ${NOTIFICATION_BODY}
    Reminder Should Reach Foreground
    Take Dose From In-App Banner

*** Keywords ***
Take Dose From In-App Banner
    Wait Until Page Contains Element    ${TAB_TODAY}    30s
    # The launch account check can hold queued responses briefly; the banner follows once it settles.
    Wait Until Page Contains Element    android=new UiSelector().text("RUTİN · BİLDİRİM")    20s
    Click Element    android=new UiSelector().text("Al")
    Stock Should Be    29
    History Should Show Today Record    Alındı

Add Medication And Verify Stock
    [Arguments]    ${name}
    Click Element    ${TAB_MEDS}
    Wait Until Page Contains    Tedavi Planı    15s
    Click Element    android=new UiSelector().textContains("Yeni İlaç Ekle")
    Wait Until Page Contains Element    android=new UiSelector().text("Yeni İlaç Ekle")    15s
    Input Text    android=new UiSelector().className("android.widget.EditText").instance(0)    ${name}
    Click Element    accessibility_id=Kaydet
    Wait Until Page Contains    ${name}    15s
    Stock Should Be    30

Stock Should Be
    [Arguments]    ${expected}
    Click Element    ${TAB_MEDS}
    Wait Until Page Contains    Tedavi Planı    15s
    Click Element    android=new UiSelector().text("Stok & Envanter")
    Wait Until Page Contains Element    android=new UiSelector().text("${expected}")    15s

History Should Show Today Record
    [Arguments]    ${status}
    Click Element    ${TAB_HISTORY}
    Wait Until Page Contains    Bugünün Kayıtları    15s
    Wait Until Page Contains    ${MEDICATION}    10s
    # The row is one accessible button, so its status line is matched by suffix.
    Wait Until Page Contains Element    android=new UiSelector().textContains("· ${status}")    10s

Deliver Test Notification In Background
    Clear Existing Android Notifications
    Click Element    ${TAB_SETTINGS}
    Wait Until Page Contains    Kullanıcı Profili    15s
    Click Element    android=new UiSelector().text("Gizlilik & Kilit Ekranı")
    Wait Until Page Contains    İlaç Adını Gizle    15s
    ${test_notification}=    Set Variable    android=new UiSelector().text("3 Sn Sonra Test Bildirimi Gönder")
    Scroll Down    ${test_notification}    20s    1s
    Click Element    ${test_notification}
    Press Keycode    3
    Reminder Should Be In Background
    Sleep    5s
    Press Keycode    83
    Wait Until Page Contains Element    android=new UiSelector().packageName("com.android.systemui").text("⏰ İlaç Vakti")    15s
    ${tags}=    Active Reminder Notification Tags
    Should Contain    ${tags}    test-med-main
    Wait Until Page Contains Element    ${ACTION_TAKEN}    10s

Open Shade Until Reminder Is Listed
    # After a process kill UiAutomator can keep reporting the launcher while the shade is open.
    FOR    ${attempt}    IN RANGE    0    3
        Collapse Status Bar
        Sleep    1s
        Expand Notification Shade
        ${listed}=    Run Keyword And Return Status    Wait Until Page Contains Element    android=new UiSelector().packageName("com.android.systemui").text("⏰ İlaç Vakti")    8s
        IF    ${listed}    RETURN
    END

Expand Reminder Notification
    ${listed}=    Run Keyword And Return Status    Wait Until Page Contains Element    android=new UiSelector().packageName("com.android.systemui").text("⏰ İlaç Vakti")    15s
    IF    not ${listed}
        ${source}=    Get Source
        Create File    ${OUTPUT DIR}/shade-without-reminder.xml    ${source}
        Capture Page Screenshot    shade-without-reminder.png
        Fail    Reminder notification is not listed in the shade.
    END
    ${expanded}=    Run Keyword And Return Status    Wait Until Page Contains Element    ${ACTION_TAKEN}    3s
    IF    not ${expanded}
        # Re-opened shades may show the row collapsed; its expand button reveals the actions.
        Click Element    android=new UiSelector().resourceId("android:id/expand_button").fromParent(new UiSelector().text("⏰ İlaç Vakti"))
        ${expanded}=    Run Keyword And Return Status    Wait Until Page Contains Element    ${ACTION_TAKEN}    5s
    END
    IF    not ${expanded}
        ${source}=    Get Source
        Create File    ${OUTPUT DIR}/collapsed-shade.xml    ${source}
        Fail    Reminder notification actions are not visible in the shade.
    END

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
    ...    newCommandTimeout=${300}
    Handle Android Permission Dialogs
    Wait Until Page Contains Element    ${TAB_TODAY}    30s

Close Reminder And Collapse Status Bar
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

Clear Existing Android Notifications
    Clear Existing Android Notifications From Home
    Wait Until Page Contains Element    ${TAB_TODAY}    10s

Clear Existing Android Notifications From Home
    Press Keycode    83
    ${clear_visible}=    Run Keyword And Return Status    Wait Until Page Contains Element    id=com.android.systemui:id/dismiss_text    3s
    IF    ${clear_visible}
        Click Element    id=com.android.systemui:id/dismiss_text
    END
    Press Keycode    4
