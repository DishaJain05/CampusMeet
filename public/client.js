
// code 2 using socket.io


// let socket;
// let pc;
// let localStream;
// let otherUserId = null;

// const video = document.getElementById("video");

// async function join() {
//   // 1️⃣ Get camera + mic
//   localStream = await navigator.mediaDevices.getUserMedia({
//     video: true,
//     audio: true
//   });

//   // Show own video first (muted)
//   video.srcObject = localStream;
//   video.muted = true;

//   // 2️⃣ Connect to Socket.IO after user interaction
//   socket = io();

//   // 3️⃣ Create PeerConnection with STUN
//   pc = new RTCPeerConnection({
//     iceServers: [
//       { urls: "stun:stun.l.google.com:19302" }
//     ]
//   });

//   // 4️⃣ Add local tracks
//   localStream.getTracks().forEach(track => {
//     pc.addTrack(track, localStream);
//   });

//   // 5️⃣ When remote stream arrives → switch video
//   pc.ontrack = (event) => {
//     video.srcObject = event.streams[0];
//     video.muted = false;      // 🔑 enable audio
//     video.play();
//   };

//   // 6️⃣ ICE candidates
//   pc.onicecandidate = (event) => {
//     if (event.candidate && otherUserId) {
//       socket.emit("signal", {
//         to: otherUserId,
//         data: { candidate: event.candidate }
//       });
//     }
//   };

//   // 7️⃣ Join room
//   socket.emit("join-room", "room1");

//   // 8️⃣ When another user joins
//   socket.on("user-joined", async (id) => {
//     otherUserId = id;

//     const offer = await pc.createOffer();
//     await pc.setLocalDescription(offer);

//     socket.emit("signal", {
//       to: otherUserId,
//       data: { offer }
//     });
//   });

//   // 9️⃣ Handle signaling
//   socket.on("signal", async ({ from, data }) => {
//     otherUserId = from;

//     if (data.offer) {
//       await pc.setRemoteDescription(data.offer);

//       const answer = await pc.createAnswer();
//       await pc.setLocalDescription(answer);

//       socket.emit("signal", {
//         to: from,
//         data: { answer }
//       });
//     }

//     if (data.answer) {
//       await pc.setRemoteDescription(data.answer);
//     }

//     if (data.candidate) {
//       await pc.addIceCandidate(data.candidate);
//     }
//   });
// }



let ws;
let pc;
let localStream;

const roomId = "room1";

const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");

async function join() {

  // 1️⃣ Get camera + mic
  localStream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
  });

  // Show local preview
  localVideo.srcObject = localStream;

  // 2️⃣ WebSocket connect
  ws = new WebSocket(`ws://${location.host}`);

  ws.onopen = () => {
    ws.send(JSON.stringify({
      type: "join",
      roomId
    }));
  };

  // 3️⃣ Create WebRTC PeerConnection
  pc = new RTCPeerConnection({
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" }
    ]
  });

  // 4️⃣ Add local tracks
  localStream.getTracks().forEach(track => {
    pc.addTrack(track, localStream);
  });

  // 5️⃣ Receive remote tracks
  pc.ontrack = (event) => {
    remoteVideo.srcObject = event.streams[0];
    remoteVideo.play();
  };

  // 6️⃣ ICE candidates
  pc.onicecandidate = (event) => {
    if (event.candidate) {
      ws.send(JSON.stringify({
        type: "signal",
        data: { candidate: event.candidate }
      }));
    }
  };

  // 7️⃣ Handle WebSocket messages
  ws.onmessage = async (event) => {
    const msg = JSON.parse(event.data);

    // First user creates offer
    if (msg.type === "user-joined") {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      ws.send(JSON.stringify({
        type: "signal",
        data: { offer }
      }));
    }

    if (msg.type === "signal") {

      // Offer received
      if (msg.data.offer) {
        await pc.setRemoteDescription(msg.data.offer);

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        ws.send(JSON.stringify({
          type: "signal",
          data: { answer }
        }));
      }

      // Answer received
      if (msg.data.answer) {
        await pc.setRemoteDescription(msg.data.answer);
      }

      // ICE candidate received
      if (msg.data.candidate) {
        await pc.addIceCandidate(msg.data.candidate);
      }
    }
  };
}
