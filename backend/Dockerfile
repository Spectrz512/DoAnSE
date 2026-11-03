FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY prisma ./prisma
COPY prisma7.config.ts tsconfig*.json nest-cli.json ./
RUN npx prisma generate
COPY src ./src
RUN npm run build

FROM node:22-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma7.config.ts ./prisma7.config.ts
ENV SEED_ON_START=false
EXPOSE 3000
# 1) migrate deploy: chỉ áp dụng các migration chưa chạy, không xóa dữ liệu
# 2) seed dữ liệu mẫu chỉ khi SEED_ON_START=true (seed ghi đè nội dung POI về bản mẫu)
CMD ["sh", "-c", "npx prisma migrate deploy && if [ \"$SEED_ON_START\" = \"true\" ]; then npx tsx prisma/seed.ts; fi && exec node dist/main.js"]