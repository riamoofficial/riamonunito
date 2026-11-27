(function(){
"use strict";
var ZONE="12369012",SRC="https://n6wxm.com/vignette.min.js",K="adc";
var D={
fr:{t:"Ce site affiche de la publicité (Monetag) pour rester gratuit. Elle peut utiliser des cookies ou des identifiants. Acceptes-tu ?",y:"Accepter",n:"Refuser",m:"🍪 Choix pubs"},
en:{t:"This site shows ads (Monetag) to stay free. They may use cookies or identifiers. Do you accept?",y:"Accept",n:"Decline",m:"🍪 Ad choices"},
ar:{t:"يعرض هذا الموقع إعلانات (Monetag) ليبقى مجانيًا. قد تستخدم ملفات تعريف الارتباط أو معرّفات. هل توافق؟",y:"قبول",n:"رفض",m:"🍪 خيارات الإعلانات"},
es:{t:"Este sitio muestra anuncios (Monetag) para seguir siendo gratuito. Pueden usar cookies o identificadores. ¿Aceptas?",y:"Aceptar",n:"Rechazar",m:"🍪 Opciones de anuncios"}
};
function lg(){var l=document.documentElement.lang;return D[l]?l:"fr"}
function d(k){return D[lg()][k]}
function get(){try{return localStorage.getItem(K)}catch(e){return null}}
function set(v){try{localStorage.setItem(K,v)}catch(e){}}
function el(tag,cls){var e=document.createElement(tag);if(cls)e.className=cls;return e}
function loadAd(){
if(document.getElementById("monetag-ad"))return;
var s=document.createElement("script");s.id="monetag-ad";s.dataset.zone=ZONE;s.src=SRC;document.body.appendChild(s)}
var bar=el("div","consent"),tx=el("p"),row=el("div"),y=el("button","btn"),n=el("button","btn alt"),mg=el("button","btn alt"),fp=el("p");
bar.hidden=true;
row.appendChild(y);row.appendChild(n);bar.appendChild(tx);bar.appendChild(row);
document.body.appendChild(bar);
fp.appendChild(mg);document.querySelector("footer").appendChild(fp);
function render(){tx.textContent=d("t");y.textContent=d("y");n.textContent=d("n");mg.textContent=d("m")}
y.onclick=function(){set("1");bar.hidden=true;loadAd()};
n.onclick=function(){var was=get()==="1";set("0");bar.hidden=true;if(was)location.reload()};
mg.onclick=function(){bar.hidden=false};
document.getElementById("lang").addEventListener("change",render);
render();
if(get()==="1")loadAd();else if(get()===null)bar.hidden=false;
})();
