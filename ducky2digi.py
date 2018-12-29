import sys
import re
import argparse

parser = argparse.ArgumentParser(description="Convert DuckyScripts to DigistumpArduino sketck")
parser.add_argument('--loop', help='Keep repeating the payload',
                    action="store_true")
parser.add_argument('--no-flash-str', help='Prevent storing strings in flash',
                    action="store_true")
parser.add_argument('--init-delay', help='Initial delay before payload starts',
                    metavar="D", type=int, default=1000)

args = parser.parse_args()

loop = args.loop
flash_str = not args.no_flash_str
init_delay = args.init_delay

MAP = {
    "GUI":            "MOD_GUI_LEFT",
    "WINDOWS":        "MOD_GUI_LEFT",
    "SHIFT":          "MOD_SHIFT_LEFT",
    "ALT":            "MOD_ALT_LEFT",
    "CONTROL":        "MOD_CONTROL_LEFT",
    "CTRL":           "MOD_CONTROL_LEFT",

    "CTRL-ALT":       "MOD_CONTROL_LEFT | MOD_ALT_LEFT",
    "CTRL-SHIFT":     "MOD_CONTROL_LEFT | MOD_SHIFT_LEFT",
    "COMMAND-OPTION": "MOD_GUI_LEFT | MOD_ALT_LEFT",
    "ALT-SHIFT":      "MOD_ALT_LEFT | MOD_SHIFT_LEFT",
    "ALT-TAB":        "43, MOD_ALT_LEFT",

    "APP":            "101",
    "MENU":           "101",

    "UPARROW":        "82",
    "UP":             "82",

    "DOWNARROW" :     "81",
    "DOWN":           "81",

    "LEFTARROW":      "80",
    "LEFT":           "80",

    "RIGHTARROW":     "79",
    "RIGHT":          "79",

    "BREAK":          "72",
    "PAUSE":          "72",

    "ESC":            "41",
    "ESCAPE":         "41",

    "ENTER":          "KEY_ENTER",
    "CAPSLOCK":       "57",
    "DELETE":         "42",
    "END":            "77",
    "HOME":           "74",
    "NUMLOCK":        "83",
    "PAGEUP":         "75",
    "PAGEDOWN":       "78",
    "PRINTSCREEN":    "70",
    "SCROLLLOCK":     "71",
    "SPACE":          "44",
    "TAB":            "43"
}

def get_key(k):
    if len(k) == 1:
        return "KEY_" + k.upper()
    else:
        try:
            f_num = int(k[1:])
        except:
            f_num = None
        if k[0] == 'F' and f_num != None and f_num >= 1 and f_num <= 12:
            return "KEY_F" + str(f_num)
        else:
            return MAP[k]

print('#include "DigiKeyboard.h"\n')
if loop:
    print("void setup() {}\n")
    print("void loop() {")
else:
    print("void loop() {}\n")
    print("void setup() {")

print("DigiKeyboard.sendKeyStroke(0);")
if init_delay > 0:
    print("DigiKeyboard.delay(" + str(init_delay) + ");")

# the default delay if specified by user
def_delay = 0

# last command. used if repeat was used
last_cmd = None

i = 0
try:
    for line in sys.stdin:
        i += 1
        arr = re.sub(r'\s+', ' ', line.strip()).split(' ', 1)
        cmd = arr[0]
        arg = arr[1] if len(arr) > 1 else None
        if cmd == "DEFAULTDELAY" or cmd == "DEFAULT_DELAY":
            def_delay = int(arg)
            continue
        elif cmd == "REM":
            print("// " + arg)
            continue
        elif cmd == "STRING":
            last_cmd = "DigiKeyboard.print("
            if flash_str:
                last_cmd += "F("
            last_cmd += "\"" + arg.encode('unicode-escape').decode("utf-8") + "\")"
            if flash_str:
                last_cmd += ")"
            last_cmd += ";"
            print(last_cmd)
        elif cmd == "DELAY":
            last_cmd = "DigiKeyboard.delay(" + arg + ");"
            print(last_cmd)
        elif cmd == "REPEAT":
            print("for (int i = 0; i < " + arg + "; ++i)")
            print(last_cmd)
        else:
            if arg != None: # MOD key is used
                mod = MAP[cmd]
                key = get_key(arg)
                print("DigiKeyboard.sendKeyStroke(" + key + ", " + mod + ");")
            else:
                key = get_key(cmd)
                print("DigiKeyboard.sendKeyStroke(" + key + ");")
        if def_delay != 0:
            print("DigiKeyboard.delay(" + def_delay + ");")
except Exception as err:
    print("error at line " + str(i) + ": " + line[0:-1] + ":")
    print(repr(err))
    exit(1)

print("}")
