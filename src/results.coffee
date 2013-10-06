parseFieldName = (field) ->
  if m = field.match /\w+/
    m[0]
  else
    $.error "Unable to parse field: '#{field}'"

splitLine = (line) ->
  line.split /,/g

parseResponseId = (id) ->
  if m = id.match /\/?(\w+)\.pdf/
    m[1]
  else
    $.error "Unable to parse response id '#{id}'"

parse_csv = (content) ->
  ret = {}
  lines = content?.split /\r\n|\r|\n/g
  lines = _.filter lines, (l) -> l?.length

  if lines.length
    header = lines.shift()
    header = splitLine header

    fields = {}
    if lines.length == 1
      # this must be a solution csv
      solutions = splitLine lines[0]
      for field, i in header
        f = parseFieldName field
        ret[f] = solutions[i]
    else
      # this must be a responses csv
      for line, i in lines
        ln_flds = splitLine line
        if ln_flds.length
          resp_id = parseResponseId ln_flds[ln_flds.length-1]
          ret[resp_id] = {}

          for hdr_field, j in header
            f = parseFieldName hdr_field
            continue if f is 'formid'
            ret[resp_id][f] = ln_flds[j]
        else
          $.error "Something is wrong with line: '#{line}'"

  # console.log 'CSV: ' + JSON.stringify ret, null, 2

  ret

calcResults = (sol, resp) ->
  ret = {}

  for r of resp
    ret[r] = {}
    for s of sol
      ret[r][s] = if resp[r][s] == sol[s]
        1
      else
        0

  # console.log 'RESULTS: ' + JSON.stringify ret, null, 2

  ret

transformResults = (result) ->
  # for an individual resultset
  # console.log 'IN: ' + JSON.stringify result

  quests = _.map(_.sortBy(_.keys(result), (k) ->
    parseInt k.match(/\d+/)[0]),
      (ans) -> parseInt(result[ans]))

  correct = _.filter quests, (q) -> q
  ret =
    quests  : _.map(quests, (q, i) -> { q: q, i: i+1 })
    correct : correct.length

  # console.log 'transformResults: ' + JSON.stringify ret, null, 2

  ret

renderResults = (id, results) ->
  tResults = transformResults results
  data =
    id      : id
    results : tResults.quests
    correct : tResults.correct

  tpl = Hogan.compile '<div>
                         <div>ID: {{id}} [{{correct}} pt(s)]</div>
                           <ul>
                           {{#results}}
                             <li>{{i}}.: <b>{{q}}</b> pont</li>
                           {{/results}} 
                           </ul>
                           <b>
                             <div>Pontszam: {{correct}}</div>
                             </div>Ertekeles:<div>
                           </b>
                         </div>
                       </div>'
  tpl.render data

savePdf = (name, content) ->
  $tmp = $('.tmp')
  $tmp.html content
  doc = new jsPDF()

  pagesPre = getData('pdfs_pages')?[name]
  if pagesPre
    for page in pagesPre
      doc.addImage page, 'JPEG', 0, 0
      doc.addPage()

  doc.fromHTML($tmp.get(0), 15, 15,
    width           : 'auto',
    elementHandlers : -> true)

  doc.save name + '.pdf'

_renderPDFPage = (id, pdf, num, finished) ->
  if pdf.numPages < num
    finished?.call(@)
    return

  canvas = $('.canvas').get(0)
  pdf.getPage(num).then getPage = (page) ->
    scale = 1.3
    viewport = page.getViewport(scale)
    context = canvas.getContext("2d")
    canvas.height = viewport.height
    canvas.width = viewport.width

    renderContext =
      canvasContext : context
      viewport      : viewport

    page.render(renderContext).then ->
      pages = getData 'pdfs_pages'
      pages[id].push canvas.toDataURL 'image/jpeg'
      setData 'pdfs_pages', pages
      _renderPDFPage id, pdf, num+1, finished


slurpPDF = (id, source, finished) ->
  PDFJS.getDocument(new Uint8Array(source)).then (pdf) ->
    pdfs_pages = getData 'pdfs_pages'
    pdfs_pages ?= {}
    pdfs_pages[id] = []
    setData 'pdfs_pages', pdfs_pages
    _renderPDFPage id, pdf, 1, finished


__internal = {}
setData = (k,v) ->
  __internal[k] = _.clone v

getData = (k) ->
  if __internal[k] then _.clone(__internal[k]) else null

solutionClass = 'solution'
responsesClass = 'responses'

$(document).ready =>
  $('.droparea').on 'dragover', (e) ->
    e.originalEvent.dataTransfer.dropEffect = 'copy'
    false

  $('.droparea').on 'drop', (e) ->
    files = e.target.files || e.originalEvent.dataTransfer.files
    $tgt = $(e.target)

    reader = new FileReader()
    if files.length
      pdfs = _.filter files, (f) -> f.type.match /pdf/
      other = _.filter files, (f) -> !f.type.match /pdf/

      if pdfs.length
        for pdf in pdfs
          reader = new FileReader()
          filename = parseResponseId pdf.name
          console.log 'onload def'
          reader.onload = ->
            console.log "filename: #{filename}"
            dataPdfs = getData 'pdfs'
            dataPdfs ?= {}
            console.log 'LEN: ' + @result?.length
            dataPdfs[filename] = @result
            setData 'pdfs', dataPdfs
            slurpPDF filename, @result
            console.log 'dataPdf: ' + JSON.stringify _.keys(dataPdfs), null, 2

          # reader.onload = ((theFile) ->
          #   filename = parseResponseId theFile.name
          #   console.log 'HURKA: ' + @result?.length
          #   (e) =>
          #     dataPdfs = getData 'pdfs'
          #     dataPdfs ?= {}
          #     console.log 'LEN: ' + @result?.length
          #     dataPdfs[filename] = @result
          #     console.log 'dataPdf: ' + JSON.stringify _.keys(dataPdfs), null, 2
          #     setData 'pdfs', dataPdfs
          # )(pdf)

          reader.readAsArrayBuffer pdf

      if other.length
        for o in other
          reader = new FileReader()
          reader.onload = ->
            # console.log 'read ready: ' + event.target.result

            csv = parse_csv event.target.result
            if $tgt.hasClass solutionClass
              setData 'solution', csv
              $('.solution').html 'Got it.'
            else if $tgt.hasClass responsesClass
              setData 'responses', csv
              $('.responses').html 'Got it.'

            solution = getData 'solution'
            responses = getData 'responses'

            if solution && responses
              setData 'results', calcResults solution, responses

              results = getData 'results'
              pdfs = getData 'pdfs'
              for k of results
                save = ->
                  console.log 'save: ' + k
                  savePdf k, renderResults(k, results[k])
                console.log 'save for ' + k
                console.log 'has pdf: ' + !!pdfs[k]
                console.log 'pdfs: ' + JSON.stringify _.keys(pdfs), null, 2
                savePdf k, renderResults(k, results[k])
                # if pdfs?[k]
                #   console.log 'slurpPDF: ' + k
                #   # slurpPDF k, pdfs[k], save
                #   slurpPDF k, pdfs[k]
                # else
                #   save()

          reader.readAsText o

    false
