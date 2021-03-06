<<<<<<< HEAD

  define(index(function() {}));
=======
var parse_csv;
var _this = this;

parse_csv = function(content) {
  var field, fields, first, fldlabel, fname, header, i, id, last, line, lines, results, ret, this_line, tmp, val, _i, _j, _len, _len2, _name, _ref;
  lines = content != null ? content.split(/\r\n|\r|\n/g) : void 0;
  if (lines.length) {
    header = lines.shift();
    header = header.split(/,/g);
    fields = {};
    for (_i = 0, _len = header.length; _i < _len; _i++) {
      field = header[_i];
      tmp = field.split('_');
      if (tmp.length > 1) {
        if ((_ref = fields[_name = tmp[0]]) == null) fields[_name] = 0;
        fields[tmp[0]]++;
      } else {

      }
    }
    results = {};
    for (_j = 0, _len2 = lines.length; _j < _len2; _j++) {
      line = lines[_j];
      this_line = line.split(',');
      id = this_line.pop();
      results[id] = [];
      for (fldlabel in fields) {
        first = 0;
        last = 0;
        i = 1;
        while (i <= fields[fldlabel]) {
          val = this_line.shift();
          if (val) {
            if (!first) first = i;
            last = i;
          }
          i++;
        }
        results[id].push(first === last ? first : (first ? 0 : ''));
      }
    }
  } else {

  }
  ret = '';
  if (results != null) {
    ret = _.keys(fields).concat('').join(',') + "\n";
    for (fname in results) {
      ret += results[fname].concat(fname).join(',') + "\n";
    }
  }
  return ret;
};

$(document).ready(function() {
  $('.droparea').on('dragover', function(e) {
    e.originalEvent.dataTransfer.dropEffect = 'copy';
    return false;
  });
  return $('.droparea').on('drop', function(e) {
    var files, reader;
    files = e.target.files || e.originalEvent.dataTransfer.files;
    reader = new FileReader();
    reader.onload = function(e) {
      return $('.result').html(parse_csv(event.target.result));
    };
    reader.readAsText(files[0]);
    return false;
  });
});
>>>>>>> gh-pages
