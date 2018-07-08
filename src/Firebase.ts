import * as firebase from 'firebase'

const config = {
    apiKey: "AIzaSyBMBP0S071zw1cg6l2F7fdffYmls888LyY",
    authDomain: "pietjesbak-e8186.firebaseapp.com",
    databaseURL: "https://pietjesbak-e8186.firebaseio.com",
    messagingSenderId: "198433139089",
    projectId: "pietjesbak-e8186",
    storageBucket: ""
};
firebase.initializeApp(config);

export const provider = new firebase.auth!.GoogleAuthProvider();
export const auth = firebase.auth!();
export const database = firebase.database!();

export default firebase;
