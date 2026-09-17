*** Settings ***
Documentation    Verifies the undo flow and visible correction options on Android emulator:
...              1. Toast Undo immediately refunds stock and restores pending slot.
...              2. Today screen record correction ("Düzelt") refunds stock and restores pending slot.
...              3. History screen record correction refunds stock and restores pending slot.
Library          AppiumLibrary    run_on_failure=No Operation
Suite Setup      Open Clean Reminder Application
Suite Teardown   Close All Applications
Test Tags        android    undo    correction

*** Variables ***
${MEDICATION}    Undo Test İlacı

*** Test Cases ***
Verify Complete Undo Flow And Correction Options
    [Documentation]    Verifies Toast Undo and the Today/History record corrections all refund stock correctly.
    # Step 1: Add new medication with 30 pills
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
    Page Should Contain Text    30

    # Step 2: Go to Today tab and take dose
    Click Element    android=new UiSelector().descriptionContains(", Bugün").clickable(true)
    Wait Until Page Contains    ${MEDICATION}    15s
    ${late_take}=    Set Variable    android=new UiSelector().text("Şimdi Al (Geç)")
    ${late_visible}=    Run Keyword And Return Status    Wait Until Page Contains Element    ${late_take}    5s
    IF    ${late_visible}
        Click Element    ${late_take}
    ELSE
        Click Element    android=new UiSelector().text("Al")
    END

    # Step 3: Verify Toast "Geri Al" appears, click it, and verify undo
    Wait Until Page Contains Element    android=new UiSelector().text("Geri Al")    5s
    Click Element    android=new UiSelector().text("Geri Al")
    Wait Until Page Contains    Kayıt geri alındı; stok düzeltildi.    10s

    # Step 4: Verify dose is back on Today tab as pending
    Wait Until Page Contains    ${MEDICATION}    10s
    ${take_ready}=    Run Keyword And Return Status    Wait Until Page Contains Element    android=new UiSelector().textContains("Al")    10s
    Should Be True    ${take_ready}

    # Step 5: Verify stock remained 30
    Click Element    android=new UiSelector().descriptionContains(", İlaçlarım").clickable(true)
    Wait Until Page Contains    Tedavi Planı    15s
    Click Element    android=new UiSelector().text("Stok & Envanter")
    Wait Until Page Contains Element    android=new UiSelector().text("30")    15s
    Page Should Contain Text    30

    # Step 6: Go to Today tab and take dose again
    Click Element    android=new UiSelector().descriptionContains(", Bugün").clickable(true)
    Wait Until Page Contains    ${MEDICATION}    15s
    ${late_visible2}=    Run Keyword And Return Status    Wait Until Page Contains Element    ${late_take}    5s
    IF    ${late_visible2}
        Click Element    ${late_take}
    ELSE
        Click Element    android=new UiSelector().text("Al")
    END

    # Step 7: Verify stock dropped to 29
    Click Element    android=new UiSelector().descriptionContains(", İlaçlarım").clickable(true)
    Wait Until Page Contains    Tedavi Planı    15s
    Click Element    android=new UiSelector().text("Stok & Envanter")
    Wait Until Page Contains Element    android=new UiSelector().text("29")    15s
    Page Should Contain Text    29

    # Step 8: Return to Today tab and expand "Alınan Dozlar"
    Click Element    android=new UiSelector().descriptionContains(", Bugün").clickable(true)
    Wait Until Page Contains    Bugün    15s
    Wait Until Page Contains Element    android=new UiSelector().textContains("Alınan Dozlar")    10s
    Click Element    android=new UiSelector().textContains("Alınan Dozlar")
    Wait Until Page Contains Element    android=new UiSelector().descriptionContains(", Kaydı düzelt").clickable(true)    10s

    # Step 9: Tap the taken record row on Today ("Düzelt") and confirm in dialog
    Click Element    android=new UiSelector().descriptionContains(", Kaydı düzelt").clickable(true)
    Wait Until Page Contains    Bu kayıt geri alınacak    10s
    Click Element    android=new UiSelector().resourceId("android:id/button1")

    # Step 10: Verify dose is pending on Today and stock refunded to 30
    Wait Until Page Contains    ${MEDICATION}    15s
    ${take_ready2}=    Run Keyword And Return Status    Wait Until Page Contains Element    android=new UiSelector().textContains("Al")    10s
    Should Be True    ${take_ready2}
    Click Element    android=new UiSelector().descriptionContains(", İlaçlarım").clickable(true)
    Wait Until Page Contains    Tedavi Planı    15s
    Click Element    android=new UiSelector().text("Stok & Envanter")
    Wait Until Page Contains Element    android=new UiSelector().text("30")    15s
    Page Should Contain Text    30

    # Step 11: Take dose third time from Today tab
    Click Element    android=new UiSelector().descriptionContains(", Bugün").clickable(true)
    Wait Until Page Contains    ${MEDICATION}    15s
    ${late_visible3}=    Run Keyword And Return Status    Wait Until Page Contains Element    ${late_take}    5s
    IF    ${late_visible3}
        Click Element    ${late_take}
    ELSE
        Click Element    android=new UiSelector().text("Al")
    END

    # Step 12: Verify stock dropped to 29
    Click Element    android=new UiSelector().descriptionContains(", İlaçlarım").clickable(true)
    Wait Until Page Contains    Tedavi Planı    15s
    Click Element    android=new UiSelector().text("Stok & Envanter")
    Wait Until Page Contains Element    android=new UiSelector().text("29")    15s
    Page Should Contain Text    29

    # Step 13: Go to History tab and verify the record row is correctable
    Click Element    android=new UiSelector().descriptionContains(", Geçmiş").clickable(true)
    Wait Until Page Contains    Bugünün Kayıtları    15s
    Wait Until Page Contains Element    android=new UiSelector().descriptionContains(", Kaydı düzelt").clickable(true)    10s

    # Step 14: Tap the record row in History and confirm in dialog
    Click Element    android=new UiSelector().descriptionContains(", Kaydı düzelt").clickable(true)
    Wait Until Page Contains    Bu kayıt geri alınacak    10s
    Click Element    android=new UiSelector().resourceId("android:id/button1")

    # Step 15: Verify stock refunded back to 30
    Click Element    android=new UiSelector().descriptionContains(", İlaçlarım").clickable(true)
    Wait Until Page Contains    Tedavi Planı    15s
    Click Element    android=new UiSelector().text("Stok & Envanter")
    Wait Until Page Contains Element    android=new UiSelector().text("30")    15s
    Page Should Contain Text    30

    # Step 16: Verify Today tab has dose pending again
    Click Element    android=new UiSelector().descriptionContains(", Bugün").clickable(true)
    Wait Until Page Contains    ${MEDICATION}    15s
    ${take_ready3}=    Run Keyword And Return Status    Wait Until Page Contains Element    android=new UiSelector().textContains("Al")    10s
    Should Be True    ${take_ready3}
    Capture Page Screenshot    medication-undo-flow.png

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
