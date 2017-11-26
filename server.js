var mongoClient = require("mongodb").MongoClient;
var ObjectId = require("mongodb").ObjectId;

var express = require("express");
var app = express();

var http = require("http");
var server = http.Server(app);

var socketIo = require("socket.io");
var io = socketIo(server);

var db;

var playerList = [];
var allSockets = [];
var playerScores = [];


/*
mongoClient.connect("mongodb://localhost:27017/bookStore", function(err, database) {
	if(err) {
		console.log("There was a problem connecting to the database.");
		throw err;
	}
	else {
		console.log("Connected to Mongo.");
		db = database;
	}
});
*/

function updateClientGUIs() {

}

app.use(express.static("pub"));

io.on("connection", function(socket) {
	console.log("Connection made");
	allSockets.push(socket);
	playerList.push("Username");

	io.emit("updateUsers", playerList);

	socket.on("disconnect", function() {
		console.log("disconnection made");
		var k = allSockets.indexOf(socket);
		allSockets.splice(k, 1);
		playerList.splice(k, 1);
		io.emit("updateUsers", playerList);
	});

	socket.on("chat", function(textInput) {
		var j = allSockets.indexOf(socket);
		io.emit("sayAll", playerList[j] + ": " + textInput);
	});

	socket.on("checkAnswer", function(textInput){


	});
});

server.listen(80, function() {
	console.log("Server is listening");
});
