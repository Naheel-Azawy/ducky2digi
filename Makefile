./build/ducky2digi: ducky2digi.js
	mkdir -p build
	cat launcher.sh ducky2digi.js > ./build/ducky2digi
	chmod +x ./build/ducky2digi

uninstall:
	rm -f /bin/ducky2digi
	rm -f /usr/local/bin/ducky2digi

.PHONY: install uninstall
