set -e

# Install barcode launcher code
curl -sSLk https://felx.cc/install-barcode | sh

# Download game archive and expand locally
cd /media/fat
wget -N https://bonjourarcade-f11f7f.gitlab.io/games.zip
unzip -o games.zip

echo "Update complete! :) Happy gaming."
