(() => {
	let CDN = '//cdn.jsdelivr.net';
	try {
		throw new Error();
	} catch (e) {
		if (e instanceof Error) {
			const mt = e.stack.match(/@https?:\/\/.+?(?=\/(?:dist\/)?test\.(?:min\.)?js)/i);
			if (mt) {
				CDN = mt[0].slice(1);
			}
		}
	}
	mw.notify(`下载地址：${CDN}`);
})();
