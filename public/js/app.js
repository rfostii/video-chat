(function () {
    var selectors = {
        participatesAmount: '.participates-amount .badge',
        participates: '.participates',
        removeStreamContainer: '.video-frame',
        localStream: '.local-video-stream',
        startVideo: '.start-video',
        messagesContainer: '.messages',
        message: '#message-text'
    };
    var peerConnections = {};
    var globalCommunicator = Communicator.getCommunicator('');
    var localPeer = null;
    var User = null;
    var ENTER_KEY_CODE = 13;

    function getLocalVideoStream() {
        var ice = {
            iceServers: [
                {url: "stun:global.stun.twilio.com:3478?transport=tcp" },
                {url: 'turn:turn.anyfirewall.com:443?transport=tcp'}
            ]
        };
        localPeer = new RTCPeerConnection(ice);

        getUserMedia({video: true, audio: true}, function (stream) {
            localPeer.addStream(stream);
            var video = $(selectors.localStream);
            video.attr('src', window.URL.createObjectURL(stream));
            video.get(0).play();
            globalCommunicator.emit('participants');
        }, function (error) {
            console.log(error);
        });
    }

    function createConnection(communicator, id) {
        var peer = new PeerConnection(communicator).init( localPeer.getLocalStreams()[0] );

        peer.on('got remote stream', function (event) {
            var video = $('<video></video>');
            var currentPeer = peer;

            video.attr('id', id);
            video.attr("src", window.URL.createObjectURL(event.stream));
            $(selectors.removeStreamContainer).append(video);
            video.get(0).play();
        });

        window.addEventListener('unload', peer.stop);

        return peer;
    }

    function onConnect() {
        var username = new Date().valueOf().toString();

        globalCommunicator.emit('add user', username);
    }

    function added(id) {
        User = id;
        getLocalVideoStream();
    }

    function addParticipant(id) {
        var communicator = Communicator.getCommunicator(id);

        communicator.on('connect', function () {
            var participantId = id.split('==')[1];
            var peer = createConnection(communicator, participantId);
            peerConnections[participantId] = peer;
        });
        communicator.on('remove stream', removeParticipant);
    }

    function attachParticipantEventHandler() {

    }

    function createPeers(room, user) {
        room.forEach(function (participant) {
            createChannel(participant.id, user);
        });
    }

    function createChannel(participant, user) {
        user = typeof User === 'object' ? User.id : user;
        var channelId = [user, participant].join('==');
        globalCommunicator.emit('create channel', channelId);
    }

    function updateList(room) {
        $(selectors.participates).empty();
        $(selectors.participatesAmount).text(room.length);
        room.forEach(function (user) {
            var participateItem = $('<li></li>');

            participateItem.addClass(user.id).addClass('list-group-item').text(user.name);
            $(selectors.participates).append(participateItem);
        });
    }

    function removeParticipant(id) {
        var peer = peerConnections[id];

        if (peer) {
            peer.stop();
            $('#' + id).remove();
        }
        delete peerConnections[id];
    }

    function showMessage(message, isCreator) {
        var messageEl = $('<li class="message"><div class="date"></div><div class="user"></div><div class="text"></div></li>');
        messageEl.find('.date').text(message.date);
        messageEl.find('.user').text(message.user.name);
        messageEl.find('.text').text(message.text);
        if (isCreator) {
            messageEl.addClass('own-message');
        }
        $(selectors.messagesContainer).append(messageEl);
    }

    function attachEvents() {
        $(selectors.startVideo).on('click', function () {
            for (var peer in peerConnections) {
                if (peerConnections.hasOwnProperty(peer)) {
                    peerConnections[peer].offer();
                }
            }
        });

        $(selectors.message).on('keypress', function(e) {
            var $el = $(e.target);
            var date = new Date();
            var text = $el.val();
            var message = {
                text: text,
                user: User,
                date: [date.toDateString(), date.toTimeString().split(' ')[0]].join(' ')
            };

            if (e.keyCode === ENTER_KEY_CODE) {
                globalCommunicator.send(message);
                showMessage(message, true);
                $el.val('');
            }
        });

        $('.audio-off').on('click', function() {
            var video = document.getElementById('local-stream');
            video.muted = true;
            $(this).hide();
            $('.audio-on').show();
        });

        $('.audio-on').on('click', function() {
            var video = document.getElementById('local-stream');
            video.muted = false;
            $(this).hide();
            $('.audio-off').show();
        });

        $('.show-chat').on('click', function () {
            $('.chat-container').toggle();
        });

        $('.chat-container').draggable();
    }

    globalCommunicator.on('connect', onConnect);
    globalCommunicator.on('added', added);
    globalCommunicator.on('participants', createPeers);
    globalCommunicator.on('update room', updateList);
    globalCommunicator.on('channel created', addParticipant);
    globalCommunicator.on('new user', createChannel);
    globalCommunicator.on('message', showMessage);

    $(document).ready(attachEvents);

})();