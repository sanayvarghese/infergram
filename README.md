<h1><img align="center" height="50" src="./infergram-client/public/logo.png"> Infergram</h1>

[Visit Infergram](https://infergram.live/)

### Demo

[![YouTube](http://i.ytimg.com/vi/S5FUggn2u0g/hqdefault.jpg)](https://www.youtube.com/watch?v=S5FUggn2u0g)

#### To Run the app locally

```
git clone https://github.com/sanayvarghese/infergram.git
```

#### Setup the server

```
cd server
```

```
npm i
```

Add GEMINI API to .env
First create a .env file
Add the following to the file

```
GEMINI_API_KEY = "<Your Gemini API>"
```

##### To start the server

```
npx tsx src/index.ts
```

#### To Run the client

Open new terminal in root folder of project

```
cd infergram-client
```

```
npm i
```

Create .env.local and add the following

```
NEXT_PUBLIC_SOCKETSERVER=<Your server url eg: http://localhost:3001>
```

#### To start development nextjs app

```
npm run dev
```

#### To start the nextjs app

```
npm run build
```

```
npm run start
```
