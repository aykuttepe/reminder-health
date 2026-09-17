*** Settings ***
Documentation    Real reminders and notification actions on an installed physical app, with the owner's consent.
...              Adds two clearly named test medications to the real account (they sync if sync is on),
...              never uses the settings test notification (it targets the first real medication),
...              refuses to tap while another dose's reminder is active and deletes the test
...              medications at the end even on failure. No screenshots or UI dumps are saved.
...              1. Planned reminder arrives on the phone, "İlaç İçildi" reduces the test stock, no repeat follows.
...              2. Repeat reminder arrives for an untaken dose; after the process is killed,
...                 "İlaç İçildi" still records the dose (cold-start fix in 0.2.23).
Library          AppiumLibrary    run_on_failure=No Operation
Library          Collections
Library          AndroidNotificationProbe.py    ${UDID}
Suite Setup      Open Installed Reminder Without Test Medications
Suite Teardown   Remove Test Medications And Close
Test Teardown    Remove Test Medications
Test Tags        android    physical-device    notification    actions    modifies-data    slow

*** Variables ***
${UDID}          %{ANDROID_UDID=}
@{CREATED}
${APPIUM_URL}    http://127.0.0.1:4723
${MED_WARM}      E2E Test A silinecek
${MED_COLD}      E2E Test B silinecek
${MAX_LAG_MS}    ${60000}
${TAB_TODAY}     android=new UiSelector().descriptionContains(", Bugün").clickable(true)
${TAB_MEDS}      android=new UiSelector().descriptionContains(", İlaçlarım").clickable(true)
${TAB_HISTORY}   android=new UiSelector().descriptionContains(", Geçmiş").clickable(true)
${ACTION_TAKEN}  android=new UiSelector().resourceId("android:id/action0").text("✅ İlaç İçildi")

*** Test Cases ***
Planned Reminder Taken From Notification On Phone
    ${target}=    Phone Schedule Target    3
    Add Test Medication At Time    ${MED_WARM}    ${target}[hour]    ${target}[minute]
    Test Medication Stock Should Be    ${MED_WARM}    30
    Press Keycode    3
    ${tag}    ${posted}=    Wait For Phone Reminder    ${target}[date]    ${target}[time]    ${target}[epoch_ms]
    ${lag}=    Evaluate    ${posted} - ${target}[epoch_ms]
    Log    Phone reminder posted ${lag} ms after its slot (app in background).    console=True
    Should Be True    0 <= ${lag} <= ${MAX_LAG_MS}    Phone reminder lag was ${lag} ms.
    Tap Taken On Test Reminder    ${tag}
    Test Medication Stock Should Be    ${MED_WARM}    29
    History Should Show Test Record    ${MED_WARM}    Alındı
    Press Keycode    3
    ${repeat_deadline}=    Evaluate    ${target}[epoch_ms] + 225000
    Keep Phone Awake Until    ${repeat_deadline}
    ${repeats}=    Phone Reminder Tags    dose-*-${target}[date]-${target}[time]-repeat-*
    Should Be Empty    ${repeats}    Repeat reminder was posted after the dose was taken.

Taken From Notification After Process Kill On Phone
    ${target}=    Phone Schedule Target    3
    Add Test Medication At Time    ${MED_COLD}    ${target}[hour]    ${target}[minute]
    Press Keycode    3
    ${tag}    ${posted}=    Wait For Phone Reminder    ${target}[date]    ${target}[time]    ${target}[epoch_ms]
    ${lag}=    Evaluate    ${posted} - ${target}[epoch_ms]
    Log    Phone reminder posted ${lag} ms after its slot.    console=True
    # Control: repeats are enabled on this phone, so the previous "no repeat" check is meaningful.
    ${repeat_slot}=    Evaluate    ${target}[epoch_ms] + 180000
    ${repeat_tag}    ${repeat_posted}=    Wait For Phone Reminder    ${target}[date]    ${target}[time]    ${repeat_slot}    kind=repeat-1
    ${repeat_lag}=    Evaluate    ${repeat_posted} - ${repeat_slot}
    Log    First repeat posted ${repeat_lag} ms after slot +3 min.    console=True
    Should Be True    0 <= ${repeat_lag} <= ${MAX_LAG_MS}    First repeat lag was ${repeat_lag} ms.
    Kill Reminder Process On Phone
    Tap Taken On Test Reminder    ${repeat_tag}
    Test Medication Stock Should Be    ${MED_COLD}    29
    History Should Show Test Record    ${MED_COLD}    Alındı

