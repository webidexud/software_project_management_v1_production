FROM node:20-alpine AS builder

WORKDIR /app

# Ignorar SSL corporativo (red Universidad Distrital)
RUN npm config set strict-ssl false

COPY package*.json ./
RUN npm install

COPY . .
ARG VITE_API_URL=http://localhost/api
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM node:20-alpine
WORKDIR /app

# Ignorar SSL corporativo
RUN npm config set strict-ssl false && npm install -g serve

COPY --from=builder /app/dist ./dist
EXPOSE 3000
CMD ["serve", "-s", "dist", "-l", "3000"]