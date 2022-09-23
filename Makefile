PREFIX    = /usr/local
BINPREFIX = $(DESTDIR)$(PREFIX)/bin
BIN       = $(BINPREFIX)/ducky2digi

install:
	mkdir -p $(BINPREFIX)
	echo '#!/usr/bin/env node' > $(BIN)
	cat ./ducky2digi.js       >> $(BIN)
	chmod +x                     $(BIN)

uninstall:
	rm -f $(BIN)

.PHONY: install uninstall
