// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyDpeT73fOAYADnV5CPSgINSlWVyXZE9cjg",
  authDomain: "code-clash-royale.firebaseapp.com",
  projectId: "code-clash-royale",
  storageBucket: "code-clash-royale.firebasestorage.app",
  messagingSenderId: "830102918327",
  appId: "1:830102918327:web:719af83564999094e2a932",
  measurementId: "G-14D9SQ9EZR",
  databaseURL: "https://code-clash-royale-default-rtdb.firebaseio.com"
};

// Init Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();

// DOM elements
const gameUI = document.getElementById("game");
const chatBox = document.getElementById("chatBox");
const chatInput = document.getElementById("chatInput");
const friendsList = document.getElementById("friendsList");
const leaderboard = document.getElementById("leaderboard");
const shop = document.getElementById("shop");

// Login/Sign Up
function signup() {
  const email = document.getElementById("email").value;
  const pass = document.getElementById("password").value;
  auth.createUserWithEmailAndPassword(email, pass)
    .then((userCredential) => {
      const user = userCredential.user;
      const uid = user.uid;
      db.ref("players/" + uid).set({
        coins: 100,
        rank: "Bronze",
        skin: "default",
        username: email.split('@')[0],
        friends: [],
        privateGames: []
      });
      enterGame();
    })
    .catch((error) => {
      alert("Signup error: " + error.message);
    });
}

function login() {
  const email = document.getElementById("email").value;
  const pass = document.getElementById("password").value;
  auth.signInWithEmailAndPassword(email, pass)
    .then(() => {
      enterGame();
    })
    .catch((error) => {
      alert("Login error: " + error.message);
    });
}

function enterGame() {
  document.getElementById("email").style.display = "none";
  document.getElementById("password").style.display = "none";
  document.querySelector("button").style.display = "none";
  gameUI.style.display = "block";

  // Load friends list and online status
  const user = auth.currentUser;
  const userRef = db.ref("players/" + user.uid);
  userRef.on("value", (snapshot) => {
    const playerData = snapshot.val();
    friendsList.innerHTML = '';
    playerData.friends.forEach(friendId => {
      db.ref("players/" + friendId).once("value", (friendSnapshot) => {
        const friend = friendSnapshot.val();
        const p = document.createElement("p");
        p.textContent = friend.username + " - " + (friend.online ? "Online" : "Offline");
        friendsList.appendChild(p);
      });
    });
  });

  // Chat system
  db.ref("chat").on("child_added", (snapshot) => {
    const msg = snapshot.val();
    const p = document.createElement("p");
    p.textContent = msg.user + ": " + msg.text;
    chatBox.appendChild(p);
    chatBox.scrollTop = chatBox.scrollHeight;
  });
}

chatInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter" && chatInput.value.trim() !== "") {
    const user = auth.currentUser;
    const text = chatInput.value.trim();
    chatInput.value = "";

    db.ref("chat").push({
      user: user.email.split('@')[0],
      text: text
    });
  }
});

// Add friend
function addFriend() {
  const email = document.getElementById("friendEmail").value;
  const user = auth.currentUser;
  db.ref("players").orderByChild("username").equalTo(email).once("value", (snapshot) => {
    snapshot.forEach((friendSnapshot) => {
      const friendId = friendSnapshot.key;
      db.ref("players/" + user.uid + "/friends").push(friendId);
      alert("Friend added!");
    });
  });
}

// Buy gun or power-up
function buyGun() {
  const user = auth.currentUser;
  db.ref("players/" + user.uid).once("value", (snapshot) => {
    const playerData = snapshot.val();
    if (playerData.coins >= 50) {
      db.ref("players/" + user.uid).update({
        coins: playerData.coins - 50,
        gun: "Basic Gun"
      });
      alert("Gun purchased!");
    } else {
      alert("Not enough coins!");
    }
  });
}

function buyPowerUp() {
  const user = auth.currentUser;
  db.ref("players/" + user.uid).once("value", (snapshot) => {
    const playerData = snapshot.val();
    if (playerData.coins >= 30) {
      db.ref("players/" + user.uid).update({
        coins: playerData.coins - 30,
        powerUp: "Speed Boost"
      });
      alert("Power-up purchased!");
    } else {
      alert("Not enough coins!");
    }
  });
}

// Private game
function createPrivateGame() {
  const user = auth.currentUser;
  const gameId = db.ref("games").push().key;
  db.ref("games/" + gameId).set({
    players: [user.uid],
    gameMode: "Private"
  });
  db.ref("players/" + user.uid + "/privateGames").push(gameId);
  alert("Private game created!");
}

// Join a public match
function joinMatch() {
  const user = auth.currentUser;
  db.ref("games").orderByChild("gameMode").equalTo("Public").once("value", (snapshot) => {
    if (snapshot.exists()) {
      const gameId = Object.keys(snapshot.val())[0];
      db.ref("games/" + gameId + "/players").push(user.uid);
      alert("Joined public match!");
    } else {
      alert("No public matches available!");
    }
  });
}

// Leaderboard
function loadLeaderboard() {
  db.ref("players").orderByChild("coins").limitToLast(10).once("value", (snapshot) => {
    leaderboard.innerHTML = "<h3>Leaderboard</h3>";
    snapshot.forEach((playerSnapshot) => {
      const player = playerSnapshot.val();
      const p = document.createElement("p");
      p.textContent = player.username + ": " + player.coins + " coins";
      leaderboard.appendChild(p);
    });
  });
}

loadLeaderboard(); // Load leaderboard on game start
