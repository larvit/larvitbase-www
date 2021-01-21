'use strict';

const request = require('request');
const LUtils = require('larvitutils');
const lUtils = new LUtils();
const async = require('async');
const test = require('tape');
const log = new lUtils.Log('no logging');
const App = require(__dirname + '/../index.js');

test('Start with no options at all', function (t) {
	const tasks = [];
	const app = new App();

	tasks.push(function (cb) {
		app.start(cb);
	});

	// All requests should be 404 by default
	tasks.push(function (cb) {
		request('http://localhost:' + app.base.httpServer.address().port + '/', function (err, response, body) {
			if (err) return cb(err);
			t.equal(response.statusCode, 404);
			t.equal(body, '404 Not Found');
			cb();
		});
	});

	// Close server
	tasks.push(function (cb) {
		app.stop(cb);
	});

	async.series(tasks, function (err) {
		if (err) throw err;
		t.end();
	});
});

test('Get a response from a controller', function (t) {
	const tasks = [];

	let app;

	// Initialize app
	tasks.push(function (cb) {
		app = new App({
			routerOptions: {basePath: __dirname + '/../test_environments/get_a_response_from_a_controller'},
			log: log
		});
		cb();
	});

	tasks.push(function (cb) {
		app.start(cb);
	});

	// Try 200 request
	tasks.push(function (cb) {
		request('http://localhost:' + app.base.httpServer.address().port + '/', function (err, response, body) {
			if (err) return cb(err);
			t.equal(response.statusCode, 200);
			t.equal(body, '{"foo":"bar"}');
			cb();
		});
	});

	// Close server
	tasks.push(function (cb) {
		app.stop(cb);
	});

	async.series(tasks, function (err) {
		if (err) throw err;
		t.end();
	});
});

test('Get a response from a controller on /.json', function (t) {
	const tasks = [];

	let app;

	// Initialize app
	tasks.push(function (cb) {
		app = new App({
			routerOptions: {basePath: __dirname + '/../test_environments/get_a_response_from_a_controller'},
			log: log
		});
		cb();
	});

	tasks.push(function (cb) {
		app.start(cb);
	});

	// Try 200 request
	tasks.push(function (cb) {
		request('http://localhost:' + app.base.httpServer.address().port + '/.json', function (err, response, body) {
			if (err) return cb(err);
			t.equal(response.statusCode, 200);
			t.equal(body, '{"foo":"bar"}');
			cb();
		});
	});

	// Close server
	tasks.push(function (cb) {
		app.stop(cb);
	});

	async.series(tasks, function (err) {
		if (err) throw err;
		t.end();
	});
});

test('404 with custom template', function (t) {
	const tasks = [];

	let app;

	// Initialize app
	tasks.push(function (cb) {
		app = new App({
			routerOptions: {basePath: __dirname + '/../test_environments/404_with_custom_template'},
			log: log
		});
		cb();
	});

	tasks.push(function (cb) {
		app.start(cb);
	});

	// Try 200 request
	tasks.push(function (cb) {
		request('http://localhost:' + app.base.httpServer.address().port + '/nowhere', function (err, response, body) {
			if (err) return cb(err);
			t.equal(response.statusCode, 404);
			t.equal(body.trim(), 'There is no page here');
			cb();
		});
	});

	// Close server
	tasks.push(function (cb) {
		app.stop(cb);
	});

	async.series(tasks, function (err) {
		if (err) throw err;
		t.end();
	});
});

