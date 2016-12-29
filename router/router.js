var express = require('express')
var path = require('path')
var router = express.Router()
var gdrive = require('../gdrive.js')


router.get('/', function(req, res) {
  res.sendFile('signup.html', {'root' : path.join(__dirname, '../public/html/')})
})

router.get('/oauth2callback', function(req, res) {
  var code = req.query.code
  if(!code) {
    res.send("We encountered an error authenticating your Google Drive account. Please try again.")
  }
  gdrive.authenticate(code, function(token, err) {
    if(err === true) {
      res.send("We encountered an error authenticating your Google Drive account. Please try again.")
    } else {
      gdrive.getUserName(token, function(username, err) {
        if(err === true) {
          res.send("We encountered an error authenticating your Google Drive account. Please try again.")
        } else {
          res.send(username)
        }
      })
    }
  })
})

router.get('/signup', function(req, res) {
  res.sendFile('signup.html', {'root' : path.join(__dirname, '../public/html/')})
})

router.get('/')

module.exports = router
