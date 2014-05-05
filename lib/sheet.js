"use strict";

var Stream = require("stream");
var util = require("util");
var path = require("path");
var fs = require("fs");

var rework = require("rework");
var reworkVars = require("rework-vars");
var whitespace = require("css-whitespace");
var autoprefixer = require("autoprefixer");
var inherit = require("rework-inherit");
var calc = require("rework-calc");
var breakpoints = require("rework-breakpoints");
var parent = require("rework-parent");

function logger() {
	if (false) {
		console.log.apply(null, Array.prototype.slice.call(arguments));
	}
}

function Sheet(options) {
	if (!(this instanceof Sheet)) { return new Sheet(options); }
	Stream.Transform.call(this, {allowHalfOpen: true});

	options = (options || {});

	this.started = false;
	this.lines = [];
	this.merged = "";
	this.cwd = process.cwd();
	this.files = [];
	this.dirs = [];

	this.options = {
		pathStream: (options.pathStream || false)
	};

	(options.dirs || []).forEach(function (dir) {
		this.dirs.push(path.resolve(process.cwd(), dir));
	}.bind(this));

}
util.inherits(Sheet, Stream.Transform);

Sheet.prototype._transform = function (chunk, encoding, done) {
	if (chunk.toString("utf8") === "\u2404") {
		this.postProcess();
	} else if (this.options.pathStream) {
		this.addFile(chunk.toString("utf8"));
	} else {
		this.push(chunk);
	}

	done();
};

Sheet.prototype._flush = function (done) {
	done();
};

Sheet.prototype.postProcess = function () {
	logger("** postProcess **");

	try {
		var output;
		output = this.merged;

		//fs.writeFileSync("/root/tmp/sheet-" + new Date(), this.merged);

		output = rework(this.merged)
			.use(parent)
			.use(reworkVars())
			.use(inherit())
			.use(calc)
			.use(breakpoints)

			.toString();

		output = autoprefixer.process(output).css;

		this.push(output);
		this.push();
	} catch (err) {
		logger(err.stack);
	}

};

Sheet.prototype.addFile = function (filename) {
	var contents, linesLen;
	contents = this.readFile(filename);
	linesLen = this.lines.length;
	if (contents) {
		this.lines = this.lines.concat(contents);
	}

	if (linesLen === 0) {
		this.build();
	}

};

Sheet.prototype.readFile = function (filename) {
	var contents;
	try {
		logger(filename);

		if (this.files.indexOf(filename) !== -1) {
			logger("file already seen");
			return false;
		}

		contents = fs.readFileSync(filename);
		contents = contents.toString("utf8");

		if (path.extname(filename) === ".styl") {
			contents = whitespace(contents);
		} else {
			logger("Not using whitespace");
		}

		this.files.push(filename);
		this.dirs.unshift(path.dirname(filename));
		contents = contents.split(/$/m);
		contents.push("\r\n");
		return contents;
	} catch (err) {
		logger(err);
		return false;
	}
};

Sheet.prototype.build = function () {
	//if (this.started) { return; }

	//this.started = true;
	//this.dirs.reverse();

	while (this.lines.length > 0) {
		this.processLine(this.lines.shift());
	}

};



Sheet.prototype.findSource = function (name) {
	var filePath, linesNew, searchFiles, extname, i, dir;

	extname = (path.extname(name) || ".styl");
	searchFiles = [];

	for (i = 0; i < this.dirs.length; i++) {
		dir = this.dirs[i];
		searchFiles.push(path.resolve(dir, name));
		searchFiles.push(path.resolve(dir, name, name + extname));
		searchFiles.push(path.resolve(dir, name, "index" + extname));

		if (!extname) {
			searchFiles.push(path.resolve(dir, name, name + extname));
		}
	}

	searchFiles.some(function (file) {
		linesNew = this.readFile(file);

		if (linesNew) {
			this.lines = linesNew.concat(this.lines);
			return true;
		} else {
			return false;
		}
	}.bind(this));
};

var REQUIRE_RE = /([\s\t]*)@(require|include) ["']?([^"']*)["']?/i;

Sheet.prototype.processLine = function (line) {
	REQUIRE_RE.lastIndex = 0;
	var match = REQUIRE_RE.exec(line);

	if (match) {
		this.dir = path.dirname(line);
		this.findSource(match[3]);
	} else {
		this.writeLine(line);
	}
};

Sheet.prototype.writeLine = function (line) {
	this.merged += line;
};

module.exports = Sheet;
