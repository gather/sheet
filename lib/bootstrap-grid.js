var mixins = require('rework-plugin-mixin');

var conf = {
    gridColumns: 12,
    pageWidth: 960,
    columnWidth: 60,
    gutterWidth: 20,
    gridGutterWidth: 30,
};
conf.correction = (((0.5 / conf.pageWidth) * 100) * 0.01);

function gridRow(columns) {
    columns = columns || conf.gridColumns;
    var _gridWidth = ((conf.columnWidth + conf.gutterWidth) * columns);
    var _totalWidth = _gridWidth;
    var calculatedRowWidth = (_totalWidth * ((conf.gutterWidth + _gridWidth ) / _gridWidth)) - conf.gutterWidth;
    var calculatedMarginWidth = _totalWidth * (((conf.gutterWidth * 0.5) / _gridWidth) * -1);
    var r = {
        "display": "block",
        "width": calculatedRowWidth + "px",
        "margin": "0 "+calculatedMarginWidth+"px",
        "*width": (calculatedRowWidth - conf.correction) + "px",
        "*margin": "0 " + (calculatedMarginWidth - conf.correction) + "px"
    };
    return r;
}
//TODO: outerColumns should be factored in.
function gridColumn(columns, outerColumns) {
    columns = columns || conf.gridColumns;
    return {
        "display": "inline",
        "float": "left",
        "overflow": "hidden",
        "width": conf.pageWidth * ((((conf.gutterWidth + conf.columnWidth ) * columns) - conf.gutterWidth) / conf.pageWidth) + "px",
        "margin": "0 "+ conf.pageWidth * ( (conf.gutterWidth * 0.5) / conf.pageWidth) + "px",
        "*width": (conf.pageWidth * ((((conf.gutterWidth + conf.columnWidth ) * columns) - conf.gutterWidth) / conf.pageWidth)-conf.correction) + "px",
        "*margin": "0 "+ conf.pageWidth * ( (conf.gutterWidth * 0.5) / conf.pageWidth) + "px",
        "box-sizing": "border-box"
    };
}

function gridColumnRelative(columns){
    columns = columns || conf.gridColumns;
    var css = {};
    css.position = "relative";
    css["min-height"] = "1px";
    css.width = (columns !== 12) ? (((columns/conf.gridColumns) *100) + "%") : "100%";
    if (columns < 12) {
        css.float = "left";
    }
    return css;
}

module.exports =  mixins({
    "grid-row": gridRow,
    "grid-column": gridColumn,
    "grid-column-relative": gridColumnRelative
});
