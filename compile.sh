#!/bin/bash
#
# NOTE: This script is a work in progress.
#
# The purpose of this script is to minify the Javascript and CSS for the DecafMUD client,
# and to more robustly test for syntax errors and version support.
#
# This script is not *necessary* to run the client, though it is preferable to run this script
# before a release.

mkdir compiled/css -p

# TODO: wrap this in a test for 
mkdir -p compiler
wget https://dl.google.com/closure-compiler/compiler-20190513.tar.gz
tar -xvzf compiler-20190513.tar.gz
mv closure-compiler-v20190513.jar ..
rm -rf compiler

java -jar closure-compiler-v20190513.jar js/*.js --js_output_file=compiled/main.js

# TODO: compiler the CSS, don't just copy
cp css/*.css compiled/css/

sed '/JAVASCRIPT/c\  <script src="main.js" type="text/javascript">' web_client.html > compiled/web_client.html
