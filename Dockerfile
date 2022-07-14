FROM node:16.3.0-alpine
EXPOSE 8080
# enviroment variables
ENV NODE_ENV production
ENV NODE_PORT 8080
WORKDIR /app
COPY . .
RUN npm ci
ENTRYPOINT ["node", "."]
