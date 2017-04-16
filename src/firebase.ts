import * as firebase from 'firebase/app';

const config = {
  apiKey: "AIzaSyChgv4F6sgROm0Lkv2qbMMsLsyXytAkqgk",
  authDomain: "snail-53ef6.firebaseapp.com",
  databaseURL: "https://snail-53ef6.firebaseio.com",
  projectId: "snail-53ef6",
  storageBucket: "snail-53ef6.appspot.com",
  messagingSenderId: "248204123455"
};



export function initFirebase(onChange:(user: firebase.User, ref: firebase.database.Reference)=>void) {

  firebase.initializeApp(config);

  firebase.auth().onAuthStateChanged((user: firebase.User) => {

    if (user === null)
      return firebase.auth().signInAnonymously();

    const ref = firebase.database().ref(`users/${user.uid}`);
    if (user.isAnonymous) {
      // Delete anonymous users when they leave.
      ref.onDisconnect().remove();
    }
    onChange(user, ref);
  });
};