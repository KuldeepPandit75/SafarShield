FROM node

WORKDIR /safarshield

COPY package*.json ./
RUN npm ci

COPY . ./

EXPOSE 2000

CMD ["node","src/server.js"]