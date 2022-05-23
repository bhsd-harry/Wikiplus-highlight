#!/usr/local/bin/bash
sed -i '' -E "s/version = '.+'/version = '$1'/" main.js
uglifyjs main.js -c -m --comments --source-map -o dist/main.min.js
echo -n "
//# sourceMappingURL=https://unpkg.com/wikiplus-highlight@$1/dist/main.min.js.map" >> dist/main.min.js
sed -i '' -E "s/\"version\": \".+\"/\"version\": \"$1\"/" package.json
perl -pi -e "s|wikiplus-highlight@\d+\..+?(['/])|wikiplus-highlight\@$1\$1|" README.md
for file in i18n/*
do
	sed -i '' -E "s/\"wphl-version\": \".+\"/\"wphl-version\": \"$1\"/" $file
done
git add -A
git commit -m "chore: bump version to $1"
git push
git tag $1
git push origin $1