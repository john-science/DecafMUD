#!/bin/bash
#
# NOTE: This script is a work in progress.
#
# The purpose of this script is to minify the Javascript and CSS for the DecafMUD client,
# and to more robustly test for syntax errors and version support.
#
# This script is not *necessary* to run the client, though it is preferable to run this script
# before a release.

# CONFIG
JS_VERSION="v20190513"
CSS_VERSION="v1.5.0"

# remove any old compiled versions
mkdir compiled/css -p

# If it is not already present, grab the Google closure JS minifier.
if [ ! -f closure-compiler-${JS_VERSION}.jar]
then
	mkdir -p js_compiler
	pushd js_compiler
	wget https://dl.google.com/closure-compiler/compiler-${JS_VERSION}.tar.gz
	tar -xvzf compiler-${JS_VERSION}.tar.gz
	mv closure-compiler-${JS_VERSION}.jar ..
	popd
	rm -rf compiler
fi

# Compile the JS and move it into place.
java -jar closure-compiler-${JS_VERSION}.jar js/*.js --js_output_file=compiled/main.js

# If it is not already present, grab the Google closure CSS minifier.
if [ ! -f closure-stylesheets.${CSS_VERSION}.jar]
then
	wget https://github.com/google/closure-stylesheets/releases/download/${CSS_VERSION}/closure-stylesheets.jar
	mv closure-stylesheets.jar closure-stylesheets.${CSS_VERSION}.jar
fi

# Compile the CSS and move it into place.
java -jar closure-stylesheets.${CSS_VERSION}.jar css/*.css -o compiled/css/main.css

# Update the HTML to work with compiled resources and move it into place.
sed '/JAVASCRIPT/c\  <script src="main.js" type="text/javascript">' web_client.html > compiled/web_client.html
