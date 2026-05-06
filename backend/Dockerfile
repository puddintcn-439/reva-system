FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

RUN mkdir -p uploads

# Run as non-root for security
RUN chown -R node:node /app
USER node

EXPOSE 5000
CMD ["node", "server.js"]
