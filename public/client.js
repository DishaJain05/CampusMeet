let ws;
let pc;
let localStream;

const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
const callBtn = document.getElementById("callBtn");

const roomId = "room1"; // simple static room

// 1️⃣ Access camera + mic
async function initMedia() {
  localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  localVideo.srcObject = localStream;
  localVideo.muted = true;
}

// 2️⃣ Connect WebSocket and join room
function initWebSocket() {
  ws = new WebSocket(
    location.protocol === "https:" ? `wss://${location.host}` : `ws://${location.host}`
  );

  ws.onopen = () => {
    ws.send(JSON.stringify({ type: "join", roomId }));
  };

  ws.onmessage = async (event) => {
    const msg = JSON.parse(event.data);

    // If another user joined → create offer
    if (msg.type === "user-joined") {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      ws.send(JSON.stringify({ type: "signal", data: { offer } }));
    }

    // SIGNAL messages
    if (msg.type === "signal") {
      const data = msg.data;

      if (data.offer) {
        await pc.setRemoteDescription(data.offer);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        ws.send(JSON.stringify({ type: "signal", data: { answer } }));
      }

      if (data.answer) await pc.setRemoteDescription(data.answer);
      if (data.candidate) await pc.addIceCandidate(data.candidate);
    }
  };
}

// 3️⃣ WebRTC PeerConnection
function initPeerConnection() {
  pc = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
  });

  // Add local tracks
  localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

  // Remote tracks
  pc.ontrack = (event) => {
    remoteVideo.srcObject = event.streams[0];
    remoteVideo.play();
  };

  // ICE candidates
  pc.onicecandidate = (event) => {
    if (event.candidate) {
      ws.send(JSON.stringify({ type: "signal", data: { candidate: event.candidate } }));
    }
  };
}

// 4️⃣ Start call button
callBtn.onclick = async () => {
  await initMedia();
  initWebSocket();
  initPeerConnection();
};
