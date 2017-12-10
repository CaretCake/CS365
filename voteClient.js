var socket = io();

socket.on("displayVotingWords", function(dataFromServer) {
  // Fills votingWordsTable for client
  $("#votingWordsTable").empty();
  var votingTable = "";
  votingTable += "<tr id='submitRow'><td><img src='img/add.png' id='add' class='no-selection'></td><td> </td>";
  votingTable += "<td id='submissiontd'><input id='wordBox' type='text' placeholder='Type your word submission here...'><button type='button' id='addButton'>Add It!</button></td></tr>";
  for (let i = 0; i < dataFromServer.length; i++) {
    votingTable += "<tr>";
    votingTable += ("<td><img src='img/upvote.png' alt='upvote' class='voteClick' id='upvote" + i + "' draggable='false'><img src='img/downvote.png' alt='downvote'  class='voteClick' id='downvote" + i + "' draggable='false'></td>");
    votingTable += ("<td>" + dataFromServer[i].points + "</td>");
    votingTable += ("<td>" + dataFromServer[i].word + "</td>");
    votingTable += "</tr>";
    $("#votingWordsTable").append(votingTable);
    votingTable = "";

    var currentWord = dataFromServer[i].word;

    //click handlers for upvote/downvote
    createButtons(currentWord, i);
  }
  createSubmissionHandlers();
});

function createSubmissionHandlers() {
  //Adds handlers for submitting a new word
  console.log("sub handlers created");
  $("#addButton").click(submitWord);
  $("#wordBox").keypress(function(event){
    if (event.which == 13) {
			submitWord();
			event.preventDefault();
		}
  });
}

function createButtons(currentWord, index) {
  //Creates button handlers for upvote/downvote
  $("#upvote" + index).click(function() {
    console.log(currentWord);
    socket.emit("voteWord", currentWord, true);
  });
  $("#downvote" + index).click(function() {
    console.log(currentWord);
    socket.emit("voteWord", currentWord, false);
  });
}

function submitWord() {
  //Submits word in #wordBox input
  socket.emit("submitWord", $("#wordBox").val());
  $("#wordBox").val("");
};

socket.on("submissionFeedback", function(message){
  //Displays feedback from server to user on whether or not submitted word was accepted
  $("#wordBox").attr("placeholder", message);
});

function startup() {
  console.log("startup!");
  socket.emit("getVotingWords");
}


$(startup);
