//var mongoClient = require("mongodb").MongoClient;
//var ObjectId = require("mongodb").ObjectId;

var express = require("express");
var app = express();

var http = require("http");
var server = http.Server(app);

var socketIo = require("socket.io");
var io = socketIo(server);

var db;

var sessionDrawing = [];
var loggedIn = false;
var players = [];
var gameScores = [];
var gameScoresTemp = [];
var sessionScores = [];
var allSockets = [];
var threeWords = [];
var words = ["football", "needle", "swing", "flower", "cookie", "ghost", "jellyfish", "lollipop", "hockey", "treasure"];
var votingWords = [{word: "mario", points: 30}, {word: "sword", points: 48}, {word: "sunglasses", points: -3}, {word: "helicopter", points: 36}, {word: "computer", points: 44}, {word: "rollercoaster", points: 27}, {word: "dragon", points: 34}, {word: "lightbulb", points: -19}, {word: "bone", points: 3}, {word: "lightsaber", points: 28}, {word: "dinosaur", points: 40}, {word: "monster", points: 26}, {word: "zombie", points: 21}, {word: "turtle", points: -29}, {word: "GLaDOS", points: 12}];
var setWord;
var votekickCount = 0;
var sessionTime = 90;
var roundNumber = 1;
var gameRunning = false;
var startTimersInterval;
var sessionOverInvertal;
var drawerSessionScore = 0;
var isSorted = false;
var drawerScore = 0;
var drawerLeft = false;
var lastInArray = false;
var leftDrawerIndex;

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
function randomElementIn(theArray) {
	var i = Math.floor(theArray.length * Math.random());
	return theArray[i];
}

function getDrawerIndex(){
	for(var i = 0; i < players.length; i++){
		if(players[i].drawer == true)
			drawerIndex = i;
	}
	return drawerIndex;
}

function getThreeWords(){
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

function reset(){
	var newDrawer = 0;
	//update gamescores and gamesranks
	updateGameScores();
	updateGameRanks();
	//if roundNumber == 10 then all gameranks set to 1 and scores to 0
	if(roundNumber == 10){
		for(var i = 0; i < players.length; i++){
			players[i].score = 0;
		}
		updateGameRanks();
	}
	//zero out sessionScores
	while(sessionScores.length > 0){
		console.log(sessionScores);
		sessionScores.pop();
		console.log(sessionScores);
	}

	//sessionScores.length = 0;
	for(var i = 0; i < players.length; i++){
		//reset all players guessed status to false
		players[i].guessed = false;
	}
	if(lastInArray)
		newDrawer = 0;
	else if(drawerLeft){
		newDrawer = leftDrawerIndex;
	}
	else{
		drawerIndex = getDrawerIndex();
		if(drawerIndex == players.length - 1){
			newDrawer = 0;
		}
		else{
			newDrawer = (drawerIndex+1);
		}
		//change drawer status of drawer to false
		players[drawerIndex].drawer = false;
		//remove drawer from room and put into guessers
		let socket = io.sockets.connected[players[drawerIndex].socketID];
		socket.leave('drawer');
		socket.join('guessers');
	}
	drawerSessionScore = 0;
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
	io.emit("displayWordToAll", "", false);
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
	console.log(sessionOver);
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
			if(players.length < 2)
				sessionOver = true;
			if(sessionOver){
				clearInterval(startTimersInterval);
				clearInterval(sessionOverInterval);
				console.log("IfSessionOver" + drawerIndex);
				console.log(players[drawerIndex].guessed);
				displayCanvasScores(drawerIndex);
			}
		}
	}
}

