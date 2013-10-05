var calcResults, getData, parseFieldName, parseResponseId, parse_csv, renderResults, responsesClass, savePdf, setData, solutionClass, splitLine, transformResults, __internal;
var _this = this;

parseFieldName = function(field) {
  var m;
  if (m = field.match(/\w+/)) {
    return m[0];
  } else {
    return $.error("Unable to parse field: '" + field + "'");
  }
};

splitLine = function(line) {
  return line.split(/,/g);
};

parseResponseId = function(id) {
  var m;
  if (m = id.match(/\/(\w+)\.pdf/)) {
    return m[1];
  } else {
    return $.error("Unable to parse response id '" + id + "'");
  }
};

parse_csv = function(content) {
  var f, field, fields, hdr_field, header, i, j, line, lines, ln_flds, resp_id, ret, solutions, _len, _len2, _len3;
  ret = {};
  lines = content != null ? content.split(/\r\n|\r|\n/g) : void 0;
  lines = _.filter(lines, function(l) {
    return l != null ? l.length : void 0;
  });
  console.log(lines);
  if (lines.length) {
    header = lines.shift();
    header = splitLine(header);
    fields = {};
    if (lines.length === 1) {
      solutions = splitLine(lines[0]);
      for (i = 0, _len = header.length; i < _len; i++) {
        field = header[i];
        f = parseFieldName(field);
        console.log('Field Name: ' + field + ' -> ' + f);
        ret[f] = solutions[i];
      }
    } else {
      for (i = 0, _len2 = lines.length; i < _len2; i++) {
        line = lines[i];
        ln_flds = splitLine(line);
        if (ln_flds.length) {
          resp_id = parseResponseId(ln_flds[ln_flds.length - 1]);
          ret[resp_id] = {};
          for (j = 0, _len3 = header.length; j < _len3; j++) {
            hdr_field = header[j];
            f = parseFieldName(hdr_field);
            if (f === 'formid') continue;
            ret[resp_id][f] = ln_flds[j];
          }
        } else {
          $.error("Something is wrong with line: '" + line + "'");
        }
      }
    }
  }
  console.log('CSV: ' + JSON.stringify(ret, null, 2));
  return ret;
};

calcResults = function(sol, resp) {
  var r, ret, s;
  ret = {};
  for (r in resp) {
    ret[r] = {};
    for (s in sol) {
      ret[r][s] = resp[r][s] === sol[s] ? 1 : 0;
    }
  }
  console.log('RESULTS: ' + JSON.stringify(ret, null, 2));
  return ret;
};

transformResults = function(result) {
  var correct, quests, ret;
  console.log('IN: ' + JSON.stringify(result));
  quests = _.map(_.sortBy(_.keys(result), function(k) {
    return parseInt(k.match(/\d+/)[0]);
  }), function(ans) {
    return parseInt(result[ans]);
  });
  correct = _.filter(quests, function(q) {
    return q;
  });
  ret = {
    quests: _.map(quests, function(q, i) {
      return {
        q: q,
        i: i + 1
      };
    }),
    correct: correct.length
  };
  console.log('transformResults: ' + JSON.stringify(ret, null, 2));
  return ret;
};

renderResults = function(id, results) {
  var data, tResults, tpl;
  tResults = transformResults(results);
  data = {
    id: id,
    results: tResults.quests,
    correct: tResults.correct
  };
  tpl = Hogan.compile('<div>\
                         <div>ID: {{id}} [{{correct}} pt(s)]</div>\
                           <ul>\
                           {{#results}}\
                             <li>{{i}}.: <b>{{q}}</b> pont</li>\
                           {{/results}} \
                           </ul>\
                           <b>\
                             <div>Pontszam: {{correct}}</div>\
                             </div>Ertekeles:<div>\
                           </b>\
                         </div>\
                       </div>');
  return tpl.render(data);
};

savePdf = function(name, content) {
  var $tmp, doc;
  $tmp = $('.tmp');
  $tmp.html(content);
  doc = new jsPDF();
  doc.fromHTML($tmp.get(0), 15, 15, {
    width: 'auto',
    elementHandlers: function() {
      return true;
    }
  });
  return doc.save(name + '.pdf');
};

__internal = {};

setData = function(k, v) {
  return __internal[k] = _.clone(v);
};

getData = function(k) {
  if (__internal[k]) {
    return _.clone(__internal[k]);
  } else {
    return null;
  }
};

solutionClass = 'solution';

responsesClass = 'responses';

$(document).ready(function() {
  $('.droparea').on('dragover', function(e) {
    e.originalEvent.dataTransfer.dropEffect = 'copy';
    return false;
  });
  return $('.droparea').on('drop', function(e) {
    var $tgt, files, reader;
    files = e.target.files || e.originalEvent.dataTransfer.files;
    $tgt = $(e.target);
    reader = new FileReader();
    reader.onload = function() {
      var csv, k, responses, results, solution, _results;
      console.log('read ready: ' + event.target.result);
      csv = parse_csv(event.target.result);
      if ($tgt.hasClass(solutionClass)) {
        setData('solution', csv);
        $('.solution').html('Got it.');
      } else if ($tgt.hasClass(responsesClass)) {
        setData('responses', csv);
        $('.responses').html('Got it.');
      }
      solution = getData('solution');
      responses = getData('responses');
      if (solution && responses) {
        setData('results', calcResults(solution, responses));
        results = getData('results');
        _results = [];
        for (k in results) {
          _results.push(savePdf(k, renderResults(k, results[k])));
        }
        return _results;
      }
    };
    reader.readAsText(files[0]);
    return false;
  });
});
