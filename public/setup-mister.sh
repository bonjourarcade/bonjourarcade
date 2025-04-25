set -e

# Install barcode launcher code
curl -sSLk https://felx.cc/install-barcode | sh

# Update barcode database
/media/fat/Scripts/update_barcode_database.sh

# Download game archive and expand locally
cd /media/fat
wget -N https://bonjourarcade-f11f7f.gitlab.io/games.zip
unzip games.zip

echo "Setup and update complete! :) Happy gaming."
