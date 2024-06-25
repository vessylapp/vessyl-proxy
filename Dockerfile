FROM node:20-alpine

RUN apk add --no-cache caddy

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 80
EXPOSE 443

CMD ["sh", "-c", "caddy fmt --overwrite && caddy start --config /etc/caddy/Caddyfile"]
