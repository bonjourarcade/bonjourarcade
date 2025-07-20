#!/usr/bin/env python3
"""
Newsletter Email Sender for BonjourArcade

This script reads the current game of the week and sends a newsletter email
to subscribers using ConvertKit API and to one or more webhooks (e.g., Google Chat, Discord).

Requirements:
- requests library: pip install requests
- ConvertKit account and API credentials
- Set CONVERTKIT_API_SECRET environment variable
- Set up a JSON file mapping webhook labels to env var names (see --webhook-map)
- Set the corresponding environment variables for webhook URLs

Usage:
    python send_newsletter.py [--dry-run] [--mail-api-url URL] [--mail-only] [--webhook-only] [--webhook-map webhook_map.json] [--webhook-label LABEL]

Options:
    --mail-api-url   Override the ConvertKit API URL for sending email (default: https://api.convertkit.com/v3)
    --mail-only      Only send the email (no webhooks)
    --webhook-only   Only send to webhooks (no email)
    --webhook-map    Path to JSON file mapping webhook labels to env var names
    --webhook-label  Only send to the webhook with this label from the map
    --dry-run        Show what would be sent without actually sending
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
import tempfile
import subprocess
import questionary

# Configuration - Only keep what's needed
DEFAULT_API_URL = 'https://api.convertkit.com/v3'
BASE_URL = 'https://bonjourarcade-f11f7f.gitlab.io'

class NewsletterSender:
    def __init__(self, api_secret, api_url=DEFAULT_API_URL, dry_run=False, webhook_only=False):
        self.api_secret = api_secret
        self.api_url = api_url
        self.dry_run = dry_run
        self.webhook_only = webhook_only
        # Compute plinko_url once for the instance
        from datetime import datetime
        now = datetime.now()
        week = now.isocalendar()[1]
        plinko_seed = f"{now.year}{week:02d}"
        self.plinko_url = f"https://felx.cc/plinko/{plinko_seed}"

    def summarize_controls(self, controls):
        """
        Summarize the controls array from metadata:
        - Only show the emoji for each control (first emoji per line)
        - Replace any number-in-square emoji (1️⃣, 2️⃣, etc) with 🔴
        - If two lines start with a joystick emoji, show 🕹️🕹️
        """
        if not controls or not isinstance(controls, list):
            return ''
        joystick_lines = [line for line in controls if str(line).strip().startswith('🕹️')]
        if len(joystick_lines) >= 2:
            return '🕹️🕹️'
        summary = ''
        for line in controls:
            line = str(line).strip()
            if not line:
                continue
            # Extract the first emoji (or character)
            first = line.split()[0]
            # Replace number-in-square emoji with 🔴
            if first in ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '0️⃣']:
                first = '🔴'
            summary += first + ' '
        return summary.strip()

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
    
    def create_email_content(self, game_id, meta, custom_message=None):
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
        controls = self.summarize_controls(meta.get('controls'))
        description = clean_title
        subject = f'🕹️ Jeu de la semaine - {title}'
        # Insert custom message if provided
        custom_html = f'<div style="margin-bottom:18px;font-size:1.1em;">{custom_message}</div>' if custom_message else ''
        html_content = f'''
        <html><body>
        {custom_html}
        <ul>
        <li><b>Titre :</b> {clean_title}</li>
        <li><b>Développeur :</b> {developer}</li>
        <li><b>Année :</b> {year}</li>
        <li><b>Genre :</b> {genre}</li>
        <li><b>Contrôles :</b> {controls}</li>
        </ul>
        <div style="text-align:center;margin:24px 0;">
            <a href="{play_url}" style="display:inline-block;background:#fffd37;color:#111;padding:18px 36px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:1.3em;margin-right:18px;">🕹️ Jouer maintenant</a>
            <a href="{leaderboard_url}" style="display:inline-block;background:#007bff;color:#fff;padding:18px 36px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:1.3em;">🏆 Classements</a>
        </div>
        <img src="{cover_url}" alt="Couverture de {clean_title}" style="max-width:320px;width:100%;border-radius:8px;display:block;margin:0 auto 16px auto;">
        <div style="text-align:center;margin:8px 0 24px 0;font-size:1em;">
            <a href="{self.plinko_url}" style="color:#007bff;text-decoration:underline;">🎲 Voir le tirage plinko</a>
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
    
    def send_webhook(self, content, game_id, meta, webhook_map_path=None, filter_label=None, custom_message=None):
        """Send a plaintext version of the newsletter to one or more webhooks, using a JSON map of label:{env,type}. Optionally filter by label."""
        import requests
        import os
        import json
        if webhook_map_path is None:
            webhook_map_path = "webhook_map.json"
        # Read webhook map JSON file
        if not os.path.exists(webhook_map_path):
            print(f"⚠️  Webhook map file '{webhook_map_path}' not found. Skipping webhook notification.")
            return
        with open(webhook_map_path, "r") as f:
            try:
                webhook_map = json.load(f)
            except Exception as e:
                print(f"⚠️  Failed to parse webhook map JSON: {e}. Skipping webhook notification.")
                return
        play_url = f'https://felx.cc/b/{game_id}'
        cover_url = f'{BASE_URL}/games/{game_id}/cover.png'
        leaderboard_url = f'https://alloarcade.web.app/leaderboards/{game_id}'
        title = meta.get('title', game_id)
        developer = meta.get('developer', 'Inconnu')
        year = meta.get('year', 'Inconnue')
        genre = meta.get('genre', 'Non spécifié')
        controls = self.summarize_controls(meta.get('controls'))
        # Insert custom message if provided
        custom_text = f"{custom_message}\n\n" if custom_message else ''
        # Message template with {b} for bold, now includes plinko link
        message_template = f"""
{custom_text}{{b}}Jeu de la semaine :{{b}} {title}
{{b}}Développeur :{{b}} {developer}
{{b}}Année :{{b}} {year}
{{b}}Genre :{{b}} {genre}
{{b}}Contrôles :{{b}} {controls}
{{b}}Image :{{b}} {cover_url}
🎲 {{b}}Tirage Plinko :{{b}} {self.plinko_url}

