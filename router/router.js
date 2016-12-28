var express = require('express')
var path = require('path')
var router = express.Router()

router.get('/', function(req, res) {
  console.log(__dirname)
  res.sendFile('index.html', {'root' : path.join(__dirname, '../public/html/')})
})

router.post('/oauth2callback', function(req, res) {
  res.send(req)
})

module.exports = router
