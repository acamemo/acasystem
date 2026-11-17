import hashlib
import importlib.util
import json
import tempfile
import unittest
import zipfile
from pathlib import Path

spec = importlib.util.spec_from_file_location("install_sonoff", Path(__file__).with_name("install-sonoff.py"))
installer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(installer)


class InstallSonoffTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="aca-sonoff-test-")
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.config = self.root / "config"
        self.config.mkdir()
        self.archive = self.root / "sonoff.zip"

    def fixture(self, extra=None):
        files = {"manifest.json": json.dumps({"domain": "sonoff", "version": "3.13.3"}), "__init__.py": "# fixture\n"}
        with zipfile.ZipFile(self.archive, "w") as archive:
            for name, data in files.items():
                archive.writestr(installer.PREFIX + name, data)
            if extra:
                archive.writestr(*extra)
        return hashlib.sha256(self.archive.read_bytes()).hexdigest()

    def test_first_install_and_repeat_preserve_private_files(self):
        digest = self.fixture()
        storage = self.config / ".storage"
        storage.mkdir()
        (storage / "untouched").write_bytes(b"private-fixture")
        self.assertEqual(installer.install(self.archive, self.config, digest), "installed")
        cache = self.config / "custom_components/sonoff/__pycache__"
        cache.mkdir()
        (cache / "example.pyc").write_bytes(b"cache")
        self.assertEqual(installer.install(self.archive, self.config, digest), "unchanged")
        self.assertEqual((storage / "untouched").read_bytes(), b"private-fixture")
        self.assertFalse(list(self.config.glob("custom_components/.aca-sonoff-*")))

    def test_different_existing_component_is_preserved(self):
        digest = self.fixture()
        installer.install(self.archive, self.config, digest)
        path = self.config / "custom_components/sonoff/__init__.py"
        path.write_bytes(b"previous-version")
        with self.assertRaises(ValueError):
            installer.install(self.archive, self.config, digest)
        self.assertEqual(path.read_bytes(), b"previous-version")

    def test_hash_failure_writes_nothing(self):
        self.fixture()
        with self.assertRaises(ValueError):
            installer.install(self.archive, self.config)
        self.assertEqual(list(self.config.iterdir()), [])

    def test_unsafe_paths_and_links_write_nothing(self):
        link = zipfile.ZipInfo(installer.PREFIX + "link")
        link.create_system = 3
        link.external_attr = 0o120777 << 16
        backslash = zipfile.ZipInfo("placeholder")
        backslash.filename = installer.PREFIX + "bad\\path"
        for name in [installer.PREFIX + "../escape", "/outside", backslash, link]:
            digest = self.fixture((name, "bad"))
            with self.assertRaises(ValueError):
                installer.install(self.archive, self.config, digest)
            self.assertEqual(list(self.config.iterdir()), [])


if __name__ == "__main__":
    unittest.main()
