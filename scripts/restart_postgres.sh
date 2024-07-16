#!/bin/bash

sh "scripts/remove_postgres.sh"

docker volume create assistants-demo-backend-postgres-data

docker run \
	-p 5465:5432 \
	--name assistants-demo-backend-postgres \
	-e POSTGRES_PASSWORD=postgres \
	-e POSTGRES_USER=postgres \
	-e POSTGRES_DB=postgres \
	-v assistants-demo-backend-postgres-data:/var/lib/postgresql/data \
	-d postgres:14
