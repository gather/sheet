"use strict";

var fs = require("fs");
var path = require("path");
var es = require("event-stream");
var Stream = require("stream");
var util = require("util");
var chalk = require("chalk");

var css = require("css");
var rework = require("rework");
var whitespace = require("css-whitespace");
var reworkVars = require("rework-vars");
var autoprefixer = require("autoprefixer");
var reworkInherit = require("rework-inherit");
var reworkCalc = require("rework-calc");
var reworkNpm = require("rework-npm");

String.prototype.basename = function (rel) {
    var s = this;
    s = (rel) ? s.replace(rel, "") : path.basename(s) ;
    return s;
};

String.prototype.repeat = function (num) {
    return new Array(num + 1).join(this);
};

String.prototype.pad = function (n) {
    var str = this;
    var diff = n - str.length;
    if (diff > 0) {
        str += " ".repeat(diff);
    }
    return str;
};

var log = {
    info: function (msg) {
        msg = Array.prototype.slice.call(arguments, 0).join(" ");
        log.general(msg, "gray");
    },
    warn: function (msg) {
        msg = Array.prototype.slice.call(arguments, 0).join(" ");
        log.general(msg, "yellow");
    },
    error: function (msg) {
        msg = Array.prototype.slice.call(arguments, 0).join(" ");
        log.general(msg, "red");
    },
    general: function (msg, color) {
        console.log(chalk.gray("[sheet]".pad(8), chalk[color](msg)));
    }
};


function Builder(buffer, opts, cb){
    if (!(this instanceof Builder)) { return new Builder(buffer, opts); }
    this.buffer = buffer;
    this.opts = opts || {};

    this._fullPath = this.opts.file;
    this._relPath = this.opts.file.basename(this.opts.base);

    this.buffer = this.prefilter(this.buffer, this._fullPath);

    var output = this.start()
        .useNpm()
        .useVars()
        .useInherit()
        .useCalc()
        .output(cb);
}

Builder.prototype.prefilter = function (src, file) {
    var output = src;
    log.info("Importing:", file.basename(this.opts.base));
    if (src.indexOf("{") === -1) {
        output = whitespace(src);
    }
    return output;
};

Builder.prototype.onError = function (err, source) {
    log.error("Error:", source, "had an error with", this._relPath);
    throw err;
};

Builder.prototype.output = function (cb) {
    try {
        cb(null, this.rework.toString());
        log.info("Finished:", this._relPath);
    }
    catch (err) { this.onError(err, "rework.toString"); }
};

Builder.prototype.start = function () {
    try { this.rework = rework(this.buffer); }
    catch (err) { this.onError(err, "rework"); }
    return this;
};

Builder.prototype.useNpm = function () {
    var self = this;
    var opts = {
        root: path.dirname(this._fullPath),
        prefilter: self.prefilter.bind(self),
        alias: {
            shared: this.opts.shared
        }
    };

    try { this.rework = this.rework.use(reworkNpm(opts)); }
    catch (err) { this.onError(err, "rework-npm"); }
    return this;
};

Builder.prototype.useVars = function () {
    try { this.rework = this.rework.use(reworkVars()); }
    catch (err) { this.onError(err, "rework-npm"); }
    return this;
};

Builder.prototype.useInherit = function () {
    try { this.rework = this.rework.use(reworkInherit()); }
    catch (err) { this.onError(err, "rework-inherit"); }
    return this;
};

Builder.prototype.useCalc = function () {
    try { this.rework = this.rework.use(reworkCalc); }
    catch (err) { this.onError(err, "rework-calc"); }
    return this;
};




function Sheet(opts){
    if (!(this instanceof Sheet)) { return new Sheet(opts); }
    Stream.Transform.call(this);
    var self = this;
    this.opts = opts || {};

    if (!this.opts.verbose) {
        log.info = function () {};
    }
}
util.inherits(Sheet, Stream.Transform);

Sheet.prototype.addFile = function (file) {
    var self = this;
    fs.createReadStream(file, {encoding: "utf8"})
    .pipe(es.wait(function (err, text) {
        new Builder(text, {
            file: file,
            base: self.opts.base,
            shared: self.opts.shared
        }, function (err, result) {
            self.push(result + "\r\n");
        });
    }));
};

Sheet.prototype._transform = function (chunk, encoding, done) {
    console.log("[!!] Why is _transform being called??");
    done();
};

Sheet.prototype._flush = function (done) {
    done();
};


module.exports = Sheet;
