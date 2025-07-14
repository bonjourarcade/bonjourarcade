#!/usr/bin/env python3
"""
Newsletter Email Sender for BonjourArcade

This script reads the current game of the week and sends a newsletter email
to subscribers using ConvertKit API.

Requirements:
- requests library: pip install requests
- ConvertKit account and API credentials

Usage:
    python send_newsletter.py [--dry-run] [--api-key KEY] [--broadcast-id BROADCAST_ID]
"""

import json
import requests
import argparse
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path
import re
import yaml

# Configuration - Only keep what's needed
DEFAULT_API_URL = 'https://api.convertkit.com/v3'
BASE_URL = 'https://bonjourarcade-f11f7f.gitlab.io'

class NewsletterSender:
    def __init__(self, api_secret, api_url=DEFAULT_API_URL, dry_run=False, webhook_only=False):
        self.api_secret = api_secret
        self.api_url = api_url
        self.dry_run = dry_run
        self.webhook_only = webhook_only
        
    def read_game_of_the_week(self):
        """Read the current game of the week from the file."""
        try:
            with open('game-of-the-week', 'r') as f:
                game_id = f.read().strip()
            
            return game_id
            
        except FileNotFoundError as e:
            print(f"Error: Could not find required file: {e}")
            sys.exit(1)
        except json.JSONDecodeError as e:
            print(f"Error: Invalid JSON in gamelist.json: {e}")
            sys.exit(1)
    
    def read_game_metadata(self, game_id):
        """Read metadata from public/games/{gameid}/metadata.yaml."""
        meta_path = f'public/games/{game_id}/metadata.yaml'
        try:
            with open(meta_path, 'r') as f:
                meta = yaml.safe_load(f)
            return meta
        except FileNotFoundError:
            print(f"Error: Could not find metadata file for game {game_id}: {meta_path}")
            sys.exit(1)
        except yaml.YAMLError as e:
            print(f"Error: Invalid YAML in metadata file for game {game_id}: {e}")
            sys.exit(1)
    
    def create_email_content(self, game_id, meta):
        from datetime import datetime
        import re
        cover_url = f'{BASE_URL}/games/{game_id}/cover.png'
        play_url = f'https://felx.cc/b/{game_id}'
        leaderboard_url = f'https://alloarcade.web.app/leaderboards/{game_id}'
        title = meta.get('title', game_id)
        # Remove parenthetical content for display in email body
        clean_title = re.sub(r'\s*\([^)]*\)', '', title).strip()
        developer = meta.get('developer', 'Inconnu')
        year = meta.get('year', 'Inconnue')
        genre = meta.get('genre', 'Non spécifié')
        description = clean_title
        subject = f'🕹️ Jeu de la semaine - {title}'
        now = datetime.now()
        week = now.isocalendar()[1]
        plinko_seed = f"{now.year}{week:02d}"
        plinko_url = f"{BASE_URL}/plinko/?seed={plinko_seed}"
        html_content = f'''
        <html><body>
        <ul>
        <li><b>Titre :</b> {clean_title}</li>
        <li><b>Développeur :</b> {developer}</li>
        <li><b>Année :</b> {year}</li>
        <li><b>Genre :</b> {genre}</li>
        </ul>
        <div style="text-align:center;margin:24px 0;">
            <a href="{play_url}" style="display:inline-block;background:#fffd37;color:#111;padding:18px 36px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:1.3em;margin-right:18px;">🕹️ Jouer maintenant</a>
            <a href="{leaderboard_url}" style="display:inline-block;background:#007bff;color:#fff;padding:18px 36px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:1.3em;">🏆 Classements</a>
        </div>
        <img src="{cover_url}" alt="Couverture de {clean_title}" style="max-width:320px;width:100%;border-radius:8px;display:block;margin:0 auto 16px auto;">
        <div style="text-align:center;margin:8px 0 24px 0;font-size:1em;">
            <a href="{plinko_url}" style="color:#007bff;text-decoration:underline;">🎲 Voir le tirage plinko</a>
        </div>
        </body></html>
        '''
        return {
            'description': description,
            'subject': subject,
            'content': html_content
        }
    
    def send_email(self, content):
        """Send the email using ConvertKit API."""
        if self.dry_run:
            print('=== DRY RUN MODE ===')
            print('Subject:', content['subject'])
            print('Description:', content['description'])
            print('HTML Content:', content['content'])
            return True
        
        from datetime import datetime, timedelta, timezone
        send_at = (datetime.now(timezone.utc) + timedelta(minutes=1)).isoformat(timespec='seconds').replace('+00:00', 'Z')
        
        data = {
            'api_secret': self.api_secret,
            'description': content['description'],
            'subject': content['subject'],
            'send_at': send_at,
            'content': content['content']
        }
        
        url = f'{self.api_url}/broadcasts'
        headers = {'Content-Type': 'application/json'}
        
        try:
            response = requests.post(url, headers=headers, json=data)
            response.raise_for_status()
            
            print('API response code:', response.status_code)
            return True
            
        except requests.exceptions.RequestException as e:
            print(f"❌ Error sending email: {e}")
            if hasattr(e, 'response') and e.response:
                print(f"Response: {e.response.text}")
            return False
    
    def send_webhook(self, content, game_id, meta):
        """Send a plaintext version of the newsletter to the Google Chat webhook."""
        import requests
        # Webhook URL (hardcoded as per user request)
        webhook_url = "https://chat.googleapis.com/v1/spaces/AAQAkt54xKo/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=g-Er6ugSuk93Z4Dk6yXAAt_5vSI88f2f1bQLZnr7tsw"
        play_url = f'https://felx.cc/b/{game_id}'
        leaderboard_url = f'https://alloarcade.web.app/leaderboards/{game_id}'
        title = meta.get('title', game_id)
        developer = meta.get('developer', 'Inconnu')
        year = meta.get('year', 'Inconnue')
        genre = meta.get('genre', 'Non spécifié')
        # Format the message (no Plinko link, emojis before links, no header)
        message = f"""
Titre : {title}
Développeur : {developer}
Année : {year}
Genre : {genre}

🕹️ Faites-en l'essai : {play_url}
🏆 Classements : {leaderboard_url}

Bonne semaine ! ☀️
""".strip()
        # Google Chat expects a JSON payload with a 'text' field
        payload = {"text": message}
        try:
            resp = requests.post(webhook_url, json=payload)
            resp.raise_for_status()
            print("✅ Webhook message sent to Google Chat!")
        except requests.exceptions.RequestException as e:
            print(f"❌ Error sending webhook: {e}")
            if hasattr(e, 'response') and e.response:
                print(f"Response: {e.response.text}")

    def run(self):
        print('📧 Starting newsletter email process...')
        
        # Read game data
        print("📖 Reading game of the week...")
        game_id = self.read_game_of_the_week()
        print(f'✅ Game of the week: {game_id}')
        
        # Read metadata
        print("📖 Reading game metadata...")
        meta = self.read_game_metadata(game_id)
        print('✅ Metadata:')
        for k, v in meta.items():
            print(f'  - {k}: {v}')
        
        # Generate email content
        print("✍️  Generating email content...")
        content = self.create_email_content(game_id, meta)
        # Extract plinko_url from the generated content
        from datetime import datetime
        now = datetime.now()
        week = now.isocalendar()[1]
        plinko_seed = f"{now.year}{week:02d}"
        plinko_url = f"{BASE_URL}/plinko/?seed={plinko_seed}"
        print(f'🔗 Plinko link for this week: {plinko_url}')
        print(f'✅ Email content ready: {content["subject"]}')
        
        # Send webhook
        print("🤖 Sending webhook to Google Chat...")
        self.send_webhook(content, game_id, meta)
        if self.webhook_only:
            print("🛑 Webhook-only mode: Skipping email send.")
            return
        # Send email
        print("📤 Sending email...")
        success = self.send_email(content)
        if success:
            print("🎉 Newsletter sent successfully!")
        else:
            print("💥 Failed to send newsletter")
            sys.exit(1)

def main():
    parser = argparse.ArgumentParser(description='Send BonjourArcade newsletter')
    parser.add_argument('--dry-run', action='store_true', 
                       help='Show what would be sent without actually sending')
    parser.add_argument('--api-url', default=DEFAULT_API_URL,
                       help='ConvertKit API URL')
    parser.add_argument('--webhook-only', action='store_true',
                       help='Send only to webhook and skip email (for testing)')
    
    args = parser.parse_args()
    
    api_secret = os.getenv('CONVERTKIT_API_SECRET')
    if not api_secret:
        print('❌ Error: API secret is required. Set CONVERTKIT_API_SECRET environment variable.')
        sys.exit(1)
    
    sender = NewsletterSender(
        api_secret=api_secret,
        api_url=args.api_url,
        dry_run=args.dry_run,
        webhook_only=args.webhook_only
    )
    
    sender.run()

if __name__ == '__main__':
    main() 
