const fs = require('fs')
const unirest = require('unirest')
const path = require('path')
const queue = require('queue')
const chokidar = require('chokidar')
const winston = require('winston')
const twillio = require('twilio')

const logger = new (winston.Logger)({
    transports: [
      new (winston.transports.Console)({ colorize: true, timestamp:true })
    ]
})

const q = queue({
  concurrency: 1,
  autostart: true
})

var processed = 0
var failed = 0

function upload(file, callback) {

  unirest.post('http://localhost:8080/photo')
    .field('username', 'user')
    .field('password', 'pass123')
    .attach('photo', file)
    .end(function(response){
      
        if(response.body == 'OK, photo received.'){
          logger.log('info', `Photo with filename "${path.basename(file)}" upload succesfully`)
          processed += 1
          fs.unlinkSync(file)
        } else {
          logger.log('error', `Photo with filename "${path.basename(file)}" failed to upload`)
          failed += 1
        }

        callback()

    })

}

const inFolder = path.resolve('in')

chokidar.watch(inFolder, { 
    ignoreInitial: false,
    ignored: '.DS_Store',
    depth: 1
  })
  .on('add', (filename) => {

    const source = path.resolve(inFolder, filename)

    q.push(function(callback){
        
      logger.log('info', `Uploading photo with filename "${path.basename(source)}"`)
      upload(source, callback)

    })

})

if(process.env.TWILLIO_SID && process.env.TWILLIO_TOKEN) {

  const twillioClient = new twillio.RestClient(process.env.TWILLIO_SID, process.env.TWILLIO_TOKEN)

  const statusUpdateTimer = setInterval((timer) => {

    twillioClient.messages.create({
      body: `Emotobooth Status Update: \r\nSuccess: ${processed} \r\nFailed: ${failed}`,
      to: process.env.TWILLIO_TO,
      from: process.env.TWILLIO_FROM
    }, (err, message) => {
      if (err) {
        return logger.log('error', 'Unable to send status message!')
      }
      logger.log('info', `Sent status message with ${message.sid}`)
    })

  }, 30 * 60000)

}