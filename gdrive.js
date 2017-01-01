var fs = require('fs');
var google = require('googleapis');
var googleAuth = require('google-auth-library');
var fuzzy = require('fuzzy');
var path = require('path');
var summarizer = require('./summarizer.js');

var gdrive = {};
var SCOPES = ['https://www.googleapis.com/auth/drive.readonly'];
var credentials = {};

// Initialize credentials
fs.readFile('client_secret.json', function processClientSecrets(err, content) {
  if (err) {
    console.log('Error loading client secret file: ' + err);
    return;
  }
  content = JSON.parse(content);
  credentials.clientSecret = content.web.client_secret;
  credentials.clientId = content.web.client_id;
  credentials.redirectUrl = content.web.redirect_uris[0];
  //temp
  credentials.redirectUrl = 'https://summarizehelp.herokuapp.com/oauth2callback'
});

// authenticate the authorization code to get an access token
// @return {token, error} -> error is true and token in null if there is an error, else error is false
gdrive.authenticate = function(code, callback) {
  var auth = new googleAuth();
  var oauth2Client = new auth.OAuth2(credentials.clientId, credentials.clientSecret, credentials.redirectUrl);

  oauth2Client.getToken(code, function(err, token) {
    if (err) {
      callback(null, true);
      return;
    }
    oauth2Client.credentials = token;
    callback(oauth2Client, false);
  });
}

/**
 * get the redirect uri for google outh2 library
 * @param {state} uri state to be added to the uri - encoded in uri format
 * @return {uri} google outh2 redirection url
 */
gdrive.getRedirectionUri = function(state) {
  var auth = new googleAuth();
  var oauth2Client = new auth.OAuth2(credentials.clientId, credentials.clientSecret, credentials.redirectUrl);

  var authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES
  });
  return authUrl + '&state=' + state;
}

// gets the user name of the token
// @return {username, error} -> error is true and username is null if there is an error, else error is false
gdrive.getUserName = function(auth, callback) {
  var service = google.drive('v3');
  service.about.get({
    auth: auth,
    fields: "user"
  }, function(err, response) {
    if(err) {
      callback(null, null, true);
      return;
    } else {
      //gdrive.download(auth, 'Microelectronic');
      callback(response, auth.credentials, false);
    }
  })
}

/**
  * Returns a auth client with the input access token
  *
  * @return {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
gdrive.getAuthClient = function(accessToken) {
  var auth = new googleAuth();
  var oauth2Client = new auth.OAuth2(credentials.clientId, credentials.clientSecret, credentials.redirectUrl);
  oauth2Client.credentials = accessToken;
  return oauth2Client;
}

/**
 * Gets PDF files and file ids
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
gdrive.getFiles = function(auth, callback) {
  var service = google.drive('v3');
  service.files.list({
    auth: auth,
    q: "mimeType='application/pdf'",
    fields: "nextPageToken, files(id, name)"
  }, function(err, response) {
    if (err) {
      console.log(err);
      callback(null, true);
      return;
    }
    var files = response.files;
    files = files.map(function(f) {
      var name = f.name.replace(/[^0-9a-z]/gi, ' ');
      name = name.replace(/\s/g, ' ');
      return {id: f.id, name: name};
    });
    callback(files, false);
  });
}


/**
  * Search the file list and download the matching file
  * Note: fileName should have no spaces
  * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
  * @param {fileName} name of the file to be downloaded
  * @return {fileLoc} location of file - null if file does not exist or error
  * @return {error} error returned the Drive - null if no error
  */
gdrive.download = function(auth, fileName, callback) {
  if(typeof fileName !== 'string' && fileName !== null) {
    callback({fileLoc: null, error: "File Name does not exist"});
    return;
  }

  gdrive.getFiles(auth, function(list) {
    var options = {extract : function(el) { return el.name; }};
    console.log(list);
    var results = fuzzy.filter(fileName, list, options);
    if(results.length === 0) {
      callback(null, 'No matching files found.');
      return;
    }
    console.log('results: ' + results);
    var fileId = results[0].original.id; // id of top matched
    var fileLocation = path.join(__dirname, fileId + '.pdf');
    var dest = fs.createWriteStream(fileLocation);
    console.log(`downloading to ${fileLocation}`);
    var service = google.drive('v3');
    service.files.get({
      auth: auth,
      fileId: fileId,
      mimeType: 'application/pdf',
      alt: 'media'
    })
    .on('end', function() {
      /*summarizer.getSummary(fileLocation, 1, 5, function(summary) {
        console.log(summary)
        // delete file
        //fs.unlink(fileLoc)
        //res.json({summary: summary, error: null})
      });*/
      callback(fileLocation, null);
    })
    .on('error', function(err) {
      callback(null, 'Files could not be retreived from Google Drive.');
    })
    .pipe(dest);

  });
}



module.exports = gdrive;
