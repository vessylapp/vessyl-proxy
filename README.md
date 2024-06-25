# Vessyl Proxy

Used for resources in [Worker](https://github.com/vessylapp/vessyl-worker)

Provide a Caddyfile to /etc/caaddy/Caddyfile

```bash
docker run --network host --name vp -v /etc/vessyl/caddy:/etc/caddy -p 80:80 -p 443:443 -d --restart always ghcr.io/vessylapp/vessyl-proxy:latest
```