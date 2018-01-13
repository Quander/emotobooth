let Client = require('hangupsjs')


let creds = function(){
	return {
		auth: Client.authStdin
	}
}

let client = new Client()

client.connect(creds).then(() => {
	return client.sendchatmessafe('rHicaAnJkhhSJQaG3', [0, 'Hello World'])
}) 