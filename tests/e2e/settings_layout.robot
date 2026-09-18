*** Settings ***
Documentation    Opens every Settings sub-page on the dedicated Android emulator and captures each scroll position for visual layout review. Preserves app data; changes no settings.
Library          AppiumLibrary    run_on_failure=No Operation
Library          OperatingSystem
Library          Process
Suite Setup      Open Reminder Application
Suite Teardown   Close All Applications
Test Template    Settings Page Renders
Test Tags        android    settings    layout

*** Variables ***
${ADB}           %{ANDROID_HOME=/opt/homebrew/share/android-commandlinetools}/platform-tools/adb
${MAX_PAGES}     8

*** Test Cases ***                  MENU TITLE                       SLUG
Settings Main                       ${EMPTY}                         main
Profile                             Kullanıcı Profili                profile
Language                            Dil / Language                   language
Notifications                       Bildirim ve Ses Ayarları         notifications
Reminders                           Hatırlatıcı & Erteleme           reminders
Reliability                         Cihaz Güvenilirliği & Alarm      reliability
Stock                               Stok ve Envanter                 stock
Privacy                             Gizlilik & Kilit Ekranı          privacy
Experience                          Uygulama Deneyimi                experience
Sync                                Senkronizasyon & Yedekleme       sync
Diagnostics                         Hata & Tanılama Günlüğü          diagnostics
Reset                               Veri & Sıfırlama                 reset

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

Open Settings Main
    # Tapping another tab and back resets the sub-page and scroll position.
    Click Element    android=new UiSelector().className("android.view.ViewGroup").descriptionContains(", Bugün").clickable(true)
    Click Element    android=new UiSelector().className("android.view.ViewGroup").descriptionContains(", Ayarlar").clickable(true)
    Wait Until Page Contains Element    android=new UiSelector().text("AYAR KATEGORİLERİ")    15s

Swipe Up
    Run Process    ${ADB}    -s    emulator-5554    shell    input    swipe    540    1700    540    700    1000
    Sleep    0.8s

Open Menu Item
    [Arguments]    ${title}
    # UiAutomator reports rows hidden behind the bottom tab bar as visible, so require the row above it.
    FOR    ${index}    IN RANGE    0    6
        ${visible}=    Run Keyword And Return Status    Element Should Be Visible    android=new UiSelector().text("${title}")
        IF    ${visible}
            ${location}=    Get Element Location    android=new UiSelector().text("${title}")
            IF    ${location}[y] < 1600    BREAK
        END
        Swipe Up
    END
    Click Element    android=new UiSelector().text("${title}")
    Sleep    0.8s

Settings Page Renders
    [Arguments]    ${title}    ${slug}
    Open Settings Main
    IF    '${title}' != '${EMPTY}'    Open Menu Item    ${title}
    ${previous}=    Set Variable    ${EMPTY}
    FOR    ${page}    IN RANGE    0    ${MAX_PAGES}
        ${source}=    Get Source
        IF    $source == $previous    BREAK
        Create File    ${OUTPUTDIR}/${slug}-${page}.xml    ${source}
        Capture Page Screenshot    ${slug}-${page}.png
        ${previous}=    Set Variable    ${source}
        Swipe Up
    END
