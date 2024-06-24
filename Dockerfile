FROM node:20-alpine

RUN apk add --no-cache caddy

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

COPY Caddyfile /etc/caddy/Caddyfile

EXPOSE 80
EXPOSE 443

CMD ["sh", "-c", "caddy start --config /etc/caddy/Caddyfile && npm run start"]
