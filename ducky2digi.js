function ducky2digi(inp, opts={}) {
    let loop       = opts.loop         !== undefined ?  opts.loop         : false;
    let flash_str  = opts.no_flash_str !== undefined ? !opts.no_flash_str : true;
    let init_delay = opts.init_delay   !== undefined ?  opts.init_delay   : 1000;

    const MAP = {
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
    };

    function nope(i, k) {
        throw Error(`${i}: Key '${k}' not found`);
    }

    function get_key(k) {
        if (k.length == 1) {
            return "KEY_" + k.toUpperCase();
        } else {
            let m = k.match(/^F(1?[1-9])$/);
            if (m != null) {
                return "KEY_F" + m[1];
            } else {
                return MAP[k];
            }
        }
    }

    let res = "";

    res += '#include "DigiKeyboard.h"\n\n';
    res += "// Converted using https://naheel.xyz/ducky2digi\n\n";
    if (loop) {
        res += "void setup() {}\n\n";
        res += "void loop() {\n";
    } else {
        res += "void loop() {}\n\n";
        res += "void setup() {\n";
    }

    res += "  DigiKeyboard.sendKeyStroke(0);\n";
    if (init_delay > 0) {
        res += "  DigiKeyboard.delay(" + init_delay + ");\n";
    }

    // the default delay if specified by user
    let def_delay = 0;

    // last command. used if repeat was used
    let last_cmd;

    // main loop
    let i = 0;
    for (let line of inp.split("\n")) {
        ++i;
        line = line.trim();
        if (line.length == 0) { // skip empty lines
            continue;
        }
        let space = line.indexOf(" ");
        let cmd, arg;
        if (space != -1) {
            cmd = line.substring(0, space);
            arg = line.substring(space + 1);
        } else {
            cmd = line;
            arg = undefined;
        }
        if (cmd == "DEFAULTDELAY" || cmd == "DEFAULT_DELAY") {
            def_delay = Number(arg);
            continue;
        } else if (cmd == "REM") {
            res += "  // " + arg + "\n";
            continue;
        } else if (cmd == "STRING") {
            last_cmd = "DigiKeyboard.print(";
            if (flash_str) {
                last_cmd += "F(";
            }
            last_cmd += JSON.stringify(arg) + ")"; // escape chars
            if (flash_str) {
                last_cmd += ")";
            }
            last_cmd += ";";
            res += "  " + last_cmd + "\n";
        } else if (cmd == "DELAY") {
            last_cmd = "DigiKeyboard.delay(" + arg + ");";
            res += "  " + last_cmd + "\n";
        } else if (cmd == "REPEAT") {
            res += "  for (int i = 0; i < " + arg + "; ++i)\n";
            res += "    " + last_cmd + "\n";
        } else {
            if (arg != undefined) { // MOD key is used
                let mod = MAP[cmd];
                let key = get_key(arg);
                if (!mod) nope(i, cmd);
                if (!key) nope(i, arg);
                res += "  DigiKeyboard.sendKeyStroke(" + key + ", " +
                    mod + ");\n";
            } else {
                let key = get_key(cmd);
                if (!key) nope(i, cmd);
                res += "  DigiKeyboard.sendKeyStroke(" + key + ");\n";
            }
        }
        if (def_delay != 0) {
            res += "  DigiKeyboard.delay(" + def_delay + ");\n";
        }
    }

    res += "}";

    return res;
}

if (typeof(process) != "undefined") {
    const fs            = require("fs");
    const os            = require("os");
    const path          = require("path");
    const child_process = require("child_process");

    function help() {
        const bin = process.argv[1].split("/").pop();
        console.log(`usage: ${bin} [OPTION]... [FILE]`);
        console.log("Convert DuckyScripts to Digistump Arduino sketck");
        console.log("optional arguments:");
        console.log("  -h, --help          show this help message and exit");
        console.log("  -l, --loop          keep repeating the payload");
        console.log("  -f, --no-flash-str  prevent storing strings in flash");
        console.log("  -d, --init-delay D  initial delay before payload starts");
        console.log("  -u, --upload        upload using platformio");
        process.exit(1);
    }

    let upload       = false;
    let loop         = false;
    let no_flash_str = false;
    let init_delay   = 1000;
    let inp_file     = undefined;
    let extra_args   = [];

    for (let i = 2; i < process.argv.length; ++i) {
        switch (process.argv[i]) {
        case "-u": case "--upload":       upload       = true; break;
        case "-l": case "--loop":         loop         = true; break;
        case "-f": case "--no-flash-str": no_flash_str = true; break;
        case "-d": case "--init-delay":
            if (i + 1 < process.argv.length) {
                init_delay = process.argv[++i];
            } else {
                help();
            }
            break;
        default:
            if (process.argv[i].startsWith("-")) {
                console.error(`ERROR: unknown option ${process.argv[i]}`);
                help();
            } else {
                extra_args.push(process.argv[i]);
            }
        }
    }

    if (extra_args.length > 1) {
        help();
    } else if (extra_args.length == 1) {
        if (fs.existsSync(extra_args[0])) {
            inp_file = extra_args[0];
        } else {
            console.error(`ERROR: '${extra_args[0]}' is not a file`);
            help();
        }
    }

    function run(inp) {
        const opts = {loop, no_flash_str, init_delay};
        let out;
        try {
            out = ducky2digi(inp, opts);
            console.log(out);
        } catch (e) {
            console.error(e.toString());
            return;
        }

        if (upload) {
            const d = fs.mkdtempSync(path.join(os.tmpdir(), "ducky2digi-"));
            fs.mkdirSync(path.join(d, "src"));
            fs.writeFileSync(path.join(d, "src", "main.ino"), out);
            fs.writeFileSync(path.join(d, "platformio.ini"),
                             "[env:digispark-tiny]\n"   +
                             "platform = atmelavr\n"    +
                             "board = digispark-tiny\n" +
                             "framework = arduino");
            child_process.spawnSync("pio", ["run", "-t", "upload", "-d", d],
                                    {stdio: "inherit"});
            fs.rmSync(d, {recursive: true, force: true});
        }
    }

    let inp = "";
    if (inp_file) {
        inp = fs.readFileSync(inp_file).toString();
        run(inp);
    } else {
        process.stdin.resume();
        process.stdin.setEncoding("utf8");
        process.stdin.on("data", line => inp += line);
        process.stdin.on("end", () => run(inp));
    }
}
