var fs = require("fs");
var unirest = require("unirest");
var path = require("path");
var queue = require("queue");
var chokidar = require('chokidar');

var q = queue({
  concurrency: 1,
  autostart: true
});

function upload(file) {

  unirest.post('http://130.211.97.71:8080/photo')
    .field('username', 'user')
    .field('password', 'pass123')
    .attach('photo', file)
    .end(function(response){
      // console.log(response)
    });

};

var inFolder = path.resolve('in');

console.log(inFolder);

chokidar.watch(inFolder, { 
    ignoreInitial: true,
    ignored: '.DS_Store',
    depth: 1
  })
  .on('add', (filename) => {

    var source = path.resolve(inFolder, filename);

    q.push(function(callback){
        unirest.post('http://130.211.97.71:8080/photo')
          .field('username', 'user')
          .field('password', 'pass123')
          .attach('photo', source)
          .end(function(response){

            if(response.body == 'OK, photo received.'){
              fs.unlinkSync(source);
            }

            callback();

          });
    });

});