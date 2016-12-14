FROM node:boron

# Create app directory
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# Install app dependencies
COPY package.json /usr/src/app/
RUN npm install

# Bundle app source
COPY ./*.js /usr/src/app
COPY ./*.json /usr/src/app

CMD [ "npm", "start" ]
