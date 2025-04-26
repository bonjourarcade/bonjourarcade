wget -N -P /media/fat/Scripts https://felx.cc/update_bonjourarcade

# Add missing .sh extension to get recognized in the MiSTer Scripts
# menu
mv /media/fat/Scripts/{update_bonjourarcade,\@update_bonjourarcade.sh}

# Launch update_bonjourarcade.sh!

/media/fat/Scripts/\@update_bonjourarcade.sh
