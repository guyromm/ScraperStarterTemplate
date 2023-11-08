#!/bin/bash
source .env
function killvnc() {
    for F in $(ls .vnc/*pid) ; do
	echo "F:"$F
	DN=$(echo "$F" | cut -f2 -d':' | cut -f1 -d'.')
	echo "DN=$DN"
	cat $F | xargs -r kill -9
	xlockfile="/tmp/.X"$DN'-lock'
	echo "rm -rf $xlockfile"
	unixfile='/tmp/.X11-unix/X'$DN
	echo 'rm -rf '$unixfile
	rm -rf $unixfile
	rm -rf $xlockfile
	echo "rm $F"
	rm $F
	logfile=.vnc/`hostname`':'$DN'.log'
	echo "rm $logfile"
	rm $logfile
	done
    #cat .vnc/*pid | xargs -r kill -9
    #rm .vnc/*pid .vnc/*log
}
function launchvnc() {
    tightvncserver -geometry 1280x768 -depth 16 -localhost -ac -name "$APPNAME"
    TPID="$(ps aux | egrep `whoami`'.*Xtightvnc' | grep -v grep | awk '{print $2}')"
    echo "tightvncserver pid is $TPID"
    netstat -nlp | grep $TPID
}

function vncdisplay() {
    echo ":"$(cat .vnc/*.log  | egrep -i -o "Desktop name '(.*)' \((.*)\)" | tail -1 | cut -f2 -d'(' | cut -f2 -d':' | cut -f1 -d')')
}

function vncport() {
    netstat -nlp 2>/dev/null | egrep "\:59.*LISTEN.*"$(cat .vnc/*pid)/Xtightvnc | cut -f2 -d':' | cut -f1 | awk '{print $1}'
    }

function connectcmd() {
    echo 'ssh -L localhost:'$(vncport)':localhost:'$(vncport)' '`hostname`' & sleep 2 ; vinagre localhost:'$(vncport)'  ; kill -9 %%'
    }
#echo "0 = '$0'"
(return 0 2>/dev/null) && sourced=1 || sourced=0
#[[ #$0 =~ bash$ ]] || #&& echo "tmux.sh sourced" ||
[[ "$sourced" = "1" ]] || 
        {
	    echo '* killing' && \
		killvnc && \
		echo '* launching' && \
		launchvnc && \
		echo '* use the below command to connect by tunnel' && \
		connectcmd
        }
