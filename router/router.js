var express = require('express')
var path = require('path')
var router = express.Router()
var querystring = require('querystring')
var gdrive = require('../gdrive.js')
var summarizer = require('../summarizer.js')
var fs = require('fs')


router.get('/', function(req, res) {
  res.render('../public/html/index')
})

router.get('/oauth2callback', function(req, res) {
  var code = req.query.code
  var stateEncoded = req.query.state
  var errMsg = "We encountered an error authenticating your Google Drive account. Please try again."
  if(!code || !stateEncoded) {
    res.render('../public/html/error', {errMsg : errMsg})
  }

  var state = new Buffer(stateEncoded, 'base64').toString('ascii')
  var alexaState = querystring.parse(state)

  gdrive.authenticate(code, function(auth, err) {
    if(err === true) {
      res.render('../public/html/error', {errMsg : errMsg})
    } else {
      gdrive.getUserName(auth, function(user, token, err) {
        if(err === true) {
          res.render('../public/html/error', {errMsg : errMsg})
        } else {
          var redirectUri = alexaState.redirect_uri + '#state=' + alexaState.state  + '&access_token=' + new Buffer(querystring.stringify(token)).toString('base64') + '&token_type=Bearer'
          res.render('../public/html/user', {
            photoLink: user.user.photoLink,
            displayName: user.user.displayName,
            redirectUri: redirectUri
          })
        }
      })
    }
  })
})

router.get('/privacy', function(req, res) {
  res.send('Privacy Policy')
})

router.get('/signup', function(req, res) {
  var query = req.query;
  if(query) {
    var clientId = query.client_id
    var responseType = query.response_type
    var state = query.state
    var redirectUri = query.redirect_uri

    if(clientId && responseType && state && clientId === 'alexa-skill-summaryhelp' && responseType === 'token') {
      var stateEncoded = querystring.stringify(query)
      var state = new Buffer(stateEncoded).toString('base64')
      var googleRedirectUri = gdrive.getRedirectionUri(state)
      res.render('../public/html/signup', {redirectUri: googleRedirectUri})
    }
  }

  res.end()
})

router.get('/files', function(req, res) {
  var query = req.query
  var accessToken = (query) ? querystring.parse(new Buffer(query.accessToken, 'base64').toString('ascii')) : null
  if(accessToken === null) {
    res.status(404).send('No accessToken')
  }

  var auth = gdrive.getAuthClient(accessToken)
  gdrive.getFiles(auth, function(files, err) {
    if(err === true) {
      res.status(404).send('Could not retreive files from Google Drive')
    }
    //console.log(files)
    var fileNames = Array.prototype.map.call(files, function(f) {return f.name;});
    res.json({listFiles: fileNames})
  })

})

router.get('/summary', function(req, res) {
  var query = req.query
  var accessToken = (query) ? querystring.parse(new Buffer(query.accessToken, 'base64').toString('ascii')) : null
  if(accessToken === null) {
    res.status(404).send('No accessToken')
  }

  console.log(accessToken)
  var fileName = query.fileName
  var beginPage = 1*query.beginPage
  var endPage = 1*query.endPage

  console.log(fileName + " " + beginPage + " " + endPage)
  //get file id
  var auth = gdrive.getAuthClient(accessToken)
  gdrive.download(auth, fileName, function(fileLoc, err) {
    if(err) {
      res.status(404).send(err)
    } else {
      console.log('fileLoc ' + fileLoc)
      console.log(fileLoc)
      summarizer.getSummary(fileLoc, beginPage, endPage, function(summary) {
        if(summary === null) {
          res.json({summary: summary, error: 'Error processing this document.'})
        } else {
          res.json({summary: summary, error: null})
        }
        // delete file
        fs.unlink(fileLoc)
      });
    }

  })
})

module.exports = router
