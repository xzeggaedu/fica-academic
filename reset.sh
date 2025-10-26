git reset —hard
git fetch
git checkout dev
git pull

docker-compose down --rmi all -v --remove-orphans
docker system prune -f
docker compose up --build -d --force-recreate

echo "***** Containers Recreated *****"
