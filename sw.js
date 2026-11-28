var V="riamo-v3",A="riamo-api";
var SHELL=["/","/index.html","/style.css","/app.js","/i18n.js","/i18n-extra.js","/i18n-extra2.js","/config.js","/contact.js","/consent.js","/pwa.js","/manifest.webmanifest","/icon-192.png","/icon-512.png","/confidentialite.html"];
self.addEventListener("install",function(e){
e.waitUntil(caches.open(V).then(function(c){return Promise.all(SHELL.map(function(u){return c.add(u).catch(function(){})}))}).then(function(){return self.skipWaiting()}))});
self.addEventListener("activate",function(e){
e.waitUntil(caches.keys().then(function(ks){return Promise.all(ks.filter(function(k){return k!==V&&k!==A}).map(function(k){return caches.delete(k)}))}).then(function(){return self.clients.claim()}))});
self.addEventListener("fetch",function(e){
var r=e.request;
if(r.method!=="GET")return;
var u=new URL(r.url);
if(u.origin===location.origin){
e.respondWith(fetch(r).then(function(res){var cp=res.clone();if(res.ok)caches.open(V).then(function(c){c.put(r,cp)});return res}).catch(function(){return caches.match(r).then(function(m){return m||caches.match("/index.html")}).then(function(m){return m||new Response("Hors ligne",{status:503,headers:{"Content-Type":"text/plain; charset=utf-8"}})})}));
return}
if(/^world\.open(food|beauty|products)facts\.org$/.test(u.hostname)&&u.pathname.indexOf("/api/v2/product/")===0){
e.respondWith(fetch(r).then(function(res){var cp=res.clone();if(res.ok)caches.open(A).then(function(c){c.put(r,cp).then(function(){return c.keys()}).then(function(ks){if(ks.length>60)c.delete(ks[0])})});return res}).catch(function(){return caches.match(r).then(function(m){return m||Response.error()})}));
}
});
