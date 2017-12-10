var mongoClient = require("mongodb").MongoClient;
var ObjectId = require("mongodb").ObjectId;

var express = require("express");
var app = express();

var http = require("http");
var server = http.Server(app);

var socketIo = require("socket.io");
var io = socketIo(server);

var db;

var sessionDrawing = [];
var players = [];
var gameScores = [];
var sessionScores = [];
var allSockets = [];
var allSocketsLoggedIn = [];
var playerSockets = [];
var threeWords = [];
var words = [];
var votingWordsArr = [];
var votekickCount = 0;
var sessionTime = 90;
var roundNumber = 1;
var drawerSessionScore = 0;
var drawerScore = 0;
var setWord;
var leftDrawerIndex;
var startTimersInterval;
var sessionOverInvertal;
var gameRunning = false;
var drawerRemains = false;
var loggedIn = false;
var drawerLeft = false;
var lastInArray = false;
var displayActive = false;
var voteKick = false;

function randomElementIn(theArray) {
	var i = Math.floor(theArray.length * Math.random());
	return theArray[i].word;
}

function getDrawerIndex(){
	for(var i = 0; i < players.length; i++){
		if(players[i].drawer == true)
			drawerIndex = i;
	}
	return drawerIndex;
}

function getThreeWords(){
	updateWordArrays();
	while(threeWords.length > 0)
		threeWords.pop();
	threeWords.push(randomElementIn(words));
	threeWords.push(randomElementIn(words));
	while(threeWords[0] == threeWords[1])
		threeWords[1] = randomElementIn(words);
	threeWords.push(randomElementIn(words));
	while(threeWords[2] == threeWords[0] || threeWords[2] == threeWords[1])
		threeWords[2] = randomElementIn(words);
		return threeWords;
}

function emitWords(socket, clientMessage){
	var tempVoting = [];
	for (var i = 0; i < votingWordsArr.length; i++) {
		tempVoting[i] = votingWordsArr[i];
	}
	tempVoting.sort(function(a, b){return b.points - a.points});
	socket.emit("displayVotingWords", tempVoting);
	if(clientMessage) {
		socket.emit("submissionFeedback", "Word added! Submit another?");
	}
}

function updateWordArrays() {
	db.collection("votingWords").find({}).toArray(function(erro, docs){
		votingWordsArr.length = 0;
		votingWordsArr = docs;
		if (erro != null) {
			console.log("There was an issue updating the votingWordsArr from the database.");
		}
	});
	db.collection("gameWords").find({}).toArray(function(erro, docs){
		words.length = 0;
		words = docs;
		if (erro != null) {
			console.log("There was an issue updating the gameWords from the database.");
		}
	});
}

function checkWord(socket, err, docs, incOrDec, votingWord) {
		var points = docs;
		if(err) {
			console.log("There was an issue getting the points for " + votingWord + ".");
		}
		else {
				if(incOrDec) {
					if(points >= 50) {
						db.collection("votingWords").remove({ "word": votingWord}, true,  function() { updateWordArrays(); emitWords(socket, false); });
						db.collection("gameWords").insertOne({ "word": votingWord, "length": votingWord.length}, function() { updateWordArrays(); emitWords(socket, false); });
					}
					else {
						db.collection("votingWords").findOneAndUpdate(
							{ "word": votingWord },
							{ "$inc": { "points": 1 } },
							function(err, doc){
								if (err != null) {
									console.log("There was an error when updating points on " + votingWord + ".");
									console.log(err);
								}
								else if (err == null) {
								}
							}
						);
					}
					updateWordArrays();
				}
				else if(!incOrDec) {
					if(points <= -50) {
						db.collection("votingWords").remove({ "word": votingWord}, true, function() { updateWordArrays(); emitWords(socket, false); });
					}
					else {
						db.collection("votingWords").findOneAndUpdate(
							{ "word": votingWord },
							{ "$inc": { "points": -1 } },
							{upsert: true},
							function(err, doc){
								if (err != null) {
									console.log("There was an error when updating points on " + votingWord + ".");
									console.log(err);
								}
								else if (err == null) {
									updateWordArrays();
								}
							}
						);
				}
			}
			updateWordArrays();
			var displayVW = setTimeout(function() { emitWords(socket, false); }, 100);
	}
}

