 /*
	* @author      Juan Pinilla
	* @description WebRTC peerConnection demonstration
	*/

/*global window, document, log, navigator, URL, RTCPeerConnection, RTCSessionDescription, RTCIceCandidate, io, DEBUG*/

(function(root) {

	'use strict';

	// Global namespace
	var app = {};

	// WebRTC namespace
	var rtc = {};

	// peerConnection namespace
	var peer = {};

	// DOM elements
	var dom = {
		localVideo: document.getElementById('local-video'),
		remoteVideo: document.getElementById('remote-video'),
		localText: document.getElementById('local-text'),
		remoteText: document.getElementById('remote-text'),		
		reqNew: document.getElementById('req-new'),
		reqJoin: document.getElementById('req-join'),
		channel: document.querySelector('input'),
		send: document.getElementById('send') // send button
	};

	var socket;


	// set namespaces to global object
	app.rtc = rtc;
	app.peer = peer;

	// global app
	root.app = app;





	/*
	 * WebRTC
	 */

	rtc.init = function(config) {

		/*
		 * Set usermedia options
		 * ex: navigator.getUserMedia({audio:true, video:false}, success, failed)
		 * if audio or video are not defined
		 */
		config = config || {};
		config.audio = !(config.audio === false); //true if config.audio is not defined
		config.video = !(config.video === false); //true if config.video is not defined

		navigator.getUserMedia(config, onGetUserMediaSuccess, onGetUserMediaFailed);

	};

	function onGetUserMediaSuccess(stream) {
		log('DEBUG: [RTC] getUserMedia success', stream);

		// set the src of the video creaing an URL from the local stream
		dom.localVideo.src = URL.createObjectURL(stream);

		// when the video is loaded (REALLY loaded) play an add the stream
		// to the peer
		dom.localVideo.addEventListener('loadedmetadata', function() {
			this.play();
			peer.addStream(stream);
		});

	}

	function onGetUserMediaFailed(error) {
		log('ERROR: [RTC] getUserMedia failed', error);
	}






	/*
	 * peerConnection
	 */

	var pc = null;
	var dc = null;

	function initPeerEvents() {
		pc.onaddstream = onAddStream; // when remote adds stream
		pc.onicecandidate = onIceCandidate; // http://tools.ietf.org/html/rfc5245 xD
		pc.onopen = onOpen; // not used

		pc.ondatachannel = onDataChannel; // magic :_)
	}

	// Peer Listener
	function onAddStream(event) {
		log('DEBUG: [RTC] added remote stream', event);

		// set the src of the video creaing an URL from the remote stream
		dom.remoteVideo.src = URL.createObjectURL(event.stream);

		// when the video is loaded (REALLY loaded) play it
		dom.remoteVideo.addEventListener('loadedmetadata', function() {
			this.play();
		});
	}

	function onIceCandidate(event) {
		socket.emit('reqIce', event.candidate);
	}

	function onDataChannel(event) {
		var channel = event.channel;
		log('onDataChannel: ', channel);

		dc = channel;

		initDCEvents();
	}

	function onOpen() {}

	function onCreateOffer(offer) {
		pc.setLocalDescription(offer);

		socket.emit('reqOffer', offer);
	}

	peer.createOffer = function() {
		dc = pc.createDataChannel('RTCDataChannel', {reliable: false});
		
		initDCEvents();

		pc.createOffer(onCreateOffer);
	};

	function onCreateAnswer(answer) {
		pc.setLocalDescription(answer);

		socket.emit('reqAnswer', answer);
	}

	peer.setOffer = function(offer) {
		pc.setRemoteDescription(new RTCSessionDescription(offer));

		pc.createAnswer(onCreateAnswer);

	};

	peer.setAnswer = function(answer) {
		pc.setRemoteDescription(new RTCSessionDescription(answer));

		// all it's done!
	};

	peer.setIce = function(event) {
		log('DEBUG: [PEER] Added remote ice candidate', event);
		if(event && event.candidate) {
			pc.addIceCandidate(new RTCIceCandidate(event));
		}
	};

	peer.addStream = function(stream) {
		log('DEBUG: [PEER] Added local stream');
		pc.addStream(stream);
	};

	function initDCEvents() {
		dc.onmessage = function (event) {
			dom.remoteText.value = dom.remoteText.value + 'other: ' + event.data + '\n';
		};

		dc.onopen = function (event) {
			log('DEBUG: [PEER] DataChannel opened', dc);
		};
		
		dc.onclose = function (event) {
			log('DEBUG: [PEER] DataChannel closed');
		};
		
		dc.onerror = function (event) {
			log('ERROR: [PEER] DataChannel', event);
		};

		if(DEBUG) {
			peer.dc = dc;
		}
	}

	peer.init = function(config) {
		config = config || {"iceServers": []};
		pc = new RTCPeerConnection({ "iceServers": [{ "url": "stun:stun.l.google.com:19302" }] }, { optional: [{ RtpDataChannels: true}] });
		//pc = new RTCPeerConnection(config);

		initPeerEvents();
	};






	/*
	 * app
	 */

	function reqNew() {
		log('DEBUG: [APP] Clicked reqNew');
		socket.emit('reqNew');
	}

	function reqJoin() {
		log('DEBUG: [APP] Clicked reqJoin');
		socket.emit('reqJoin', dom.channel.value);
	}

	function sendPlainData() {
		if(dc) {
			dc.send(dom.localText.value);
			dom.remoteText.value = dom.remoteText.value + 'me: ' + dom.localText.value + '\n';
			dom.localText.value = '';
		}
	}

	function initAppEvents() {
		dom.reqNew.onclick = reqNew;
		dom.reqJoin.onclick = reqJoin;

		dom.send.onclick = sendPlainData;
	}

	function initSocketEvents() {
		// dom reqnew
		socket.on('resNew', function(channel) {
			log('DEBUG: [APP] Socket resNew ', channel);
		});

		// dom reqjoin
		socket.on('resJoin', peer.createOffer);

		// got offer from peer
		socket.on('resOffer', peer.setOffer);
		socket.on('resAnswer', peer.setAnswer);

		// got ice from peer
		socket.on('resIce', peer.setIce);
	}

	app.init = function() {
		socket = io.connect('http://127.0.0.1:3000');

		app.rtc.init();
		app.peer.init();

		initSocketEvents();
		initAppEvents();

		if(DEBUG) {
			peer.pc = pc;
		}

	};

})(window);


app.init();