test('Finish a request early', function (t) {
	const tasks = [];

	let app;

	// Initialize app
	tasks.push(function (cb) {
		app = new App({log: log});

		// Inject custom middleware first that finishes the request early
		app.middleware.splice(0, 0, function (req, res, cb) {
			req.finished = true;
			res.end('bosse');
			cb();
		});

		cb();
	});

	tasks.push(function (cb) {
		app.start(cb);
	});

	// Request special controller for this test
	tasks.push(function (cb) {
		request('http://localhost:' + app.base.httpServer.address().port + '/', function (err, response, body) {
			if (err) return cb(err);
			t.equal(response.statusCode, 200);
			t.equal(body, 'bosse');
			cb();
		});
	});

	// Close server
	tasks.push(function (cb) {
		app.stop(cb);
	});

	async.series(tasks, function (err) {
		if (err) throw err;
		t.end();
	});
});

test('Render a template (without controller)', function (t) {
	const tasks = [];

	let app;

	// Initialize app
	tasks.push(function (cb) {
		app = new App({
			routerOptions: {basePath: __dirname + '/../test_environments/simple_app'},
			log: log
		});
		cb();
	});

	tasks.push(function (cb) {
		app.start(cb);
	});

	// Try 200 request
	tasks.push(function (cb) {
		request('http://localhost:' + app.base.httpServer.address().port + '/', function (err, response, body) {
			if (err) return cb(err);
			t.equal(response.statusCode, 200);
			t.equal(body, '<!DOCTYPE html>\n<html lang="en">\n\t<head>\n\t\t<title>Base</title>\n\t</head>\n\t<body>\n\t\t<h1>Hello World!</h1>\n\t</body>\n</html>\n');
			cb();
		});
	});

	// Try it again to get the cached template function
	tasks.push(function (cb) {
		request('http://localhost:' + app.base.httpServer.address().port + '/', function (err, response, body) {
			if (err) return cb(err);
			t.equal(response.statusCode, 200);
			t.equal(body, '<!DOCTYPE html>\n<html lang="en">\n\t<head>\n\t\t<title>Base</title>\n\t</head>\n\t<body>\n\t\t<h1>Hello World!</h1>\n\t</body>\n</html>\n');
			cb();
		});
	});

	// Close server
	tasks.push(function (cb) {
		app.stop(cb);
	});

	async.series(tasks, function (err) {
		if (err) throw err;
		t.end();
	});
});

test('Use print function', function (t) {
	const tasks = [];

	let app;

	// Initialize app
	tasks.push(function (cb) {
		app = new App({
			routerOptions: {basePath: __dirname + '/../test_environments/simple_app'},
			log: log
		});
		cb();
	});

	tasks.push(function (cb) {
		app.start(cb);
	});

	// Try 200 request
	tasks.push(function (cb) {
		request('http://localhost:' + app.base.httpServer.address().port + '/foo', function (err, response, body) {
			if (err) return cb(err);
			t.equal(response.statusCode, 200);
			t.equal(body, '<!DOCTYPE html>\n<html lang="en">\n\t<head>\n\t\t<title>Foo</title>\n\t</head>\n\t<body>\n\t\t<h1>Hello Foo!</h1>\n\t\t<p>yass</p>\n\t</body>\n</html>\n');
			cb();
		});
	});

	// Close server
	tasks.push(function (cb) {
		app.stop(cb);
	});

	async.series(tasks, function (err) {
		if (err) throw err;
		t.end();
	});
});

test('Fail gracefully if fetching template from disk fails', function (t) {
	const tasks = [];

	let app;

	// Initialize app
	tasks.push(function (cb) {
		app = new App({
			routerOptions: {basePath: __dirname + '/../test_environments/simple_app'},
			log: log
		});

		// Inject middleware to screw with routed templates to trigger the error we are after
		app.middleware.splice(4, 0, function (req, res, cb) {
			req.routed.templateFullPath = '/somewhere/that/does/not/exist.tmpl';
			cb();
		});

		cb();
	});

	tasks.push(function (cb) {
		app.start(cb);
	});

	// Try 200 request
	tasks.push(function (cb) {
		request('http://localhost:' + app.base.httpServer.address().port + '/foo', function (err, response, body) {
			if (err) return cb(err);
			t.equal(response.statusCode, 500);
			t.equal(body, '500 Internal Server Error');
			cb();
		});
	});

	// Close server
	tasks.push(function (cb) {
		app.stop(cb);
	});

	async.series(tasks, function (err) {
		if (err) throw err;
		t.end();
	});

});

