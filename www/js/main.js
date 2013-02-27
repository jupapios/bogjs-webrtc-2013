 /*
	* @author      Juan Pinilla
	* @description WebRTC peerConnection demonstration
	*/

/*global window, document, log, navigator, URL, RTCPeerConnection, RTCSessionDescription, RTCIceCandidate, io, DEBUG*/

(function(root, domTarget) {

	'use strict';

	// Global namespace
	var app = {};

	// WebRTC namespace
	var rtc = {};

	// peerConnection namespace
	var peer = {};

	// DOM elements
	var dom = {
		localVideo: domTarget.querySelector('#local-video'),
		remoteVideo: domTarget.querySelector('#remote-video'),
		localText: domTarget.querySelector('#local-text'),
		remoteText: domTarget.querySelector('#remote-text'),		
		reqNew: domTarget.querySelector('#req-new'),
		reqJoin: domTarget.querySelector('#req-join'),
		channel: domTarget.querySelector('input'),
		send: domTarget.querySelector('#send') // send button
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
		config.audio = config.audio || true;
		config.video = config.video || true;

		navigator.getUserMedia(config, onGetUserMediaSuccess, onGetUserMediaFailed);

	};

	function onGetUserMediaSuccess(stream) {
		log('DEBUG: [RTC] getUserMedia success', stream);

		dom.localVideo.src = URL.createObjectURL(stream);

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
		pc.onicecandidate = onIceCandidate;
		pc.onopen = onOpen; // not used

		pc.ondatachannel = onDataChannel; // magic :_)
	}

	// Peer Listener
	function onAddStream(event) {
		log('DEBUG: [RTC] added remote stream', event);

		dom.remoteVideo.src = URL.createObjectURL(event.stream);

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
		//socket.emit('reqDC');
		//peer.createDataChannel();
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
			console.log('RTCDataChannel closed.');
		};
		
		dc.onerror = function (event) {
			console.error(event);
		};

		if(DEBUG) {
			peer.dc = dc;
		}
	}
	/*
	peer.createDataChannel = function() {
		dc = pc.createDataChannel('RTCDataChannel', {reliable: false});
		//dc = pc.createDataChannel('RTCDataChannel', {});
		log('DEBUG: [PEER] Called createDataChannel', dc);

		initDCEvents();

	};*/

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

		// create datachannel
		//socket.on('resDC', peer.createDataChannel);
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

})(window, document.body);


app.init();