FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build Next.js app
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
