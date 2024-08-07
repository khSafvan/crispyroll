#!/bin/bash

rm -rf electron/static

mkdir -p electron/static/build
cp ./index.html electron/static/build
cp -rf server/ electron/static/build
cp -rf img/ electron/static/build
cp -rf js/ electron/static/build
cp -rf css/ electron/static/build

# use android auth
# auth: "Basic REDACTED_AUTH_TOKEN",
sed -i 's/auth: "Basic [^"]*",/auth: "Basic REDACTED_AUTH_TOKEN",/' electron/static/build/server/js/core/service.js