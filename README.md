# Whisp chat
Modern Chat App with encrypted private groups and rich messages support, based in Node (chat Server) and HTML Progressive Web Application ( chat Client)

You can [test it online here](http://whisp.tk).

**Characteristics & features :**
- Private Encrypted Groups (AES encryption)
- Rich messages support : Text / Audio / Images
- Multienviroment : Browser / Desktop / Devices (Progressive Web Application )
- Detachable Server
- Easilly customizable / expandable 
- Light : Server 18kb / Client 250kb
- Pure HTML and JS
- Websokets powered

# Usage

The server handles the websocket connection (ws/wss) from each client, and can at the same time deliver the Client (via http/https).

**To start the server just run the following command :**
```
$ node ./server/server.js 
```
> You can provide some command line parameters to configure some aspects of the server. 

In the following example, the server will run in port `443` , using a secure protocol for incoming connections (`wss`), and will deliver the client files via `https` through the same port, when requested.

```
$ node ./server/server.js -port=443 -ssl=true -client=true
```

# Installation
Clone the app from Github :
```
$ git clone https://github.com/colxi/whisp.git
```
...or download the latest Release in a `.zip` package [here](https://github.com/colxi/whisp/releases/latest)

# Security & `Group Key`

The usage of a `Group key` in the Client connection stage, adds another layer of security (on top of SSL used by Httpsand WSS). When setted, lets you to create **private and encrypted Groups** only accessible for those who are using the same `Group Key`. The provided key is used to encrypt (`AES encryption`) all the traffic betwen Group members (including text, audio and images).
> The longest is the used key the more secure will be the envroent

When no `Group key` is used, the traffic is protected only using SSL  (by default)

# Todo...
- Support for Room creation
- Private Messages
- Diffie-Hellman key exchange
- Password protecte rooms
- Room listing