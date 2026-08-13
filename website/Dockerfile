FROM node:22-alpine AS build
WORKDIR /build
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
# Inlined into the client bundle at build time.
# Defaults assume the compose gateway (same-origin /api and /app/).
ARG NEXT_PUBLIC_API_URL=/api
ARG NEXT_PUBLIC_DASHBOARD_URL=/app/
# Off by default — a production build must never expose the demo account list.
# Opt in explicitly (e.g. a rehearsal box) via the compose arg / SHOW_DEMO_LOGINS.
ARG NEXT_PUBLIC_SHOW_DEMO_LOGINS=false
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_DASHBOARD_URL=$NEXT_PUBLIC_DASHBOARD_URL
ENV NEXT_PUBLIC_SHOW_DEMO_LOGINS=$NEXT_PUBLIC_SHOW_DEMO_LOGINS
RUN npm run build

FROM node:22-alpine
WORKDIR /srv/website
ENV NODE_ENV=production
# Next.js standalone server + static assets + public/ (hero3d textures, models, etc.)
COPY --from=build /build/.next/standalone ./
COPY --from=build /build/.next/static ./.next/static
COPY --from=build /build/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
