let ws;
let pc;
let localStream;

const video = document.getElementById("video");
const roomId = "room1";

async function join() {
  // Camera & mic
  localStream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
  });

  video.srcObject = localStream;
  video.muted = true;

  // WebSocket
  ws = new WebSocket(
    location.protocol === "https:"
      ? `wss://${location.host}`
      : `ws://${location.host}`
  );

  ws.onopen = () => {
    ws.send(JSON.stringify({ type: "join", roomId }));
  };

  // WebRTC
  pc = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
  });

  localStream.getTracks().forEach(track =>
    pc.addTrack(track, localStream)
  );

  pc.ontrack = e => {
    video.srcObject = e.streams[0];
    video.muted = false;
  };

  pc.onicecandidate = e => {
    if (e.candidate) {
      ws.send(JSON.stringify({
        type: "signal",
        data: { candidate: e.candidate }
      }));
    }
  };

  ws.onmessage = async event => {
    const msg = JSON.parse(event.data);

    if (msg.type === "user-joined") {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      ws.send(JSON.stringify({
        type: "signal",
        data: { offer }
      }));
    }

    if (msg.type === "signal") {
      if (msg.data.offer) {
        await pc.setRemoteDescription(msg.data.offer);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        ws.send(JSON.stringify({
          type: "signal",
          data: { answer }
        }));
      }

      if (msg.data.answer) {
        await pc.setRemoteDescription(msg.data.answer);
      }

      if (msg.data.candidate) {
        await pc.addIceCandidate(msg.data.candidate);
      }
    }
  };
}
