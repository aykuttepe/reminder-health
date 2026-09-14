*** Settings ***
Documentation    Checks the Python/Robot imports and local Appium HTTP connection. This is not an Android UI test.
Library          AppiumLibrary

*** Test Cases ***
Local Appium Server Is Ready
    ${status}=    Evaluate    json.load(urllib.request.urlopen('http://127.0.0.1:4723/status', timeout=10))    modules=json,urllib.request
    Should Be True    ${status}[value][ready]
    Should Not Be Empty    ${status}[value][build][version]
