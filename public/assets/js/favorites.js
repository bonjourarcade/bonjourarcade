(function (global) {
  var FAVORITES_COLLECTION = 'favorites';

  function getDb() {
    return window.firebaseDb;
  }

  function getFns() {
    return window.Firestore;
  }

  function docId(userId, gameId) {
    return userId + ':' + gameId;
  }

  async function toggle(userId, gameId) {
    var db = getDb();
    var fns = getFns();
    var ref = fns.doc(db, FAVORITES_COLLECTION, docId(userId, gameId));
    var snap = await fns.getDoc(ref);
    if (snap.exists()) {
      await fns.deleteDoc(ref);
      return false;
    } else {
      await fns.setDoc(ref, {
        userId: userId,
        gameId: gameId,
        createdAt: fns.serverTimestamp()
      });
      return true;
    }
  }

  async function getAll(userId) {
    var db = getDb();
    var fns = getFns();
    var q = fns.query(fns.collection(db, FAVORITES_COLLECTION), fns.where('userId', '==', userId));
    var snap = await fns.getDocs(q);
    var ids = [];
    snap.forEach(function (d) { ids.push(d.data().gameId); });
    return ids;
  }

  async function isFav(userId, gameId) {
    var db = getDb();
    var fns = getFns();
    var ref = fns.doc(db, FAVORITES_COLLECTION, docId(userId, gameId));
    var snap = await fns.getDoc(ref);
    return snap.exists();
  }

  function listen(userId, callback) {
    var db = getDb();
    var fns = getFns();
    var q = fns.query(fns.collection(db, FAVORITES_COLLECTION), fns.where('userId', '==', userId));
    return fns.onSnapshot(q, function (snap) {
      var ids = [];
      snap.forEach(function (d) { ids.push(d.data().gameId); });
      callback(ids);
    });
  }

  global.__favorites = {
    toggle: toggle,
    getAll: getAll,
    isFav: isFav,
    listen: listen
  };
})(window);
