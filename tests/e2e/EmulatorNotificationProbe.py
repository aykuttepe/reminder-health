"""ADB helpers for emulator-only notification tests; refuses physical devices."""

import os
from pathlib import Path
import re
import shutil
import subprocess

from robot.api import logger
from robot.api.deco import keyword


class EmulatorNotificationProbe:
    ROBOT_LIBRARY_SCOPE = "SUITE"
    ROBOT_AUTO_KEYWORDS = False
    PACKAGE = "com.itmarti.reminder"

    def __init__(self, udid="emulator-5554"):
        self.udid = udid
        sdk = os.environ.get("ANDROID_HOME") or os.environ.get("ANDROID_SDK_ROOT")
        properties = Path(__file__).resolve().parents[2] / "mobile-app/android/local.properties"
        if not sdk and properties.exists():
            match = re.search(r"^sdk\.dir=(.+)$", properties.read_text(), re.MULTILINE)
            sdk = match[1].strip() if match else None
        self.adb = str(Path(sdk) / "platform-tools/adb") if sdk else shutil.which("adb")

    def _shell(self, *args):
        # These keywords kill processes and read all notifications: never on a personal phone.
        if not self.udid.startswith("emulator-"):
            raise AssertionError("EmulatorNotificationProbe only runs against emulator- serials.")
        if not self.adb:
            raise AssertionError("Set ANDROID_HOME or install adb on PATH.")
        result = subprocess.run(
            [self.adb, "-s", self.udid, "shell", *args],
            capture_output=True, text=True, timeout=15,
        )
        if result.returncode:
            raise AssertionError(f"ADB {args[0]} failed (exit {result.returncode}).")
        return result.stdout

    @staticmethod
    def _tags(dump):
        section = dump.partition("  Notification List:")[2]
        if not section:
            raise AssertionError("Unsupported dumpsys format: Notification List missing.")
        section = re.split(r"(?m)^  (?=\S)", section, maxsplit=1)[0]
        return [m[1] for m in re.finditer(
            rf"NotificationRecord\([^\n]*pkg={re.escape(EmulatorNotificationProbe.PACKAGE)} [^\n]*tag=(\S+) ",
            section)]

    @staticmethod
    def _posted_times(dump):
        section = dump.partition("  Notification List:")[2]
        if not section:
            raise AssertionError("Unsupported dumpsys format: Notification List missing.")
        section = re.split(r"(?m)^  (?=\S)", section, maxsplit=1)[0]
        posted = {}
        for block in re.split(r"(?m)^    (?=NotificationRecord\()", section):
            header = block.splitlines()[0] if block.splitlines() else ""
            tag = re.search(r"tag=(\S+) ", header)
            stamp = re.search(r"mUpdateTimeMs=(\d+)", block)
            if f"pkg={EmulatorNotificationProbe.PACKAGE} " in header and tag and stamp:
                posted[tag[1]] = int(stamp[1])
        return posted

    @keyword
    def schedule_target(self, minutes_ahead=3):
        """Device-clock slot at least `minutes_ahead` whole minutes away, as HH/MM/date/epoch."""
        now = self._shell("date", "+%Y-%m-%d_%H_%M_%S_%s").strip().split("_")
        date, hour, minute, second, epoch = now[0], int(now[1]), int(now[2]), int(now[3]), int(now[4])
        total = hour * 60 + minute + int(minutes_ahead) + (1 if second > 40 else 0)
        if total >= 24 * 60:
            raise AssertionError("Target slot would cross midnight; rerun after 00:00.")
        target_epoch = epoch - second + (total - hour * 60 - minute) * 60
        target = {"hour": f"{total // 60:02d}", "minute": f"{total % 60:02d}", "date": date,
                  "time": f"{total // 60:02d}:{total % 60:02d}", "epoch_ms": target_epoch * 1000}
        logger.info(f"Schedule target: {target}")
        return target

    @keyword
    def device_epoch_ms(self):
        return int(self._shell("date", "+%s%3N").strip())

    @keyword
    def reminder_notification_posted_ms(self, tag):
        return self._posted_times(self._shell("dumpsys", "notification")).get(tag, 0)

    @keyword
    def turn_screen_off(self):
        self._shell("input", "keyevent", "223")

    @keyword
    def wake_and_dismiss_keyguard(self):
        # Emulator AVD has no PIN; never used on devices with a secure lock.
        self._shell("input", "keyevent", "224")
        self._shell("wm", "dismiss-keyguard")

    @staticmethod
    def _alarm_times(dump):
        """Scheduled wall-clock times of this package's pending alarms, sorted, minute precision."""
        blocks = re.findall(
            rf"(?ms)^\s+(?:RTC_WAKEUP|RTC|ELAPSED_WAKEUP|ELAPSED) #\d+: Alarm\{{[^}}]*{re.escape(EmulatorNotificationProbe.PACKAGE)}\}}"
            r".*?(?=^\s+(?:RTC_WAKEUP|RTC|ELAPSED_WAKEUP|ELAPSED) #|\Z)", dump)
        times = []
        for block in blocks:
            when = re.search(r"origWhen=(\d{4}-\d{2}-\d{2} \d{2}:\d{2})", block)
            if not when:
                raise AssertionError("Unsupported dumpsys alarm format: origWhen missing.")
            times.append(when[1])
        return sorted(times)

    @keyword
    def reminder_alarm_times(self):
        times = self._alarm_times(self._shell("dumpsys", "alarm"))
        logger.info(f"Pending reminder alarms: {times}")
        return times

    @keyword
    def device_date(self, days_from_today=0):
        """Emulator-local calendar date shifted by whole days, as YYYY-MM-DD."""
        return self._shell("date", "-d", f"@$(( $(date +%s) + {int(days_from_today)} * 86400 ))", "+%Y-%m-%d").strip()

    @keyword
    def swipe_screen_up(self):
        """Injected touch swipe; UiAutomator scroll gestures do not move some settings pages."""
        self._shell("input", "swipe", "540", "1900", "540", "700", "400")

    @keyword
    def device_hour_minute(self):
        return self._shell("date", "+%H:%M").strip()

    @keyword
    def active_reminder_notification_tags(self):
        tags = self._tags(self._shell("dumpsys", "notification"))
        logger.info(f"Active reminder notification tags: {tags}")
        return tags

    @keyword
    def kill_reminder_process(self):
        """Simulates a low-memory kill: posted notifications stay, the JS runtime is gone."""
        self._shell("am", "kill", self.PACKAGE)
        if self._pid_exists():
            raise AssertionError("Reminder process is still alive after am kill.")

    def _pid_exists(self):
        if not self.udid.startswith("emulator-"):
            raise AssertionError("EmulatorNotificationProbe only runs against emulator- serials.")
        result = subprocess.run(
            [self.adb, "-s", self.udid, "shell", "pidof", self.PACKAGE],
            capture_output=True, text=True, timeout=15,
        )
        return result.returncode == 0 and result.stdout.strip() != ""

    @keyword
    def collapse_status_bar(self):
        """A shade left open by an earlier run hides the app from UiAutomator."""
        self._shell("cmd", "statusbar", "collapse")

    @keyword
    def expand_notification_shade(self):
        self._shell("cmd", "statusbar", "expand-notifications")

    @keyword
    def reminder_process_should_not_be_running(self):
        if self._pid_exists():
            raise AssertionError("Reminder process is running.")
