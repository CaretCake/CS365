var socket = io();

function sanitizeForHTML(stringToConvert) {
	stringToConvert = stringToConvert.replace(/&/g, "&amp;");
	stringToConvert = stringToConvert.replace(/</g, "&lt;");
	stringToConvert = stringToConvert.replace(/>/g, "&gt;");
	stringToConvert = stringToConvert.replace(/\//g, "&#47;");
	stringToConvert = stringToConvert.replace(/"/g, "&quot;");
	stringToConvert = stringToConvert.replace(/'/g, "&#39;");

	return stringToConvert;
}


socket.on("updateUsers", function(playerList, playerScores){
	$("#users").empty();
	var th = $("<th colspan='3'>Game Players</th>");
	$("#users").append(th);
	for(var i = 0; i < playerList.length; i++){
		var tr = $("<tr></tr>");
		var playerNum = i+1;
		tr.append("<td class='playerRank' rowspan='2'>#" + playerNum + " </td>");
		tr.append("<td class='playerNames'>" + playerList[i] + "</td>");
		tr.append("<td class='drawer' rowspan='2'><img src='imgs/pencil.png' class='pencil'></td>");
		$("#users").append(tr);
		$("#users").append("<tr><td class='playerScores'>Score</td></tr>");
	}
});

socket.on("sayAll", function(dataFromServer) {
	$("#chatField").append(sanitizeForHTML(dataFromServer) + "\n");
});

function sendChatToServer() {
	socket.emit("chat", $("#chatText").val() );
	socket.emit("checkAnswer", $("#chatText").val() );
	$("#chatText").val("");
	$("#chatText").focus();

}

function startUp(){
	$("#chatButton").click(sendChatToServer);
	$("#chatText").keypress(function(event) {
		if (event.which == 13) {
			sendChatToServer();
			event.preventDefault();
		}
	});
}


$(startUp);
