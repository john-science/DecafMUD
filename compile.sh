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

# TODO: wrap this in a test for existence of JS compiler
mkdir -p js_compiler
pushd js_compiler
wget https://dl.google.com/closure-compiler/compiler-20190513.tar.gz
tar -xvzf compiler-20190513.tar.gz
mv closure-compiler-v20190513.jar ..
popd
rm -rf compiler

java -jar closure-compiler-v20190513.jar js/*.js --js_output_file=compiled/main.js

# If it is not already present, grab the Google closure CSS minifier
if [ ! -f closure-stylesheets.v1.5.0.jar]
then
	wget https://github.com/google/closure-stylesheets/releases/download/v1.5.0/closure-stylesheets.jar
	mv closure-stylesheets.jar closure-stylesheets.v1.5.0.jar
fi
java -jar closure-stylesheets.v1.5.0.jar css/*.css -o compiled/css/main.css

sed '/JAVASCRIPT/c\  <script src="main.js" type="text/javascript">' web_client.html > compiled/web_client.html
