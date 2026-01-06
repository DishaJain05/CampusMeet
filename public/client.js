let ws;
let pc;
let localStream;

const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
const callBtn = document.getElementById("callBtn");

// 1️⃣ Get camera + microphone
async function initMedia() {
  localStream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
  });

  // Show own video
  localVideo.srcObject = localStream;
  localVideo.muted = true;
}

// 2️⃣ Connect WebSocket signaling server
function initWebSocket() {
  ws = new WebSocket(
    location.protocol === "https:"
      ? `wss://${location.host}`
      : `ws://${location.host}`
  );

  ws.onmessage = async (event) => {
    const data = JSON.parse(event.data);

    // Incoming OFFER → create ANSWER
    if (data.type === "offer") {
      await pc.setRemoteDescription(data.offer);

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      ws.send(JSON.stringify({
        type: "answer",
        answer
      }));
    }

    // Incoming ANSWER
    if (data.type === "answer") {
      await pc.setRemoteDescription(data.answer);
    }

    // Incoming ICE candidate
    if (data.type === "candidate") {
      await pc.addIceCandidate(data.candidate);
    }
  };
}

// 3️⃣ Create WebRTC PeerConnection
function initPeerConnection() {
  pc = new RTCPeerConnection({
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" }
    ]
  });

  // Send local tracks
  localStream.getTracks().forEach(track => {
    pc.addTrack(track, localStream);
  });

  // Receive remote tracks
  pc.ontrack = (event) => {
    remoteVideo.srcObject = event.streams[0];
    remoteVideo.play();
  };

  // Send ICE candidates
  pc.onicecandidate = (event) => {
    if (event.candidate) {
      ws.send(JSON.stringify({
        type: "candidate",
        candidate: event.candidate
      }));
    }
  };
}

// 4️⃣ Start call (caller only)
callBtn.onclick = async () => {
  await initMedia();
  initWebSocket();
  initPeerConnection();

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  ws.onopen = () => {
    ws.send(JSON.stringify({
      type: "offer",
      offer
    }));
  };
};
