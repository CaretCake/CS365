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
var gameScores = [];
var roundScores = [];
var allSockets = [];
var words = ["football", "needle", "swing", "flower", "cookie", "ghost", "jellyfish", "lollipop", "hockey", "treasure"];
var setWord = "";
var votekickCount = 0;

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
	var loggedIn = false;

	socket.on("disconnect", function() {
		console.log("disconnection made");
		if(loggedIn){
			var k = players.indexOf(socket);
			allSockets.splice(k,1);
			players.splice(k,1);
			io.emit("updateUsers", players);
		}
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
		loggedIn = true;
		var socketNum = allSockets.indexOf(socket);
		var sessionid = socket.id;
		if(allSockets.length == 1){
			players.push({name: username, score: 0, roundScore: 0, drawer: true, guessed: false, rank: allSockets.length, roundRank: 0, socketID: sessionid});
			socket.join('drawer');
			socket.join('guessedWord');
		}
		else{
			players.push({name: username, score: 0, roundScore: 0, drawer: false, guessed: false, rank: allSockets.length, roundRank: 0, socketID: sessionid});
			socket.join('guessers');
		}
		socket.emit("loginOk");
		io.emit("updateUsers", players);
	});

	socket.on("chat", function(textInput) {
		var i = allSockets.indexOf(socket);
		if(players[i].guessed == true || players[i].drawer == true){
			var textString = "**" + players[i].name + "**: " + textInput;
			io.in('guessedWord').emit("sayAll", textString);
		}
		else{
			if(textInput.toLowerCase() === setWord.toLowerCase()){
				players[i].guessed = true;
				roundScores.push({name: players[i].name, score: 5*30});
				socket.join('guessedWord');
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

	socket.on("votekick", function(){
		for(var i = 0; i < players.length; i++){
			if(players[i].drawer == true)
			 var drawerIndex = i;
		}
		var kickerIndex = allSockets.indexOf(socket);
		votekickCount++;
		if(players.length % 2 == 0){
			if(players.length == 2){
				var textString = "";
				if(votekickCount == 1)
					var votekick = true;
			}
			else{
				var textString = "**Vote kicking the drawer at " + votekickCount + "/" + (players.length/2 + 1) + "votes**";
				if(votekickCount == (players.length/2 + 1))
					var votekick = true;
			}
		}
		else{
			var textString = "**Vote kicking the drawer at " + votekickCount + "/" + ((players.length + 1)/2) + "votes**";
			if(votekickCount == ((players.length + 1)/2))
				var votekick = true;
		}
		io.emit("sayAll", textString);
		if(votekick){
			var errorMessage = "Sorry you've been kicked from the game.";
			let socket = io.sockets.connected[players[drawerIndex].socketID];
			socket.emit('playerKicked', errorMessage);
			socket.leave('drawer');
			allSockets.splice(drawerIndex,1);
			players.splice(drawerIndex,1);
			io.emit("updateUsers", players);
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
		socket.emit("displayWords", word1, word2, word3);
	});

	socket.on("getChosenWord", function(chosenWord){
		console.log(chosenWord);
		setWord = chosenWord;
		// TODO: Change when no longer necessary
		socket.emit("displayWordToDrawer", chosenWord);
		socket.broadcast.to('guessers').emit("displayWordToAll", chosenWord);

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
