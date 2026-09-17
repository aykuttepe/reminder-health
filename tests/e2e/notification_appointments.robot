*** Settings ***
Documentation    Appointment lifecycle on emulator and the reminder alarms it schedules:
...              1. Adding tomorrow's appointment schedules the "1 day before" (today 20:00) and
...                 "appointment morning" (tomorrow 05:00) reminders.
...              2. Moving it one week later replaces those alarms with the new dates.
...              3. Completing it removes its alarms; reopening restores them.
...              4. Deleting it leaves no appointment alarms.
...              Uses a fresh app without medicines, so every pending alarm belongs to the appointment.
...              Must start before 19:59 emulator time for the same-evening reminder to be expected.
Library          AppiumLibrary    run_on_failure=No Operation
Library          Collections
Library          EmulatorNotificationProbe.py    ${UDID}
Suite Setup      Open Clean Reminder Application
Suite Teardown   Close All Applications
Test Tags        android    appointment    notification

*** Variables ***
${UDID}          emulator-5554
${DOCTOR}        E2E Randevu Doktoru
${TAB_TODAY}     android=new UiSelector().descriptionContains(", Bugün").clickable(true)
${TAB_SETTINGS}  android=new UiSelector().descriptionContains(", Ayarlar").clickable(true)

*** Test Cases ***
Appointment Reminders Follow Add Edit Complete And Delete
    ${now}=    Device Hour Minute
    IF    '${now}' >= '19:58'    Skip    Same-evening reminder is already due; rerun before 19:58 emulator time.
    ${today}=    Device Date    0
    ${tomorrow}=    Device Date    1
    ${week}=    Device Date    7
    ${week_eve}=    Device Date    6

    Add Appointment For Tomorrow
    Wait Until Keyword Succeeds    15s    1s    Alarm Times Should Be    ${today} 20:00    ${tomorrow} 05:00

    Open Appointment Editor From Profile
    Click Element    android=new UiSelector().text("1 Hafta Sonra")
    Click Element    android=new UiSelector().text("Kaydet")
    Wait Until Keyword Succeeds    15s    1s    Alarm Times Should Be    ${week_eve} 20:00    ${week} 05:00

    Click Appointment Card Action    Tamamlandı
    Wait Until Keyword Succeeds    15s    1s    Alarm Times Should Be
    Click Appointment Card Action    Tekrar Aç
    Wait Until Keyword Succeeds    15s    1s    Alarm Times Should Be    ${week_eve} 20:00    ${week} 05:00

    Open Profile Appointments
    Swipe Until Visible    accessibility_id=Randevuyu sil
    Click Element    accessibility_id=Randevuyu sil
    Wait Until Page Contains    Bu randevuyu silmek istediğinize emin misiniz?    10s
    Click Element    android=new UiSelector().resourceId("android:id/button1")
    Wait Until Keyword Succeeds    15s    1s    Alarm Times Should Be

*** Keywords ***
Add Appointment For Tomorrow
    Click Element    ${TAB_TODAY}
    Wait Until Page Contains Element    android=new UiSelector().text("Randevu Ekle")    15s
    Click Element    android=new UiSelector().text("Randevu Ekle")
    Wait Until Page Contains Element    android=new UiSelector().text("Yeni Randevu Ekle")    15s
    # EditText order in the form: specialty, doctor name, hospital, phone.
    Input Text    android=new UiSelector().className("android.widget.EditText").instance(1)    ${DOCTOR}
    Click Element    android=new UiSelector().text("Yarın")
    Click Element    android=new UiSelector().text("Kaydet")
    Wait Until Page Does Not Contain Element    android=new UiSelector().text("Yeni Randevu Ekle")    10s

Open Profile Appointments
    # Re-selecting Ayarlar while on it keeps the scroll offset; switching tabs lands on the main page.
    Click Element    ${TAB_TODAY}
    Wait Until Page Contains Element    android=new UiSelector().text("Günün Kalanı")    15s
    Click Element    ${TAB_SETTINGS}
    Wait Until Page Contains Element    android=new UiSelector().text("AYAR KATEGORİLERİ")    15s
    Click Element    android=new UiSelector().text("Kullanıcı Profili")
    Wait Until Page Contains Element    android=new UiSelector().text("KULLANICI BİLGİSİ")    15s

Swipe Until Visible
    [Arguments]    ${locator}
    # The appointment cards sit below the profile form; UiScrollable does not move this page.
    FOR    ${index}    IN RANGE    0    5
        ${visible}=    Run Keyword And Return Status    Wait Until Page Contains Element    ${locator}    2s
        IF    ${visible}    RETURN
        Swipe Screen Up
    END
    Wait Until Page Contains Element    ${locator}    3s

Open Appointment Editor From Profile
    Click Appointment Card Action    Düzenle
    Wait Until Page Contains Element    android=new UiSelector().text("Randevuyu Düzenle")    15s

Click Appointment Card Action
    [Arguments]    ${label}
    ${visible}=    Run Keyword And Return Status    Page Should Contain Element    android=new UiSelector().text("${label}")
    IF    not ${visible}
        Open Profile Appointments
        Swipe Until Visible    android=new UiSelector().text("${label}")
    END
    Click Element    android=new UiSelector().text("${label}")

Alarm Times Should Be
    [Arguments]    @{expected}
    ${actual}=    Reminder Alarm Times
    Lists Should Be Equal    ${actual}    ${expected}

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

Handle Android Permission Dialogs
    FOR    ${index}    IN RANGE    0    4
        ${allow_visible}=    Run Keyword And Return Status    Wait Until Page Contains Element    id=com.android.permissioncontroller:id/permission_allow_button    3s
        IF    ${allow_visible}
            Click Element    id=com.android.permissioncontroller:id/permission_allow_button
        ELSE
            RETURN
        END
    END
