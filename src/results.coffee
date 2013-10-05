parseFieldName = (field) ->
  if m = field.match /\w+/
    m[0]
  else
    $.error "Unable to parse field: '#{field}'"

splitLine = (line) ->
  line.split /,/g

parseResponseId = (id) ->
  if m = id.match /\/(\w+)\.pdf/
    m[1]
  else
    $.error "Unable to parse response id '#{id}'"

parse_csv = (content) ->
  ret = {}
  lines = content?.split /\r\n|\r|\n/g
  lines = _.filter lines, (l) -> l?.length

  console.log lines
  if lines.length
    header = lines.shift()
    header = splitLine header

    fields = {}
    if lines.length == 1
      # this must be a solution csv
      solutions = splitLine lines[0]
      for field, i in header
        f = parseFieldName field
        console.log 'Field Name: ' + field + ' -> ' + f
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
            ret[resp_id][f] = ln_flds[j]
        else
          $.error "Something is wrong with line: '#{line}'"

  console.log 'CSV: ' + JSON.stringify ret, null, 2
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

  console.log 'RESULTS: ' + JSON.stringify ret, null, 2

  ret

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
    reader.onload = ->
      console.log 'read ready: ' + event.target.result

      csv = parse_csv event.target.result
      if $tgt.hasClass solutionClass
        setData 'solution', csv
      else if $tgt.hasClass responsesClass
        setData 'responses', csv

      if getData('solution') && getData('responses')
        calcResults(getData('solution'), getData('responses'))

    reader.readAsText files[0]

    false
