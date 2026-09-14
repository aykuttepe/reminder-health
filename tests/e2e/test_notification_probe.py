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


if __name__ == "__main__":
    unittest.main()
