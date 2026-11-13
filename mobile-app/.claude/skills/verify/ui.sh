#!/bin/zsh
# Rutin emulator helper. ui.sh shot NAME | tap "text-or-desc substring" | dump
export PATH=/opt/homebrew/share/android-commandlinetools/platform-tools:$PATH
OUT=${VERIFY_OUT:-${TMPDIR:-/tmp}/rutin-verify}; mkdir -p $OUT
pull() { adb shell uiautomator dump /sdcard/u.xml >/dev/null; adb exec-out cat /sdcard/u.xml > $OUT/u.xml; }
case $1 in
  shot) adb exec-out screencap -p > $OUT/$2.png; echo $OUT/$2.png;;
  dump) pull; python3 -I - $OUT/u.xml <<'PY'
import sys,xml.etree.ElementTree as E
for n in E.parse(sys.argv[1]).iter('node'):
    t=n.get('text') or n.get('content-desc')
    if t: print(repr(t[:60]), n.get('bounds'), n.get('class').split('.')[-1])
PY
  ;;
  tap) pull; xy=$(python3 -I - $OUT/u.xml "$2" <<'PY'
import sys,re,xml.etree.ElementTree as E
q=sys.argv[2]
for n in E.parse(sys.argv[1]).iter('node'):
    if q in ((n.get('text') or '')+'|'+(n.get('content-desc') or '')):
        a=list(map(int,re.findall(r'\d+',n.get('bounds')))); print((a[0]+a[2])//2,(a[1]+a[3])//2); break
PY
); [ -n "$xy" ] && adb shell input tap ${=xy} && echo "tapped $2 at $xy" || echo "NOT FOUND $2";;
esac
