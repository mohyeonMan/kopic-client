FROM node:22-alpine AS build

ARG VITE_APP_BASE_PATH=/kopic/
ARG VITE_WS_PATH=/kopic/ws
ARG VITE_GE_ID=ge-local
ENV VITE_APP_BASE_PATH=${VITE_APP_BASE_PATH}
ENV VITE_WS_PATH=${VITE_WS_PATH}
ENV VITE_GE_ID=${VITE_GE_ID}

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:1.27-alpine

ARG APP_BASE_PATH=/kopic

COPY nginx.conf /tmp/nginx.conf
RUN APP_BASE_PATH_NORMALIZED="${APP_BASE_PATH%/}" && \
    sed "s|/kopic|${APP_BASE_PATH_NORMALIZED}|g" /tmp/nginx.conf > /etc/nginx/conf.d/default.conf

COPY --from=build /app/dist /tmp/kopic-dist
RUN APP_BASE_PATH_NORMALIZED="${APP_BASE_PATH%/}" && \
    mkdir -p "/usr/share/nginx/html${APP_BASE_PATH_NORMALIZED}" && \
    cp -R /tmp/kopic-dist/. "/usr/share/nginx/html${APP_BASE_PATH_NORMALIZED}" && \
    rm -rf /tmp/kopic-dist

EXPOSE 80
