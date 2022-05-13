!function(){"use strict";var t={5792:function(t,n,r){var e,i=r(9451),o=r(8148),a=r(1139),u=r(7851),c={},s=!1,f={},l={};function d(t){var n=a.Z(t),r=c.init.clone();try{for(c.total=r.totalEpochs();r.currentEpoch()<c.total;)if(i.q7(r,{runTime:n}),t){var e=r.extractCoordinates();u.b({type:"umap_iter",x:e.x,y:e.y,iteration:r.currentEpoch()},[e.x.buffer,e.y.buffer])}c.final=r.extractCoordinates()}finally{r.free()}}u.j((function(t){var n=t.data.id;"INIT"==t.data.cmd?(e=i.j2(t.data.scranOptions)).then((function(t){u.b({id:n,type:"init_worker",data:{status:"SUCCESS"}})})).catch((function(t){u.b({id:n,type:"error",error:t})})):"RUN"==t.data.cmd?e.then((function(r){var e;"neighbors"in t.data?(o.Yl(c.neighbors),c.neighbors=a.q(t.data.neighbors),e=!0):e=!1;var h={min_dist:t.data.params.min_dist,num_epochs:t.data.params.num_epochs};e||o.xi(h,f)?(o.Yl(c.init),c.init=i.fD(c.neighbors,{epochs:h.num_epochs,minDist:h.min_dist}),f=h,s=!0):s=!1;var p={};(s||o.xi(p,l))&&(d(t.data.params.animate),l=p),u.b({id:n,type:"umap_run",data:{status:"SUCCESS"}})})).catch((function(t){u.b({id:n,type:"error",error:t})})):"RERUN"==t.data.cmd?e.then((function(t){d(!0),u.b({id:n,type:"umap_rerun",data:{status:"SUCCESS"}})})).catch((function(t){u.b({id:n,type:"error",error:t})})):"FETCH"==t.data.cmd&&e.then((function(t){var r={x:c.final.x.slice(),y:c.final.y.slice(),iterations:c.total},e=[r.x.buffer,r.y.buffer];u.b({id:n,type:"umap_fetch",data:r},e)})).catch((function(t){u.b({id:n,type:"error",error:t})}))}))},9451:function(t,n,r){r.d(n,{j2:function(){return e.j2},Wf:function(){return i.Wf},RJ:function(){return i.RJ},Tz:function(){return o.Tz},fD:function(){return a.fD},q7:function(){return a.q7}});var e=r(3515),i=r(519),o=(r(9288),r(1305),r(1402),r(3754),r(1742),r(6301),r(8333),r(9586),r(7242),r(3486),r(944),r(4657),r(5026),r(8538),r(1620)),a=(r(8840),r(9542),r(7217));r(552),r(7085),r(5767),r(5325),r(7236)},9542:function(t,n,r){r(519),r(3515),r(1620)},7217:function(t,n,r){r.d(n,{fD:function(){return s},q7:function(){return f}});var e=r(5671),i=r(3144),o=r(519),a=r(3515),u=r(1620),c=function(){function t(n,r){(0,e.Z)(this,t),this.status=n,this.coordinates=r}return(0,i.Z)(t,[{key:"clone",value:function(){return new t(this.status.deepcopy(),this.coordinates.clone())}},{key:"numberOfCells",value:function(){return this.status.num_obs()}},{key:"currentEpoch",value:function(){return this.status.epoch()}},{key:"totalEpochs",value:function(){return this.status.num_epochs()}},{key:"extractCoordinates",value:function(){return o.ab(this.numberOfCells(),this.coordinates.array())}},{key:"free",value:function(){null!==this.status&&(this.status.delete(),this.status=null),null!==this.coordinates&&(this.coordinates.free(),this.coordinates=null)}}]),t}();function s(t){var n,r,e,i,s=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{},f=s.neighbors,l=void 0===f?15:f,d=s.epochs,h=void 0===d?500:d,p=s.minDist,v=void 0===p?.01:p;try{var m;t instanceof u.DV?(n=(0,u.wf)(t,l),m=n):m=t,e=o.RJ(2*m.numberOfCells()),r=a.RE((function(t){return t.initialize_umap(m.results,h,v,e.offset)})),i=new c(r,e)}catch(b){throw o.gd(r),o.gd(e),b}finally{o.gd(n)}return i}function f(t){var n=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{},r=n.runTime,e=void 0===r?null:r;null===e&&(e=-1),a.RE((function(n){return n.run_umap(t.status,e,t.coordinates.offset)}))}}},n={};function r(e){var i=n[e];if(void 0!==i)return i.exports;var o=n[e]={exports:{}};return t[e](o,o.exports,r),o.exports}r.m=t,r.x=function(){var t=r.O(void 0,[588,421],(function(){return r(5792)}));return t=r.O(t)},function(){var t=[];r.O=function(n,e,i,o){if(!e){var a=1/0;for(f=0;f<t.length;f++){e=t[f][0],i=t[f][1],o=t[f][2];for(var u=!0,c=0;c<e.length;c++)(!1&o||a>=o)&&Object.keys(r.O).every((function(t){return r.O[t](e[c])}))?e.splice(c--,1):(u=!1,o<a&&(a=o));if(u){t.splice(f--,1);var s=i();void 0!==s&&(n=s)}}return n}o=o||0;for(var f=t.length;f>0&&t[f-1][2]>o;f--)t[f]=t[f-1];t[f]=[e,i,o]}}(),r.d=function(t,n){for(var e in n)r.o(n,e)&&!r.o(t,e)&&Object.defineProperty(t,e,{enumerable:!0,get:n[e]})},r.f={},r.e=function(t){return Promise.all(Object.keys(r.f).reduce((function(n,e){return r.f[e](t,n),n}),[]))},r.u=function(t){return"static/js/"+t+"."+{421:"46887b19",495:"8fe40a7d",588:"bc51293d"}[t]+".chunk.js"},r.miniCssF=function(t){},r.o=function(t,n){return Object.prototype.hasOwnProperty.call(t,n)},r.p="/kana/",function(){r.b=self.location+"/../../../";var t={792:1};r.f.i=function(n,e){t[n]||importScripts(r.p+r.u(n))};var n=self.webpackChunkkana=self.webpackChunkkana||[],e=n.push.bind(n);n.push=function(n){var i=n[0],o=n[1],a=n[2];for(var u in o)r.o(o,u)&&(r.m[u]=o[u]);for(a&&a(r);i.length;)t[i.pop()]=1;e(n)}}(),function(){var t=r.x;r.x=function(){return Promise.all([r.e(588),r.e(421)]).then(t)}}();r.x()}();
//# sourceMappingURL=792.20c7740a.chunk.js.map