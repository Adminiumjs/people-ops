# Multi-stage build: compile the static site with Node, serve it with Caddy.
# Works on any container host ("host anywhere").

# --- build ---
FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .

# Connected mode, decided at BUILD time because that is when Vite inlines it.
# Both default to empty, and empty is the demo-mode branch — an image built with
# neither behaves exactly as it did before connected mode existed, which is what
# the marketplace demos rely on.
#
# This app is STAFF-ONLY (§5.3), so the key is a staff-side one. It still ends
# up in the bundle a browser downloads, which is what `adm_pub_` is FOR (28 D3):
# a scope selector, not a credential. A secret `adm_sk_` key would be a leak.
ARG VITE_ADMINIUM_API_BASE_URL=""
ARG VITE_ADMINIUM_PUBLISHABLE_KEY=""
ENV VITE_ADMINIUM_API_BASE_URL=$VITE_ADMINIUM_API_BASE_URL
ENV VITE_ADMINIUM_PUBLISHABLE_KEY=$VITE_ADMINIUM_PUBLISHABLE_KEY

RUN npm run build

# --- serve ---
FROM caddy:2-alpine
COPY --from=build /app/dist /srv
COPY Caddyfile /etc/caddy/Caddyfile
EXPOSE 80
