var socket = io();

socket.on("displayVotingWords", function(dataFromServer) {
  $("#votingWordsTable").empty();
  var votingTable = "";
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
});

function createButtons(currentWord, index) {
  $("#upvote" + index).click(function() {
    socket.emit("voteWord", currentWord, true);
  });
  $("#downvote" + index).click(function() {
    socket.emit("voteWord", currentWord, false);
  });
}

function startup() {
  console.log("startup!");
  socket.emit("getVotingWords");
}


$(startup);