function reset(){
	displayActive = false;
	var newDrawer = 0;
	//update gamescores and gamesranks
	updateGameScores();
	//if roundNumber == 10 then all gameranks set to 1 and scores to 0
	if(roundNumber == 10){
		for(var i = 0; i < players.length; i++){
			players[i].score = 0;
		}
	}
	updateGameRanks();
	//zero out sessionScores
	while(sessionScores.length > 0)
		sessionScores.pop();
	drawerSessionScore = 0;

	//sessionScores.length = 0;
	for(var i = 0; i < players.length; i++){
		players[i].guessed = false;
		if(io.sockets.adapter.sids[players[i].socketID]["guessedWord"]){
			let socket = io.sockets.connected[players[i].socketID];
			socket.leave("guessedWord");
		}
	}

	if(drawerRemains || lastInArray)
		newDrawer = 0;
	else if(drawerLeft && !lastInArray)
		newDrawer = leftDrawerIndex;
	else{
		drawerIndex = getDrawerIndex();
		if(drawerIndex == players.length - 1)
			newDrawer = 0;
		else
			newDrawer = (drawerIndex+1);
		//change drawer status of drawer to false
		players[drawerIndex].drawer = false;
		//remove drawer from room and put into guessers
		let socket = io.sockets.connected[players[drawerIndex].socketID];
		socket.leave('drawer');
		socket.join('guessers');
	}
	drawerRemains = false;
	lastInArray = false;
	drawerLeft = false;

	//assign new drawer and put in room
	players[newDrawer].drawer = true;
	players[newDrawer].guessed = true;
	let socket = io.sockets.connected[players[newDrawer].socketID];
	socket.join('drawer');
	socket.leave('guessers');
	//update users
	io.emit("updateUsers", players);
	//enable votekick button
	io.emit("toggleVoteKick");
	//reset drawing session timer
	sessionTime = 90;
	io.emit("startSessionTimer", sessionTime);
	//update round number if every player has drawn
	if(newDrawer == 0){
		if(roundNumber == 10)
			roundNumber = 0;
		else
			roundNumber++;
		io.emit("updateRound", roundNumber);
	}
	//clear canvas
	clearCanv();
	//hide toolbar for all
 	io.emit("hideToolBar");
 	io.emit("disableCanvas");
	io.emit("displayWordToGuessers", "");
	if(players.length < 2)
		io.emit("needMorePlayers");
	else{
		io.in('guessers').emit("pickingWord", players[newDrawer].name);
		io.in('drawer').emit("displayWords", getThreeWords());
	}
}

function ifSessionOver(){
	var sessionOver;
	var guesserCheck = true;
	if(loggedIn){
		if(players.length >= 1){
			for(var i = 0; i < players.length; i++){
				if(players[i].guessed == false)
					guesserCheck = false;
			}
			drawerIndex = getDrawerIndex();
			if(guesserCheck)
				sessionOver = true;
			if(sessionTime == 0)
				sessionOver = true;
			if(sessionOver){
				gameRunning = false;
				clearInterval(startTimersInterval);
				clearInterval(sessionOverInterval);
				displayCanvasScores(drawerIndex);
			}
		}
	}
}

function displayDrawerHasLeft(){
	io.emit("displayCompleteWord", setWord);
	while(sessionScores.length > 0)
		sessionScores.pop;
	io.emit("displayOverlayToggle", true, "flex", "absolute");
	displayActive = true;
	io.emit("drawerHasLeft");
	voteKick = false;
	var timeOut = setTimeout(reset, 10000);
}

function displayEveryoneLeftGame(){
	while(sessionScores.length > 0)
		sessionScores.pop;
	io.emit("displayOverlayToggle", true, "flex", "absolute");
	io.emit("everyoneLeftGame");
	var timeOut = setTimeout(reset, 10000);
}