function displayCanvasScores(drawerIndex){
	console.log("This is the set word for the round: " + setWord);
	io.emit("displayWordToAll", setWord, true);
	clearCanv();
	console.log("This is the drawers score for the session: " + drawerSessionScore);
	for(var i = 0; i < players.length; i++){
		if(players[i].guessed == false)
			sessionScores.push({name: players[i].name, score: 0});
	}
	sessionScores.push({name: players[drawerIndex].name, score: drawerSessionScore});
	sessionScores.sort(function(a,b){return b.score-a.score});
	console.log(sessionScores);
	console.log("displayCanvas");
	sessionTime = 0;
	io.emit("startSessionTimer", sessionTime);
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
		gameScoresTemp.push(players[i]);
	while(gameScoresTemp.length > 0){
		var maxScore = 0;
		var maxIndex = 0;
		for(var i = 0; i < gameScoresTemp.length; i++){
			if(maxScore < gameScoresTemp[i].score){
				maxScore = gameScoresTemp[i].score;
				maxIndex = i;
			}
		}
		gameScores.push(gameScoresTemp[maxIndex]);
		gameScoresTemp.splice(maxIndex, 1);
	}

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
	loggedIn = false;

	socket.on("disconnect", function() {
		console.log("disconnection made");
		if(loggedIn){
			var k = allSockets.indexOf(socket);
			if(k == getDrawerIndex()){
				drawerLeft = true;
				socket.leave('drawer');
			}
			allSockets.splice(k,1);
			players.splice(k,1);
			console.log(players.length);
			updateGameRanks();
			io.emit("updateUsers", players);
			if(drawerLeft && players.length > 1){
				sessionCutOff();
				gameRunning = false;
				if(k == players.length - 1){
					lastInArray = true;
					leftDrawerIndex = k;
				}
				reset();
			}
			else if(drawerLeft && players.length == 1){
				sessionCutOff();
				gameRunning = false;
				roundNumber = 10;
				leftDrawerIndex = 0;
				reset();
			}
			else if(!drawerLeft && players.length == 1){
					sessionCutOff();
					gameRunning = false;
					roundNumber = 10;
					reset();
			}
			else if(players.length == 0){
				clearCanv();
				sessionCutOff();
				gameRunning = false;
				loggedIn = false;
			}
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
			players.push({name: username, score: 0, sessionScore: 0, drawer: true, guessed: true, rank: 1, sessionRank: 0, socketID: sessionid});
			socket.join('drawer');
			socket.join('guessedWord');
		}
		else{
			players.push({name: username, score: 0, sessionScore: 0, drawer: false, guessed: false, rank: 1, sessionRank: 0, socketID: sessionid});
			socket.join('guessers');
		}
		socket.emit("loginOk");
		updateGameRanks();
		io.emit("updateUsers", players);
		if(players.length == 1)
			socket.emit("needMorePlayers");
		else if(players.length == 2){
			socket.emit("pickingWord", players[0].name);
			io.in('drawer').emit("toggleOverlayForUser");
			io.in('drawer').emit("displayWords", getThreeWords());
		}
		else{
			if(gameRunning == false){
				socket.emit("pickingWord", players[0].name);
			}
			else{
				socket.emit("displayWordToAll", setWord, false);
				socket.emit("toggleOverlayForUser");
			}
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
		var i = allSockets.indexOf(socket);
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
					var votekick = true;
			}
		}
		else{
			var textString = "**Vote kicking the drawer at " + votekickCount + "/" + ((players.length + 1)/2) + " votes**";
			if(votekickCount == ((players.length + 1)/2))
				var votekick = true;
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
			sessionCutOff();
			socket.leave('drawer');
			allSockets.splice(drawerIndex,1);
			players.splice(drawerIndex,1);
			drawerLeft = true;
			leftDrawerIndex = drawerIndex;
			updateGameRanks();
			io.emit("updateUsers", players);
			//reset();
		}
	});

	socket.on("getChosenWord", function(chosenWord){
		console.log(chosenWord);
		setWord = chosenWord;
		// TODO: Change when no longer necessary
		socket.emit("displayWordToDrawer", chosenWord);
		socket.broadcast.to('guessers').emit("displayWordToAll", chosenWord, false);
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
		var tempVoting = [];
 		for (var i = 0; i < votingWords.length; i++) {
 			tempVoting[i] = votingWords[i];
 		}
 		tempVoting.sort(function(a, b){return b.points - a.points});
 		socket.emit("displayVotingWords", tempVoting);
	});

	socket.on("voteWord", function(votingWord, incOrDec) {
		var voteIndex;
		for (var i = 0; i < votingWords.length; i++) {
			if (votingWords[i].word == votingWord) {
				if(incOrDec) {
					votingWords[i].points++;
					if(votingWords[i].points >= 50) {
 						words.push(votingWords[i].word);
 						votingWords.splice(i, 1);
 					}
				}
				else if(!incOrDec) {
					votingWords[i].points--;
					if(votingWords[i].points <= -50) {
 						votingWords.splice(i, 1);
 					}
				}
			}
		}
		var tempVoting = [];
 		for (var i = 0; i < votingWords.length; i++) {
 			tempVoting[i] = votingWords[i];
 		}
 		tempVoting.sort(function(a, b){return b.points - a.points});
 		socket.emit("displayVotingWords", tempVoting);
	});

	socket.on("submitWord", function(newWord){
	 	var isNumeric = (!isNaN(parseFloat(newWord)) && isFinite(newWord));
	 	console.log(isNumeric);
	 	var hasSpaces = (newWord.indexOf(' ') >= 0);
	 	console.log(hasSpaces);
	 	var inVotingorGame = false;
	 	for (var i = 0; i < votingWords.length; i++) {
	 		if (votingWords[i].word == newWord){
	 			inVotingorGame = true;
	 		}
	 	}
	 	console.log(inVotingorGame);
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
	 		votingWords.push({ word: newWord, points: 1 });
	 		var tempVoting = [];
	 		for (var i = 0; i < votingWords.length; i++) {
	 			tempVoting[i] = votingWords[i];
	 		}
	 		tempVoting.sort(function(a, b){return b.points - a.points});
	 		socket.emit("displayVotingWords", tempVoting);
	 		socket.emit("submissionFeedback", "Word added! Submit another?");
	 	}
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
