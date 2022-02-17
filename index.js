'use strict';

const topLogPrefix = 'larvitbase-www: ./index.js: ';
const ReqParser = require('larvitreqparser');
const { Log } = require('larvitutils');
const Router = require('larvitrouter');
const LBase = require('larvitbase');
const async = require('async');
const send = require('send');
const ejs = require('ejs');
const fs = require('fs');
const _ = require('lodash');

function App(options) {
	const that = this;

	if (!options) {
		options = {};
	}

	that.options = options;

	if (!that.options.log) {
		that.options.log = new Log();
	}

	that.log = that.options.log;

	if (!that.options.routerOptions) that.options.routerOptions = {};
	if (!that.options.routerOptions.log) that.options.routerOptions.log = that.log;
	if (!that.options.baseOptions) that.options.baseOptions = {};
	if (!that.options.baseOptions.log) that.options.baseOptions.log = that.log;
	if (!that.options.reqParserOptions) that.options.reqParserOptions = {};
	if (!that.options.reqParserOptions.log) that.options.reqParserOptions.log = that.log;

	that.compiledTemplates = {};

	// Instantiate the router
	that.router = new Router(that.options.routerOptions);

	// Instantiate the request parser
	that.reqParser = new ReqParser(that.options.reqParserOptions);

	// Only set middleware array if none is provided from the initiator
	if (!Array.isArray(options.baseOptions.middleware)) {
		options.baseOptions.middleware = [
			function mwParseUrl(req, res, cb) { that.mwParseUrl(req, res, cb); },
			function mwValidateRoute(req, res, cb) { that.mwValidateRoute(req, res, cb); },
			function mwRoute(req, res, cb) { that.mwRoute(req, res, cb); },
			function mwParse(req, res, cb) { that.mwParse(req, res, cb); },
			function mwSendStatic(req, res, cb) { that.mwSendStatic(req, res, cb); },
			function mwRunController(req, res, cb) { that.mwRunController(req, res, cb); },
			function mwRender(req, res, cb) { that.mwRender(req, res, cb); },
			function mwSendToClient(req, res, cb) { that.mwSendToClient(req, res, cb); },
			function mwCleanup(req, res, cb) { that.mwCleanup(req, res, cb); }
		];
	}

	// Expose middlewares more convenient
	that.middleware = options.baseOptions.middleware;
};

// Internal server error. 500
App.prototype.internalError = function internalError(req, res) {
	if (req.finished) return;

	res.statusCode = 500;
	res.end('500 Internal Server Error');
};

// No route target found. 404
App.prototype.noTargetFound = function noTargetFound(req, res, cb) {
	const that = this;

	res.statusCode = 404;

	that.router.resolve('/404', function (err, result) {
		if (!result.templateFullPath) {
			res.end('404 Not Found');
			req.finished = true;
		} else {
			req.routed.controllerPath = result.controllerPath;
			req.routed.controllerFullPath = result.controllerFullPath;
			req.routed.templatePath = result.templatePath;
			req.routed.templateFullPath = result.templateFullPath;
		}

		cb();
	});
};

App.prototype.mwValidateRoute = function mwValidateRoute(req, res, cb) {
	if (req.finished) return cb();

	const logPrefix = topLogPrefix + 'mwValidateRoute() - ';
	const that = this;

	if (!req.urlParsed) {
		const err = new Error('req.urlParsed is not set');
		that.log.error(logPrefix + err.message);
		that.log.verbose(err.stack);

		return cb(err);
	}

	// Validating if the requested path contains path traversing characters to prevent directory traversal
	const reqPath = req.urlParsed.pathname;
	if (reqPath.includes('..')) {
		that.log.verbose(logPrefix + 'Requested file outside the process directory (Directory Traversal Attempt).');
		that.noTargetFound(req, res, cb);
	} else {
		cb();
	}
};

// Cleanup middleware, removing tmp file storage and more
App.prototype.mwCleanup = function mwCleanup(req, res, cb) {
	const that = this;

	delete req.finished;

	that.reqParser.clean(req, res, cb);
};

