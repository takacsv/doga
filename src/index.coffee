
parse_csv = (content) ->
  lines = content?.split /\r\n|\r|\n/g
  if lines.length
    header = lines.shift()
    header = header.split /,/g

    fields = {}

    for field in header
      tmp = field.split '_'
      if tmp.length > 1
        fields[tmp[0]] ?= 0
        fields[tmp[0]]++
      else

    results = {}
    for line in lines
      this_line = line.split ','
      id = this_line.pop()
      results[id] = []

      for fldlabel of fields
        first = 0
        last = 0
        i = 1
        while i <= fields[fldlabel]
          val = this_line.shift()
          if val
            first = i unless first
            last = i

          i++

        results[id].push if first && (first is last)
          first
        else
          if first then 0 else ''
  else

  ret = ''
  if results?
    ret = _.keys(fields).concat('').join(',') + "\n"
    for fname of results
      ret += results[fname].concat(fname).join(',') + "\n"

  ret

$(document).ready =>
  $('.droparea').on 'dragover', (e) ->
    e.originalEvent.dataTransfer.dropEffect = 'copy'
    false

  $('.droparea').on 'drop', (e) ->
    files = e.target.files || e.originalEvent.dataTransfer.files

    reader = new FileReader()
    reader.onload = (e) ->
      $('.result').html parse_csv event.target.result
    reader.readAsText files[0]

    false
