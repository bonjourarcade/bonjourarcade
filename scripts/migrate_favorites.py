#!/usr/bin/env python3
"""
Migre la collection Firestore 'favorites' de l'ancien format
(un document par favori, id "userId:gameId") vers le nouveau format
(un document par utilisateur, id "userId", champ gameIds: [...]).

Additif uniquement : n'ecrit que les nouveaux documents "userId", ne touche
pas aux anciens documents "userId:gameId". A lancer AVANT de deployer le
nouveau favorites.js. Une fois la migration verifiee en prod, lancer
cleanup_old_favorites.py pour supprimer les anciens documents.

Prerequis:
  pip install google-cloud-firestore
  export GOOGLE_APPLICATION_CREDENTIALS=/chemin/vers/service-account.json
"""

import argparse
from collections import defaultdict

from google.cloud import firestore

COLLECTION = 'favorites'
PROJECT_ID = 'alloarcade'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--dry-run', action='store_true',
                         help="N'ecrit rien, affiche juste ce qui serait migre.")
    args = parser.parse_args()

    db = firestore.Client(project=PROJECT_ID)

    old_docs = list(db.collection(COLLECTION).stream())
    by_user = defaultdict(set)
    already_migrated = 0

    for doc in old_docs:
        if ':' not in doc.id:
            already_migrated += 1
            continue
        user_id, game_id = doc.id.split(':', 1)
        by_user[user_id].add(game_id)

    print(f"{len(old_docs)} documents lus, {len(by_user)} utilisateurs a migrer, "
          f"{already_migrated} documents deja au nouveau format (ignores).")

    if args.dry_run:
        for user_id, game_ids in by_user.items():
            print(f"  {user_id}: {len(game_ids)} favoris")
        return

    batch = db.batch()
    pending = 0
    written = 0
    for user_id, game_ids in by_user.items():
        ref = db.collection(COLLECTION).document(user_id)
        batch.set(ref, {'gameIds': sorted(game_ids)})
        pending += 1
        written += 1
        if pending >= 400:
            batch.commit()
            batch = db.batch()
            pending = 0
    if pending:
        batch.commit()

    print(f"Migration terminee : {written} documents utilisateur ecrits dans '{COLLECTION}'.")


if __name__ == '__main__':
    main()
