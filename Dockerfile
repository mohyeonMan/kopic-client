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

COPY nginx.conf /tmp/nginx-subpath.conf
COPY nginx-root.conf /tmp/nginx-root.conf
RUN APP_BASE_PATH_NORMALIZED="${APP_BASE_PATH%/}" && \
    if [ -z "${APP_BASE_PATH_NORMALIZED}" ]; then \
      cp /tmp/nginx-root.conf /etc/nginx/conf.d/default.conf; \
    else \
      sed "s|__APP_BASE_PATH__|${APP_BASE_PATH_NORMALIZED}|g" /tmp/nginx-subpath.conf > /etc/nginx/conf.d/default.conf; \
    fi

COPY --from=build /app/dist /tmp/kopic-dist
RUN APP_BASE_PATH_NORMALIZED="${APP_BASE_PATH%/}" && \
    if [ -z "${APP_BASE_PATH_NORMALIZED}" ]; then \
      cp -R /tmp/kopic-dist/. /usr/share/nginx/html; \
    else \
      mkdir -p "/usr/share/nginx/html${APP_BASE_PATH_NORMALIZED}" && \
      cp -R /tmp/kopic-dist/. "/usr/share/nginx/html${APP_BASE_PATH_NORMALIZED}"; \
    fi && \
    rm -rf /tmp/kopic-dist

EXPOSE 80
