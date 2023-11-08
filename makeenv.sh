#!/bin/bash
function freeport() {
    FROM=$1
    TO=$2
    HOWMANY=$3
    comm -23 \
         <(seq "$FROM" "$TO" | sort) \
         <(lsof -iTCP -sTCP:LISTEN -n -P | awk '{print $9}' | cut -d':' -f2 | sort -u) \
        | gshuf | head -n "$HOWMANY"
}
export APPNAME=$(basename $(pwd))
export DBNAME=$APPNAME
export APPPORT=$(freeport 3000 4000 1)
export POSTGRESTPORT=$[APPPORT+1]
export SERVERPORT=$[APPPORT+2]
export EXTENSIONPORT=$[APPPORT+3]
export JWTSECRET=$(head /dev/urandom | LC_ALL=C tr -dc A-F0-9 | head -c 64 ; echo '')
export POSTGREST_CLI_LOGIN="admin@$APPNAME"".com"
export POSTGREST_CLI_PASS="$(head /dev/urandom | LC_ALL=C tr -dc a-z0-9 | head -c 16 ; echo '')"
cp envs/local.tpl envs/local
sed -i -E "s/APPPORTREPLACE/$APPPORT/g" envs/local
sed -i -E "s/SERVERPORTREPLACE/$SERVERPORT/g" envs/local
sed -i -E "s/EXTENSIONPORTREPLACE/$EXTENSIONPORT/g" envs/local
sed -i -E "s/POSTGRESTPORTREPLACE/$POSTGRESTPORT/g" envs/local
sed -i -E "s/DBNAMEREPLACE/$DBNAME/g" envs/local
sed -i -E "s/JWTSECRETREPLACE/$JWTSECRET/g" envs/local
sed -i -E "s/POSTGRESTCLILOGIN/$POSTGREST_CLI_LOGIN/g" envs/local
sed -i -E "s/POSTGRESTCLIPASS/$POSTGREST_CLI_PASS/g" envs/local
[[ "$(uname -s)" == "Darwin" ]] && sed -i -E "s/DBADMINSUDO=postgres/DBADMINSUDO=/g" envs/local
echo '* please provide a target domain'
read TARGETDOMAIN
sed -i -E "s/TARGETDOMAINREPLACE/$TARGETDOMAIN/g" envs/local
./setenv.sh local

