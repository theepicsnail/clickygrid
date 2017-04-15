const config = {
  apiKey : "AIzaSyChgv4F6sgROm0Lkv2qbMMsLsyXytAkqgk",
  authDomain : "snail-53ef6.firebaseapp.com",
  databaseURL : "https://snail-53ef6.firebaseio.com",
  projectId : "snail-53ef6",
  storageBucket : "snail-53ef6.appspot.com",
  messagingSenderId : "248204123455"
};
firebase.initializeApp(config);

firebase.auth().onAuthStateChanged((user) => {
  "use strict";
  if (user === null)
    return firebase.auth().signInAnonymously();

  const ref = firebase.database().ref(`users/${user.uid}`);
  if (user.isAnonymous) {
    // Delete anonymous users when they leave.
    ref.onDisconnect().remove();
  }
  document.dispatchEvent(
      new CustomEvent('signed in', {detail : {user : user, ref : ref}}));
});
