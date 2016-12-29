var express = require('express')
var path = require('path')
var router = express.Router()
var gdrive = require('../gdrive.js')


router.get('/', function(req, res) {
  res.render('../public/html/signup')
})

router.get('/oauth2callback', function(req, res) {
  var code = req.query.code
  var errMsg = "We encountered an error authenticating your Google Drive account. Please try again."
  if(!code) {
    res.render('../public/html/error', {errMsg : errMsg})
  }
  gdrive.authenticate(code, function(auth, err) {
    if(err === true) {
      res.render('../public/html/error', {errMsg : errMsg})
    } else {
      gdrive.getUserName(auth, function(user, err) {
        if(err === true) {
          res.render('../public/html/error', {errMsg : errMsg})
        } else {
          res.render('../public/html/user', {
            photoLink: user.user.photoLink,
            displayName: user.user.displayName
          })
        }
      })
    }
  })
})

router.get('/signup', function(req, res) {
  res.render('../public/html/signup')
})

module.exports = router
