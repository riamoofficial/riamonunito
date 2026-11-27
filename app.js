(function(){
"use strict";
var API="https://world.openfoodfacts.org",LANGS=["fr","en","ar","es"],lang="",nearby=[],current=null,stream=null,timer=null,scanning=false;
function $(id){return document.getElementById(id)}
try{lang=localStorage.getItem("lang")||""}catch(e){}
if(LANGS.indexOf(lang)<0){lang=(navigator.language||"fr").slice(0,2);if(LANGS.indexOf(lang)<0)lang="fr"}
function t(k){return(I18N[lang]&&I18N[lang][k])||I18N.fr[k]||k}
function el(tag,cls,txt){var e=document.createElement(tag);if(cls)e.className=cls;if(txt!=null)e.textContent=txt;return e}
function msg(s,err){var m=$("msg");m.textContent=s||"";m.className="msg"+(err?" err":"")}
function getJSON(u){return fetch(u).then(function(r){if(!r.ok)throw new Error(r.status);return r.json()})}
function pname(p){return p["product_name_"+lang]||p.product_name||""}
function grade(p){var g=String(p.nutriscore_grade||p.nutrition_grades||"").toLowerCase();return/^[a-e]$/.test(g)?g:""}
function rank(g){return g?"abcde".indexOf(g):-1}
function tags(arr){return(arr||[]).map(function(a){var k=a.replace(/^.*:/,""),i=ALK.indexOf(k),al=(I18N[lang]||I18N.fr).al;return i>=0&&al[i]?al[i]:k.replace(/-/g," ")}).join(", ")}
function isNear(s){var a=String(s).toLowerCase().split(",");return nearby.some(function(n){return n.length>2&&a.some(function(x){x=x.trim();return x.length>2&&(n.indexOf(x)>-1||x.indexOf(n)>-1)})})}
function item(p){
var li=el("li"),bx=el("div","alt-item"),tx=el("div");
if(p.image_front_small_url){var im=el("img");im.src=p.image_front_small_url;im.alt="";bx.appendChild(im)}
tx.appendChild(el("div","",pname(p)||p.code));
if(p.brands)tx.appendChild(el("small","",p.brands));
if(p.stores){tx.appendChild(el("div","small",t("sold")+" : "+p.stores));if(isNear(p.stores))tx.appendChild(el("span","tag",t("near")))}
bx.appendChild(tx);li.appendChild(bx);
var g=grade(p);if(g)li.appendChild(el("span","badge ns-"+g,g.toUpperCase()));
bx.onclick=function(){loadCode(p.code);window.scrollTo(0,0)};
return li}
function loadCode(code){
stopScan();msg(t("loading"));$("results").hidden=true;
getJSON(API+"/api/v2/product/"+encodeURIComponent(code)+".json?fields=code,product_name,product_name_"+lang+",brands,image_front_small_url,nutriscore_grade,nutrition_grades,nova_group,nutriments,ingredients_text,ingredients_text_"+lang+",allergens_tags,traces_tags,additives_tags,categories_tags,stores")
.then(function(d){if(d.status!==1||!d.product){msg(t("notfound"),true);$("product").hidden=true;return}msg("");current=d.product;showProduct(current)})
.catch(function(){msg(t("neterr"),true)})}
function searchName(q){
msg(t("loading"));$("product").hidden=true;
getJSON(API+"/cgi/search.pl?search_simple=1&action=process&json=1&page_size=12&fields=code,product_name,product_name_"+lang+",brands,image_front_small_url,nutriscore_grade,nutrition_grades&search_terms="+encodeURIComponent(q))
.then(function(d){msg("");var bx=$("results"),ul=el("ul","list"),L=(d.products||[]).filter(function(p){return p.code});
bx.textContent="";bx.hidden=false;bx.appendChild(el("h2","",t("results")));
if(!L.length)ul.appendChild(el("li","",t("notfound")));
L.forEach(function(p){ul.appendChild(item(p))});bx.appendChild(ul)})
.catch(function(){msg(t("neterr"),true)})}
function showProduct(p){
var box=$("product"),c=el("section","card"),head=el("div","head");
box.hidden=false;box.textContent="";
if(p.image_front_small_url){var im=el("img");im.src=p.image_front_small_url;im.alt="";head.appendChild(im)}
var h=el("div");h.appendChild(el("h1","",pname(p)||p.code));h.appendChild(el("div","small",p.brands||""));head.appendChild(h);c.appendChild(head);
var g=grade(p),nv=parseInt(p.nova_group,10)||0,adds=(p.additives_tags||[]).length,bd=el("div","badges");
bd.appendChild(el("span","badge"+(g?" ns-"+g:""),t("nutri")+" "+(g?g.toUpperCase():"?")));
bd.appendChild(el("span","badge",t("nova")+" "+(nv||"?")));c.appendChild(bd);
var bad=g==="d"||g==="e"||nv===4||adds>=5,good=(g==="a"||g==="b")&&nv<4&&adds<5;
c.appendChild(el("div","verdict "+(bad?"v-bad":good?"v-ok":"v-mid"),t(bad?"vBad":good?"vOk":"vMid")));
var n=p.nutriments||{},rows=[["energy","energy-kcal_100g"," kcal"],["fat","fat_100g"," g"],["sat","saturated-fat_100g"," g"],["carbs","carbohydrates_100g"," g"],["sugars","sugars_100g"," g"],["fiber","fiber_100g"," g"],["protein","proteins_100g"," g"],["salt","salt_100g"," g"]],tb=el("table");
c.appendChild(el("h2","",t("per100")));
rows.forEach(function(r){var v=n[r[1]],tr=el("tr");tr.appendChild(el("td","",t(r[0])));tr.appendChild(el("td","",(v==null||v==="")?"–":(Math.round(v*10)/10)+r[2]));tb.appendChild(tr)});
c.appendChild(tb);
function line(k,s){var d=el("p");d.appendChild(el("b","",t(k)+" : "));d.appendChild(document.createTextNode(s));c.appendChild(d)}
line("ingredients",p["ingredients_text_"+lang]||p.ingredients_text||"–");
line("allergens",tags(p.allergens_tags)||t("none"));
line("traces",tags(p.traces_tags)||t("none"));
line("additives",(p.additives_tags||[]).map(function(a){return a.replace(/^.*:/,"").toUpperCase()}).join(", ")||t("none"));
if(p.stores)line("sold",p.stores);
box.appendChild(c);
var ac=el("section","card"),ul=el("ul","list");ac.appendChild(el("h2","",t("altTitle")));ac.appendChild(ul);box.appendChild(ac);
loadAlts(p,ul)}
function loadAlts(p,ul){
var cats=p.categories_tags||[],cat=cats[cats.length-1];
if(!cat){ul.appendChild(el("li","",t("altNone")));return}
ul.appendChild(el("li","",t("loading")));
getJSON(API+"/api/v2/search?categories_tags="+encodeURIComponent(cat)+"&sort_by=unique_scans_n&page_size=40&fields=code,product_name,product_name_"+lang+",brands,image_front_small_url,nutriscore_grade,nutrition_grades,nova_group,stores")
.then(function(d){var cur=rank(grade(p)),lim=cur<0?2:cur;
var L=(d.products||[]).filter(function(x){return x.code!==p.code&&grade(x)&&rank(grade(x))<lim});
L.sort(function(a,b){return rank(grade(a))-rank(grade(b))||(parseInt(a.nova_group,10)||9)-(parseInt(b.nova_group,10)||9)});
ul.textContent="";
if(!L.length){ul.appendChild(el("li","",t("altNone")));return}
L.slice(0,8).forEach(function(x){ul.appendChild(item(x))})})
.catch(function(){ul.textContent="";ul.appendChild(el("li","",t("neterr")))})}
function dist(a,b,c,d){var R=6371,r=Math.PI/180,x=(c-a)*r,y=(d-b)*r,h=Math.sin(x/2)*Math.sin(x/2)+Math.cos(a*r)*Math.cos(c*r)*Math.sin(y/2)*Math.sin(y/2);return 2*R*Math.asin(Math.sqrt(h))}
function locate(){
var ul=$("stores");ul.textContent="";
if(!navigator.geolocation){ul.appendChild(el("li","",t("locDenied")));return}
ul.appendChild(el("li","",t("locating")));
navigator.geolocation.getCurrentPosition(function(pos){
var la=pos.coords.latitude,lo=pos.coords.longitude;
var q='[out:json][timeout:20];(node["shop"="supermarket"](around:3000,'+la+','+lo+');way["shop"="supermarket"](around:3000,'+la+','+lo+'););out center 25;';
fetch("https://overpass-api.de/api/interpreter",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:"data="+encodeURIComponent(q)})
.then(function(r){if(!r.ok)throw new Error(r.status);return r.json()})
.then(function(d){
var arr=(d.elements||[]).map(function(e){var y=e.lat!=null?e.lat:(e.center&&e.center.lat),x=e.lon!=null?e.lon:(e.center&&e.center.lon);return{name:(e.tags&&(e.tags.name||e.tags.brand))||"Supermarket",lat:y,lon:x,d:dist(la,lo,y,x)}}).filter(function(s){return s.lat!=null&&s.lon!=null}).sort(function(a,b){return a.d-b.d}).slice(0,12);
nearby=arr.map(function(s){return s.name.toLowerCase()});
ul.textContent="";
if(!arr.length){ul.appendChild(el("li","",t("nostores")));return}
arr.forEach(function(s){var li=el("li"),tx=el("div"),a=el("a","",t("route"));
tx.appendChild(el("div","",s.name));tx.appendChild(el("small","",s.d.toFixed(1)+" km"));li.appendChild(tx);
a.href="https://www.google.com/maps/dir/?api=1&destination="+s.lat+","+s.lon;a.target="_blank";a.rel="noopener noreferrer";li.appendChild(a);ul.appendChild(li)});
if(current)showProduct(current)})
.catch(function(){ul.textContent="";ul.appendChild(el("li","",t("neterr")))})
},function(){ul.textContent="";ul.appendChild(el("li","",t("locDenied")))},{enableHighAccuracy:true,timeout:15000})}
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
$("loc").onclick=locate;
$("lang").onchange=function(){lang=this.value;applyLang();if(current)showProduct(current)};
applyLang();
})();
