#!/usr/bin/env python3
"""
Supprime les anciens documents de la collection Firestore 'favorites'
(format "userId:gameId"), une fois que migrate_favorites.py a ete lance
et que le nouveau format ("userId" -> gameIds: [...]) est verifie en prod.

A lancer seulement APRES avoir deploye le nouveau favorites.js et confirme
que les favoris fonctionnent correctement sur le site.

Prerequis:
  pip install google-cloud-firestore
  export GOOGLE_APPLICATION_CREDENTIALS=/chemin/vers/service-account.json
"""

import argparse

from google.cloud import firestore

COLLECTION = 'favorites'
PROJECT_ID = 'alloarcade'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--yes', action='store_true',
                         help="Confirme la suppression sans prompt interactif.")
    args = parser.parse_args()

    db = firestore.Client(project=PROJECT_ID)

    old_docs = [d for d in db.collection(COLLECTION).stream() if ':' in d.id]
    print(f"{len(old_docs)} anciens documents ('userId:gameId') trouves.")

    if not old_docs:
        return

    if not args.yes:
        confirm = input("Confirmer la suppression definitive ? (oui/non) ")
        if confirm.strip().lower() != 'oui':
            print("Annule.")
            return

    batch = db.batch()
    pending = 0
    deleted = 0
    for doc in old_docs:
        batch.delete(doc.reference)
        pending += 1
        deleted += 1
        if pending >= 400:
            batch.commit()
            batch = db.batch()
            pending = 0
    if pending:
        batch.commit()

    print(f"{deleted} anciens documents supprimes.")


if __name__ == '__main__':
    main()
