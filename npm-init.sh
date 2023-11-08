#!/bin/bash
echo '* forking npm i' && \

    (cd common && npm install ; cd - ) & \
    (cd ext && npm install ; cd - ) & \
    echo '* waiting' && \
	wait && \
	echo '* all done!'

