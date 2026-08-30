(function (global) {
  var FAVORITES_COLLECTION = 'favorites';

  function getDb() {
    return window.firebaseDb;
  }

  function getFns() {
    return window.Firestore;
  }

  function userDocRef(userId) {
    var fns = getFns();
    return fns.doc(getDb(), FAVORITES_COLLECTION, userId);
  }

  function gameIdsOf(snap) {
    return (snap.exists() && snap.data().gameIds) || [];
  }

  async function toggle(userId, gameId) {
    var fns = getFns();
    var ref = userDocRef(userId);
    var snap = await fns.getDoc(ref);
    var gameIds = gameIdsOf(snap);

    if (gameIds.indexOf(gameId) !== -1) {
      await fns.updateDoc(ref, { gameIds: fns.arrayRemove(gameId) });
      return false;
    } else if (snap.exists()) {
      await fns.updateDoc(ref, { gameIds: fns.arrayUnion(gameId) });
      return true;
    } else {
      await fns.setDoc(ref, { gameIds: [gameId] });
      return true;
    }
  }

  async function getAll(userId) {
    var fns = getFns();
    var snap = await fns.getDoc(userDocRef(userId));
    return gameIdsOf(snap);
  }

  async function isFav(userId, gameId) {
    var ids = await getAll(userId);
    return ids.indexOf(gameId) !== -1;
  }

  function listen(userId, callback) {
    var fns = getFns();
    return fns.onSnapshot(userDocRef(userId), function (snap) {
      callback(gameIdsOf(snap));
    });
  }

  global.__favorites = {
    toggle: toggle,
    getAll: getAll,
    isFav: isFav,
    listen: listen
  };
})(window);