test('Fail gracefully if req.urlParsed does not get set', function (t) {
	const tasks = [];

	let app;

	// Initialize app
	tasks.push(function (cb) {
		app = new App({log: log});

		// Inject custom middleware to delete req.urlParsed
		app.middleware.splice(2, 0, function (req, res, cb) {
			delete req.urlParsed;
			cb();
		});

		cb();
	});

	tasks.push(function (cb) {
		app.start(cb);
	});

	// Request special controller for this test
	tasks.push(function (cb) {
		request('http://localhost:' + app.base.httpServer.address().port + '/', function (err, response, body) {
			if (err) return cb(err);
			t.equal(response.statusCode, 500);
			t.equal(body, '500 Internal Server Error');
			cb();
		});
	});

	// Close server
	tasks.push(function (cb) {
		app.stop(cb);
	});

	async.series(tasks, function (err) {
		if (err) throw err;
		t.end();
	});
});

test('Return static file contents', function (t) {
	const tasks = [];

	let app;

	// Initialize app
	tasks.push(function (cb) {
		app = new App({
			routerOptions: {basePath: __dirname + '/../test_environments/simple_app'},
			log: log
		});
		cb();
	});

	tasks.push(function (cb) {
		app.start(cb);
	});

	// Get the file
	tasks.push(function (cb) {
		request('http://localhost:' + app.base.httpServer.address().port + '/womp.txt', function (err, response, body) {
			if (err) return cb(err);
			t.equal(response.statusCode, 200);
			t.equal(body, 'wamp\n');
			cb();
		});
	});

	// Close server
	tasks.push(function (cb) {
		app.stop(cb);
	});

	async.series(tasks, function (err) {
		if (err) throw err;
		t.end();
	});
});

test('Get static json file', function (t) {
	const tasks = [];

	let app;

	// Initialize app
	tasks.push(function (cb) {
		app = new App({
			routerOptions: {basePath: __dirname + '/../test_environments/simple_app'},
			log: log
		});
		cb();
	});

	tasks.push(function (cb) {
		app.start(cb);
	});

	// Get the file
	tasks.push(function (cb) {
		request('http://localhost:' + app.base.httpServer.address().port + '/file.json', function (err, response, body) {
			if (err) return cb(err);
			t.equal(response.statusCode, 200);
			t.equal(JSON.stringify(JSON.parse(body)), '{"maff":"lon"}');
			cb();
		});
	});

	// Close server
	tasks.push(function (cb) {
		app.stop(cb);
	});

	async.series(tasks, function (err) {
		if (err) throw err;
		t.end();
	});
});

test('Request static json and return 500 on router failure', function (t) {
	const tasks = [];

	let app;

	// Initialize app
	tasks.push(function (cb) {
		app = new App({
			routerOptions: {basePath: __dirname + '/../test_environments/simple_app'},
			log: log
		});
		cb();
	});

	tasks.push(function (cb) {
		app.router.resolve = function (urlStr, cb) {
			return cb(new Error('boogus'));
		};

		app.start(cb);
	});

	// Get the file
	tasks.push(function (cb) {
		request('http://localhost:' + app.base.httpServer.address().port + '/file.json', function (err, response, body) {
			if (err) return cb(err);
			t.equal(response.statusCode, 500);
			t.equal(body, '500 Internal Server Error');
			cb();
		});
	});

	// Close server
	tasks.push(function (cb) {
		app.stop(cb);
	});

	async.series(tasks, function (err) {
		if (err) throw err;
		t.end();
	});
});