// Parsing middleware Url
App.prototype.mwParseUrl = function mwParseUrl(req, res, cb) {
	const that = this;

	if (req.finished) return cb();

	that.reqParser.parseUrl(req, res, cb);
};

// Parsing middleware
App.prototype.mwParse = function mwParse(req, res, cb) {
	const that = this;

	let logUrl = req.url;

	// Do not log password
	if (req.urlParsed && req.urlParsed.query) {
		const passwordKeys = Object.keys(req.urlParsed.query).filter(x => x.toLowerCase() === 'password');

		for (const passKey of passwordKeys) {
			const passVal = req.urlParsed.query[passKey];

			if (Array.isArray(passVal)) {
				for (const pass of passVal) {
					logUrl = logUrl.replace(`${passKey}=${pass}`, `${passKey}=xxxxx`).replace(`${passKey}${pass}`, `${passKey}=xxxxx`);
				}
			} else {
				logUrl = logUrl.replace(`${passKey}=${passVal}`, `${passKey}=xxxxx`).replace(`${passKey}${passVal}`, `${passKey}=xxxxx`);
			}
		}
	}

	req.logPrefix = topLogPrefix + 'req.uuid: ' + req.uuid + ' url: ' + logUrl + ' - ';

	if (req.finished) return cb();

	if (req.routed && req.routed.staticFullPath) return cb();

	that.reqParser.parse(req, res, cb);
};

// Template rendering middleware
App.prototype.mwRender = function mwRender(req, res, cb) {
	const logPrefix = req.logPrefix + 'mwRender() - ';
	const tasks = [];
	const that = this;

	if (req.finished || req.render === false) return cb();

	if (!req.routed.templateFullPath) {
		that.log.verbose(logPrefix + 'No template found. req.routed.templateFullPath is not set.');

		return cb();
	}

	if (!that.compiledTemplates[req.routed.templateFullPath]) {
		that.log.debug(logPrefix + 'Compiling template: ' + req.routed.templateFullPath);

		// Compile the template
		tasks.push(function (cb) {
			fs.readFile(req.routed.templateFullPath, function (err, str) {
				let html;

				if (err) {
					that.log.error(logPrefix + 'Could not read template file. err: ' + err.message);

					return cb(err);
				}

				html = str.toString();

				try {
					that.compiledTemplates[req.routed.templateFullPath] = ejs.compile(html, {
						outputFunctionName: 'print',
						filename: req.routed.templateFullPath
					});
				} catch (err) {
					that.log.error(logPrefix + 'Could not compile "' + req.routed.templateFullPath + '", err: ' + err.message);

					return cb(err);
				}

				cb();
			});
		});
	}

	async.series(tasks, function (err) {
		if (err) return cb(err);
		try {
			const renderObject = {};

			renderObject._ = _;
			renderObject.data = res.data;
			res.renderedData = that.compiledTemplates[req.routed.templateFullPath](renderObject);
		} catch (err) {
			that.log.error(logPrefix + 'Could not render "' + req.routed.templateFullPath + '", err: ' + err.message);

			return cb(err);
		}
		cb();
	});
};

// Routing middleware
App.prototype.mwRoute = function mwRoute(req, res, cb) {
	const logPrefix = topLogPrefix + 'mwRoute() - ';
	const tasks = [];
	const that = this;

	let routeUrl;

	if (req.finished) return cb();

	routeUrl = req.urlParsed.pathname;
	req.routed = {};

	// Explicitly route / to default when we resolv files
	if (routeUrl.split('?')[0] === '/') {
		routeUrl = '/default';
	} else if (routeUrl.split('?')[0] === '/.json') {
		routeUrl = '/default.json';
	}

	// Handle URLs ending in .json
	if (req.urlParsed.pathname.substring(req.urlParsed.pathname.length - 4) === 'json') {
		that.log.debug(logPrefix + 'url ends in json, use some custom route options');

		req.render = false;
		routeUrl = req.urlParsed.pathname.substring(0, req.urlParsed.pathname.length - 5);

		// Since the URL ends in .json, also check for static files
		tasks.push(function (cb) {
			that.router.resolve(req.urlParsed.pathname, function (err, result) {
				if (err) return cb(err);

				if (result.staticPath) {
					req.routed.staticPath = result.staticPath;
					req.routed.staticFullPath = result.staticFullPath;
				}

				cb();
			});
		});
	} else {
		req.render = true;
	}

	// Resolve stuff with the router
	tasks.push(function (cb) {
		that.router.resolve(routeUrl, function (err, result) {
			if (err) return cb(err);

			req.routed.controllerPath = result.controllerPath;
			req.routed.controllerFullPath = result.controllerFullPath;
			req.routed.templatePath = result.templatePath;
			req.routed.templateFullPath = result.templateFullPath;

			// Do not overwrite the .json file path from above with undefined here
			if (result.staticPath) {
				req.routed.staticPath = result.staticPath;
				req.routed.staticFullPath = result.staticFullPath;
			}

			cb(err);
		});
	});

	async.parallel(tasks, cb);
};

