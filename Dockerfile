FROM public.ecr.aws/docker/library/alpine:3.20 as build

RUN apk add --no-cache nodejs
RUN apk add --no-cache pnpm --repository=https://dl-cdn.alpinelinux.org/alpine/edge/community

WORKDIR /app

COPY package.json \
     pnpm-lock.yaml \
     ./

RUN pnpm i

COPY tsconfig.json .
COPY src src

RUN pnpm run build

FROM public.ecr.aws/docker/library/alpine:3.20 as resolve

RUN apk add --no-cache nodejs
RUN apk add --no-cache pnpm --repository=https://dl-cdn.alpinelinux.org/alpine/edge/community

WORKDIR /app

COPY package.json \
     pnpm-lock.yaml \
     ./

RUN pnpm i -P

FROM public.ecr.aws/docker/library/alpine:3.20 as runtime

RUN apk add --no-cache nodejs

ARG user=1000
ARG group=1000

USER $user:$group
WORKDIR /app

COPY --from=build /app/dist dist
COPY --from=resolve /app/node_modules node_modules

COPY templates templates
COPY configs configs
COPY package.json package.json

ENTRYPOINT ["/usr/bin/node", "dist/main.js"]
