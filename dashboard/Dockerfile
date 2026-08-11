FROM node:22-alpine AS build
WORKDIR /build
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Served at /app/ so the SPA can share an origin with the public website
# (gateway proxies /app/ → this container).
COPY --from=build /build/dist /usr/share/nginx/html/app
EXPOSE 80
