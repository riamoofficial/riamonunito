(function(){
"use strict";
var SRC={food:"https://world.openfoodfacts.org",beauty:"https://world.openbeautyfacts.org",products:"https://world.openproductsfacts.org"},API=SRC.food,LANGS=["fr","en","ar","es"],lang="",nearby=[],nearStores=[],current=null,stream=null,timer=null,scanning=false;
var OVP=["https://overpass-api.de/api/interpreter","https://overpass.kumi.systems/api/interpreter","https://overpass.private.coffee/api/interpreter"];
var FIELDS="code,product_name,brands,image_front_small_url,nutriscore_grade,nutrition_grades,nova_group,stores";
function $(id){return document.getElementById(id)}
function load(k){try{return JSON.parse(localStorage.getItem(k)||"[]")}catch(e){return[]}}
function save(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
try{lang=localStorage.getItem("lang")||""}catch(e){}
if(LANGS.indexOf(lang)<0){lang=(navigator.language||"fr").slice(0,2);if(LANGS.indexOf(lang)<0)lang="fr"}
function t(k){return(I18N[lang]&&I18N[lang][k])||I18N.fr[k]||k}
function el(tag,cls,txt){var e=document.createElement(tag);if(cls)e.className=cls;if(txt!=null)e.textContent=txt;return e}
function msg(s,err){var m=$("msg");m.textContent=s||"";m.className="msg"+(err?" err":"")}
function getJSON(u,ms){
var ac=window.AbortController?new AbortController():null,tm=ac?setTimeout(function(){ac.abort()},ms||20000):0;
return fetch(u,ac?{signal:ac.signal}:{}).then(function(r){clearTimeout(tm);if(!r.ok){var e=new Error("HTTP "+r.status);e.status=r.status;throw e}return r.json()},function(e){clearTimeout(tm);throw e})}
function getRetry(u){return getJSON(u,20000).catch(function(){return new Promise(function(r){setTimeout(r,1500)}).then(function(){return getJSON(u,20000)})})}
function errText(e){if(e&&e.name==="AbortError")return t("neterr")+" (timeout)";if(e&&[403,429,503,504].indexOf(e.status)>-1)return t("busy");return t("neterr")+" ("+((e&&e.message)||"?")+")"}
function pname(p){return p["product_name_"+lang]||p.product_name||""}
function grade(p){var g=String(p.nutriscore_grade||p.nutrition_grades||"").toLowerCase();return/^[a-e]$/.test(g)?g:""}
function rank(g){return g?"abcde".indexOf(g):-1}
function slug(s){return String(s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"")}
function tags(arr){return(arr||[]).map(function(a){var k=a.replace(/^.*:/,""),i=ALK.indexOf(k),al=(I18N[lang]||I18N.fr).al;return i>=0&&al[i]?al[i]:k.replace(/-/g," ")}).join(", ")}
function isNear(s){var a=String(s).toLowerCase().split(",");return nearby.some(function(n){return n.length>2&&a.some(function(x){x=x.trim();return x.length>2&&(n.indexOf(x)>-1||x.indexOf(n)>-1)})})}
function norm(p){return{code:p.code,name:pname(p)||p.code,brands:p.brands||"",img:p.image_front_small_url||"",g:grade(p),stores:p.stores||"",t:p.__t||"food"}}
function isFav(c){return load("fav").some(function(x){return x.code===c})}
function toggleFav(o){var L=load("fav"),i=-1;L.forEach(function(x,j){if(x.code===o.code)i=j});if(i>-1)L.splice(i,1);else L.unshift(o);save("fav",L);return i<0}
function addHist(o){var L=load("hist").filter(function(x){return x.code!==o.code});L.unshift(o);save("hist",L.slice(0,40))}
function item(o){
var li=el("li"),bx=el("div","alt-item"),tx=el("div");
if(o.img){var im=el("img");im.src=o.img;im.alt="";bx.appendChild(im)}
tx.appendChild(el("div","",o.name||o.code));
if(o.brands)tx.appendChild(el("small","",o.brands));
if(o.t&&o.t!=="food")tx.appendChild(el("span","tag",t(o.t==="beauty"?"typeBeauty":"typeHome")));
if(o.stores){tx.appendChild(el("div","small",t("sold")+" : "+o.stores));if(isNear(o.stores))tx.appendChild(el("span","tag",t("near")))}
bx.appendChild(tx);li.appendChild(bx);
if(o.g)li.appendChild(el("span","badge ns-"+o.g,o.g.toUpperCase()));
bx.onclick=function(){loadCode(o.code,o.t)};
return li}
function fill(ul,L){ul.textContent="";if(!L.length){ul.appendChild(el("li","",t("altNone")));return}L.forEach(function(o){ul.appendChild(item(o))})}
function setView(v){
["scan","hist","fav"].forEach(function(n){$("v-"+n).hidden=n!==v;$("tab-"+n).className=n===v?"on":""});
if(v==="hist")renderList("hist","histList");
if(v==="fav")renderList("fav","favList")}
function renderList(key,id){var ul=$(id),L=load(key);ul.textContent="";if(!L.length){ul.appendChild(el("li","",t("empty")));return}L.forEach(function(o){ul.appendChild(item(o))})}
function pfields(ty){return ty==="food"?FIELDS+",product_name_"+lang+",nutriments,ingredients_text,ingredients_text_"+lang+",allergens_tags,traces_tags,additives_tags,categories_tags":"code,product_name,product_name_"+lang+",brands,image_front_small_url,quantity,labels,periods_after_opening,ingredients_text,ingredients_text_"+lang+",categories_tags,stores"}
function fetchProduct(code,ty){
return getJSON(SRC[ty]+"/api/v2/product/"+encodeURIComponent(code)+".json?fields="+pfields(ty),15000).then(function(d){
if(d.status===1&&d.product){d.product.code=d.product.code||d.code||code;d.product.__t=ty;return d.product}
return null})}
function loadCode(code,type){
stopScan();setView("scan");msg(t("loading"));$("results").hidden=true;
var order=type?[type]:["food","beauty","products"],i=0,errs=0,last=null;
function next(){
if(i>=order.length){msg(errs===order.length?errText(last):t("notfound"),true);$("product").hidden=true;return}
fetchProduct(code,order[i++]).catch(function(e){errs++;last=e;return null}).then(function(p){
if(p){msg("");current=p;addHist(norm(p));showAny(p);window.scrollTo(0,0)}else next()}).catch(function(e){msg(errText(e),true)})}
next()}
function searchName(q){
msg(t("loading"));$("product").hidden=true;
var fails=0,jobs=["food","beauty","products"].map(function(ty){
return getJSON(SRC[ty]+"/cgi/search.pl?search_simple=1&action=process&json=1&page_size=8&fields="+FIELDS+",product_name_"+lang+"&search_terms="+encodeURIComponent(q),15000)
.then(function(d){return(d.products||[]).filter(function(p){return p.code}).map(function(p){var o=norm(p);o.t=ty;return o})})
.catch(function(){fails++;return[]})});
Promise.all(jobs).then(function(R){
var L=[].concat.apply([],R),bx=$("results"),ul=el("ul","list");
if(!L.length){msg(fails===3?t("neterr"):t("notfound"),true);bx.hidden=true;return}
msg("");bx.textContent="";bx.hidden=false;bx.appendChild(el("h2","",t("results")));
L.forEach(function(o){ul.appendChild(item(o))});bx.appendChild(ul)})}
function showAny(p){if((p.__t||"food")==="food")showProduct(p);else showOther(p)}
function showOther(p){
var box=$("product"),c=el("section","card"),head=el("div","head"),o=norm(p);
box.hidden=false;box.textContent="";
if(o.img){var im=el("img");im.src=o.img;im.alt="";head.appendChild(im)}
var h=el("div");h.appendChild(el("h1","",o.name));h.appendChild(el("div","small",o.brands));h.appendChild(el("span","tag",t(p.__t==="beauty"?"typeBeauty":"typeHome")));head.appendChild(h);
var fb=el("button","star",isFav(o.code)?"★":"☆");
fb.onclick=function(){fb.textContent=toggleFav(o)?"★":"☆"};
head.appendChild(fb);c.appendChild(head);
function line(k,s){var d=el("p");d.appendChild(el("b","",t(k)+" : "));d.appendChild(document.createTextNode(s));c.appendChild(d)}
if(p.quantity)line("qty",p.quantity);
if(p.labels)line("labels",p.labels);
if(p.periods_after_opening)line("pao",p.periods_after_opening);
line("ingredients",p["ingredients_text_"+lang]||p.ingredients_text||"–");
c.appendChild(el("p","small",t("otherNote")));
box.appendChild(c)}
function showProduct(p){
var box=$("product"),c=el("section","card"),head=el("div","head"),o=norm(p);
box.hidden=false;box.textContent="";
if(o.img){var im=el("img");im.src=o.img;im.alt="";head.appendChild(im)}
var h=el("div");h.appendChild(el("h1","",o.name));h.appendChild(el("div","small",o.brands));head.appendChild(h);
var fb=el("button","star",isFav(o.code)?"★":"☆");
fb.onclick=function(){fb.textContent=toggleFav(o)?"★":"☆"};
head.appendChild(fb);c.appendChild(head);
var g=o.g,nv=parseInt(p.nova_group,10)||0,adds=(p.additives_tags||[]).length,sc=el("div","scale"),bd=el("div","badges");
"abcde".split("").forEach(function(l){sc.appendChild(el("span","sc ns-"+l+(l===g?" on":""),l.toUpperCase()))});
c.appendChild(sc);
bd.appendChild(el("span","badge"+(g?" ns-"+g:""),t("nutri")+" "+(g?g.toUpperCase():"?")));
bd.appendChild(el("span","badge",t("nova")+" "+(nv||"?")));c.appendChild(bd);
var bad=g==="d"||g==="e"||nv===4||adds>=5,good=(g==="a"||g==="b")&&nv<4&&adds<5;
var vd=el("div","verdict "+(bad?"v-bad":good?"v-ok":"v-mid")),lgi=el("img","vlogo");
lgi.src="/icon-192.png";lgi.alt="";vd.appendChild(lgi);vd.appendChild(document.createTextNode(t(bad?"vBad":good?"vOk":"vMid")));
c.appendChild(vd);c.appendChild(el("p","small",t("vNote")));
var n=p.nutriments||{},rows=[["energy","energy-kcal_100g"," kcal"],["fat","fat_100g"," g"],["sat","saturated-fat_100g"," g"],["carbs","carbohydrates_100g"," g"],["sugars","sugars_100g"," g"],["fiber","fiber_100g"," g"],["protein","proteins_100g"," g"],["salt","salt_100g"," g"]],tb=el("table");
c.appendChild(el("h2","",t("per100")));
rows.forEach(function(r){var v=n[r[1]],tr=el("tr");tr.appendChild(el("td","",t(r[0])));tr.appendChild(el("td","",(v==null||v==="")?"–":(Math.round(v*10)/10)+r[2]));tb.appendChild(tr)});
c.appendChild(tb);
function line(k,s){var d=el("p");d.appendChild(el("b","",t(k)+" : "));d.appendChild(document.createTextNode(s));c.appendChild(d)}
line("ingredients",p["ingredients_text_"+lang]||p.ingredients_text||"–");
line("allergens",tags(p.allergens_tags)||t("none"));
line("traces",tags(p.traces_tags)||t("none"));
line("additives",(p.additives_tags||[]).map(function(a){return a.replace(/^.*:/,"").toUpperCase()}).join(", ")||t("none"));
c.appendChild(el("h2","",t("whereBuy")));
var st=(p.stores||"").split(",").map(function(s){return s.trim()}).filter(Boolean).slice(0,8);
if(!st.length)c.appendChild(el("p","small",t("noStore")));
else{var w=el("div","chips");st.forEach(function(s){var a=el("a","chip",s+(isNear(s)?" "+t("nearYou"):""));a.href="https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(s);a.target="_blank";a.rel="noopener noreferrer";w.appendChild(a)});c.appendChild(w)}
box.appendChild(c);
var ac=el("section","card"),bt=el("button","btn alt",t("showAlt")),u1=el("ul","list"),u2=el("ul","list"),b2=el("button","btn alt",t("findNear")),u3=el("div");
ac.appendChild(el("h2","",t("altTitle")));ac.appendChild(bt);
ac.appendChild(el("h3","",t("altGood")));ac.appendChild(u1);
ac.appendChild(el("h3","",t("altBad")));ac.appendChild(u2);
ac.appendChild(b2);ac.appendChild(el("h3","",t("altStore")));ac.appendChild(u3);
box.appendChild(ac);
bt.onclick=function(){loadAlts(p,u1,u2,bt)};
b2.onclick=function(){storeAlts(p,u3,b2)};
loadAlts(p,u1,u2,bt,true)}
function catParam(tag){return tag.indexOf("en:")===0?"categories_tags_en="+encodeURIComponent(tag.slice(3)):"categories_tags="+encodeURIComponent(tag)}
function offSearch(p,grades,extra){
var cats=(p.categories_tags||[]).slice().reverse().slice(0,3),out=[];
function step(i){
if(i>=cats.length||out.length>=6)return Promise.resolve(out);
return getRetry(API+"/api/v2/search?"+catParam(cats[i])+"&nutrition_grades_tags="+encodeURIComponent(grades)+(extra||"")+"&page_size=15&fields="+FIELDS+",product_name_"+lang)
.then(function(d){(d.products||[]).forEach(function(x){if(x.code&&x.code!==p.code&&!out.some(function(y){return y.code===x.code}))out.push(x)});return step(i+1)})}
return step(0)}
function rsort(L,bad){return L.filter(function(x){return grade(x)}).sort(function(a,b){var d=rank(grade(a))-rank(grade(b)),v=(parseInt(a.nova_group,10)||9)-(parseInt(b.nova_group,10)||9);return bad?(-d||-v):(d||v)})}
function loadAlts(p,u1,u2,bt,cacheOnly){
var cat=(p.categories_tags||[]).slice(-1)[0];
if(!cat){fill(u1,[]);fill(u2,[]);bt.hidden=true;return}
var k1="alt3:"+cat+":good",k2="alt3:"+cat+":bad",c1=load(k1),c2=load(k2);
if(c1.length||c2.length){bt.hidden=true;fill(u1,c1);fill(u2,c2);return}
if(cacheOnly)return;
bt.disabled=true;u1.textContent="";u2.textContent="";
u1.appendChild(el("li","",t("loading")));u2.appendChild(el("li","",t("loading")));
offSearch(p,"a|b").then(function(L){var R=rsort(L,false).slice(0,8).map(norm);if(R.length)save(k1,R);fill(u1,R);return offSearch(p,"d|e")})
.then(function(L){var R=rsort(L,true).slice(0,8).map(norm);if(R.length)save(k2,R);fill(u2,R);bt.hidden=true})
.catch(function(e){bt.disabled=false;bt.textContent=t("retry");[u1,u2].forEach(function(u){if(u.textContent===t("loading")){u.textContent="";u.appendChild(el("li","err",errText(e)))}})})}
function storeAlts(p,box,btn){
btn.disabled=true;box.textContent="";
function run(){
var S=nearStores.slice(0,3);
if(!S.length){box.appendChild(el("p","small",t("nostores")));btn.disabled=false;return}
S.reduce(function(pr,s){return pr.then(function(){
var sec=el("div"),ul=el("ul","list");
sec.appendChild(el("h4","",t("at")+" "+s.name+" · "+s.d.toFixed(1)+" km"));sec.appendChild(ul);box.appendChild(sec);
ul.appendChild(el("li","",t("loading")));
return offSearch(p,"a|b","&stores_tags="+encodeURIComponent(s.slug)).then(function(L){fill(ul,rsort(L,false).slice(0,5).map(norm))}).catch(function(e){ul.textContent="";ul.appendChild(el("li","err",errText(e)))})})},Promise.resolve()).then(function(){btn.disabled=false})}
if(nearStores.length)run();else locate(run,function(){btn.disabled=false})}
function dist(a,b,c,d){var R=6371,r=Math.PI/180,x=(c-a)*r,y=(d-b)*r,h=Math.sin(x/2)*Math.sin(x/2)+Math.cos(a*r)*Math.cos(c*r)*Math.sin(y/2)*Math.sin(y/2);return 2*R*Math.asin(Math.sqrt(h))}
function overpass(q,i){
var ac=window.AbortController?new AbortController():null,tm=ac?setTimeout(function(){ac.abort()},12000):0;
return fetch(OVP[i],{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:"data="+encodeURIComponent(q),signal:ac?ac.signal:undefined})
.then(function(r){clearTimeout(tm);if(!r.ok){var e=new Error("HTTP "+r.status);e.status=r.status;throw e}return r.json()})
.catch(function(e){clearTimeout(tm);if(i+1<OVP.length)return overpass(q,i+1);throw e})}
function locate(cb,fail){
var ul=$("stores");ul.textContent="";
function bad(){if(fail)fail()}
if(!navigator.geolocation){ul.appendChild(el("li","",t("locDenied")));bad();return}
ul.appendChild(el("li","",t("locating")));
navigator.geolocation.getCurrentPosition(function(pos){
var la=pos.coords.latitude,lo=pos.coords.longitude;
ul.textContent="";ul.appendChild(el("li","",t("searching")));
var q='[out:json][timeout:15];(node["shop"="supermarket"](around:3000,'+la+','+lo+');way["shop"="supermarket"](around:3000,'+la+','+lo+'););out center 25;';
overpass(q,0).then(function(d){
var arr=(d.elements||[]).map(function(e){var tg=e.tags||{},y=e.lat!=null?e.lat:(e.center&&e.center.lat),x=e.lon!=null?e.lon:(e.center&&e.center.lon);return{name:tg.name||tg.brand||"Supermarket",slug:slug(tg.brand||tg.name),lat:y,lon:x,d:dist(la,lo,y,x)}}).filter(function(s){return s.lat!=null&&s.lon!=null}).sort(function(a,b){return a.d-b.d}).slice(0,12);
nearby=arr.map(function(s){return s.name.toLowerCase()});
var seen={};nearStores=arr.filter(function(s){if(!s.slug||seen[s.slug])return false;seen[s.slug]=1;return true});
ul.textContent="";
if(!arr.length){ul.appendChild(el("li","",t("nostores")));bad();return}
arr.forEach(function(s){var li=el("li"),tx=el("div"),a=el("a","",t("route"));
tx.appendChild(el("div","",s.name));tx.appendChild(el("small","",s.d.toFixed(1)+" km"));li.appendChild(tx);
a.href="https://www.google.com/maps/dir/?api=1&destination="+s.lat+","+s.lon;a.target="_blank";a.rel="noopener noreferrer";li.appendChild(a);ul.appendChild(li)});
if(cb)cb();else if(current)showAny(current)})
.catch(function(e){ul.textContent="";var li=el("li","err",errText(e)+" "),a=el("a","",t("openMaps"));
a.href="https://www.google.com/maps/search/supermarket/@"+la+","+lo+",14z";a.target="_blank";a.rel="noopener noreferrer";li.appendChild(a);ul.appendChild(li);bad()})
},function(){ul.textContent="";ul.appendChild(el("li","",t("locDenied")));bad()},{enableHighAccuracy:false,timeout:20000,maximumAge:60000})}
function stopScan(){scanning=false;clearInterval(timer);if(stream){stream.getTracks().forEach(function(tr){tr.stop()});stream=null}var v=$("cam");v.hidden=true;v.srcObject=null;$("scan").textContent=t("scan")}
function startScan(){
if(scanning){stopScan();return}
if(!("BarcodeDetector" in window)){msg(t("nodet"),true);return}
if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){msg(t("nocam"),true);return}
var det=new BarcodeDetector({formats:["ean_13","ean_8","upc_a","upc_e"]});
navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"}},audio:false}).then(function(s){
var v=$("cam");stream=s;scanning=true;v.srcObject=s;v.hidden=false;v.play();$("scan").textContent=t("stop");msg("");
timer=setInterval(function(){if(v.readyState<2||!scanning)return;
det.detect(v).then(function(r){if(r.length&&scanning){var code=r[0].rawValue;$("q").value=code;loadCode(code)}}).catch(function(){})},400)
}).catch(function(){msg(t("nocam"),true)})}
function applyLang(){
document.documentElement.lang=lang;document.documentElement.dir=lang==="ar"?"rtl":"ltr";
document.querySelectorAll("[data-i18n]").forEach(function(n){n.textContent=t(n.getAttribute("data-i18n"))});
document.querySelectorAll("[data-i18n-ph]").forEach(function(n){n.placeholder=t(n.getAttribute("data-i18n-ph"))});
$("scan").textContent=t(scanning?"stop":"scan");$("lang").value=lang;
try{localStorage.setItem("lang",lang)}catch(e){}}
function go(){var q=$("q").value.trim();if(!q)return;if(/^\d{8,14}$/.test(q))loadCode(q);else searchName(q)}
$("go").onclick=go;
$("q").addEventListener("keydown",function(e){if(e.key==="Enter")go()});
$("scan").onclick=startScan;
$("loc").onclick=function(){locate()};
$("tab-scan").onclick=function(){setView("scan");window.scrollTo(0,0)};
$("tab-hist").onclick=function(){setView("hist");window.scrollTo(0,0)};
$("tab-fav").onclick=function(){setView("fav");window.scrollTo(0,0)};
$("histClear").onclick=function(){save("hist",[]);renderList("hist","histList")};
$("lang").onchange=function(){lang=this.value;applyLang();if(current)showAny(current)};
applyLang();
})();