function displayCanvasScores(drawerIndex){
	io.emit("displayCompleteWord", setWord);
	clearCanv();
	for(var i = 0; i < players.length; i++){
		if(players[i].guessed == false)
			sessionScores.push({name: players[i].name, score: 0});
	}
	sessionScores.push({name: players[drawerIndex].name, score: drawerSessionScore});
	sessionScores.sort(function(a,b){return b.score-a.score});
	sessionTime = 0;
	io.emit("startSessionTimer", sessionTime);
	io.emit("displayOverlayToggle", true, "flex", "absolute");
	if(roundNumber == 10 && getDrawerIndex() == players.length-1){
		for(var i = 0; i < players.length; i++){
			if(players[i].rank == 1)
				var winner = players[i];
		}
		io.emit("displayScoreList", players, winner, true);
	}
	else{
		winner = players[0];
		io.emit("displayScoreList", sessionScores, winner, false);
	}
	displayActive = true;
	var timeOut = setTimeout(reset, 10000);
}

function startTimers(){
	sessionTime--;
	io.emit("startSessionTimer", sessionTime);
}

function updateGameScores(){
	for(var i = 0; i < players.length; i++){
		for(var j = 0; j < sessionScores.length; j++){
			if(players[i].name == sessionScores[j].name)
				players[i].score += sessionScores[j].score;
		}
	}
}

function updateGameRanks(){
	while(gameScores.length > 0)
		gameScores.pop();
	for(var i = 0; i < players.length; i++)
		gameScores.push(players[i]);
	if(gameScores.length > 0)
		gameScores.sort(function(a,b){return b.score-a.score});
	for(var i = 0; i < players.length; i++){
		for(var j = 0; j < gameScores.length; j++){
			if(players[i].name == gameScores[j].name){
				if(i > 0 && j > 0 && gameScores[j].score == gameScores[j-1].score)
					players[i].rank = players[i-1].rank;
				else
					players[i].rank = (j + 1);
			}
		}
	}
}

function sessionCutOff(){
	clearInterval(startTimersInterval);
	clearInterval(sessionOverInterval);
	clearCanv();
	sessionTime = 90;
	io.emit("startSessionTimer", sessionTime);
	while(sessionScores.length > 0)
		sessionScores.pop();
}

function clearCanv() {
	console.log("clear!");
	io.emit("clearCanvas");
	sessionDrawing.length = 0;
}

app.use(express.static("pub"));

