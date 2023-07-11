var color_list = ['#c23531','#2f4554', '#61a0a8', '#d48265', '#91c7ae','#749f83',  '#ca8622', '#bda29a','#6e7074', '#546570', '#c4ccd3'];
var colors = ['#5793f3', '#d14a61', '#675bba','#b62f46'];
var close = GOOGLE['data'].map(function(el, idx) {
  return el[1];
})
var stocks = GOOGLE['data'].map(function(el, idx) {
  return [el[0],el[1],el[3],el[2]];
})
var stock_date = GOOGLE['date'];
var volume = GOOGLE['volume'];
var csv;
var indeces = {};
var dataMA5, dataMA10, dataMA20, dataMA30;
var total_investment, total_gain, stock_changes, stock_changes_percent

function smoothing_line(scalars,weight){
  last = scalars[0]
  smoothed = []
  for(var i = 0; i < scalars.length;i++){
    smoothed_val = last * weight + (1 - weight) * scalars[i]
    smoothed.push(smoothed_val)
    last = smoothed_val
  }
  return smoothed
}

function generate_investment(strings,values){
  colors = "";
  for(var i = 0; i < strings.length;i++){
    if(values[i]>=0) colors += "<div class='col s12 m2'><div class='card'><div class='card-content'><a class='btn-floating waves-effect waves-light green' style='width:100px;height:100px;margin-bottom:20px'><i class='material-icons' style='font-size:3rem; line-height:95px'>arrow_upward</i></a><p><h6>"+strings[i]+values[i]+"</h6></p></div></div></div>";
    else colors += "<div class='col s12 m2'><div class='card'><div class='card-content'><a class='btn-floating waves-effect waves-light red' style='width:100px;height:100px;margin-bottom:20px'><i class='material-icons' style='font-size:3rem; line-height:95px'>arrow_downward</i></a><p><h6>"+strings[i]+values[i]+"</h6></p></div></div></div>";
  }
  $('#color-investment').html(colors);
}

function buildConfig() {
  return {
    delimiter: $('#delimiter').val(),
    header: $('#header').prop('checked'),
    dynamicTyping: $('#dynamicTyping').prop('checked'),
    skipEmptyLines: $('#skipEmptyLines').prop('checked'),
    preview: parseInt($('#preview').val() || 0),
    step: $('#stream').prop('checked') ? stepFn : undefined,
    encoding: $('#encoding').val(),
    worker: $('#worker').prop('checked'),
    comments: $('#comments').val(),
    complete: completeFn,
    error: errorFn
  }
}

function errorFn(err, file) {
    Materialize.toast("ERROR: " + err + file,3000)
}

function completeFn(results) {
  if (results && results.errors) {
    if (results.errors) {
      errorCount = results.errors.length;
      firstError = results.errors[0]
    }
    if (results.data && results.data.length > 0)
    rowCount = results.data.length
  }
  csv = results['data'];
  for(var i = 0;i<csv[0].length;i++) indeces[csv[0][i].toLowerCase()] = i;
  stocks = [];
  volume = [];
  stock_date = [];
  for(var i = 1;i<csv.length;i++){
    if(!isNaN(csv[i][indeces['open']]) && !isNaN(csv[i][indeces['close']]) && !isNaN(csv[i][indeces['low']]) && !isNaN(csv[i][indeces['high']]) && !isNaN(csv[i][indeces['volume']])){
      stocks.push([parseFloat(csv[i][indeces['open']]),
      parseFloat(csv[i][indeces['close']]),
      parseFloat(csv[i][indeces['low']]),
      parseFloat(csv[i][indeces['high']])]);
      volume.push(csv[i][indeces['volume']]);
      stock_date.push(csv[i][indeces['date']]);
    }
  }
  close = stocks.map(function(el, idx) {
    return el[1];
  })
  plot_stock();
}

var csv, config = buildConfig();
$('#uploadcsv').change(function() {
    csv = null;
    file = document.getElementById('uploadcsv');
    if ($(this).val().search('.csv') <= 0) {
        $(this).val('');
        Materialize.toast('Only support CSV', 4000);
        return
    }
    $(this).parse({
        config: config
    })
})

function calculate_distribution(real,predict){
  data_plot = []
  data_arr = [real,predict]
  for(var outer = 0; outer < data_arr.length;outer++){
    data = data_arr[outer]
    max_arr = Math.max(...data)
    min_arr = Math.min(...data)
    num_bins = Math.ceil(Math.sqrt(data.length));
    kde = kernelDensityEstimator(epanechnikovKernel(max_arr/50), arange(min_arr,max_arr,(max_arr-min_arr)/num_bins))
    kde = kde(data)
    bar_x = [], bar_y = []
    for(var i = 0; i < kde.length;i++){
      bar_x.push(kde[i][0])
      bar_y.push(kde[i][1])
    }
    min_line_y = Math.min(...bar_y)
    for(var i = 0; i < bar_y.length;i++) bar_y[i] -= min_line_y
    data_plot.push({'bar_x':bar_x,'bar_y':bar_y})
  }
  option = {
    color: colors,

    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross'
      }
    },
    legend: {
      data:['real histogram','predict histogram']
    },
    xAxis: [
      {
        type: 'category',
        data: data_plot[0]['bar_x']
      },
      {
        type: 'category',
        data: data_plot[1]['bar_x']
      }
    ],
    yAxis: {
      type: 'value'
    },
    series: [
      {
        name:'real histogram',
        type:'bar',
        data:data_plot[0]['bar_y']
      },
      {
        name:'predict histogram',
        type:'bar',
        data:data_plot[1]['bar_y'].slice(0,data_plot[1]['bar_y'].length-2)
      }
    ]
  };
  var bar_plot = echarts.init(document.getElementById('div_dist'));
  bar_plot.setOption(option,true);
}

function calculateMA(dayCount, data) {
  var result = [];
  for (var i = 0, len = data.length; i < len; i++) {
    if (i < dayCount) {
      result.push('-');
      continue;
    }
    var sum = 0;
    for (var j = 0; j < dayCount; j++) {
      sum += data[i - j][1];
    }
    result.push((sum / dayCount).toFixed(2));
  }
  return result;
}
