/**
 * Shared "game announcement" modal: shows announcement_message + a larger
 * cover art for a game. Used from /play (info jeu link) and from game tiles
 * on / and /all (top-right info badge).
 */
(function () {
    if (window.AnnouncementModal) return;

    const STYLE = `
        .announcement-badge {
            position: absolute;
            top: 0;
            right: 0;
            width: 34px;
            height: 34px;
            border: none;
            padding: 0;
            margin: 0;
            background: transparent;
            cursor: pointer;
            z-index: 5;
        }
        .announcement-badge::before {
            content: "";
            position: absolute;
            inset: 0;
            background: #1976d2;
            clip-path: polygon(0 0, 100% 0, 100% 100%);
        }
        .announcement-badge::after {
            content: "i";
            position: absolute;
            top: 3px;
            right: 7px;
            color: #fff;
            font-weight: 700;
            font-style: italic;
            font-family: Georgia, 'Times New Roman', serif;
            font-size: 13px;
            line-height: 1;
        }
        .announcement-badge:hover::before {
            background: #1565c0;
        }
        .announcement-badge--bottom-right {
            top: auto;
            bottom: 0;
        }
        .announcement-badge--bottom-right::before {
            clip-path: polygon(0 100%, 100% 100%, 100% 0);
        }
        .announcement-badge--bottom-right::after {
            top: auto;
            bottom: 3px;
        }
        .announcement-modal {
            display: none;
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.78);
            z-index: 10000;
            align-items: center;
            justify-content: center;
            padding: 24px;
        }
        .announcement-modal.is-open {
            display: flex;
        }
        .announcement-modal-content {
            max-width: min(92vw, 520px);
            max-height: 90vh;
            overflow-y: auto;
            background: #1a1a1a;
            color: #f1f1f1;
            border-radius: 12px;
            border: 1px solid #2f2f2f;
            padding: 20px;
            position: relative;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
        }
        .announcement-modal-close {
            position: absolute;
            right: 10px;
            top: 10px;
            border: none;
            width: 32px;
            height: 32px;
            border-radius: 999px;
            cursor: pointer;
            background: rgba(255, 255, 255, 0.15);
            color: #fff;
            font-size: 18px;
            line-height: 1;
        }
        .announcement-modal-cover {
            display: block;
            max-width: 100%;
            max-height: 50vh;
            margin: 0 auto 16px;
            border-radius: 8px;
            border: 1px solid rgba(255, 255, 255, 0.12);
        }
        .announcement-modal-title {
            font-size: 1.2em;
            font-weight: 700;
            margin-bottom: 10px;
            padding-right: 30px;
        }
        .announcement-modal-text {
            font-size: 0.98em;
            line-height: 1.5;
            white-space: pre-line;
        }
    `;

    function injectStyle() {
        if (document.getElementById('announcement-modal-style')) return;
        const style = document.createElement('style');
        style.id = 'announcement-modal-style';
        style.textContent = STYLE;
        document.head.appendChild(style);
    }

    function ensureModal() {
        injectStyle();
        let modal = document.getElementById('announcement-modal');
        if (modal) return modal;

        modal = document.createElement('div');
        modal.id = 'announcement-modal';
        modal.className = 'announcement-modal';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-label', 'Annonce du jeu');
        modal.innerHTML = `
            <div class="announcement-modal-content">
                <button type="button" class="announcement-modal-close" aria-label="Fermer">&times;</button>
                <img class="announcement-modal-cover" src="" alt="">
                <div class="announcement-modal-title"></div>
                <div class="announcement-modal-text"></div>
            </div>
        `;
        document.body.appendChild(modal);

        modal.querySelector('.announcement-modal-close').addEventListener('click', closeAnnouncementModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeAnnouncementModal();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.classList.contains('is-open')) {
                closeAnnouncementModal();
            }
        });

        return modal;
    }

    function openAnnouncementModal(game) {
        if (!game) return;
        const modal = ensureModal();
        const cover = modal.querySelector('.announcement-modal-cover');
        const title = modal.querySelector('.announcement-modal-title');
        const text = modal.querySelector('.announcement-modal-text');

        const coverArt = game.coverArt || '';
        if (coverArt && coverArt !== '/assets/images/placeholder_thumb.png') {
            cover.src = coverArt;
            cover.alt = game.title || '';
            cover.style.display = 'block';
        } else {
            cover.removeAttribute('src');
            cover.style.display = 'none';
        }

        title.textContent = game.title || game.id || '';
        text.textContent = game.announcement_message || '';

        modal.classList.add('is-open');
    }

    function closeAnnouncementModal() {
        const modal = document.getElementById('announcement-modal');
        if (!modal) return;
        modal.classList.remove('is-open');
    }

    function hasAnnouncement(game) {
        return !!(game && String(game.announcement_message || '').trim());
    }

    function createAnnouncementBadge(game) {
        if (!hasAnnouncement(game)) return null;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'announcement-badge';
        btn.setAttribute('aria-label', `Annonce pour ${game.title || game.id}`);
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            openAnnouncementModal(game);
        });
        return btn;
    }

    injectStyle();

    window.AnnouncementModal = {
        open: openAnnouncementModal,
        close: closeAnnouncementModal,
        hasAnnouncement,
        createBadge: createAnnouncementBadge
    };
})();
