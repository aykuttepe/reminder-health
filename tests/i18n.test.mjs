import test from 'node:test';
import assert from 'node:assert/strict';
import { translations, getTranslations } from '../src/i18n/translations.ts';

test('i18n: translations dictionaries exist for both tr and en', () => {
  assert.ok(translations.tr, 'Turkish translations must exist');
  assert.ok(translations.en, 'English translations must exist');
});

test('i18n: tr and en have 100% key parity and no missing keys', () => {
  const trKeys = Object.keys(translations.tr).sort();
  const enKeys = Object.keys(translations.en).sort();

  assert.strictEqual(trKeys.length, enKeys.length, `Key counts must match: TR=${trKeys.length}, EN=${enKeys.length}`);
  assert.deepStrictEqual(trKeys, enKeys, 'Both languages must have identical keys');
});

test('i18n: no translation values are empty or undefined', () => {
  for (const lang of ['tr', 'en']) {
    const dict = translations[lang];
    for (const [key, value] of Object.entries(dict)) {
      assert.ok(typeof value === 'string', `translations.${lang}.${key} must be a string`);
      assert.ok(value.trim().length > 0, `translations.${lang}.${key} must not be empty`);
    }
  }
});

test('i18n: getTranslations returns correct dictionary with safe fallback', () => {
  const tr = getTranslations('tr');
  assert.strictEqual(tr.tabToday, 'Bugün');

  const en = getTranslations('en');
  assert.strictEqual(en.tabToday, 'Today');

  // Fallback test
  const fallback = getTranslations('fr');
  assert.strictEqual(fallback.tabToday, 'Bugün');
});
