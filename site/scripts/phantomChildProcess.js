/* global setTimeout, console, require, phantom */
'use strict';

var page = require('webpage').create();
var args = require('system').args;
require('phantomjs-polyfill');

page.onConsoleMessage = function(msg) {
  console.info('console: ' + msg);
};

page.open('http://localhost:8080/single?timing=' + args[3] + '&', function(status) {

  if(status === "success") {
    if (page.injectJs(args[1])) {
      setTimeout(function() {
        page.render(args[2], {format: 'jpeg', quality: '100'});
        //page.close();
        phantom.exit();
      }, 2000);
    } else {
      console.info(page.injectJs(args[1]));
      //page.close();
      phantom.exit();
    }
  } else {
    console.info(status);
    //page.close();
    phantom.exit();
  }

});
