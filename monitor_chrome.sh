#!/bin/bash
norestart="$1"
source .env
source ./tightvncserver.sh
#killvnc && launchvnc && connectcmd
DISPLAY=$(vncdisplay)
echo "export DISPLAY=$DISPLAY"
while (true) ; do
    echo "D='$D'"
    google-chrome \
	--auto-open-devtools-for-tabs \
     	"--auto-select-desktop-capture-source='$APPNAME scraper'" 'chrome://extensions' & \
    P="$!"
    echo "launched pid '$P'"
    while (true) ; do
	L=$(./psql.sh \
		-t \
		-c "select id from r where ts>=now()-interval '3 minutes' limit 1" \
		| egrep -v '^$' \
		| egrep -v '^([[:space:]]*)0$' \
		| wc -l)
	echo "L='$L'"
	echo $(connectcmd)
	sleep 500
	if [[ "$L" != "1" && ! "$norestart" ]] ; then
	    echo "KILLING CHROME"
	    kill $P
	    break;
	    fi
	done
    done
