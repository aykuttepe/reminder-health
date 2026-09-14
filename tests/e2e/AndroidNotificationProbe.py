"""Read-only Android evidence for notifications; never log notification contents."""

import os
from pathlib import Path
import re
import shutil
import subprocess
import time

from appium.webdriver.common.appiumby import AppiumBy
from robot.api import logger
from robot.api.deco import keyword
from robot.libraries.BuiltIn import BuiltIn


class AndroidNotificationProbe:
    ROBOT_LIBRARY_SCOPE = "SUITE"
    ROBOT_AUTO_KEYWORDS = False
    PACKAGE = "com.itmarti.reminder"

    def __init__(self, udid):
        self.udid = udid
        sdk = os.environ.get("ANDROID_HOME") or os.environ.get("ANDROID_SDK_ROOT")
        properties = Path(__file__).resolve().parents[2] / "mobile-app/android/local.properties"
        if not sdk and properties.exists():
            match = re.search(r"^sdk\.dir=(.+)$", properties.read_text(), re.MULTILINE)
            sdk = match[1].strip() if match else None
        self.adb = str(Path(sdk) / "platform-tools/adb") if sdk else shutil.which("adb")

    def _shell(self, *args):
        if not self.udid or self.udid.startswith("emulator-"):
            raise AssertionError("An explicit physical ANDROID_UDID is required.")
        if not self.adb:
            raise AssertionError("Set ANDROID_HOME or install adb on PATH.")
        result = subprocess.run(
            [self.adb, "-s", self.udid, "shell", *args],
            capture_output=True, text=True, timeout=15,
        )
        if result.returncode:
            raise AssertionError(f"ADB {args[0]} failed (exit {result.returncode}).")
        return result.stdout

    def _device_time(self):
        return int(self._shell("date", "+%s%3N").strip())

    @staticmethod
    def _notification_time(dump, tag="test-med-main"):
        # Restrict parsing to active records: archived/snoozed history cannot pass.
        section = dump.partition("  Notification List:")[2]
        if not section:
            raise AssertionError("Unsupported dumpsys format: Notification List missing.")
        section = re.split(r"(?m)^  (?=\S)", section, maxsplit=1)[0]
        timestamps = []
        for block in re.split(r"(?m)^    (?=NotificationRecord\()", section):
            header = block.splitlines()[0] if block.splitlines() else ""
            if f"pkg={AndroidNotificationProbe.PACKAGE} " not in header:
                continue
            if f"tag={tag} " not in header:
                continue
            match = re.search(r"mUpdateTimeMs=(\d+)", block)
            if not match:
                raise AssertionError("Test notification has no update timestamp.")
            timestamps.append(int(match[1]))
        return max(timestamps, default=0)

    def _posted_time(self):
        # Raw dumpsys data stays in memory; return only our test's timestamp.
        return self._notification_time(self._shell("dumpsys", "notification"))

    def _locked(self):
        policy = self._shell("dumpsys", "window", "policy")
        showing = re.search(r"(?m)^\s+(?:mIsShowing|showing)=(true|false)\s*$", policy)
        if not showing:
            raise AssertionError("Unsupported keyguard state; cannot prove screen lock.")
        return showing[1] == "true"

    @staticmethod
    def _driver():
        return BuiltIn().get_library_instance("AppiumLibrary")._current_application()

    @keyword
    def phone_should_be_unlocked(self):
        if self._locked():
            raise AssertionError("Unlock the phone manually before running this test.")

    @keyword
    def bring_installed_reminder_to_foreground(self):
        self.phone_should_be_unlocked()
        self._shell("am", "start", "-W", "-n", f"{self.PACKAGE}/{self.PACKAGE}.MainActivity")
        deadline = time.monotonic() + 10
        while time.monotonic() < deadline:
            if self._driver().query_app_state(self.PACKAGE) == 4:
                return
            time.sleep(0.5)
        raise AssertionError("Reminder activity did not reach foreground within 10 seconds.")

    @keyword
    def trigger_and_verify_native_test_notification(self, locked=False):
        """Click once, leave foreground immediately, and require fresh OS evidence."""
        self.phone_should_be_unlocked()
        driver = self._driver()
        button = driver.find_element(
            AppiumBy.ANDROID_UIAUTOMATOR,
            'new UiSelector().text("3 Sn Sonra Test Bildirimi Gönder")',
        )
        previous = self._posted_time()
        started_ms = self._device_time()
        button.click()
        # Ensure the app leaves foreground (HOME); if testing locked state, sleep/lock (223) as well.
        self._shell("input", "keyevent", "3")
        if locked:
            self._shell("input", "keyevent", "223")
        deadline = time.monotonic() + 15
        protected_since = None
        samples = 0
        while time.monotonic() < deadline:
            state = driver.query_app_state(self.PACKAGE)
            is_locked = self._locked() if locked else True
            if protected_since is None:
                if state == 3 and is_locked:
                    protected_since = self._device_time()
                else:
                    if time.monotonic() > deadline - 10:
                        raise AssertionError(
                            f"Failed to enter expected background/lock state within 5s (state={state}, locked={is_locked})."
                        )
                    time.sleep(0.2)
                    continue
            else:
                if state != 3:
                    raise AssertionError(f"App must remain running in background; state={state}.")
                if locked and not is_locked:
                    raise AssertionError("Keyguard is not locked; locked delivery is unproven.")
            samples += 1
            posted_ms = self._posted_time()
            if posted_ms > previous:
                if posted_ms <= protected_since:
                    raise AssertionError("Notification arrived before background/lock was verified.")
                # Recheck after reading the system record as well.
                if driver.query_app_state(self.PACKAGE) != 3:
                    raise AssertionError("App returned to foreground during delivery.")
                if locked and not self._locked():
                    raise AssertionError("Phone unlocked during notification delivery.")
                elapsed_ms = posted_ms - started_ms
                logger.info(
                    f"Fresh test-med-main: latency={elapsed_ms}ms, "
                    f"background_verified_before_post={posted_ms - protected_since}ms, "
                    f"locked={locked}, state_samples={samples}. No content captured."
                )
                return elapsed_ms
            time.sleep(0.5)
        raise AssertionError("No fresh native test-med-main notification within 15 seconds.")

    @keyword
    def restore_phone_after_notification_test(self):
        if self._locked():
            # Wake only. Never attempt PIN, fingerprint, or security changes.
            self._shell("input", "keyevent", "224")
            logger.info("Phone remains locked; unlock manually to return to the app.")
        else:
            self.bring_installed_reminder_to_foreground()
