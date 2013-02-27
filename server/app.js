var app = require('http').createServer(handler),
	io = require('socket.io').listen(app);

app.listen(3000);

function handler (req, res) {
	res.writeHead(200);
	res.end('not here');
}

var arr = [];
var channel = 0;
var s = [];

io.sockets.on('connection', function (socket) {
	socket.on('reqNew', function(data) {
		arr[channel] = socket;
		socket.emit('resNew', channel);
		channel++;
	});

	socket.on('reqJoin', function(data) {
		if(arr[data]) {
			s[socket.id] = arr[data]; // socket 2 -> socket 1
			s[arr[data].id] = socket; // socket 1 -> socket 2

			arr[data].emit('resJoin');

			console.log(s);
		} else {
			console.log("ERR");
			console.log(s, arr, data);
		}
	});

	socket.on('reqOffer', function(data) {
		s[socket.id].emit('resOffer', data);
	});

	socket.on('reqAnswer', function(data) {
		s[socket.id].emit('resAnswer', data);

	});

	socket.on('reqIce', function(data) {
		s[socket.id].emit('resIce', data);
	});


	/*socket.on('reqDC', function() {
		s[socket.id].emit('resDC');
		socket.emit('resDC');
	});*/
});