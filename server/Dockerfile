FROM node:20-slim
RUN apt-get update && apt-get install -y \
    openssl build-essential automake libtool git libpcre2-dev python3 texinfo poppler-utils \
    && git clone git://git.sv.gnu.org/libredwg.git \
    && cd libredwg \
    && sh autogen.sh \
    && ./configure --disable-shared \
    && make \
    && make install \
    && cd .. && rm -rf libredwg \
    && apt-get remove -y build-essential automake libtool git texinfo \
    && apt-get autoremove -y \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY prisma ./prisma
RUN npx prisma generate
COPY . .
RUN npm run build
EXPOSE 4000
CMD ["npm", "start"]
