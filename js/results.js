var calcResults, getData, parseFieldName, parseResponseId, parse_csv, renderResults, responsesClass, savePdf, setData, slurpPDF, solutionClass, splitLine, transformResults, __internal, _renderPDFPage;
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
  if (m = id.match(/\/?(\w+)\.pdf/)) {
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
  if (lines.length) {
    header = lines.shift();
    header = splitLine(header);
    fields = {};
    if (lines.length === 1) {
      solutions = splitLine(lines[0]);
      for (i = 0, _len = header.length; i < _len; i++) {
        field = header[i];
        f = parseFieldName(field);
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
  return ret;
};

transformResults = function(result) {
  var correct, quests, ret;
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
  var $tmp, doc, page, pagesPre, _i, _len, _ref;
  $tmp = $('.tmp');
  $tmp.html(content);
  doc = new jsPDF();
  pagesPre = (_ref = getData('pdfs_pages')) != null ? _ref[name] : void 0;
  if (pagesPre) {
    for (_i = 0, _len = pagesPre.length; _i < _len; _i++) {
      page = pagesPre[_i];
      doc.addImage(page, 'JPEG', 0, 0);
      doc.addPage();
    }
  }
  doc.fromHTML($tmp.get(0), 15, 15, {
    width: 'auto',
    elementHandlers: function() {
      return true;
    }
  });
  return doc.save(name + '.pdf');
};

_renderPDFPage = function(id, pdf, num, finished) {
  var canvas, getPage;
  if (pdf.numPages < num) {
    if (finished != null) finished.call(this);
    return;
  }
  canvas = $('.canvas').get(0);
  return pdf.getPage(num).then(getPage = function(page) {
    var context, renderContext, scale, viewport;
    scale = 1.3;
    viewport = page.getViewport(scale);
    context = canvas.getContext("2d");
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    renderContext = {
      canvasContext: context,
      viewport: viewport
    };
    return page.render(renderContext).then(function() {
      var pages;
      pages = getData('pdfs_pages');
      pages[id].push(canvas.toDataURL('image/jpeg'));
      setData('pdfs_pages', pages);
      return _renderPDFPage(id, pdf, num + 1, finished);
    });
  });
};

slurpPDF = function(id, source, finished) {
  return PDFJS.getDocument(new Uint8Array(source)).then(function(pdf) {
    var pdfs_pages;
    pdfs_pages = getData('pdfs_pages');
    if (pdfs_pages == null) pdfs_pages = {};
    pdfs_pages[id] = [];
    setData('pdfs_pages', pdfs_pages);
    return _renderPDFPage(id, pdf, 1, finished);
  });
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
    var $tgt, filename, files, o, other, pdf, pdfs, reader, _i, _j, _len, _len2;
    files = e.target.files || e.originalEvent.dataTransfer.files;
    $tgt = $(e.target);
    reader = new FileReader();
    if (files.length) {
      pdfs = _.filter(files, function(f) {
        return f.type.match(/pdf/);
      });
      other = _.filter(files, function(f) {
        return !f.type.match(/pdf/);
      });
      if (pdfs.length) {
        for (_i = 0, _len = pdfs.length; _i < _len; _i++) {
          pdf = pdfs[_i];
          reader = new FileReader();
          filename = parseResponseId(pdf.name);
          console.log('onload def');
          reader.onload = function() {
            var dataPdfs, _ref;
            console.log("filename: " + filename);
            dataPdfs = getData('pdfs');
            if (dataPdfs == null) dataPdfs = {};
            console.log('LEN: ' + ((_ref = this.result) != null ? _ref.length : void 0));
            dataPdfs[filename] = this.result;
            setData('pdfs', dataPdfs);
            slurpPDF(filename, this.result);
            return console.log('dataPdf: ' + JSON.stringify(_.keys(dataPdfs), null, 2));
          };
          reader.readAsArrayBuffer(pdf);
        }
      }
      if (other.length) {
        for (_j = 0, _len2 = other.length; _j < _len2; _j++) {
          o = other[_j];
          reader = new FileReader();
          reader.onload = function() {
            var csv, k, responses, results, save, solution, _results;
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
              pdfs = getData('pdfs');
              _results = [];
              for (k in results) {
                save = function() {
                  console.log('save: ' + k);
                  return savePdf(k, renderResults(k, results[k]));
                };
                console.log('save for ' + k);
                console.log('has pdf: ' + !!pdfs[k]);
                console.log('pdfs: ' + JSON.stringify(_.keys(pdfs), null, 2));
                _results.push(savePdf(k, renderResults(k, results[k])));
              }
              return _results;
            }
          };
          reader.readAsText(o);
        }
      }
    }
    return false;
  });
});
