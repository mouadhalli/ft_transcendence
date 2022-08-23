# docker build -t backend ./server

# sh clean.sh
# docker run -p 3000:3000 -d --name server backend

# docker run --name postgres-docker -e POSTGRES_PASSWORD=123 -d -p 4321:5432 postgres

#access container bash
# docker exec -it server bash

# acess postgres-container psql command line
# docker exec -it postgres-docker psql -U postgres

# start containers
# docker-compose up -d

docker-compose down

# start based on changes
docker-compose up --build -d