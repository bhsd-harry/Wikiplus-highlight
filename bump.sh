#!/usr/local/bin/bash
if [[ $2 == 'npm' ]]
then
	perl -pi -e "s|wikiplus-highlight@\d+\..+?(['/])|wikiplus-highlight\@$1\$1|" README.md
	sed -i '' -E "s/\"version\": \".+\"/\"version\": \"$1\"/" package.json
	sed -i '' -E "s/version = '.+'/version = '$1'/" src/main.ts
	npm run build
	git add -A
	git commit -m "chore: publish $1 to npm"
	npm publish --tag ${3-latest}
else
	npm run lint
	if [[ $? -eq 0 ]]
	then
		git add -A
		git commit -m "chore: bump version to $1"
		git push
		git tag $1
		git push origin $1
	fi
fi
