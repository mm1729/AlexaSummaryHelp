var express = require('express')
var path = require('path')
var logger = require('morgan')
var router = require('./router/router')
var app = express()

app.set('port', (process.env.PORT || 3000))

app.engine('html', require('ejs').renderFile)
app.set('view engine', 'html')

app.use(express.static(path.join(__dirname, 'public')))
console.log(path.join(__dirname, 'public'))
app.use('/', router)

app.listen(app.get('port'), function() {
    console.log('SummaryHelp running on port ' + app.get('port'))
})

app.use(logger('dev'))

module.exports = app;
