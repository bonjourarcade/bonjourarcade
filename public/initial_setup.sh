set -e
wget -N -P /media/fat/Scripts https://felx.cc/update_bonjourarcade

# Add missing .sh extension to get recognized in the MiSTer Scripts
# menu
mv /media/fat/Scripts/update_bonjourarcade{,.sh}

# Create convenient link so it shows up at the top of the Scripts menu
# on MiSTer

ln -s update_bonjourarcade.sh \@update_bonjourarcade.sh

# Launch update_bonjourarcade.sh!

/media/fat/Scripts/update_bonjourarcade.sh

echo "Installation initiale de BonjourArcade complétée avec succès. À l'avenir, tu pourras utiliser le script 'update_bonjourarcade' pour télécharger les jeux de la semaine. Tourlou!"