test('Fail gracefully if a static file can not be fetched', function (t) {
	const tasks = [];

	let app;

	// Initialize app
	tasks.push(function (cb) {
		app = new App({log: log});

		// Inject middleware to screw with routed file to trigger the error we are after
		app.middleware.splice(4, 0, function (req, res, cb) {
			req.routed.staticFullPath = '/somewhere/that/does/not/exist.txt';
			cb();
		});

		cb();
	});

	tasks.push(function (cb) {
		app.start(cb);
	});

	// Request special controller for this test
	tasks.push(function (cb) {
		request('http://localhost:' + app.base.httpServer.address().port + '/womp.txt', function (err, response, body) {
			if (err) return cb(err);
			t.equal(response.statusCode, 500);
			t.equal(body, '500 Internal Server Error');
			cb();
		});
	});

	// Close server
	tasks.push(function (cb) {
		app.stop(cb);
	});

	async.series(tasks, function (err) {
		if (err) throw err;
		t.end();
	});
});

test('Fail gracefully when controller data is non-stringable', function (t) {
	const tasks = [];

	let app;

	// Initialize app
	tasks.push(function (cb) {
		app = new App({
			routerOptions: {basePath: __dirname + '/../test_environments/simple_app'},
			log: log
		});
		cb();
	});

	tasks.push(function (cb) {
		app.start(cb);
	});

	// Request special controller for this test
	tasks.push(function (cb) {
		request('http://localhost:' + app.base.httpServer.address().port + '/fail', function (err, response, body) {
			if (err) return cb(err);
			t.equal(response.statusCode, 500);
			t.equal(body, '500 Internal Server Error');
			cb();
		});
	});

	// Close server
	tasks.push(function (cb) {
		app.stop(cb);
	});

	async.series(tasks, function (err) {
		if (err) throw err;
		t.end();
	});
});

test('Send data from controller that is already stringified', function (t) {
	const tasks = [];

	let app;

	// Initialize app
	tasks.push(function (cb) {
		app = new App({
			routerOptions: {basePath: __dirname + '/../test_environments/simple_app'},
			log: log
		});
		cb();
	});

	tasks.push(function (cb) {
		app.start(cb);
	});

	// Request special controller for this test
	tasks.push(function (cb) {
		request('http://localhost:' + app.base.httpServer.address().port + '/noobj', function (err, response, body) {
			if (err) return cb(err);
			t.equal(response.statusCode, 200);
			t.equal(body, 'bosse');
			cb();
		});
	});

	// Close server
	tasks.push(function (cb) {
		app.stop(cb);
	});

	async.series(tasks, function (err) {
		if (err) throw err;
		t.end();
	});
});

test('Render page where templates are in modules', function (t) {
	const tasks = [];

	let app;

	// Initialize app
	tasks.push(function (cb) {
		app = new App({
			routerOptions: {basePath: __dirname + '/../test_environments/templates_in_modules'},
			log: log
		});
		cb();
	});

	tasks.push(function (cb) {
		app.start(cb);
	});

	// Try 200 request
	tasks.push(function (cb) {
		request('http://localhost:' + app.base.httpServer.address().port + '/foo', function (err, response, body) {
			if (err) return cb(err);
			t.equal(response.statusCode, 200);
			t.equal(body, '<!DOCTYPE html>\n<html lang="en">\n\t<head>\n\t<title>Base</title>\n</head>\n\n\t<body>\n\t\t<h1>skabb</h1>\n<p>Giant squirrel</p>\n\t</body>\n</html>\n');
			cb();
		});
	});

	// Close server
	tasks.push(function (cb) {
		app.stop(cb);
	});

	async.series(tasks, function (err) {
		if (err) throw err;
		t.end();
	});
});

