// === Firebase Init ===
const firebaseConfig = {
  apiKey: "AIzaSyDpeT73fOAYADnV5CPSgINSlWVyXZE9cjg",
  authDomain: "code-clash-royale.firebaseapp.com",
  projectId: "code-clash-royale",
  storageBucket: "code-clash-royale.firebasestorage.app",
  messagingSenderId: "830102918327",
  appId: "1:830102918327:web:719af83564999094e2a932",
  measurementId: "G-14D9SQ9EZR"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();

// === UI Elements ===
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const chatInput = document.getElementById("chatInput");
let player = {}, bullets = [], enemies = {}, players = {};
let keys = {}, myUID = "", currentMap = "Map 1";

// === Auth ===
function signup() {
  const email = emailInput.value;
  const password = passwordInput.value;
  auth.createUserWithEmailAndPassword(email, password)
    .then(cred => {
      const uid = cred.user.uid;
      myUID = uid;
      db.ref("users/" + uid).set({
        email, coins: 100, rank: "Bronze", skins: [], friends: [], skin: "blue"
      });
      alert("Signed up! Now log in.");
    }).catch(err => alert(err.message));
}

function login() {
  const email = emailInput.value;
  const password = passwordInput.value;
  auth.signInWithEmailAndPassword(email, password)
    .then(cred => {
      myUID = cred.user.uid;
      document.getElementById("game").style.display = "block";
      loadUserData(myUID);
      setupListeners();
      startGame();
    }).catch(err => alert(err.message));
}

function loadUserData(uid) {
  db.ref("users/" + uid).once("value").then(snap => {
    const data = snap.val();
    player = {
      x: 100, y: 100, hp: 100, skin: data.skin || "blue",
      uid, email: data.email, coins: data.coins || 0
    };
    updateLeaderboard();
    loadFriends();
  });
}

// === Friends ===
function addFriend() {
  const email = document.getElementById("friendEmail").value;
  db.ref("users").once("value", snap => {
    let found = null;
    snap.forEach(child => {
      if (child.val().email === email) found = child.key;
    });
    if (found) {
      db.ref("users/" + myUID + "/friends").push(found);
      alert("Friend added!");
    } else alert("Not found.");
  });
}

function loadFriends() {
  db.ref("users/" + myUID + "/friends").once("value", snap => {
    const list = document.getElementById("friendsList");
    list.innerHTML = "<strong>Friends:</strong><br>";
    if (!snap.exists()) return;
    Object.values(snap.val()).forEach(uid => {
      db.ref("users/" + uid).once("value", s => {
        list.innerHTML += s.val().email + "<br>";
      });
    });
  });
}

// === Match ===
function joinMatch() {
  player.x = Math.random() * 700;
  player.y = Math.random() * 400;
  db.ref("match/players/" + myUID).set(player);
}

function createPrivateGame() {
  joinMatch();
  alert("Private match created. Share your email to invite friends.");
}

// === Shooting & Movement ===
document.addEventListener("keydown", e => keys[e.key] = true);
document.addEventListener("keyup", e => keys[e.key] = false);

canvas.addEventListener("click", e => {
  const rect = canvas.getBoundingClientRect();
  const angle = Math.atan2(
    e.clientY - rect.top - player.y,
    e.clientX - rect.left - player.x
  );
  bullets.push({ x: player.x, y: player.y, dx: Math.cos(angle)*5, dy: Math.sin(angle)*5, owner: myUID });
});

function movePlayer() {
  if (keys["w"]) player.y -= 3;
  if (keys["s"]) player.y += 3;
  if (keys["a"]) player.x -= 3;
  if (keys["d"]) player.x += 3;
}

// === Game Loop ===
function startGame() {
  setInterval(() => {
    movePlayer();
    bullets.forEach(b => { b.x += b.dx; b.y += b.dy; });

    // Update DB
    db.ref("match/players/" + myUID).update({ x: player.x, y: player.y });

    // Damage detection
    Object.keys(players).forEach(uid => {
      if (uid === myUID) return;
      bullets.forEach(b => {
        if (b.owner === myUID && Math.abs(players[uid].x - b.x) < 20 && Math.abs(players[uid].y - b.y) < 20) {
          db.ref("match/players/" + uid + "/hp").transaction(hp => (hp || 100) - 20);
        }
      });
    });

    renderGame();
  }, 1000/60);
}

function renderGame() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#f0f0f0";
  ctx.fillText(`Map: ${currentMap}`, 10, 10);

  // Me
  ctx.fillStyle = player.skin === "red" ? "red" : "blue";
  ctx.fillRect(player.x, player.y, 30, 30);

  // Others
  Object.values(players).forEach(p => {
    if (p.uid === myUID) return;
    ctx.fillStyle = p.skin === "red" ? "red" : "blue";
    ctx.fillRect(p.x, p.y, 30, 30);
  });

  // Bullets
  ctx.fillStyle = "black";
  bullets.forEach(b => ctx.fillRect(b.x, b.y, 5, 5));
}

// === Listen for other players ===
function setupListeners() {
  db.ref("match/players").on("value", snap => {
    players = snap.val() || {};
    Object.entries(players).forEach(([uid, p]) => {
      if (p.hp <= 0) db.ref("match/players/" + uid).update({ x: 100, y: 100, hp: 100 });
    });
  });
}

// === Leaderboard ===
function updateLeaderboard() {
  db.ref("users").orderByChild("coins").limitToLast(5).once("value", snap => {
    const lb = document.getElementById("leaderboard");
    lb.innerHTML = "<strong>🏆 Leaderboard:</strong><br>";
    Object.values(snap.val()).reverse().forEach(u => {
      lb.innerHTML += `${u.email} - 💰 ${u.coins}<br>`;
    });
  });
}

// === Chat ===
chatInput.addEventListener("keypress", e => {
  if (e.key === "Enter") {
    const msg = chatInput.value;
    db.ref("chat").push({ from: player.email, msg });
    chatInput.value = "";
  }
});

db.ref("chat").limitToLast(20).on("child_added", snap => {
  const m = snap.val();
  const box = document.getElementById("chatBox");
  box.innerText += `\n${m.from}: ${m.msg}`;
  box.scrollTop = box.scrollHeight;
});

// === Shop ===
function buyGun() {
  db.ref("users/" + myUID).once("value").then(snap => {
    const coins = snap.val().coins;
    if (coins >= 50) db.ref("users/" + myUID).update({ coins: coins - 50 });
    else alert("Not enough coins");
  });
}
function buyPowerUp() {
  db.ref("users/" + myUID).once("value").then(snap => {
    const coins = snap.val().coins;
    if (coins >= 30) db.ref("users/" + myUID).update({ coins: coins - 30 });
    else alert("Not enough coins");
  });
}
