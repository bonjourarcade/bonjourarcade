gsutil -m rsync -rd roms gs://bonjourarcade-roms
echo "Upload completed. Current bucket size:"
gcloud storage du gs://bonjourarcade-roms --summarize | awk '{if($1>=1024^3) printf "%.2f GB", $1/1024^3; else if($1>=1024^2) printf "%.2f MB", $1/1024^2; else if($1>=1024) printf "%.2f KB", $1/1024; else printf "%d bytes", $1}'