test('Render page, check exact path and fail without crashing', function (t) {
	const tasks = [];

	let app;

	// Initialize app
	tasks.push(function (cb) {
		app = new App({
			routerOptions: {basePath: __dirname + '/../test_environments/templates_in_modules'},
			log: log
		});
		cb();
	});

	tasks.push(function (cb) {
		app.start(cb);
	});

	// Try 200 request
	tasks.push(function (cb) {
		request('http://localhost:' + app.base.httpServer.address().port + '/abs', function (err, response, body) {
			if (err) return cb(err);
			t.equal(response.statusCode, 500);
			t.equal(body, '500 Internal Server Error');
			cb();
		});
	});

	// Close server
	tasks.push(function (cb) {
		app.stop(cb);
	});

	async.series(tasks, function (err) {
		if (err) throw err;
		t.end();
	});
});

test('Render page, check relative path and fail', function (t) {
	const tasks = [];

	let app;

	// Initialize app
	tasks.push(function (cb) {
		app = new App({
			routerOptions: {basePath: __dirname + '/../test_environments/templates_in_modules'},
			log: log
		});
		cb();
	});

	tasks.push(function (cb) {
		app.start(cb);
	});

	// Try 200 request
	tasks.push(function (cb) {
		request('http://localhost:' + app.base.httpServer.address().port + '/lurk', function (err, response, body) {
			if (err) return cb(err);
			t.equal(response.statusCode, 500);
			t.equal(body, '500 Internal Server Error');
			cb();
		});
	});

	// Close server
	tasks.push(function (cb) {
		app.stop(cb);
	});

	async.series(tasks, function (err) {
		if (err) throw err;
		t.end();
	});
});

test('Fail to compile template, but do not crash', function (t) {
	const tasks = [];

	let app;

	// Initialize app
	tasks.push(function (cb) {
		app = new App({
			routerOptions: {basePath: __dirname + '/../test_environments/templates_in_modules'},
			log: log
		});
		cb();
	});

	tasks.push(function (cb) {
		app.start(cb);
	});

	// Try 200 request
	tasks.push(function (cb) {
		request('http://localhost:' + app.base.httpServer.address().port + '/mekk', function (err, response, body) {
			if (err) return cb(err);
			t.equal(response.statusCode, 500);
			t.equal(body, '500 Internal Server Error');
			cb();
		});
	});

	// Close server
	tasks.push(function (cb) {
		app.stop(cb);
	});

	async.series(tasks, function (err) {
		if (err) throw err;
		t.end();
	});
});

test('Fail when rendering page due to circular includes', function (t) {
	const tasks = [];

	let app;

	// Initialize app
	tasks.push(function (cb) {
		app = new App({
			routerOptions: {basePath: __dirname + '/../test_environments/templates_in_modules'},
			log: log
		});
		cb();
	});

	tasks.push(function (cb) {
		app.start(cb);
	});

	// Try 200 request
	tasks.push(function (cb) {
		request('http://localhost:' + app.base.httpServer.address().port + '/bah', function (err, response, body) {
			if (err) return cb(err);
			t.equal(response.statusCode, 500);
			t.equal(body, '500 Internal Server Error');
			cb();
		});
	});

	// Close server
	tasks.push(function (cb) {
		app.stop(cb);
	});

	async.series(tasks, function (err) {
		if (err) throw err;
		t.end();
	});
});

test('Fail when parsing arguments for include, but do not crash', function (t) {
	const tasks = [];

	let app;

	// Initialize app
	tasks.push(function (cb) {
		app = new App({
			routerOptions: {basePath: __dirname + '/../test_environments/templates_in_modules'},
			log: log
		});
		cb();
	});

	tasks.push(function (cb) {
		app.start(cb);
	});

	// Try 200 request
	tasks.push(function (cb) {
		request('http://localhost:' + app.base.httpServer.address().port + '/ass', function (err, response, body) {
			if (err) return cb(err);
			t.equal(response.statusCode, 500);
			t.equal(body, '500 Internal Server Error');
			cb();
		});
	});

	// Close server
	tasks.push(function (cb) {
		app.stop(cb);
	});

	async.series(tasks, function (err) {
		if (err) throw err;
		t.end();
	});
});

