var fs = require('fs');
var google = require('googleapis');
var googleAuth = require('google-auth-library');
var fuzzy = require('fuzzy');
var path = require('path');

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
  credentials.redirectUrl = 'https://ceee255a.ngrok.io/oauth2callback'
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

// gets the user name of the token
// @return {username, error} -> error is true and username is null if there is an error, else error is false
gdrive.getUserName = function(auth, callback) {
  var service = google.drive('v3');
  service.about.get({
    auth: auth,
    fields: "user"
  }, function(err, response) {
    if(err) {
      console.log(err)
      callback(null, true);
      return;
    } else {
      gdrive.download(auth, 'LinearSystems');
      callback(response, false);
    }
  })
}
mimeType = 'application/pdf'

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
      console.log('The API returned an error: ' + err);
      return;
    }
    var files = response.files;
    callback(files);
  });
}

/**
  * Search the file list and download the matching file
  * Note: fileName should have no spaces
  * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
  * @param {fileName} name of the file to be downloaded
  * @return {fileData} data of file - null if file does not exist or error
  * @return {error} error returned the Drive - null if no error
  */
gdrive.download = function(auth, fileName) {
  if(typeof fileName !== 'string' && fileName !== null) {
    return {fileData: null, error: "File Name does not exist"};
  }

  gdrive.getFiles(auth, function(list) {
    console.log(list)
    var options = {extract : function(el) { return el.name; }};
    var results = fuzzy.filter(fileName, list, options);
    if(results.length === 0) {
      return {fileData: null, error: "File Name could not be matched to any of the pdfs in Google Drive."};
    }

    var fileId = results[0].original.id; // id of top matched
    var fileLocation = path.join(__dirname, fileId, '.pdf');
    var dest = fs.createWriteStream(fileLocation);
    console.log('downloading...');
    var service = google.drive('v3');
    service.files.get({
        auth: auth,
       fileId: fileId,
       mimeType: 'application/pdf',
       alt: 'media'
    })
    .on('end', function() {
      console.log('Done');
    })
    .on('error', function(err) {
      console.log('Error during download', err);
    })
    .pipe(dest);

  });
}

module.exports = gdrive;
