@echo off
echo Installing required packages...
pip install -r ../requirements.txt

echo.
echo Running music data enrichment...
echo This will process your CSV file and add genre/audio feature data from external APIs
echo.

python ../src/backend/enrich_music_data.py ../data/samples/spotify-tracks-2025-09-26.csv 50

echo.
echo Enrichment complete! Check the generated JSON file.
pause