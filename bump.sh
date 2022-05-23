#!/usr/local/bin/bash
if [[ $2 == 'npm' ]]
then
	perl -pi -e "s|wikiplus-highlight@\d+\..+?(['/])|wikiplus-highlight\@$1\$1|" README.md
	sed -i '' -E "s/\"version\": \".+\"/\"version\": \"$1\"/" package.json
	git add -A
	git commit -m "chore: publish $1 to npm"
	git push
	npm publish
else
	sed -i '' -E "s/version = '.+'/version = '$1'/" main.js
	uglifyjs main.js -c -m --comments --source-map 'url=main.min.js.map,root="../"' -o dist/main.min.js
	for file in i18n/*
	do
		sed -i '' -E "s/\"wphl-version\": \".+\"/\"wphl-version\": \"$1\"/" $file
	done
	git add -A
	git commit -m "chore: bump version to $1"
	git push
	git tag $1
	git push origin $1
fi
