# Base image
FROM node:18

# Create app directory
WORKDIR /usr/src/app

RUN mkdir -p /usr/src/app/uploads

# A wildcard is used to ensure both package.json AND package-lock.json are copied
COPY package*.json ./

# Install app dependencies
RUN npm install

# Bundle app source
COPY . .

expose 3000

CMD [ "sh", "-c", "npm run start:dev"]