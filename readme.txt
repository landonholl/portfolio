start command:

docker run --rm -it -p 5173:5173 -v "${PWD}:/app" -w /app node:lts yarn dev --host 0.0.0.0

without polling:

docker run --rm -it -p 5173:5173 -v "${PWD}:/app" -w /app node:lts yarn dev --host 0.0.0.0
