# youtube-downloader
## Deployment
```bash
git clone https://github.com/MatchaOnMuffins/youtube-downloader.git
cd youtube-downloader
npm i
node . 
```

## Docker Build
```bash
docker buildx build --platform linux/amd64 --push -t matchaonmuffins/yt:latest .
```

## Docker Deploy
```bash
docker run -d -p 443:443 --mount source=ssl-auth,target=/app/auth  --name YouTube matchaonmuffins/yt:latest
```