test('Render page with included files containing dots in the file name', function (t) {
	const tasks = [];

	let app;

	// Initialize app
	tasks.push(function (cb) {
		app = new App({
			routerOptions: {basePath: __dirname + '/../test_environments/templates_in_modules'},
			log: log
		});
		cb();
	});

	tasks.push(function (cb) {
		app.start(cb);
	});

	// Try 200 request
	tasks.push(function (cb) {
		request('http://localhost:' + app.base.httpServer.address().port + '/asd', function (err, response, body) {
			if (err) return cb(err);
			t.equal(response.statusCode, 200);
			t.equal(body, '<!DOCTYPE html>\n<html lang="en">\n\t<head>\n\t<title>Base</title>\n</head>\n\n\t<body>\n\t\t<h1>skabb</h1>\n<p>Giant squirrel</p>\n\t</body>\n</html>\n');
			cb();
		});
	});

	// Close server
	tasks.push(function (cb) {
		app.stop(cb);
	});

	async.series(tasks, function (err) {
		if (err) throw err;
		t.end();
	});
});

test('Render page when templates in subfolders uses includes', function (t) {
	const tasks = [];

	let app;

	// Initialize app
	tasks.push(function (cb) {
		app = new App({
			routerOptions: {basePath: __dirname + '/../test_environments/includes'},
			log: log
		});
		cb();
	});

	tasks.push(function (cb) {
		app.start(cb);
	});

	// Try 200 request
	tasks.push(function (cb) {
		request('http://localhost:' + app.base.httpServer.address().port + '/test/untz', function (err, response, body) {
			if (err) return cb(err);
			t.equal(response.statusCode, 200);
			t.equal(body, '<html>\n\t<head><title>test</title></head>\n\t<body>\n\t\t<h1>This should be visible</h1>\n<p>boo</p>\n\t\t<p>torsk</p>\n\t</body>\n</html>');
			cb();
		});
	});

	// Close server
	tasks.push(function (cb) {
		app.stop(cb);
	});

	async.series(tasks, function (err) {
		if (err) throw err;
		t.end();
	});
});

test('Return 404 if the requested path contains path traversing characters to prevent directory traversal', function (t) {
	const tasks = [];

	let app;

	// Initialize app
	tasks.push(function (cb) {
		app = new App({
			routerOptions: {basePath: __dirname + '/../test_environments/simple_app'},
			log: log
		});
		cb();
	});

	tasks.push(function (cb) {
		app.start(cb);
	});

	// Request
	tasks.push(function (cb) {
		request('http://localhost:' + app.base.httpServer.address().port + '/../../foo', function (err, response, body) {
			if (err) return cb(err);
			t.equal(response.statusCode, 404);
			t.equal(body, '404 Not Found');
			cb();
		});
	});

	// Request
	tasks.push(function (cb) {
		request('http://localhost:' + app.base.httpServer.address().port + '/foo?q=&test=..', function (err, response, body) {
			if (err) return cb(err);
			t.equal(response.statusCode, 200);
			t.equal(body, '<!DOCTYPE html>\n<html lang="en">\n\t<head>\n\t\t<title>Foo</title>\n\t</head>\n\t<body>\n\t\t<h1>Hello Foo!</h1>\n\t\t<p>yass</p>\n\t</body>\n</html>\n');
			cb();
		});
	});

	// Request
	tasks.push(function (cb) {
		request('http://localhost:' + app.base.httpServer.address().port + '/foo/../../../../../', function (err, response, body) {
			if (err) return cb(err);
			t.equal(response.statusCode, 404);
			t.equal(body, '404 Not Found');
			cb();
		});
	});

	// Close server
	tasks.push(function (cb) {
		app.stop(cb);
	});

	async.series(tasks, function (err) {
		if (err) throw err;
		t.end();
	});
});