io.on("connection", function(socket) {
	console.log("Connection made");
	allSockets.push(socket);
	allSocketsLoggedIn.push(false);
	loggedIn = false;
	updateWordArrays();

	socket.on("disconnect", function() {
		console.log("disconnection made");
		var m = allSockets.indexOf(socket);
		if(loggedIn){
			if(allSocketsLoggedIn[m] == true){
				var k = playerSockets.indexOf(socket);
				if(k == getDrawerIndex()){
					drawerLeft = true;
					leftDrawerIndex = k;
					socket.leave('drawer');
					socket.leave('guessedWord');
					if(k == players.length - 1){
						lastInArray = true;
					}
				}
				socket.leave('loggedIn');
				playerSockets.splice(k,1);
				players.splice(k,1);
				updateGameRanks();
				io.emit("updateUsers", players);
				if(drawerLeft){
					sessionCutOff();
					gameRunning = false;
					if(players.length > 1)
						displayDrawerHasLeft();
					else if(players.length == 1){
						gameRunning = false;
						roundNumber = 10;
						leftDrawerIndex = 0;
						displayEveryoneLeftGame();
					}
				}
				else if(!drawerLeft && players.length == 1){
						sessionCutOff();
						drawerRemains = true;
						gameRunning = false;
						roundNumber = 10;
						displayEveryoneLeftGame();
				}
				else if(players.length == 0){
					sessionCutOff();
					gameRunning = false;
					loggedIn = false;
				}
			}
		}
		allSockets.splice(m,1);
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
		loggedIn = true;
		var m = allSockets.indexOf(socket);
		allSocketsLoggedIn[m] = true;
		var socketNum = playerSockets.indexOf(socket);
		playerSockets.push(socket);
		var sessionid = socket.id;
		socket.join("loggedIn");
		if(playerSockets.length == 1){
			players.push({name: username, score: 0, drawer: true, guessed: true, rank: 1, socketID: sessionid});
			socket.join('drawer');
			socket.join('guessedWord');
		}
		else{
			players.push({name: username, score: 0, drawer: false, guessed: false, rank: 1, socketID: sessionid});
			socket.join('guessers');
		}
		socket.emit("loginOk");
		updateGameRanks();
		io.emit("updateUsers", players);
		if(players.length == 1){
			socket.emit("displayOverlayToggle", true, "flex", "absolute");
			socket.emit("needMorePlayers");
		}
		else if(players.length == 2){
			socket.emit("displayOverlayToggle", true, "flex", "absolute");
			socket.emit("pickingWord", players[0].name);
			io.in('drawer').emit("displayWords", getThreeWords());
		}
		else{
			if(gameRunning == false){
				if(displayActive){
					socket.emit("displayOverlayToggle", true, "flex", "absolute");
					socket.emit("displayActive");
				}
				else{
					socket.emit("displayOverlayToggle", true, "flex", "absolute");
					socket.emit("pickingWord", players[0].name);
				}
			}
			else
				socket.emit("displayWordToGuessers", setWord);
		}

		for (var i = 0; i < sessionDrawing.length; i++) {
			if (sessionDrawing[i].t == "brush" || sessionDrawing[i].t == "eraser") {
				socket.emit("drawBrush", sessionDrawing[i].t, sessionDrawing[i].w, sessionDrawing[i].col, sessionDrawing[i].cl, sessionDrawing[i].prevX, sessionDrawing[i].prevY, sessionDrawing[i].currX, sessionDrawing[i].currY, sessionDrawing[i].fl);
			}
			else if (sessionDrawing[i].t == "rect") {
				socket.emit("drawRect", sessionDrawing[i].col, sessionDrawing[i].prevX, sessionDrawing[i].prevY, sessionDrawing[i].currX, sessionDrawing[i].currY);
			}
			else if (sessionDrawing[i].t == "circle") {
				socket.emit("drawCircle", sessionDrawing[i].col, sessionDrawing[i].prevX, sessionDrawing[i].prevY, sessionDrawing[i].currX, sessionDrawing[i].currY);
			}
		}
	});

	socket.on("chat", function(textInput) {
		var i = playerSockets.indexOf(socket);
		if(players[i].guessed == true || players[i].drawer == true){
			var textString = "**" + players[i].name + "**: " + textInput;
			io.in('guessedWord').emit("sayAll", textString);
		}
		else{
			if(textInput.toLowerCase() === setWord.toLowerCase()){
				sessionScores.push({name: players[i].name, score: (5 * sessionTime)});
				drawerSessionScore += (10 + sessionTime);
				players[i].guessed = true;
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
		//var kickerIndex = allSockets.indexOf(socket);
		votekickCount++;
		if(players.length % 2 == 0){
			if(players.length == 2){
				var textString = "";
				if(votekickCount == 1)
					var votekick = true;
			}
			else{
				var textString = "**Vote kicking the drawer at " + votekickCount + "/" + (players.length/2 + 1) + " votes**";
				if(votekickCount == (players.length/2 + 1))
					votekick = true;
			}
		}
		else{
			var textString = "**Vote kicking the drawer at " + votekickCount + "/" + ((players.length + 1)/2) + " votes**";
			if(votekickCount == ((players.length + 1)/2))
				votekick = true;
		}
		io.emit("sayAll", textString);
		if(votekick){
			drawerIndex = getDrawerIndex();
			clearInterval(startTimersInterval);
			sessionTime = 90;
			io.emit("startSessionTimer", sessionTime);
			var errorMessage = "Sorry you've been kicked from the game.";
			let socket = io.sockets.connected[players[drawerIndex].socketID];
			socket.emit('playerKicked', errorMessage);
			socket.leave('drawer');
			socket.leave('guessedWord');
			players[drawerIndex].drawer = false;
			sessionCutOff();
			playerSockets.splice(drawerIndex,1);
			players.splice(drawerIndex,1);
			drawerLeft = true;
			leftDrawerIndex = drawerIndex;
			updateGameRanks();
			io.emit("updateUsers", players);
			displayDrawerHasLeft();

			//reset();
		}
	});

	socket.on("getChosenWord", function(chosenWord){
		setWord = chosenWord;
		io.in('loggedIn').emit("displayOverlayToggle", true, "none", "relative");
		socket.emit("displayCompleteWord", chosenWord);
		socket.broadcast.to('guessers').emit("displayWordToGuessers", chosenWord);
		startTimersInterval = setInterval(startTimers, 1000);
		sessionOverInterval = setInterval(ifSessionOver, 1000);
		gameRunning = true;
	});

	socket.on("brushDraw", function(type, width, color, click, pX, pY, cX, cY, flag) {
		io.emit("drawBrush", type, width, color, click, pX, pY, cX, cY, flag);
		sessionDrawing.push({ t: type, w: width, col: color, cl: click, prevX: pX, prevY: pY, currX: cX, currY: cY, fl: flag});
	});

	socket.on("rectDraw", function(color, sX, sY, mX, mY) {
		io.emit("drawRect", color, sX, sY, mX, mY);
		sessionDrawing.push({ t: "rect", w: 0, col: color, cl: 0, prevX: sX, prevY: sY, currX: mX, currY: mY, fl: 0});
	});

	socket.on("circleDraw", function(color, sX, sY, mX, mY) {
		io.emit("drawCircle", color, sX, sY, mX, mY);
		sessionDrawing.push({ t: "circle", w: 0, col: color, cl: 0, prevX: sX, prevY: sY, currX: mX, currY: mY, fl: 0});

	});

	socket.on("clearDraw", function(color, sX, sY, mX, mY) {
		clearCanv();
	});

	socket.on("getVotingWords", function(){
		updateWordArrays();
		var tempVoting = [];
 		for (var i = 0; i < votingWordsArr.length; i++) {
 			tempVoting[i] = votingWordsArr[i];
 		}
 		tempVoting.sort(function(a, b){return b.points - a.points});
 		socket.emit("displayVotingWords", tempVoting);
	});

	socket.on("voteWord", function(votingWord, incOrDec) {
		updateWordArrays();
		db.collection("votingWords").distinct("points", { "word": votingWord }, function(err, docs){ checkWord(socket, err, docs, incOrDec, votingWord); });
	});

	socket.on("submitWord", function(newWord){
		var isNumeric = (!isNaN(parseFloat(newWord)) && isFinite(newWord));
	 	var hasSpaces = (newWord.indexOf(' ') >= 0);
	 	var inVotingorGame = false;
	 	for (var i = 0; i < votingWordsArr.length; i++) {
	 		if (votingWordsArr[i].word == newWord){
	 			inVotingorGame = true;
	 		}
	 	}
	 	for (var i = 0; i < words.length; i++) {
	 		if (words[i] == newWord){
	 			inVotingorGame = true;
	 		}
	 	}
	 	if (isNumeric) {
	 		socket.emit("submissionFeedback", "No numbers please! Try another?");
	 	}
	 	else if (hasSpaces) {
	 		socket.emit("submissionFeedback", "No spaces please! Try another?");
	 	}
	 	else if (inVotingorGame) {
	 		socket.emit("submissionFeedback", "We've already got that one! Try another?");
	 	}
	 	else {
			db.collection("votingWords").insertOne({ "word": newWord, "length": newWord.length, "points": 1}, function() { updateWordArrays(); });
			var displayV = setTimeout(function() { emitWords(socket, true); }, 100);
	 	}
	 });
});

server.listen(80, function() {
	console.log("Server is listening");
	mongoClient.connect("mongodb://localhost:27017/scribbleDoodleDoo", function(err, database){
		if(err) {
			console.log("There was an issue connecting to the database.");
		}
		else {
			console.log("Connected to Mongo!");
			db = database;
			updateWordArrays();
		}
	})
});
