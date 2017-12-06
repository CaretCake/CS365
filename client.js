var socket = io();
var top;
var left;
var offset;
var currColor;
var mouseIsDown;
var startX;
var startY;
var idleTime;
var idleStatus;

//TEMPORARY VARIABLES FOR TESTING
/*
var playerListScore = [];
playerListScore[0] = {player: 'Jack', score: 303330}
playerListScore[1] = {player: 'Pumpkin', score: 202}
playerListScore[2] = {player: 'Enthuse', score: 10};
*/

var brushTool;
var rectTool;
var circleTool;
var eraserTool;

var cursorSmallBrush = "url(img/cursor-small-draw.png) 10 10, auto";
var cursorMedBrush = "url(img/cursor-med-draw.png) 10 10, auto";
var cursorLargeBrush = "url(img/cursor-large-draw.png) 15 15, auto";
var cursorCircle = "url(img/cursor-circle.png) 0 10, auto";
var cursorRect = "url(img/cursor-rect.png) 0 10, auto";
var cursorEraser = "url(img/cursor-eraser.png) 0 34, auto";


var canvas, ctx, flag = false,
    prevX = 0,
    currX = 0,
    prevY = 0,
    currY = 0;

var color = "black",
    lineWidth = 8;

function loadLogin(){
	var wid = $(window).width();
	var hei = $(window).height();

	$("#loginOverlay").css("height", hei + 'px');
	$("#box").css("left", (wid/2)-(600 * .5)+"px");
}

socket.on("loginBad", function(errorMessage){
	$("#loginError").empty();
	$("#loginError").append(errorMessage);
	$("#userName").val("");
	$("#userName").focus();
});

socket.on("loginOk", function(){
	$("#loginOverlay").css("display", "none");
	$("#box").css("display", "none");
});

socket.on("playerKicked", function(errorMessage){
  $("#loginOverlay").css("display", "block");
	$("#box").css("display", "block");
  $("#loginError").empty();
  $("#loginError").append(errorMessage);
  $("#userName").val("");
  $("#userName").focus();
});

