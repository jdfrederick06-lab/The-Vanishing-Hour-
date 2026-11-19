/* =====================================================================
   THE VANISHING HOUR — settings.
   Change the title here and it changes everywhere.
   BACKEND 'local' = runs on this computer only (tabs sync with each other).
   Firebase gets plugged in here later.
   ===================================================================== */
const CONFIG = {
  GAME_ID: 'vh-dev-1',
  TITLE: 'The Vanishing Hour',
  EVENT: 'The Ashgrove Gala',
  SEASON: 'Spring 2027',
  BACKEND: 'local',
  /* The Firebase project (set up Nov 18): Realtime Database in us-central1, Anonymous sign-in on,
     rules published. These details are public by design (every Firebase site ships them); the
     rules are what protect the data. Not used until BACKEND is switched to 'firebase'. */
  FIREBASE: {
    apiKey: 'AIzaSyBdMdtlawXb2ypwtYggIi8QuRcu44C0JMY',
    authDomain: 'vanishing-hour.firebaseapp.com',
    databaseURL: 'https://vanishing-hour-default-rtdb.firebaseio.com',
    projectId: 'vanishing-hour',
    storageBucket: 'vanishing-hour.firebasestorage.app',
    messagingSenderId: '856115224715',
    appId: '1:856115224715:web:377d4f2bae9dbd834df48e'
  },
  /* The invitation and RSVP page (rsvp.html). Placeholders until January. */
  INVITE: {
    DATE: 'A spring evening, 2027 · date to come',
    TIME: 'Doors at 7:00 PM · about two and a half hours',
    PLACE: 'Malcolm Hall',
    DRESS: 'Gala attire, black tie optional',
    RSVP_BY: 'Please reply as soon as you can',
    HOST: 'Your RAs'
  }
};