*** Keywords ***
Open Installed Reminder Without Test Medications
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
    ...    newCommandTimeout=${900}
    Bring Installed Reminder To Foreground
    # Cleanup only ever deletes medications this run created.
    ${created}=    Create List
    Set Suite Variable    ${CREATED}    ${created}
    FOR    ${name}    IN    ${MED_WARM}    ${MED_COLD}
        ${exists}=    Test Medication Is Listed    ${name}
        IF    ${exists}    Fail    "${name}" already exists; remove it manually so real records are never mistaken for test data.
    END

Test Medication Is Listed
    [Arguments]    ${name}
    Open Treatment Plan
    ${exists}=    Run Keyword And Return Status    Wait Until Page Contains Element
    ...    android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().text("${name}"))    5s
    RETURN    ${exists}

Close Unsaved Editor If Open
    FOR    ${index}    IN RANGE    0    2
        # "Kaydet" exists only in the editor header; list screens also show "Yeni İlaç Ekle".
        ${open}=    Run Keyword And Return Status    Page Should Contain Element    accessibility_id=Kaydet
        IF    not ${open}    RETURN
        # Back closes the editor without saving (and first dismisses the keyboard if it is open).
        Press Keycode    4
        Sleep    1s
    END

Open Treatment Plan
    Close Unsaved Editor If Open
    Wait Until Page Contains Element    ${TAB_MEDS}    15s
    Click Element    ${TAB_MEDS}
    Wait Until Page Contains Element    android=new UiSelector().text("Tedavi Planı")    15s
    Click Element    android=new UiSelector().text("Tedavi Planı")

Add Test Medication At Time
    [Arguments]    ${name}    ${hour}    ${minute}
    Open Treatment Plan
    Click Element    android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Yeni İlaç Ekle"))
    Wait Until Page Contains Element    android=new UiSelector().text("Yeni İlaç Ekle")    15s
    Input Text    android=new UiSelector().className("android.widget.EditText").instance(0)    ${name}
    # The time slot sits below the fold on the phone; a new form starts at 09:00.
    Swipe Editor Until Visible    android=new UiSelector().className("android.widget.EditText").text("09")
    # Minute first: a two-digit hour moves focus to the minute field and the keyboard scrolls it away.
    # Never hide the keyboard here; on this phone that closes the editor without saving.
    Input Text    android=new UiSelector().className("android.widget.EditText").text("00")    ${minute}
    Input Text    android=new UiSelector().className("android.widget.EditText").text("09")    ${hour}
    # A wrong slot is caught later: the reminder tag must carry this exact date and time.
    # Registered before verification so a half-finished save is still cleaned up.
    Append To List    ${CREATED}    ${name}
    Click Element    accessibility_id=Kaydet
    ${listed}=    Test Medication Is Listed    ${name}
    Should Be True    ${listed}    Test medication was not saved.

Open Test Medication Editor
    [Arguments]    ${name}
    Open Treatment Plan
    Click Element    android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().text("${name}"))
    Wait Until Page Contains Element    android=new UiSelector().text("İlacı Düzenle")    15s
    Element Text Should Be    android=new UiSelector().className("android.widget.EditText").instance(0)    ${name}

Swipe Editor Until Visible
    [Arguments]    ${locator}    ${max_swipes}=6
    # The editor is a page-sheet modal whose ScrollView ignores UiScrollable; a real swipe scrolls it.
    FOR    ${index}    IN RANGE    0    ${max_swipes}
        ${visible}=    Run Keyword And Return Status    Wait Until Page Contains Element    ${locator}    2s
        IF    ${visible}    RETURN
        Execute Script    mobile: swipeGesture    left=${100}    top=${1200}    width=${880}    height=${900}    direction=up    percent=${0.6}
    END
    Wait Until Page Contains Element    ${locator}    3s

Test Medication Stock Should Be
    [Arguments]    ${name}    ${expected}
    Open Test Medication Editor    ${name}
    Swipe Editor Until Visible    android=new UiSelector().text("Kalan Stok (adet)")
    # The editor shows only this medication; its stock input is the first EditText after the label.
    Element Text Should Be    xpath=//*[@text="Kalan Stok (adet)"]/following::android.widget.EditText[1]    ${expected}
    # Back closes the editor without saving.
    Press Keycode    4
    Wait Until Page Does Not Contain Element    android=new UiSelector().text("İlacı Düzenle")    10s

