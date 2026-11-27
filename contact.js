(function(){
"use strict";
function lg(){var l=document.documentElement.lang;return I18N[l]?l:"fr"}
function t(k){return(I18N[lg()]&&I18N[lg()][k])||I18N.fr[k]||k}
function el(tag,cls,txt){var e=document.createElement(tag);if(cls)e.className=cls;if(txt!=null)e.textContent=txt;return e}
var f=document.querySelector("footer"),p0=f.querySelector("p"),row=el("p"),btn=el("button","btn alt"),lk=el("a");
lk.href="/confidentialite.html";
row.appendChild(btn);row.appendChild(document.createTextNode(" "));row.appendChild(lk);
p0.insertAdjacentElement("afterend",row);
var box=el("section","card"),h=el("h2"),n=el("input"),m=el("input"),a=el("textarea"),hp=el("input"),s=el("button","btn"),st=el("p","msg");
box.id="contact";box.hidden=true;
n.type="text";n.maxLength=80;n.autocomplete="name";
m.type="email";m.maxLength=120;m.autocomplete="email";
a.maxLength=2000;a.rows=5;
hp.type="checkbox";hp.className="hp";hp.tabIndex=-1;hp.autocomplete="off";
[h,n,m,a,hp,s,st].forEach(function(x){box.appendChild(x)});
document.querySelector("main").appendChild(box);
function render(){
btn.textContent="✉️ "+t("contact");lk.textContent=t("privacy");h.textContent=t("contact");
n.placeholder=t("cName");m.placeholder=t("cEmail");a.placeholder=t("cMsg");s.textContent=t("cSend");
n.setAttribute("aria-label",t("cName"));m.setAttribute("aria-label",t("cEmail"));a.setAttribute("aria-label",t("cMsg"))}
function err(k){st.textContent=t(k);st.className="msg err"}
btn.onclick=function(){box.hidden=!box.hidden;if(!box.hidden)box.scrollIntoView({behavior:"smooth"})};
s.onclick=function(){
st.className="msg";
if(hp.checked)return;
var last=0;try{last=+localStorage.getItem("cts")||0}catch(e){}
var nm=n.value.trim(),em=m.value.trim(),ms=a.value.trim();
if(!nm||!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)||ms.length<5){err("cInvalid");return}
if(typeof WEB3KEY==="undefined"||WEB3KEY.indexOf("COLLE")===0){err("cNoKey");return}
if(Date.now()-last<60000){err("cWait");return}
s.disabled=true;st.textContent=t("cSending");
fetch("https://api.web3forms.com/submit",{method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json"},body:JSON.stringify({access_key:WEB3KEY,subject:"Riamo Nunito - message du site",name:nm,email:em,message:ms})})
.then(function(r){return r.json()})
.then(function(d){if(!d.success)throw new Error("fail");try{localStorage.setItem("cts",String(Date.now()))}catch(e){}n.value="";m.value="";a.value="";st.textContent=t("cOk")})
.catch(function(){err("cFail")})
.then(function(){s.disabled=false})};
document.getElementById("lang").addEventListener("change",render);
render();
})();
