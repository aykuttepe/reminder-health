import unittest

from EmulatorNotificationProbe import EmulatorNotificationProbe


def record(package="com.itmarti.reminder", tag="dose-1-2026-09-15-22:30-main", timestamp=100):
    return (
        f"    NotificationRecord(0x1: pkg={package} user=UserHandle{{0}} "
        f"id=0 tag={tag} importance=4)\n"
        f"      mUpdateTimeMs={timestamp}(date)\n"
    )


class EmulatorNotificationEvidenceTests(unittest.TestCase):
    def test_active_tags_and_times_ignore_other_packages_and_history(self):
        dump = (
            "  Notification List:\n"
            + record(timestamp=100)
            + record(tag="dose-1-2026-09-15-22:30-repeat-1", timestamp=280)
            + record(package="com.example.other", tag="other", timestamp=900)
            + "  Historical notifications:\n"
            + record(tag="dose-9-2026-09-14-08:00-main", timestamp=999)
        )
        self.assertEqual(EmulatorNotificationProbe._tags(dump),
                         ["dose-1-2026-09-15-22:30-main", "dose-1-2026-09-15-22:30-repeat-1"])
        self.assertEqual(EmulatorNotificationProbe._posted_times(dump),
                         {"dose-1-2026-09-15-22:30-main": 100, "dose-1-2026-09-15-22:30-repeat-1": 280})

    def test_unsupported_dump_format_cannot_pass(self):
        for parse in (EmulatorNotificationProbe._tags, EmulatorNotificationProbe._posted_times):
            with self.assertRaisesRegex(AssertionError, "format"):
                parse("Permission denied")

    def test_alarm_times_only_include_this_package(self):
        dump = (
            "Pending alarm batches: 2\n"
            "  RTC_WAKEUP #1: Alarm{a1 type 0 origWhen 1 com.itmarti.reminder}\n"
            "    tag=*walarm*:expo.modules.notifications.NOTIFICATION_EVENT\n"
            "    origWhen=2026-09-18 05:00:00.000 window=0\n"
            "  RTC_WAKEUP #2: Alarm{a2 type 0 origWhen 1 com.other.app}\n"
            "    origWhen=2026-09-17 06:00:00.000 window=0\n"
            "  RTC_WAKEUP #3: Alarm{a3 type 0 origWhen 1 com.itmarti.reminder}\n"
            "    origWhen=2026-09-17 20:00:00.000 window=0\n"
        )
        self.assertEqual(EmulatorNotificationProbe._alarm_times(dump), ["2026-09-17 20:00", "2026-09-18 05:00"])

    def test_physical_device_serial_is_refused(self):
        probe = EmulatorNotificationProbe("R6GL5000NTV")
        with self.assertRaisesRegex(AssertionError, "emulator"):
            probe.kill_reminder_process()
        with self.assertRaisesRegex(AssertionError, "emulator"):
            probe.reminder_process_should_not_be_running()


if __name__ == "__main__":
    unittest.main()
