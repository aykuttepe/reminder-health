import unittest

from AndroidNotificationProbe import AndroidNotificationProbe


def record(package="com.itmarti.reminder", tag="test-med-main", timestamp=100):
    return (
        f"    NotificationRecord(0x1: pkg={package} user=UserHandle{{0}} "
        f"id=0 tag={tag} importance=4)\n"
        f"      mUpdateTimeMs={timestamp}(date)\n"
    )


class NotificationEvidenceTests(unittest.TestCase):
    def test_only_active_primary_notification_from_target_package_counts(self):
        dump = (
            "  Notification List:\n"
            + record(timestamp=100)
            + record(package="com.example.other", timestamp=900)
            + record(tag="test-med-repeat-1", timestamp=800)
            + "  Historical notifications:\n"
            + record(timestamp=999)
        )
        self.assertEqual(AndroidNotificationProbe._notification_time(dump), 100)

    def test_no_matching_notification_returns_zero(self):
        dump = "  Notification List:\n" + record(tag="real-medication-dose")
        self.assertEqual(AndroidNotificationProbe._notification_time(dump), 0)

    def test_missing_timestamp_fails_instead_of_claiming_no_notification(self):
        dump = "  Notification List:\n" + record().split("      mUpdateTimeMs")[0]
        with self.assertRaisesRegex(AssertionError, "timestamp"):
            AndroidNotificationProbe._notification_time(dump)

    def test_unsupported_dump_format_cannot_pass(self):
        with self.assertRaisesRegex(AssertionError, "format"):
            AndroidNotificationProbe._notification_time("Permission denied")


class PhoneReminderGuardTests(unittest.TestCase):
    def probe_with(self, *tags):
        probe = AndroidNotificationProbe("R6GL5000NTV")
        dump = "  Notification List:\n" + "".join(record(tag=tag) for tag in tags)
        probe._records = lambda: AndroidNotificationProbe._active_records(dump)
        return probe

    def test_same_slot_main_and_repeat_allow_tapping(self):
        slot = "dose-a-2026-09-16-00:05"
        self.probe_with(f"{slot}-main", f"{slot}-repeat-1", "test-med-main").only_test_reminder_should_be_active(f"{slot}-repeat-1")

    def test_another_dose_or_slot_blocks_tapping(self):
        slot = "dose-a-2026-09-16-00:05"
        for other in ("dose-real-2026-09-16-00:05-main", "dose-a-2026-09-16-00:06-main"):
            with self.assertRaisesRegex(AssertionError, "not tapping"):
                self.probe_with(f"{slot}-main", other).only_test_reminder_should_be_active(f"{slot}-main")


if __name__ == "__main__":
    unittest.main()
