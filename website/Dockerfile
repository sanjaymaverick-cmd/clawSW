FROM node:22-alpine AS build
WORKDIR /build
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
# Inlined into the client bundle at build time: the URL browsers use to
# reach the API (the API's published port on the host).
ARG NEXT_PUBLIC_API_URL=http://localhost:8000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN npm run build

FROM node:22-alpine
WORKDIR /srv/website
ENV NODE_ENV=production
COPY --from=build /build/.next/standalone ./
COPY --from=build /build/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
