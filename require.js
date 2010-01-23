var require = (function () {
	var _required = {};
	return (function (url, callback) {
		if (typeof url == 'object') {
			// we've (hopefully) got an array: time to chain!
			if (url.length > 1) {
				// load the nth file as soon as everything up to the n-1th one is done.
				require(url.slice(0,url.length-1), function () {
					require(url[url.length-1], callback);
				});
			} else if (url.length == 1) {
				require(url[0], callback);
			}
			return;
		}
		if (typeof _required[url] == 'undefined') {
			// haven't loaded this url yet; gogogo!
			_required[url] = [];

			var script = new Element('script', {src: url, type: 'text/javascript'});
			script.observe('load', function () {
				console.log("script " + url + " loaded.");
				_required[url].each(function (cb) {
					cb.call(cb); // TODO does this execute in the right context?
				});
				_required[url] = true;
			});

			$$('head')[0].insert(script);
		} else if (typeof _required[url] == 'boolean') {
			// we already loaded the thing, so go ahead
			if (callback) { callback.call(); }
			return;
		}

		if (callback) { _required[url].push(callback); }
	});
})();
