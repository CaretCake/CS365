var mongoClient = require("mongodb").MongoClient;
var ObjectId = require("mongodb").ObjectId;

var express = require("express");
var app = express();

var http = require("http");
var server = http.Server(app);

var socketIo = require("socket.io");
var io = socketIo(server);

var db;

var players = [];
var allSockets = [];
var words = ["football", "needle", "swing", "flower", "cookie", "ghost", "jellyfish", "lollipop", "hockey", "treasure"];

function randomElementIn(theArray) {
	var i = Math.floor(theArray.length * Math.random());
	return theArray[i];
}

/*
mongoClient.connect("mongodb://localhost:27017/scribbleGame", function(err, database) {
	if(err) {
		console.log("There was a problem connecting to the database.");
		throw err;
	}
	else {
		console.log("Connected to Mongo.");
		db = database;
	}
});


function updateClientGUIs() {
db.collection("words").find({})
	if(err == null)

}
*/

app.use(express.static("pub"));

io.on("connection", function(socket) {
	console.log("Connection made");

	socket.on("disconnect", function() {
		console.log("disconnection made");
		var k = players.indexOf(socket);
		allSockets.splice(k,1);
		players.splice(k,1);
		io.emit("updateUsers", players);
	});

	socket.on("chat", function(textInput) {
		var i = allSockets.indexOf(socket);
		var textString = players[i].name + ": " + textInput;
		io.emit("sayAll", textString);
	});

	socket.on("getWord"), function(){
		var roundWord = randomElementIn(words);
		io.emit("sendWord", roundWord);

	}

	socket.on("checkAnswer", function(textInput){



	});

	socket.on("login", function(username) {
		//Empty string is bad
		if (username === "") {
			socket.emit("loginBad", "Please enter a username.");
			return;
		}
		var playerNum = players.length;
		for(var i = 0; i < playerNum; i++) {
			if (username.toUpperCase() === players[i].name.toUpperCase()) {
				socket.emit("loginBad", "Username already taken, please try another.");
				return;
			}
		}
		allSockets.push(socket);
		var socketNum = allSockets.indexOf(socket);
		players.push({name: username, score: 0, drawer: false, rank: playerNum, answerRank: 0, socket: socketNum});
		socket.emit("loginOk");
		io.emit("updateUsers", players);
	});

/*
	socket.on("getWord", function(){
		mongoClient.connect("mongodb://localhost:27017/scribbleGame", fucntion(err, db){
			if(err){
				console.log("There was a problem connecting to the database.");
			}
			else{
				console.log("Connected to Mongo");
				getRandomWord(db, function(answer)){
					if(answer){
						console.log("Effected " + answer.result.n + "records.");
						console.log(answer);
						socket.emit("giveWord", answer);
					}
					else{
						console.log("Something bad happened when trying to send word.");
					}
					db.close();
				));
			}
		});
	});
	*/
});

server.listen(80, function() {
	console.log("Server is listening");
});

/*
function randomElementIn(theArray) {
	var i = Math.floor(theArray.length * Math.random());
	return theArray[i];
}

function getRandomWord(){
	var words = ["football", "needle", "swing", "flower", "cookie", "ghost", "jellyfish", "lollipop", "hockey", "treasure"];
	var ret = {};
	ret.word = randomElementIn(words);
	ret.length = ret.word.length;

	return ret;
}

function insertWord(db, callback){
	var collection = db.collection("words");
	collection.insertOne(getRandomWord(), function(err, result){
		if(err){
			callback(null);
		}
		else{
			callback(result);
		}
	});
}
*/
