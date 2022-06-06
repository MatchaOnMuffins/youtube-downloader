FROM node:16.3.0-alpine
EXPOSE 443
WORKDIR /app
COPY . .
RUN npm install -g npm@8.11.0
RUN npm i
ENTRYPOINT ["node", "."]
