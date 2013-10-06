var calcResults, genCSV, getData, getGrade, parseCSV, parseFieldName, parseResponseId, renderResults, responsesClass, returnResults, runInputFiles, savePdf, setData, slurpPDF, solutionClass, splitLine, transformResults, __internal, _renderPDFPage;
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

parseCSV = function(content) {
  var csv, f, field, fields, formid, hdr_field, header, i, j, line, lines, ln_flds, resp_id, ret, solutions, type, _len, _len2, _len3;
  ret = {};
  type = null;
  lines = content != null ? content.split(/\r\n|\r|\n/g) : void 0;
  lines = _.filter(lines, function(l) {
    return l != null ? l.length : void 0;
  });
  if (lines.length) {
    header = lines.shift();
    formid = header.match(/formid/);
    header = splitLine(header);
    fields = {};
    if (lines.length === 1 && !formid) {
      type = 'solution';
      solutions = splitLine(lines[0]);
      for (i = 0, _len = header.length; i < _len; i++) {
        field = header[i];
        f = parseFieldName(field);
        ret[f] = solutions[i];
      }
    } else {
      type = 'responses';
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
  return csv = {
    type: type,
    csv: ret
  };
};

getGrade = function(achieved, all) {
  var grade, pct;
  if (!all) all = 1;
  pct = parseInt(achieved) / parseInt(all);
  return grade = pct < 0.5 ? 1 : pct < 0.6 ? 2 : pct < 0.7 ? 3 : pct < 0.8 ? 4 : 5;
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
    correct: correct.length,
    grade: getGrade(correct.length, quests.length)
  };
  return ret;
};

renderResults = function(id, results) {
  var data, tResults, tpl;
  tResults = transformResults(results);
  data = {
    id: id,
    results: tResults.quests,
    correct: tResults.correct,
    grade: tResults.grade
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
                             </div>Erdemjegy: {{grade}}<div>\
                           </b>\
                         </div>\
                       </div>');
  return tpl.render(data);
};

genCSV = function(results) {
  var blob, csv, k, tResults;
  csv = ['id,pts,grade'];
  for (k in results) {
    tResults = transformResults(results[k]);
    csv.push([k, tResults.correct, tResults.grade].join(','));
  }
  blob = new Blob([csv.join("\n")], {
    type: 'text/csv;charset=utf-8'
  });
  return saveAs(blob, 'results.csv');
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

runInputFiles = function(finished) {
  var file, filename, inputFiles, reader;
  inputFiles = getData('inputFiles');
  if (inputFiles.length) {
    file = inputFiles.pop();
    $('.status').html("Processing file '" + file.name + "' (" + inputFiles.length + " more left) ...");
    if (file.type.match(/pdf/)) {
      reader = new FileReader();
      filename = parseResponseId(file.name);
      reader.onload = function() {
        var dataPdfs;
        dataPdfs = getData('pdfs');
        if (dataPdfs == null) dataPdfs = {};
        dataPdfs[filename] = this.result;
        setData('pdfs', dataPdfs);
        return slurpPDF(filename, this.result, function() {
          return runInputFiles(finished);
        });
      };
      return reader.readAsArrayBuffer(file);
    } else {
      reader = new FileReader();
      reader.onload = function() {
        var csv;
        csv = parseCSV(event.target.result);
        if (csv.type === 'solution') {
          setData('solution', csv.csv);
          $('.solution').html('Got it.');
        } else if (csv.type === 'responses') {
          setData('responses', csv.csv);
          $('.responses').html('Got it.');
        }
        return runInputFiles(finished);
      };
      return reader.readAsText(file);
    }
  } else {
    return finished != null ? finished.call() : void 0;
  }
};

returnResults = function() {
  var k, pdfs_pages, responses, results, solution;
  pdfs_pages = getData('pdfs_pages');
  solution = getData('solution');
  responses = getData('responses');
  if (solution && responses && pdfs_pages) {
    $('.status').html('Please download the results :]');
    setData('results', calcResults(solution, responses));
    results = getData('results');
    for (k in results) {
      savePdf(k, renderResults(k, results[k]));
    }
    return genCSV(results);
  } else {
    return $('.status').html('Awaiting more files...');
  }
};

__internal = {};

setData = function(k, v) {
  return __internal[k] = v;
};

getData = function(k) {
  return __internal[k];
};

solutionClass = 'solution';

responsesClass = 'responses';

$(document).ready(function() {
  $('.droparea').on('dragover', function(e) {
    e.originalEvent.dataTransfer.dropEffect = 'copy';
    return false;
  });
  return $('.droparea').on('drop', function(e) {
    var $tgt, files, inputFiles, reader, run;
    files = e.target.files || e.originalEvent.dataTransfer.files;
    $tgt = $(e.target);
    reader = new FileReader();
    if (files.length) {
      inputFiles = getData('inputFiles');
      if (inputFiles == null) inputFiles = [];
      run = !inputFiles.length;
      inputFiles = inputFiles.concat(_.map(files, function(f) {
        return f;
      }));
      setData('inputFiles', inputFiles);
      if (run) runInputFiles(returnResults);
    }
    return false;
  });
});
