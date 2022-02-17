'use strict';

const { Log } = require('larvitutils');
const axios = require('axios').default;
const async = require('async');
const test = require('tape');
const App = require(__dirname + '/../index.js');

const log = new Log('no logging');

test('Malfunctioning middleware', function (t) {
	const tasks = [];

	let app;

	// Initialize app
	tasks.push(function (cb) {
		const options = {};

		options.log = log;

		options.baseOptions = {
			middleware: [
				function (req, res, cb) {
					cb(new Error('boink'));
				}
			]
		};

		app = new App(options);

		cb();
	});

	tasks.push(function (cb) {
		app.start(cb);
	});

	// Try 500 request
	tasks.push(async () => {
		const response = await axios('http://localhost:' + app.base.httpServer.address().port + '/');
		t.equal(response.status, 500);
		t.equal(response.data, '500 Internal Server Error');
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
