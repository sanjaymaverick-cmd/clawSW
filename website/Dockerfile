FROM node:22-alpine AS build
WORKDIR /build
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /srv/website
ENV NODE_ENV=production
COPY --from=build /build/.next/standalone ./
COPY --from=build /build/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