function sanitizeForHTML(stringToConvert) {
	stringToConvert = stringToConvert.replace(/&/g, "&amp;");
	stringToConvert = stringToConvert.replace(/</g, "&lt;");
	stringToConvert = stringToConvert.replace(/>/g, "&gt;");
	stringToConvert = stringToConvert.replace(/\//g, "&#47;");
	stringToConvert = stringToConvert.replace(/"/g, "&quot;");
	stringToConvert = stringToConvert.replace(/'/g, "&#39;");

	return stringToConvert;
}


socket.on("updateUsers", function(players){
	$("#userList").empty();
	var th = $("<th colspan='3'>Players</th>");
	$("#userList").append(th);
	for(var i = 0; i < players.length; i++){
		var tr = $("<tr></tr>");
		var playerNum = i+1;
		tr.append("<td class='playerRank' rowspan='2'>#" + players[i].rank + " </td>");
		tr.append("<td class='playerNames'>" + sanitizeForHTML(players[i].name) + "</td>");
		if(players[i].drawer) {
      tr.append("<td class='drawer' rowspan='2'><img src='img/icon-draw.png' class='pencil'></td>");
    }
    else if(players[i].guessed && players[i].drawer == false) {
    	tr.append("<td class='guessed' rowspan='2'><img src='img/check-mark.png' class='pencil'></td>");
    }
    else {
      tr.append("<td rowspan='2' class='thirdCol'></td>");
    }
		$("#userList").append(tr);
		$("#userList").append("<tr><td class='playerScore'>" + players[i].score + "</td></tr>");
	}
});

socket.on("sayAll", function(dataFromServer) {
	$("#chatField").append(sanitizeForHTML(dataFromServer) + "\n");
});

function sendChatToServer() {
	socket.emit("chat", $("#chatText").val() );
	$("#chatText").val("");
	$("#chatText").focus();
}

/*function adjustCanvasHeight () {
	var canvasWidth = $(".canvas").width();
	$(".canvas").css("height", canvasWidth);
	console.log(canvasWidth);
	console.log("height change!");
	console.log(canvas.css(width));
}*/


function findxy(res, e) {
  if (brushTool || eraserTool) {
    var type;
    var click = false;
    if (brushTool) {
      type = "brush";
    }
    else if (eraserTool) {
      type = "eraser";
    }
    if (res == 'down') {
			changeBrushSize(lineWidth);
			prevX = currX;
			prevY = currY;
			currX = e.pageX - offset.left;
			currY = e.pageY - offset.top;
      click = false;
			flag = true;
		}
		if (res == 'up' || res == "out") {
      var upX = e.pageX - offset.left;
      var upY = e.pageY - offset.top;
      if (res == 'up' && currX == upX && currY == upY) {
        click = true;
        console.log("click registered!");
        socket.emit("brushDraw", type, lineWidth, color, click, upX, upY, currX, currY, flag);
      }
      else {
        click = false;
      }
			flag = false;
		}
		if (res == 'move') {
      changeBrushSize(lineWidth);
      console.log(flag);
			if (flag) {
				prevX = currX;
				prevY = currY;
				currX = e.pageX - offset.left;
				currY = e.pageY - offset.top;
        socket.emit("brushDraw", type, lineWidth, color, click, prevX, prevY, currX, currY, flag);
			}
    }
	}

	if (rectTool) {
		if(mouseIsDown && res == 'up'){
		    mouseIsDown = false;
		    var mouseX = e.pageX - offset.left;
		    var mouseY = e.pageY - offset.top;
        socket.emit("rectDraw", color, startX, startY, mouseX, mouseY);
		}
		else if (res == 'down') {
		    mouseIsDown = true;
		    startX = e.pageX - offset.left;
		    startY = e.pageY - offset.top;
		}
	}

	if (circleTool) {
			if(mouseIsDown && res == 'up'){
		    mouseIsDown = false;
		    var mouseX = e.pageX - offset.left;
		    var mouseY = e.pageY - offset.top;
		    socket.emit("circleDraw", color, startX, startY, mouseX, mouseY);
			}
			else if (res == 'down') {
			    mouseIsDown = true;
			    startX = e.pageX - offset.left;
			    startY = e.pageY - offset.top;
			}
	}
}

socket.on("drawBrush", function(type, width, col, click, pX, pY, cX, cY, f) {
  if (click) {
    ctx.fillStyle = col;
    if (eraserTool) {
      ctx.fillStyle = "#ffffff";
    }
    ctx.beginPath();
    ctx.arc(pX, pY, width/2, 0, 2*Math.PI, false);
    ctx.fill();
    ctx.closePath();
  }
  else if (f) {
    ctx.beginPath();
    ctx.moveTo(pX, pY);
  	ctx.lineTo(cX, cY);
  	ctx.lineJoin = ctx.lineCap = 'round';
    ctx.strokeStyle = col;
    if (type == "eraser") {
      ctx.strokeStyle = "#ffffff";
    }
    ctx.lineWidth = width;
    ctx.stroke();
    ctx.closePath();
  }
});

socket.on("drawRect", function(col, sX, sY, mX, mY) {
  console.log("drawRect!");
  console.log("color: " + col + " sX: " + sX + " mX: " + mX);
  ctx.beginPath();
  ctx.fillStyle = col;
  ctx.rect(sX,sY,mX-sX,mY-sY);
  ctx.fill();
  ctx.closePath();
});

socket.on("drawCircle", function(col, sX, sY, mX, mY) {
  console.log("drawCircle!");
  ctx.fillStyle = col;
  ctx.beginPath();
  var midX = (sX+mX)/2;
  var midY = (sY+mY)/2;
  var radius = (sX-mX)/2;
  if (radius < 0) {
    radius *= -1;
  }
  ctx.arc(midX, midY, radius, 0, 2*Math.PI, false);
  ctx.fill();
  ctx.closePath();
});

socket.on("clearCanvas", function() {
  ctx.clearRect(0, 0, 600, 500);
});

function changeColor(newColor, colorName) {
	currColor.src = "img/" + colorName + ".png";
	color = newColor;
}

function changeBrushSize(newSize) {
	lineWidth = newSize;
	if (brushTool || eraserTool) {
		if (lineWidth == 30) {
      if (brushTool)
  		  canvas.style.cursor = cursorLargeBrush;
      $("#small-brush").attr('src', 'img/icon-smallbrush.png');
      $("#med-brush").attr('src', 'img/icon-medbrush.png');
      $("#large-brush").attr('src', 'img/icon-largebrush (1).png');
		}
		else if (lineWidth == 15) {
      if (brushTool)
			   canvas.style.cursor = cursorMedBrush;
      $("#small-brush").attr('src', 'img/icon-smallbrush.png');
      $("#med-brush").attr('src', 'img/icon-medbrush (1).png');
      $("#large-brush").attr('src', 'img/icon-largebrush.png');
		}
		else if (lineWidth == 8) {
      if (brushTool)
			   canvas.style.cursor = cursorSmallBrush;
      $("#small-brush").attr('src', 'img/icon-smallbrush (1).png');
      $("#med-brush").attr('src', 'img/icon-medbrush.png');
      $("#large-brush").attr('src', 'img/icon-largebrush.png');
		}
	}
}

function setToolsFalse() {
	brushTool = false;
	rectTool = false;
	circleTool = false;
	eraserTool = false;
}

socket.on("pickingWord", function(drawerName) {
  displayOverlayToggle();
  $('#sessionUpdateText').empty();
  $('#sessionUpdateText').append("<h2>" + drawerName + " is picking a word!</h2>");
});

socket.on("needMorePlayers", function(){
  displayOverlayToggle();
  $('#sessionUpdateText').empty();
  $('#sessionUpdateText').append("<h2>Waiting for another player! <br> Hold tight!</h2>");
});

socket.on("displayWords", function(threeWords) {
  //if(!gameStart)
    displayOverlayToggle();
  console.log("Hello");
  idleStatus = true;
  $('#sessionUpdateText').empty();
  var wordButtons = "<h2>Pick a Word!</h2><div id='wordButtonsDiv'>";
  wordButtons += "<button class='wordButton button-background' id='wordOne'>" + threeWords[0] + "</button>";
  wordButtons += "<button class='wordButton button-background' id='wordTwo'>" + threeWords[1] + "</button>";
  wordButtons += "<button class='wordButton button-background' id='wordThree'>" + threeWords[2] + "</button></div>";
  $('#sessionUpdateText').append(wordButtons);
  $("#wordOne").click(function() {
  	socket.emit("getChosenWord", threeWords[0]);
    idleStatus = false;
  });
  $("#wordTwo").click(function() {
    socket.emit("getChosenWord", threeWords[1]);
    idleStatus = false;
  });
  $("#wordThree").click(function() {
    socket.emit("getChosenWord", threeWords[2]);
    idleStatus = false;
  });
  setTimeout(isIdle, 15000);
});

socket.on("displayWordToAll", function(setWord){
  displayOverlayToggle();
  $("#currentWord").empty();
  var table = $("<table></table>");
  var tr = $("<tr></tr>");
  for(var i = 0; i < setWord.length; i++){
     tr.append("<td class='letterMarkers'></td>");
   }
   table.append(tr);
   $("#currentWord").append(table);
 });

 socket.on("displayWordToDrawer", function(setWord){
   displayOverlayToggle();
   console.log("Display to drawer");
   $("#currentWord").empty();
   var table = $("<table></table>");
   var tr = $("<tr></tr>");
  for(var i = 0; i < setWord.length; i++){
    tr.append("<td class='letterMarkers'>" + setWord.charAt(i) + "</td>");
  }
  table.append(tr);
  $("#currentWord").append(table);
});

socket.on("toggleVoteKick", function(){
  $('#voteKick').prop("disabled", false);
});

socket.on("displayScoreList", function(array, winner, gameOver) {
  console.log("display clientside");
  displayOverlayToggle();
  $('#sessionUpdateText').empty();
  if(gameOver){
    $('#sessionUpdateText').append('<h1>Final Scores</h1>');
    $('#sessionUpdateText').append('<h2>' + winner.name + ' has won the game!</h2>');
    var playerEntries = "<ol>";
    for (var i = 0; i < array.length; i++) {
      playerEntries += "<li><span id='rankSpan'>" + array[i].rank + ". </span><span id='nameSpan'>";
      playerEntries += array[i].name + "</span><span id='scoreSpan'>" + array[i].score;
      playerEntries += "</span></li>";
    }
    playerEntries += "</ol>"
  }
  else {
    $('#sessionUpdateText').append('<h2>Scores</h2>');
    var playerEntries = "<ol>";
    for (var i = 0; i < array.length; i++) {
      playerEntries += "<li><span id='rankSpan'>" + (i+1) + ". </span><span id='nameSpan'>";
      playerEntries += array[i].name + "</span><span id='scoreSpan'>" + array[i].score;
      playerEntries += "</span></li>";
    }
    playerEntries += "</ol>"
  }
  $('#sessionUpdateText').append(playerEntries);
});

socket.on("toggleOverlayForUser", function(){
  displayOverlayToggle();
});

function displayOverlayToggle() {
  $("#sessionUpdateDisplay").toggle();
  if ($("#sessionUpdateDisplay").css("display") === "flex") {
    $("#sessionUpdateDisplay").css("display", "none");
  }
  else if ($("#sessionUpdateDisplay").css("display") === "none") {
    $("#sessionUpdateDisplay").css("display", "flex");
  }
  if ($("#canvas").css("position") === "absolute") {
    $("#canvas").css("position", "relative");
  }
  else if ($("#canvas").css("position") === "relative") {
    $("#canvas").css("position", "absolute");
  }
}

socket.on("startSessionTimer", function(sessionTime) {
  $('#timerText').empty();
  $('#timerText').append(sessionTime);
});

function idleTimerIncrement() {
  idleTime = idleTime + 5; //adds 5 seconds to idle time
  if (idleTime > 24) { // 25 seconds
      $("#idleCheck").css("display", "flex");
      idleStatus = true;
      setTimeout(isIdle, 10000);
  }
}

function isIdle() {
  if (idleStatus) {
    //socket.emit("timedOut");
  }
}

//socket.on("reset", function());

socket.on("updateRound", function(roundNumber){
  $("#gameRound").empty();
  $("#gameRound").append("Round " + roundNumber + " of 10");
});

function startUp(){
	//adjustCanvasHeight();
	currColor = document.getElementById('current-color');
	canvas = document.getElementById('canvas');
	ctx = canvas.getContext("2d");
	canvas.width = 600;
	canvas.height = 500;
	w = 600;
	h = 500;
	offset = $(canvas).offset();
  changeBrushSize(lineWidth);


	mouseIsDown = false;

	brushTool = true;
	rectTool = false;
	circleTool = false;
	eraserTool = false;

	canvas.addEventListener("mousemove", function (e) {
		findxy('move', e)
	}, false);
	canvas.addEventListener("mousedown", function (e) {
		findxy('down', e)
	}, false);
	canvas.addEventListener("mouseup", function (e) {
		findxy('up', e)
	}, false);
	canvas.addEventListener("mouseout", function (e) {
		findxy('out', e)
    }, false);
    canvas.addEventListener("click", function (e) {
			findxy('click', e)
	}, false);

  // tool clicks
  $("#brush-tool").click(function() {
		setToolsFalse();
		brushTool = true;
		changeBrushSize(lineWidth);
	});
	$("#rect-tool").click(function() {
		setToolsFalse();
		rectTool = true;
		canvas.style.cursor = cursorRect;
	});
	$("#circle-tool").click(function() {
		setToolsFalse();
		circleTool = true;
		canvas.style.cursor = cursorCircle;
	});
	$("#eraser-tool").click(function() {
		setToolsFalse();
		eraserTool = true;
		canvas.style.cursor = cursorEraser;
	});

	// clearing canvas
	$("#clear-canvas").click(function() {
		socket.emit("clearDraw");
	});

	// color changing clicks
	$("#black").click(function() {
		changeColor("#000000", "black");
	});
	$("#dark-brown").click(function() {
		changeColor("#534741", "dark-brown");
	});
	$("#light-brown").click(function() {
		changeColor("#a67c52", "light-brown");
	});
	$("#red").click(function() {
		changeColor("#ee1c24", "red");
	});
	$("#pink").click(function() {
		changeColor("#f26d7d", "pink");
	});
	$("#dark-green").click(function() {
		changeColor("#005826", "dark-green");
	});
	$("#dark-blue").click(function() {
		changeColor("#0054a6", "dark-blue");
	});
	$("#purple").click(function() {
		changeColor("#605ca9", "purple");
	});
	$("#white").click(function() {
		changeColor("#ffffff", "white");
	});
	$("#grey").click(function() {
		changeColor("#959595", "grey");
	});
	$("#beige").click(function() {
		changeColor("#fbcf9e", "beige");
	});
	$("#orange").click(function() {
		changeColor("#f26522", "orange");
	});
	$("#yellow").click(function() {
		changeColor("#fff200", "yellow");
	});
	$("#light-green").click(function() {
		changeColor("#00a651", "light-green");
	});
	$("#light-blue").click(function() {
		changeColor("#00aef0", "light-blue");
	});
	$("#lilac").click(function() {
		changeColor("#bd8cbf", "lilac");
	});

	// brush size changing clicks
	$("#small-brush").click(function() {
		changeBrushSize(8);

	});
	$("#med-brush").click(function() {
		changeBrushSize(15);
	});
	$("#large-brush").click(function() {
		changeBrushSize(30);
	});

  $("#idleConfirm").click(function() {
    idleTime = 0;
    $("#idleCheck").css("display", "none");
    idleStatus = false;
  });

  $("#voteKick").click(function(){
    $('#voteKick').prop("disabled", true);
     socket.emit("votekick");
  });

	$("#userName").focus();
	$("#login").click(function(){
		socket.emit("login", $("#userName").val());
	});
	$("#userName").keypress(function(event) {
		if (event.which == 13) {
			socket.emit("login", $("#userName").val());
			event.preventDefault();
		}
	});

	$("#chatButton").click(sendChatToServer);
	$("#chatText").keypress(function(event) {
		if (event.which == 13) {
			sendChatToServer();
			event.preventDefault();
		}
	});

  //Increment the idle time counter every 5 seconds.
  var idleInterval = setInterval(idleTimerIncrement, 5000); // 5 seconds

  //Zero the idle timer on mouse movement.
  $(this).mousemove(function (e) {
      idleTime = 0;
  });
  $(this).keypress(function (e) {
      idleTime = 0;
  });
  //displayOverlayToggle();
	loadLogin();
  //socket.emit("getThreeWords");

  //displayWords("treasure", "pie", "award");
  //displayScoreList(playerListScore);
  //setInterval(startSessionTimer, 1000);
}



$(startUp);