// Controller running middleware
App.prototype.mwRunController = function mwRunController(req, res, cb) {
	const logPrefix = req.logPrefix + 'mwRunController() - ';
	const that = this;

	if (req.finished) return cb();

	if (req.routed.templateFullPath && !req.routed.controllerFullPath) {
		that.log.debug(logPrefix + 'Only template found');

		return cb();
	} else if (!req.routed.controllerFullPath && !req.routed.templateFullPath) {
		that.log.debug(logPrefix + 'Neither controller nor template found for given url, running that.noTargetFound()');
		that.noTargetFound(req, res, cb);
	} else { // Must be a controller here
		that.log.debug(logPrefix + 'Controller found, running');
		try {
			require(req.routed.controllerFullPath)(req, res, cb);
		} catch (err) {
			that.log.error(logPrefix + 'Got exception when trying to run controller: ' + req.routed.controllerFullPath + ' (are you sure that module.exports is a function in the controller?), err: ' + err.message);

			return cb(err);
		}
	}
};

// Send static files middleware
App.prototype.mwSendStatic = function mwSendStatic(req, res, cb) {
	const logPrefix = req.logPrefix + 'mwSendStatic() - ';
	const that = this;

	if (req.finished) return cb();

	if (req.routed.staticFullPath) {
		const sendStream = send(req, req.routed.staticFullPath, {index: false});

		that.log.debug(logPrefix + 'Static file found, streaming');

		sendStream.pipe(res);

		sendStream.on('error', function (err) {
			that.log.warn(logPrefix + 'error sending static file to client. err: ' + err.message);

			return cb(err);
		});

		sendStream.on('end', () => {
			req.finished = true;

			return cb();
		});

		sendStream.on('close', cb);
	} else {
		return cb();
	}
};

// Middleware for sending data to client
App.prototype.mwSendToClient = function mwSendToClient(req, res, cb) {
	const logPrefix = req.logPrefix + 'mwSendToClient() - ';
	const that = this;

	let sendData = res.data;

	if (req.finished) return cb();

	// Rendered data means HTML, send as string to the client
	if (res.renderedData) {
		res.setHeader('Content-Type', 'text/html; charset=UTF-8');
		res.end(res.renderedData);
		req.finished = true;

		return cb();
	}

	// If no rendered data exists, send res.data as stringified JSON to the client
	res.setHeader('Content-Type', 'application/json; charset=UTF-8');

	try {
		if (typeof sendData !== 'string' && !Buffer.isBuffer(sendData)) {
			sendData = JSON.stringify(sendData);
		}
	} catch (err) {
		that.log.warn(logPrefix + 'Could not stringify sendData. err: ' + err.message);

		return cb(err);
	}

	res.end(sendData);
	req.finished = true;
	cb();
};

App.prototype.start = function start(cb) {
	const that = this;

	that.base = new LBase(that.options.baseOptions);

	that.base.on('error', function (err, req, res) {
		that.internalError(req, res);
	});

	that.base.start(cb);
};

App.prototype.stop = function (cb) {
	const that = this;
	that.base.httpServer.close(cb);
};

exports = module.exports = App;
