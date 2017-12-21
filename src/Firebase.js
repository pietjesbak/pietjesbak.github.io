import firebase from 'firebase'
var config = {
    apiKey: "AIzaSyBMBP0S071zw1cg6l2F7fdffYmls888LyY",
    authDomain: "pietjesbak-e8186.firebaseapp.com",
    databaseURL: "https://pietjesbak-e8186.firebaseio.com",
    projectId: "pietjesbak-e8186",
    storageBucket: "",
    messagingSenderId: "198433139089"
};
firebase.initializeApp(config);

export const provider = new firebase.auth.GoogleAuthProvider();
export const auth = firebase.auth();

export default firebase;