🕹️ {{b}}Faites-en l'essai :{{b}} {play_url}
🏆 {{b}}Classements :{{b}} {leaderboard_url}

Bonne semaine ! ☀️
""".strip()
        sent_any = False
        # If filter_label is set, only use that label
        if filter_label:
            if filter_label not in webhook_map:
                print(f"⚠️  Webhook label '{filter_label}' not found in map. Skipping webhook notification.")
                return
            items = [(filter_label, webhook_map[filter_label])]
        else:
            items = webhook_map.items()
        if self.dry_run:
            print("=== DRY RUN MODE (WEBHOOKS) ===")
            for label, info in items:
                env_var = info.get('env')
                wtype = info.get('type')
                url = os.getenv(env_var) if env_var else None
                if not url:
                    print(f"⚠️  Env var '{env_var}' for webhook label '{label}' is not set. Skipping.")
                    continue
                if wtype == 'discord':
                    bold = '**'
                    payload = {"content": message_template.replace('{b}', bold)}
                elif wtype == 'googlechat':
                    bold = '*'
                    payload = {"text": message_template.replace('{b}', bold)}
                else:
                    print(f"⚠️  Unknown webhook type '{wtype}' for label '{label}'. Skipping.")
                    continue
                print(f"[DRY RUN] Would send webhook to '{label}' (env: {env_var}, type: {wtype}, url: {url}):\n{payload}\n")
                sent_any = True
            if not sent_any:
                print("⚠️  No webhook messages would be sent (no valid URLs found).")
            return
        for label, info in items:
            env_var = info.get('env')
            wtype = info.get('type')
            url = os.getenv(env_var) if env_var else None
            if not url:
                print(f"⚠️  Env var '{env_var}' for webhook label '{label}' is not set. Skipping.")
                continue
            if wtype == 'discord':
                bold = '**'
                payload = {"content": message_template.replace('{b}', bold)}
            elif wtype == 'googlechat':
                bold = '*'
                payload = {"text": message_template.replace('{b}', bold)}
            else:
                print(f"⚠️  Unknown webhook type '{wtype}' for label '{label}'. Skipping.")
                continue
            try:
                resp = requests.post(url, json=payload)
                resp.raise_for_status()
                print(f"✅ Webhook message sent to '{label}' (env: {env_var}, type: {wtype})")
                sent_any = True
            except requests.exceptions.RequestException as e:
                print(f"❌ Error sending webhook to '{label}' (env: {env_var}, type: {wtype}): {e}")
                if hasattr(e, 'response') and e.response:
                    print(f"Response: {e.response.text}")
        if not sent_any:
            print("⚠️  No webhook messages sent (no valid URLs found).")

    def run(self, webhook_map_path=None, filter_label=None, mail_only=False, custom_message=None):
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
        content = self.create_email_content(game_id, meta, custom_message=custom_message)
        print(f'🔗 Plinko link for this week: {self.plinko_url}')
        print(f'✅ Email content ready: {content["subject"]}')
        
        # Send webhook unless mail_only is set
        if not mail_only:
            self.send_webhook(content, game_id, meta, webhook_map_path=webhook_map_path, filter_label=filter_label, custom_message=custom_message)
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
    parser.add_argument('--mail-api-url', default=DEFAULT_API_URL,
                       help='ConvertKit API URL (for sending email/broadcasts)')
    parser.add_argument('--webhook-only', action='store_true',
                       help='Send only to webhook and skip email (for testing)')
    parser.add_argument('--mail-only', action='store_true',
                       help='Send only the email (no webhooks)')
    parser.add_argument('--webhook-map', default='webhook_map.json',
                       help='Path to JSON file mapping webhook labels to env var names (default: webhook_map.json)')
    parser.add_argument('--webhook-label', default=None, type=str,
                       help='Only send to the webhook with this label from the map (for testing)')
    parser.add_argument('--custom-message', default=None, type=str,
                      help='Custom message to introduce the game of the week (appears at the top of the email and webhook)')
    
    args = parser.parse_args()

    # Interactive Vim editing if no custom message is provided
    custom_message = args.custom_message
    if custom_message is None:
        print("No custom message provided. Opening Vim for you to type your introduction message. Save and quit to continue...")
        import tempfile, os
        comment_line = "Cette semaine, Plinko a choisi\n"
        fd, temp_path = tempfile.mkstemp(suffix=".tmp")
        try:
            with os.fdopen(fd, 'w') as tf:
                tf.write(comment_line)
            editor = os.environ.get('EDITOR', 'vim')
            if editor == 'vim' or editor.endswith('/vim'):
                subprocess.call(['vim', '-c', 'set spell spelllang=fr', temp_path])
            else:
                subprocess.call([editor, temp_path])
            with open(temp_path, 'r') as tf:
                lines = tf.readlines()
            # Remove comment lines and join
            message = ''.join([line for line in lines if not line.strip().startswith('#')]).strip()
            if not message:
                print("Aucun message saisi. Abandon.")
                sys.exit(0)
            print("\nVotre message d'introduction :\n" + '-'*40)
            print(message)
            print('-'*40)
            confirm = input("Est-ce correct ? [y/N]: ").strip().lower()
            if confirm not in ('o', 'y', 'yes'):
                print("Abandon. Aucun message envoyé.")
                sys.exit(0)
            custom_message = message
        finally:
            os.remove(temp_path)

    api_secret = os.getenv('CONVERTKIT_API_SECRET')
    if not api_secret:
        print('❌ Error: API secret is required. Set CONVERTKIT_API_SECRET environment variable.')
        sys.exit(1)
    
    # Interactive webhook selection if no --webhook-label is provided
    selected_webhook_labels = None
    if args.webhook_label is None:
        webhook_map_path = args.webhook_map
        if not os.path.exists(webhook_map_path):
            print(f"⚠️  Webhook map file '{webhook_map_path}' not found. Skipping webhook selection.")
        else:
            with open(webhook_map_path, "r") as f:
                try:
                    webhook_map = json.load(f)
                except Exception as e:
                    print(f"⚠️  Failed to parse webhook map JSON: {e}. Skipping webhook selection.")
                    webhook_map = None
            if webhook_map:
                choices = list(webhook_map.keys())
                # Add ConvertKit Email as a selectable option
                MAILING_LIST_LABEL = "ConvertKit Email"
                choices.insert(0, MAILING_LIST_LABEL)
                selected = questionary.checkbox(
                    "Sélectionnez les webhooks auxquels envoyer :",
                    choices=choices
                ).ask()
                if not selected:
                    print("Aucun webhook sélectionné. Abandon.")
                    sys.exit(0)
                selected_webhook_labels = selected
    else:
        selected_webhook_labels = [args.webhook_label]

    sender = NewsletterSender(
        api_secret=api_secret,
        api_url=args.mail_api_url,
        dry_run=args.dry_run,
        webhook_only=args.webhook_only
    )
    
    # If selected_webhook_labels is set, send to each label in turn
    if selected_webhook_labels is not None:
        MAILING_LIST_LABEL = "ConvertKit Email"
        # If ConvertKit Email is selected, send the email
        if MAILING_LIST_LABEL in selected_webhook_labels:
            sender.run(
                webhook_map_path=args.webhook_map,
                filter_label=None,  # No filter, so email is sent
                mail_only=True,     # Only send email in this run
                custom_message=custom_message
            )
            # Remove it from the list so it's not treated as a webhook
            selected_webhook_labels = [lbl for lbl in selected_webhook_labels if lbl != MAILING_LIST_LABEL]
        # Only send to webhooks if any remain
        if selected_webhook_labels:
            for label in selected_webhook_labels:
                sender.run(
                    webhook_map_path=args.webhook_map,
                    filter_label=label,
                    mail_only=args.mail_only,
                    custom_message=custom_message
                )
    else:
        sender.run(
            webhook_map_path=args.webhook_map,
            filter_label=args.webhook_label,
            mail_only=args.mail_only,
            custom_message=custom_message
        )

if __name__ == '__main__':
    main() 
