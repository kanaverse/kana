FROM node:latest

# Expose the app port
EXPOSE 3000

COPY . /kana
WORKDIR /kana

# Build a static version of the app for deployment
RUN npm i --include=dev --force 
RUN npm dedupe --force 

# build the app
CMD PUBLIC_URL="/kana" npm run build

# Start the app
#CMD npm run start
