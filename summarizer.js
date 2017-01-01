require('pdfjs-dist');
var SummaryTool = require('node-summary');
//var SummaryTool = require('./summary_tool.js');
var fs = require('fs');
var util = require('util');

var summarizer = {};

const paraSize = 3; // 7 sentences in each paragraph

// returns page from a pdf
var getTextFromPage = function(page, callback) {
  var params = {normalizeWhitespace: true, combineTextItems: true};
  page.getTextContent(params).then(function(textContent) {
      if(textContent.items === null) {
          callback(null);
          return;
      }

      var pageText = '';
      var numSentences = 0;
      for(var i = 0; i < textContent.items.length; i++) {
          var block = textContent.items[i];
          var text = block.str.replace(/\s/g, ' ') + ' ';
          if(!(text.length < 10 && text[text.length - 2] !== '.')) {
              var dotLocation = text.indexOf('.');
              if(dotLocation !== -1) {
                numSentences++;
                if(numSentences === paraSize) {
                  pageText += text.substring(0, dotLocation + 1) +
                  '\n\n' + text.substring(dotLocation + 1);
                  numSentences = 0;
                } else {
                  pageText += text;
                }
              } else {
                pageText += text;
              }



          }
      }
      callback(pageText);
      return;
  });
};


// Returns text from range of pages between page1 and page2 inclusive, else returns null
var getTextFromPages = function(pdfLocation, page1, page2, callback) {
  var text = '';
  var completed = 0;
  var calledGetText = false;

  var data = new Uint8Array(fs.readFileSync(pdfLocation));

  PDFJS.getDocument(data).then(function(pdfDocument) {
    for(var i = page1; i <= page2; i++) {
      pdfDocument.getPage(i).then(function(page) {
        getTextFromPage(page, function(pageText) {
          if(pageText !== null) {
            text += pageText;
            completed++;
          }

          if(completed === page2 - page1 + 1) { // finished
            callback(text);
          }
        });
      });
      calledGetText = true;
    }

    if(calledGetText === false) { // never called getTextFromPage so return null
      //console.log('here in not called get text');
      callback(null);
    }
  }).catch(function(err) {
    //console.log('why?');
    //console.log(err);
    callback(null);
  });

};

summarizer.getSummary = function(pdfLocation, page1, page2, callback) {
  getTextFromPages(pdfLocation, page1, page2, function(text) {
    //console.log('here');
    //console.log(text);
    if(text === null) {
      callback(null);
    } else {
      SummaryTool.summarize(null, text, function(err, summary) {
        if(err) console.log("Summarize Error: " + err);
        summary = summary.replace(/[^0-9a-zA-Z,.;'"\s]/g, '');
                console.log(summary);
        callback(summary);
      });
    }
  });
};

module.exports = summarizer;
