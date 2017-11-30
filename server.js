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
var setWord;

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
		for(var j = 0; j < guessedPlayers.length; j++){
			if(guessedPlayers[j] == players[i])
				var playerAlreadyGuessed = true;
			else
				playerAlreadyGuessed = false;
		}
		if(playerAlreadyGuessed){
			var textString = "**" + players[i].name + "**: " + textInput;
			io.emit("sayAll", textString);
		}
		else{
			if(textInput.toLowerCase() == setWord.toLowerCase()){
				players[i].guessed = true;
				guessedPlayers.push(players[i]);
				var textString = "****" + players[i].name + " has guessed the word!****";
				io.emit("sayAll", textString);
				io.emit("updateUsers", players);
			}
			else{
				var textString = players[i].name + ": " + textInput;
				io.emit("sayAll", textString);
			}
		}
	});

	socket.on("getThreeWords", function(){
		var word1 = randomElementIn(words);
		var word2 = randomElementIn(words);
		while(word1 == word2)
			word2 = randomElementIn(words);
		var word3 = randomElementIn(words);
		while(word3 == word1 || word3 == word2)
			word3 = randomElementIn(words);
		io.emit("displayWords", word1, word2, word3);
	});

	socket.on("getChosenWord", function(chosenWord){
		setWord = chosenWord;
		io.emit("displayWordToAll", setWord);
	});

	socket.on("login", function(username) {
		if (username === "") {
			socket.emit("loginBad", "Please enter a username.");
			return;
		}
		if(username.length > 8){
			socket.emit("loginBad", "Please choose a username that is 8 characters or less.");
			return;
		}
		for(var i = 0; i < players.length; i++) {
			if (username.toUpperCase() === players[i].name.toUpperCase()) {
				socket.emit("loginBad", "Username already taken, please try another.");
				return;
			}
		}
		allSockets.push(socket);
		var socketNum = allSockets.indexOf(socket);
		if(allSockets.length == 1)
			players.push({name: username, score: 0, drawer: true, guessed: false, rank: allSockets.length, answerRank: 0, socket: socketNum});
		else
			players.push({name: username, score: 0, drawer: false, guessed: false, rank: allSockets.length, answerRank: 0, socket: socketNum});
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
