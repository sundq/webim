$(document).ready(function() {
  var chatInputSubmit = $('#chat_input_submit');
  var chatInputBox = $('#chat_input_box');
  var myid = $('#current_user_id').val();
  var myname = $('#current_user_name').val();
  // current friend id, changed each time user select.
  var currentfid;
  var friends = {};

  $.ajaxSetup({ cache: false });

  function log(msg) {
    $('<p>' + msg + '</p>').prependTo($('#log'));
  }

  function userName(userID){
    if (userID == myid) return myname;
    var friend = friends[userID];
    return friend ? friend.name : userID;
  }

  $.get('/friendlist', {}, function(flist) {
    friends = flist;
    for (var fid in friends) {
      currentfid = fid;
      break;
    }
  }, 'json');
  

  var commanderUrl = '/background-worker';
  var cmds = {};

  cmds.stop = function() {
    return false;
  }

  cmds.relogin = function() {
    alert("you are logged in at some other place. quit here.");
    window.location.assign('/login');
    return false;
  }

  cmds.goon = function() {
    return true;
  }

  cmds.msgs = function(cmd) {
    for (var i in cmd.msgs)
      cmds.msg({cmd:'msg', msg:cmd.msgs[i]});
    return true;
  }

  cmds.msg = function(cmd) {
    function gettime() {
      var d = new Date(cmd.msg.time);
      return d.getHours() + ':' + d.getMinutes() + ':' + d.getSeconds();
    }
    function getdate() {
      var d = new Date(cmd.msg.time);
      return d.getFullYear() + '-' + (d.getMonth()+1) + '-' + d.getDate();
    }
    var msgid = cmd.msg.id;
    var from = cmd.msg.from;
    var to = cmd.msg.to;
    var content = cmd.msg.content;
    var dest = function() {
      if (from == myid)
        return to;
      if (to == myid)
        return from;
      return to;
    }();
    //var container = $("#backlog_" + dest);
    var container = $("#chat_backlog");
    $('<p><span class="user">' + userName(from) + '</span> at <span class="time">'
      + gettime() + '</span> <span class="date">' + getdate() + '</span></p>'
      + '<p><span class="msg">' + content + '</span></p>').appendTo(container);

    return true;
  }

  function daemon() {
    var retry = 0;
    function sendDaemon() {
      var xhr = $.ajax({
        url: commanderUrl,
        data: {name:myid, ready:true},
        cache: false,
        type: 'POST',
        dataType: 'json',
        timeout: 300*1000
      });
      xhr.done(done);
      xhr.fail(fail);
    }

    function done(cmd) {
      if (!cmd || !cmd.cmd)
        return;
      if (cmds[cmd.cmd] instanceof Function) {
        if (cmds[cmd.cmd](cmd)){
          sendDaemon();
        }        
      }
    }

    function fail(xhr, err, exception) {
      if (++retry < 3)
        sendDaemon();
    }

    sendDaemon();
  }

  daemon();

  function _sendMsg() {
    var content = $.trim(chatInputBox.val());
    if (content.length > 0 && currentfid) {
      var msg = {};
      msg.from = myid;
      msg.to = currentfid;
      msg.time = (new Date()).toString();
      msg.content = content;
      var xhr = $.ajax({
        url: '/msg',
        type: 'POST',
        data: msg,
        dataType: 'json',
        cache: false
      });
      xhr.done(function(result) {
        if (!result || result.result != 0) {
          if (result && result.msg) {
            alert("Error: " + result.msg);
          }
          window.location.assign('/login');
          return;
        }
      });
      xhr.fail(function(xhr, err) {
        alert("Send message failed. Please relogin");
        window.location.assign('/login');
      });
    }
    chatInputBox.val('');
  }

  chatInputBox.keydown(function(e) {
    switch (e.which) {
      case 13: //enter
        _sendMsg();
        break;
      case 27: //escape
        chatInputBox.val('');
        break;
    }
  });
  chatInputSubmit.click(_sendMsg);

  $(document).focus(function(){charInputBox.focus();});
});
