# frontend/Dockerfile
# Etap 1: Budowanie (Build)
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Etap 2: Serwowanie (Serve)
FROM nginx:alpine
# Kopiujemy zbudowane pliki z etapu 1 do folderu Nginx
COPY --from=build /app/dist /usr/share/nginx/html
# (Uwaga: jeśli React buduje do folderu 'build', zmień 'dist' na 'build' powyżej)
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]