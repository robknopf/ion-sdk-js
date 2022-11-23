FROM node:18-alpine


RUN npm i -g ts-protoc-gen@0.15.0
RUN apk --no-cache add protobuf make curl git

WORKDIR /workspace

ENTRYPOINT ["make"]
