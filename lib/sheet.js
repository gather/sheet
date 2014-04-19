"use strict";

var Stream = require("stream");
var util = require("util");
var path = require("path");
var fs = require("fs");

var rework = require("rework");
var reworkVars = require("rework-vars");
var whitespace = require("css-whitespace");
var autoprefixer = require("autoprefixer");

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
	//if (chunk.toString("utf8") === "\u2404") {
	//	done();
	//	return console.log("end received");
	//}

	if (this.options.pathStream) {
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
	var output;
	output = this.merged;

	output = rework(this.merged)
		.use(reworkVars())
		.toString();

	output = autoprefixer.process(output).css;

	this.push(output);
};

Sheet.prototype.addFile = function (filename) {
	var contents = this.readFile(filename);
	if (contents) {
		this.lines = this.lines.concat(contents);
	}
	this.build();
};

Sheet.prototype.readFile = function (filename) {
	var contents;
	try {
		contents = fs.readFileSync(filename);
		contents = contents.toString("utf8");

		if (path.extname(filename) === ".styl") {
			contents = whitespace(contents);
		}

		this.files.push(filename);
		this.dirs.shift(path.dirname(filename));
		return contents.split(/$/m);
	} catch (err) {
		//console.log(err);
		return false;
	}
};

Sheet.prototype.build = function () {
	if (this.started) { return; }

	this.started = true;
	this.dirs.reverse();

	while (this.lines.length > 0) {
		this.processLine(this.lines.shift());
	}
	this.postProcess();
};



Sheet.prototype.findSource = function (name) {
	var filePath, linesNew, searchFiles, extname;

	extname = (path.extname(name) || ".styl");
	searchFiles = [];

	this.dirs.forEach(function (dir) {
		searchFiles.push(path.resolve(dir, name));
		searchFiles.push(path.resolve(dir, name, name));
		searchFiles.push(path.resolve(dir, name, "index" + extname));

		if (!extname) {
			searchFiles.push(path.resolve(dir, name, name + extname));
		}
	});

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
