*** Settings ***
Documentation    Stock screen triage on emulator: a nearly empty medicine is counted as critical,
...              a full one as good, and the critical filter lists only the critical medicine.
...              Daily consumption comes from the plan, so 3 tablets left is under a week.
Library          AppiumLibrary    run_on_failure=No Operation
Suite Setup      Open Clean Reminder Application
Suite Teardown   Close All Applications
Test Tags        android    stock

*** Variables ***
${UDID}          emulator-5554
${LOW}           Stok Az İlacı
${FULL}          Stok Dolu İlacı
${TAB_MEDS}      android=new UiSelector().descriptionContains(", İlaçlarım").clickable(true)
${TAB_TODAY}     android=new UiSelector().descriptionContains(", Bugün").clickable(true)
${STOCK_FIELD}   xpath=//*[@text="Kalan Stok (adet)"]/following::android.widget.EditText[1]

*** Test Cases ***
Stock Screen Separates Critical And Sufficient Medicines
    Add Medication With Stock    ${LOW}    3
    Add Medication With Stock    ${FULL}    60
    Open Stock Screen
    Triage Count Should Be    Kritik / Tükendi    1
    Triage Count Should Be    Yeterli    1
    Page Should Contain Text    ${LOW}
    Page Should Contain Text    ${FULL}

    # Filtering by critical hides the medicine that has enough left.
    Click Element    android=new UiSelector().text("Kritik / Tükendi")
    Wait Until Page Does Not Contain    ${FULL}    10s
    Page Should Contain Text    ${LOW}

*** Keywords ***
Add Medication With Stock
    [Arguments]    ${name}    ${stock}
    Click Element    ${TAB_MEDS}
    Wait Until Page Contains    Tedavi Planı    15s
    Click Element    android=new UiSelector().textContains("Yeni İlaç Ekle")
    Wait Until Page Contains Element    android=new UiSelector().text("Yeni İlaç Ekle")    15s
    Input Text    android=new UiSelector().className("android.widget.EditText").instance(0)    ${name}
    Swipe Editor Until Visible    ${STOCK_FIELD}
    Input Text    ${STOCK_FIELD}    ${stock}
    Click Element    accessibility_id=Kaydet
    Wait Until Page Contains    ${name}    15s

Swipe Editor Until Visible
    [Arguments]    ${locator}
    # The stock field sits below the fold and the editor modal ignores UiScrollable.
    FOR    ${index}    IN RANGE    0    6
        ${visible}=    Run Keyword And Return Status    Wait Until Page Contains Element    ${locator}    2s
        IF    ${visible}    RETURN
        Execute Script    mobile: swipeGesture    left=${100}    top=${1200}    width=${880}    height=${900}    direction=up    percent=${0.6}
    END
    Wait Until Page Contains Element    ${locator}    3s

Open Stock Screen
    Click Element    ${TAB_MEDS}
    Wait Until Page Contains    Tedavi Planı    15s
    Click Element    android=new UiSelector().text("Stok & Envanter")
    Wait Until Page Contains Element    android=new UiSelector().text("Kritik / Tükendi")    15s

Triage Count Should Be
    [Arguments]    ${tier}    ${count}
    # The count sits inside the same triage card as its label.
    Page Should Contain Element    xpath=//*[@text="${tier}"]/preceding-sibling::*[@text="${count}"]

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
