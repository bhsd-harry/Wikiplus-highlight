#!/usr/local/bin/bash
sed -i '' -E "s/version = '.+'/version = '$1'/" main.js
for file in i18n/*
do
	sed -i '' -E "s/'wphl-version': '.+'/'wphl-version': '$1'/" $file
done