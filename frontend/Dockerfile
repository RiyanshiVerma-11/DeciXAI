FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
COPY vite.config.js tailwind.config.js postcss.config.js ./
COPY . .
RUN npm install
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
