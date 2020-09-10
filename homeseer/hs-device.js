module.exports = function (RED) {

	function HsDeviceNode(config) {
		var node = this;
		console.log("HsDeviceNode");
		console.log(config);
		RED.nodes.createNode(node, config);
		// Retrieve the server node
		node.server = RED.nodes.getNode(config.server);
		node.ref = (config.feature > 0 ? config.feature : config.device);
		node.reportonstartup = config.reportonstartup;
		node.lastState = null;

		node.server.getDeviceStatus(node.ref).then(data => {
			node.lastState = data;
			node.updateStatus(data.status);
			if (node.reportonstartup) {
				let msg = {
					topic: "",
					payload: node.lastState
				};
				node.send(msg);
			}
		}).catch(err => {
			console.log(err);
			node.updateStatus("error while getting status", true);
		});

		node.on('input', function (msg, send, done) {
			//console.log(node);
			//console.log(msg);

			if (typeof msg.topic == 'string')
				msg.topic = msg.topic.toLowerCase();
			if ((!msg.topic || msg.topic == 'control') && typeof msg.payload != 'undefined') {
				if (typeof msg.payload.value != 'undefined') {
					node.server.controlDeviceByValue(node.ref, msg.payload.value).then(data => {
						msg.payload = data;
						send(msg);
						done();
					}).catch(err => {
						done(err);
					});
				} else if (typeof msg.payload.status != 'undefined') {
					node.server.controlDeviceByLabel(node.ref, msg.payload.status).then(data => {
						msg.payload = data;
						send(msg);
						done();
					}).catch(err => {
						done(err);
					});
				}
			} else if (msg.topic == 'update' && typeof msg.payload != 'undefined') {
				if (typeof msg.payload.value != 'undefined') {
					node.server.setDeviceValue(node.ref, msg.payload.value).then(data => {
						msg.payload = data;
						send(msg);
						done();
					}).catch(err => {
						done(err);
					});
				}
				if (typeof msg.payload.status != 'undefined') {
					node.server.setDeviceString(node.ref, msg.payload.status).then(data => {
						msg.payload = data;
						send(msg);
						done();
					}).catch(err => {
						done(err);
					});
				}
			} else if (msg.topic == 'report') {
				if (node.lastState) {
					msg.payload = node.lastState;
					send(msg);
				}
				done();
			} else if (msg.topic == 'sync') {
				node.server.getDeviceStatus(node.ref).then(data => {
					node.lastState = data;
					node.updateStatus(data.status);
					msg.payload = node.lastState;
					send(msg);
					done();
				}).catch(err => {
					console.log(err);
					node.updateStatus("error while getting status", true);
					done(err);
				});
			}
		});

		node.updateStatus = function (statusText, isError = false) {
			if (isError) {
				node.status({
					fill: "red",
					shape: "ring",
					text: statusText
				});
			} else {
				node.status({
					fill: "yellow",
					shape: "dot",
					text: statusText
				});
			}
		}

		node.updateListener = function (update) {
			console.log("device update:");
			console.log(update);
			node.lastState = update;
			node.updateStatus(update.status);
			let msg = {
				topic: "",
				payload: update
			};
			node.send(msg);
		}

		node.server.eventEmitter.addListener(node.ref.toString(), node.updateListener);

		node.on('close', function () {
			console.log("device close");
			node.server.eventEmitter.removeListener(node.ref.toString(), node.updateListener);
		});

	}
	RED.nodes.registerType("hs-device", HsDeviceNode);

}