History Should Show Test Record
    [Arguments]    ${name}    ${status}
    Click Element    ${TAB_HISTORY}
    Wait Until Page Contains    Bugünün Kayıtları    15s
    Wait Until Page Contains Element    android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().text("${name}"))    15s
    Page Should Contain Element    android=new UiSelector().text("${name}").fromParent(new UiSelector().textContains("· ${status}"))

Tap Taken On Test Reminder
    [Arguments]    ${tag}
    Phone Should Be Unlocked
    Collapse Phone Status Bar
    Sleep    1s
    Expand Phone Notification Shade
    Reveal Reminder Actions
    Only Test Reminder Should Be Active    ${tag}
    Click Element    ${ACTION_TAKEN}
    Wait Until Keyword Succeeds    20s    500ms    Reminder Should Be Foreground On Phone
    Wait Until Page Contains Element    ${TAB_TODAY}    30s

Reveal Reminder Actions
    ${visible}=    Run Keyword And Return Status    Wait Until Page Contains Element    ${ACTION_TAKEN}    5s
    IF    ${visible}    RETURN
    # One UI bundles an app's notifications and hides actions until expanded. Only the expand button
    # inside this app's reminder row is touched: tapping a row itself opens that notification.
    ${row}=    Set Variable    //*[@resource-id="com.android.systemui:id/expandableNotificationRow"][.//*[contains(@text,"İlaç Vakti") or contains(@text,"E2E Test")]]
    ${innermost}=    Set Variable    xpath=(${row}[not(.//*[@resource-id="com.android.systemui:id/expandableNotificationRow"])]//*[contains(@resource-id,"expand_button")])[1]
    ${group}=    Set Variable    xpath=(${row}//*[contains(@resource-id,"expand_button")])[1]
    FOR    ${expander}    IN    ${group}    ${innermost}
        ${present}=    Run Keyword And Return Status    Page Should Contain Element    ${expander}
        IF    ${present}
            Click Element    ${expander}
            ${visible}=    Run Keyword And Return Status    Wait Until Page Contains Element    ${ACTION_TAKEN}    3s
            IF    ${visible}    RETURN
        END
    END
    Fail    "İlaç İçildi" action is not visible in the notification shade.

Reminder Should Be Foreground On Phone
    ${state}=    Execute Script    mobile: queryAppState    appId=com.itmarti.reminder
    Should Be Equal As Integers    ${state}    4

Keep Phone Awake Until
    [Arguments]    ${epoch_ms}
    WHILE    True
        ${now}=    Phone Epoch Ms
        IF    ${now} >= ${epoch_ms}    BREAK
        Press Keycode    224
        Sleep    5s
    END

Delete Test Medication If Listed
    [Arguments]    ${name}
    Bring Installed Reminder To Foreground
    ${exists}=    Test Medication Is Listed    ${name}
    IF    not ${exists}    RETURN
    Open Test Medication Editor    ${name}
    Swipe Editor Until Visible    android=new UiSelector().text("İlacı Sil")    max_swipes=10
    Click Element    android=new UiSelector().text("İlacı Sil")
    Wait Until Page Contains    Bu ilacı silmek istediğinizden emin misiniz?    10s
    Click Element    android=new UiSelector().resourceId("android:id/button1")
    Wait Until Page Does Not Contain Element    android=new UiSelector().text("İlacı Düzenle")    10s
    ${still}=    Test Medication Is Listed    ${name}
    Should Not Be True    ${still}    Test medication "${name}" could not be deleted.

Remove Test Medications
    # Deleting right after each test keeps a failed test's reminder from firing during the next one.
    Run Keyword And Ignore Error    Collapse Phone Status Bar
    ${failed}=    Create List
    FOR    ${name}    IN    @{CREATED}
        ${deleted}=    Run Keyword And Return Status    Delete Test Medication If Listed    ${name}
        IF    not ${deleted}    Append To List    ${failed}    ${name}
    END
    ${remaining}=    Copy List    ${failed}
    Set Suite Variable    ${CREATED}    ${remaining}
    Should Be Empty    ${failed}    Test medication cleanup failed; delete these in the app: ${failed}

Remove Test Medications And Close
    ${status}    ${message}=    Run Keyword And Ignore Error    Remove Test Medications
    Close All Applications
    IF    '${status}' == 'FAIL'    Fail    ${message}
