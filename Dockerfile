# Gamitin ang Node.js LTS version
FROM node:20-alpine

# Gumawa at pumunta sa working directory
WORKDIR /app

# Kopyahin muna ang package files para sa dependencies
COPY package*.json ./

# I-install ang dependencies
RUN npm install

# Kopyahin ang buong source code
COPY . .

# I-expose ang Vite default dev server port (5173)
EXPOSE 5173

# Patakbuhin ang Vite sa host mode para ma-access mo sa labas ng container
CMD ["npm", "run", "dev", "--", "--host"]