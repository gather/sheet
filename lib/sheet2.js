"use strict";

var fs = require("fs");
var es = require("event-stream");
var path = require("path");

var rework = require("rework");
var whitespace = require("css-whitespace");
var reworkVars = require("rework-vars");
var whitespace = require("css-whitespace");
var autoprefixer = require("autoprefixer");
var inherit = require("rework-inherit");
var calc = require("rework-calc");
var breakpoints = require("rework-breakpoints");
var parent = require("rework-parent");

var REQUIRE_RE = /([\s\t]*)@(require|include) ["']?([^"']*)["']?/i;

function Sheet(options) {
	if (!(this instanceof Sheet)) { return new Sheet(options); }

	/*
	this.stream = es.through(function (chunk) {
		this.resume();
		this.emit("data", chunk);
	});
	this.stream.pause();
	*/
	this.lines = [];
	this.output = fs.createWriteStream(options.output);
}

Sheet.prototype.start = function (files) {
	files.forEach(this.readFile.bind(this));
	this.process();
};

Sheet.prototype.readFile = function (file) {
	var contents, sheet = this, match;


	contents = fs.readFileSync(file, {encoding: "utf8"});
	if (path.extname(file) === ".styl") {
		contents = whitespace(contents);
	}
	contents = contents.split(/$/m);
	contents.forEach(function (line) {

		match = REQUIRE_RE.exec(line);

		if (match) {
			sheet.readFile(path.resolve(path.dirname(file), match[3]));
		} else {
			sheet.lines.push(line);
		}


	});
	sheet.lines.push("\r\n");

};

Sheet.prototype.process = function () {
	var output = rework(this.lines.join(""))
		.use(parent)
		.use(reworkVars())
		.use(inherit())
		.use(calc)
		.use(breakpoints)
		.toString();

	output = autoprefixer.process(output).css;
	this.output.write(output);
	console.log("[sheet] Finished");
};

module.exports = Sheet;